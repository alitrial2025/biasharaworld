import { z } from "zod";
import { ApiError } from "../server";
import { paystackConfig } from "../provider-config.mjs";
import type { PaymentChannel } from "../../payment-methods";
export { paystackConfig } from "../provider-config.mjs";

const paystackEnvelope = z.object({ status: z.literal(true), data: z.unknown(), meta: z.object({ next: z.string().nullable().optional() }).optional() });
export const subaccountCode = z.string().regex(/^ACCT_[a-zA-Z0-9]+$/);
const active = z.union([z.boolean(), z.literal(1), z.literal(0)]).transform(Boolean);
const subaccountShape = z.object({
  subaccount_code: subaccountCode,
  is_verified: active.optional(), active: active.optional(),
  currency: z.string().optional(), percentage_charge: z.union([z.number(), z.string().regex(/^\d+(?:\.\d+)?$/).transform(Number)]).optional(),
});
const bank = z.object({ code: z.string(), name: z.string(), active, currency: z.literal("KES"), is_deleted: z.boolean().optional() });
const checkoutShape = z.object({ authorization_url: z.url(), reference: z.string() });
const transaction = z.object({
  status: z.string(), domain: z.string(), reference: z.string(), amount: z.number().int(), currency: z.string(),
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER), channel: z.string(), paid_at: z.iso.datetime({ offset: true }).nullable(),
  subaccount: z.object({ subaccount_code: subaccountCode }).partial().nullable().optional(),
});

export class PaystackError extends ApiError {
  constructor(readonly providerStatus?: number) {
    super("The payment provider could not complete the request. Check the payment status before retrying.", 503);
  }
}

async function request(path: string, body?: unknown) {
  const config = paystackConfig();
  if (!config) throw new ApiError("Online payments are unavailable for this shop.", 503);
  let response: Response;
  try {
    response = await fetch(`https://api.paystack.co${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${config.key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new PaystackError();
  }
  if (!response.ok) throw new PaystackError(response.status);
  try { return paystackEnvelope.parse(await response.json()); }
  catch { throw new PaystackError(); }
}

export async function kenyanSettlementBanks() {
  const banks = new Map<string, string>();
  const params = new URLSearchParams({ country: "kenya", currency: "KES", use_cursor: "true", perPage: "100" });
  for (let page = 0; page < 10; page++) {
    const result = await request(`/bank?${params}`);
    for (const item of z.array(bank).parse(result.data)) {
      if (item.active && !item.is_deleted) banks.set(item.code, item.name);
    }
    if (!result.meta?.next) return Array.from(banks, ([code, name]) => ({ code, name }));
    params.set("next", result.meta.next);
  }
  throw new PaystackError();
}

export async function createSettlementSubaccount(name: string, bankCode: string, accountNumber: string, businessId: string) {
  const { data } = await request("/subaccount", {
    business_name: name, bank_code: bankCode, account_number: accountNumber, percentage_charge: 0,
    description: `BiasharaOS merchant ${businessId}`,
  });
  return subaccountShape.parse(data).subaccount_code;
}

export async function settlementVerified(code: string) {
  const { data } = await request(`/subaccount/${encodeURIComponent(code)}`);
  const subaccount = subaccountShape.parse(data);
  return subaccount.subaccount_code === code && subaccount.active === true && subaccount.is_verified === true &&
    subaccount.currency === "KES" && subaccount.percentage_charge === 0;
}

export function hostedCheckoutUrl(value: string) {
  const url = new URL(value);
  if (url.origin !== "https://checkout.paystack.com" || url.username || url.password) throw new PaystackError();
  return url.href;
}

export function checkoutChannels(): PaymentChannel[] {
  return process.env.PAYSTACK_BANK_TRANSFERS === "true" ? ["card", "mobile_money", "bank_transfer"] : ["card", "mobile_money"];
}

export async function initializeCheckout(input: { email: string; amount: number; reference: string; subaccount: string; slug: string; orderId: number; channels: PaymentChannel[] }) {
  const config = paystackConfig();
  if (!config) throw new ApiError("Online payments are unavailable for this shop.", 503);
  const { data } = await request("/transaction/initialize", {
    email: input.email, amount: input.amount, reference: input.reference, subaccount: input.subaccount,
    currency: "KES", channels: input.channels, bearer: "subaccount",
    callback_url: `${config.origin}/portal/${encodeURIComponent(input.slug)}?paymentOrder=${input.orderId}`,
  });
  const checkout = checkoutShape.parse(data);
  if (checkout.reference !== input.reference) throw new PaystackError();
  return hostedCheckoutUrl(checkout.authorization_url);
}

export async function verifyCheckout(reference: string) {
  const { data } = await request(`/transaction/verify/${encodeURIComponent(reference)}`);
  return transaction.parse(data);
}
