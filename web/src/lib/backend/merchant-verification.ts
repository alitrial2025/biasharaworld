import { z } from "zod";
import { admin, ApiError } from "./server";

export const legalStructure = z.enum(["individual", "registered_entity"]);
const status = z.enum(["business_type_required", "owner_identity_required", "company_verification_required", "verified"]);

export async function merchantVerificationStatus(businessId: string) {
  const { data, error } = await admin().rpc("merchant_verification_status", { target_business: businessId });
  const result = status.safeParse(data);
  if (error || !result.success) throw new ApiError("Could not check merchant verification.", 503);
  return result.data;
}

export const verificationRequired = {
  business_type_required: "Declare your legal structure in Merchant verification first.",
  owner_identity_required: "Complete owner identity verification first.",
  company_verification_required: "Complete company and representative verification first.",
};

export async function merchantStructure(businessId: string, ownerId: string, structure?: z.infer<typeof legalStructure>) {
  const db = admin();
  if (structure) {
    const changed = await db.from("businesses").update({ legal_structure: structure })
      .eq("owner_id", ownerId).eq("id", businessId).is("legal_structure", null);
    if (changed.error) throw new ApiError("Could not record the business legal structure.", 503);
  }
  const { data, error } = await db.from("businesses").select("legal_structure")
    .eq("owner_id", ownerId).eq("id", businessId).maybeSingle();
  if (error) throw new ApiError("Could not check the business legal structure.", 503);
  if (!data) throw new ApiError("Only the business owner can manage merchant verification.", 403);
  if (structure && data.legal_structure !== structure) throw new ApiError("Contact support to change your legal structure.", 409);
  return data.legal_structure as z.infer<typeof legalStructure> | null;
}
