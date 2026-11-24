import { randomUUID } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import type { DemoState } from "../../data";
import { admin, ApiError } from "../server";
import { applyCommand } from "../commands";
import { merchantVerificationStatus } from "../merchant-verification";
import { hostedCheckoutUrl, initializeCheckout, paystackConfig, PaystackError, settlementVerified, verifyCheckout } from "./paystack";

export const paymentReference = /^biashara-[a-f0-9-]{36}$/;
type OrderPayment = {
  business_id: string; order_id: number; user_id: string; reference: string; amount_minor: number;
  subaccount_code: string; checkout_url: string | null; paid_at: string | null; receipt_id: number | null;
};

export async function merchantSettlementCode(businessId: string) {
  const { data, error } = await admin().from("merchant_payment_accounts").select("subaccount_code")
    .eq("business_id", businessId).maybeSingle();
  if (error) throw new ApiError("Could not check the merchant’s payment setup.", 503);
  return data?.subaccount_code as string | null | undefined;
}

async function orderPayment(businessId: string, orderId: number) {
  const { data, error } = await admin().from("customer_order_payments").select("*")
    .eq("business_id", businessId).eq("order_id", orderId).maybeSingle<OrderPayment>();
  if (error) throw new ApiError("Could not check this payment.", 503);
  return data;
}

function paymentStatus(payment: OrderPayment) {
  return {
    status: payment.paid_at ? "paid" : payment.checkout_url ? "pending" : "preparing",
    checkoutUrl: payment.paid_at || !payment.checkout_url ? null : hostedCheckoutUrl(payment.checkout_url),
    receiptId: payment.receipt_id,
  };
}

export async function customerOrderPayment(user: User, slug: string, orderId: number, action: "start" | "refresh") {
  if (!user.email || !user.email_confirmed_at) throw new ApiError("Confirm your email before paying.", 403);
  const db = admin();
  const { data: business, error } = await db.from("businesses").select("id").eq("slug", slug).maybeSingle();
  if (error) throw new ApiError("Could not find this order.", 503);
  if (!business) throw new ApiError("Order not found.", 404);
  const { data: purchase, error: accessError } = await db.from("customer_order_access").select("order_id")
    .eq("business_id", business.id).eq("order_id", orderId).eq("user_id", user.id).maybeSingle();
  if (accessError) throw new ApiError("Could not check this order.", 503);
  if (!purchase) throw new ApiError("Order not found.", 404);

  const existing = await orderPayment(business.id, orderId);
  if (existing) {
    if (action === "refresh" && !existing.paid_at) await reconcilePayment(existing.reference);
    const recorded = (await orderPayment(business.id, orderId)) ?? existing;
    if (!recorded.paid_at && (!paystackConfig() || await merchantVerificationStatus(business.id) !== "verified")) {
      return { status: "suspended", checkoutUrl: null, receiptId: null };
    }
    return paymentStatus(recorded);
  }
  if (action === "refresh") return { status: "unpaid", checkoutUrl: null, receiptId: null };
  const code = paystackConfig() && await merchantSettlementCode(business.id);
  if (!code || await merchantVerificationStatus(business.id) !== "verified" || !(await settlementVerified(code))) {
    throw new ApiError("This shop’s settlement account is not ready for online payments.", 409);
  }
  const reservation = await db.rpc("begin_customer_order_payment", {
    target_business: business.id, target_order: orderId, customer: user.id,
    payment_reference: `biashara-${randomUUID()}`, destination: code,
  });
  if (reservation.error?.code === "22023") throw new ApiError("Online payment is available for delivered orders with an unpaid balance.", 409);
  if (reservation.error?.code === "42501") throw new ApiError("Online payments are unavailable for this order.", 403);
  if (reservation.error || !reservation.data) throw new ApiError("Could not prepare the payment.", 503);
  const payment = reservation.data as OrderPayment & { created: boolean };
  if (!payment.created) return paymentStatus(payment);

  let checkoutUrl: string;
  try {
    checkoutUrl = await initializeCheckout({
      email: user.email, amount: payment.amount_minor, reference: payment.reference, subaccount: payment.subaccount_code, slug, orderId,
    });
  } catch (error) {
    if (error instanceof PaystackError && [400, 422].includes(error.providerStatus ?? 0)) {
      // The provider rejected the request before giving the buyer a checkout URL.
      await db.from("customer_order_payments").delete().eq("reference", payment.reference).is("checkout_url", null).is("paid_at", null);
    }
    throw error;
  }
  const saved = await db.from("customer_order_payments").update({ checkout_url: checkoutUrl })
    .eq("reference", payment.reference).is("paid_at", null).select("*").maybeSingle<OrderPayment>();
  if (saved.error) throw new ApiError("Checkout could not be confirmed. Check its status before trying again.", 503);
  const current = saved.data ?? await orderPayment(business.id, orderId);
  if (!current) throw new ApiError("Could not find the saved payment.", 503);
  return paymentStatus(current);
}

export async function reconcilePayment(reference: string) {
  if (!paymentReference.test(reference)) return;
  const db = admin();
  const { data: payment, error } = await db.from("customer_order_payments").select("*")
    .eq("reference", reference).maybeSingle<OrderPayment>();
  if (error) throw new ApiError("Could not find this payment.", 503);
  if (!payment || payment.paid_at) return;
  const transaction = await verifyCheckout(reference);
  if (transaction.status !== "success") return;
  const method = transaction.channel === "card" ? "Card" : transaction.channel === "mobile_money" ? "M-Pesa" : null;
  if (!method || !transaction.paid_at || transaction.domain !== paystackConfig()?.domain ||
      transaction.reference !== reference || transaction.currency !== "KES" || transaction.amount !== payment.amount_minor ||
      transaction.subaccount?.subaccount_code !== payment.subaccount_code) {
    throw new ApiError("The provider’s payment does not match this order. Contact support to reconcile it.", 409);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: record, error: stateError } = await db.from("business_records").select("state,revision")
      .eq("business_id", payment.business_id).single();
    if (stateError) throw new ApiError("Could not load the order for reconciliation.", 503);
    const state = record.state as DemoState;
    const order = state.operations.deliveries.find(({ id }) => id === payment.order_id);
    if (!order || order.total !== payment.amount_minor || order.status !== "Delivered") {
      throw new ApiError("This payment needs to be reconciled with the order.", 409);
    }
    if (order.paid) {
      const recorded = await orderPayment(payment.business_id, payment.order_id);
      if (recorded?.paid_at) return;
      throw new ApiError("This payment needs to be reconciled with the order.", 409);
    }
    const result = applyCommand(state, { type: "orderPaid", id: payment.order_id }, "Owner", method);
    const saved = await db.rpc("confirm_customer_order_payment", {
      payment_reference: reference, current_revision: record.revision, transaction_id: String(transaction.id),
      payment_channel: transaction.channel, payment_time: transaction.paid_at, target_receipt: result.id, next_state: result.state,
    });
    if (saved.error) throw new ApiError("Could not record this payment. Retry the reconciliation.", 503);
    if (saved.data === true) return;
  }
  throw new ApiError("The business records changed. Retry the payment check.", 503);
}
