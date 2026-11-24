import { z } from "zod";
import { admin, ApiError, fail, identity, json, loadBusiness } from "@/lib/backend/server";
import { merchantVerificationStatus, verificationRequired } from "@/lib/backend/merchant-verification";
import { createSettlementSubaccount, kenyanSettlementBanks, paystackConfig, PaystackError, settlementVerified } from "@/lib/backend/payments/paystack";

async function owner(request: Request) {
  const user = await identity(request);
  const workspace = await loadBusiness(user);
  if (workspace?.role !== "Owner") throw new ApiError("Only the business owner can connect a settlement account.", 403);
  return { user, workspace };
}

export async function GET(request: Request) {
  try {
    const { workspace } = await owner(request);
    if (!paystackConfig()) return json({ status: "unavailable" });
    const verification = await merchantVerificationStatus(workspace.businessId);
    if (verification !== "verified") return json({ status: "verification_required", verification });
    const { data, error } = await admin().from("merchant_payment_accounts").select("bank_name,account_last_four,subaccount_code")
      .eq("business_id", workspace.businessId).maybeSingle();
    if (error) throw new ApiError("Could not check the settlement account.", 503);
    if (!data) return json({ status: "unconnected", banks: await kenyanSettlementBanks() });
    const verified = data.subaccount_code && await settlementVerified(data.subaccount_code);
    return json({ status: verified ? "connected" : "pending", bankName: data.bank_name, lastFour: data.account_last_four });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await owner(request);
    if (!paystackConfig()) throw new ApiError("Online payment setup is unavailable.", 503);
    const verification = await merchantVerificationStatus(workspace.businessId);
    if (verification !== "verified") throw new ApiError(verificationRequired[verification], 403);
    const { bankCode, accountNumber } = z.object({ bankCode: z.string().min(1).max(30), accountNumber: z.string().regex(/^\d{6,24}$/) }).strict().parse(await request.json());
    const bank = (await kenyanSettlementBanks()).find(({ code }) => code === bankCode);
    if (!bank) throw new ApiError("Choose a supported Kenyan settlement bank.", 400);
    const db = admin();
    const lastFour = accountNumber.slice(-4);
    const reservation = await db.from("merchant_payment_accounts").insert({
      business_id: workspace.businessId, owner_id: user.id, bank_name: bank.name, account_last_four: lastFour,
    });
    if (reservation.error?.code === "23505") throw new ApiError("This business already has a settlement account. Contact support for changes.", 409);
    if (reservation.error?.code === "42501") throw new ApiError("Complete merchant verification before connecting a settlement account.", 403);
    if (reservation.error) throw new ApiError("Could not prepare settlement setup.", 503);

    let code: string;
    try {
      code = await createSettlementSubaccount(workspace.state.profile.business, bank.code, accountNumber, workspace.businessId);
    } catch (error) {
      // A connection failure may mean Paystack created the recipient. Keep the reservation for reconciliation.
      if (error instanceof PaystackError && [400, 422].includes(error.providerStatus ?? 0)) {
        await db.from("merchant_payment_accounts").delete().eq("business_id", workspace.businessId).is("subaccount_code", null);
        throw new ApiError("The provider rejected these settlement details. Check the bank and account number.", 400);
      }
      throw error;
    }
    const saved = await db.from("merchant_payment_accounts").update({ subaccount_code: code })
      .eq("business_id", workspace.businessId).is("subaccount_code", null).select("business_id").maybeSingle();
    if (saved.error || !saved.data) throw new ApiError("Settlement setup needs review. Contact support before retrying.", 503);
    return json({ status: "pending", bankName: bank.name, lastFour });
  } catch (error) { return fail(error); }
}
