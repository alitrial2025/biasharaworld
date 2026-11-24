import { z } from "zod";
import { ownerVerification, verificationAction, verificationOwner } from "@/lib/backend/identity-verification";
import { legalStructure, merchantStructure, merchantVerificationStatus } from "@/lib/backend/merchant-verification";
import { ApiError, fail, json } from "@/lib/backend/server";

const actionShape = z.union([
  verificationAction,
  z.object({ action: z.literal("declare"), legalStructure }).strict(),
]);

export async function GET(request: Request) {
  try {
    const { businessId, ownerId } = await verificationOwner(request);
    const structure = await merchantStructure(businessId, ownerId);
    return json({ ...await ownerVerification(businessId, ownerId), legalStructure: structure,
      merchantStatus: await merchantVerificationStatus(businessId) });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const { businessId, ownerId } = await verificationOwner(request);
    const input = actionShape.parse(await request.json());
    const structure = await merchantStructure(businessId, ownerId, input.action === "declare" ? input.legalStructure : undefined);
    if (input.action !== "declare" && !structure) throw new ApiError("Declare your legal structure first.", 403);
    return json({ ...await ownerVerification(businessId, ownerId, input.action === "declare" ? undefined : input.action),
      legalStructure: structure, merchantStatus: await merchantVerificationStatus(businessId) });
  } catch (error) { return fail(error); }
}
