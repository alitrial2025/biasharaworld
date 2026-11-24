import { companyVerification } from "@/lib/backend/company-verification";
import { verificationAction, verificationOwner } from "@/lib/backend/identity-verification";
import { merchantStructure } from "@/lib/backend/merchant-verification";
import { ApiError, fail, json } from "@/lib/backend/server";

export async function GET(request: Request) {
  try {
    const { businessId, ownerId } = await verificationOwner(request);
    const structure = await merchantStructure(businessId, ownerId);
    if (!structure) return json({ enabled: true, needsStructure: true });
    if (structure === "individual") return json({ enabled: true, individual: true });
    return json(await companyVerification(businessId, ownerId));
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const { businessId, ownerId } = await verificationOwner(request);
    const { action } = verificationAction.parse(await request.json());
    if (await merchantStructure(businessId, ownerId) !== "registered_entity") {
      throw new ApiError("Company verification is for registered entities. Check your legal structure.", 403);
    }
    return json(await companyVerification(businessId, ownerId, action));
  } catch (error) { return fail(error); }
}
