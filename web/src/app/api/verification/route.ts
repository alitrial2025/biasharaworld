import { z } from "zod";
import {
  admin,
  identity,
  loadBusiness,
  ApiError,
  fail,
  json,
} from "@/lib/backend/server";
import {
  verificationProfile,
  verificationMissing,
  verificationVersion,
} from "@/lib/verification";

export const dynamic = "force-dynamic";
async function owner(request: Request, businessId: string) {
  const user = await identity(request);
  if (!user.email_confirmed_at)
    throw new ApiError(
      "Confirm your email before preparing verification.",
      403,
    );
  const workspace = await loadBusiness(user, z.uuid().parse(businessId));
  if (!workspace || workspace.role !== "Owner")
    throw new ApiError(
      "Only the business owner can access verification details.",
      403,
    );
  return { user, workspace };
}
const select = "status,profile,consent_version,consented_at,updated_at";
export async function GET(request: Request) {
  try {
    const { user, workspace } = await owner(
      request,
      new URL(request.url).searchParams.get("businessId") || "",
    );
    const result = await admin()
      .from("business_verifications")
      .select(select)
      .eq("business_id", workspace.businessId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (result.error)
      throw new ApiError(
        "Could not load verification readiness. Please retry.",
        503,
      );
    return json({
      verification: result.data,
      providerConfigured: false,
      message:
        "Readiness details are stored privately. Identity verification and lending partners are not connected yet.",
    });
  } catch (error) {
    return fail(error);
  }
}
export async function PUT(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 15000) throw new ApiError("Details are too large.", 413);
    const body = z
      .object({
        businessId: z.uuid(),
        profile: verificationProfile,
        submit: z.boolean().default(false),
      })
      .strict()
      .parse(JSON.parse(raw));
    const { user, workspace } = await owner(request, body.businessId);
    const missing = verificationMissing(body.profile);
    if (body.submit && missing.length)
      throw new ApiError("Complete: " + missing.join(", ") + ".");
    const now = new Date().toISOString();
    const result = await admin()
      .from("business_verifications")
      .upsert(
        {
          business_id: workspace.businessId,
          owner_id: user.id,
          profile: body.profile,
          status: body.submit ? "submitted" : "draft",
          consent_version: body.profile.declaration
            ? verificationVersion
            : null,
          consented_at: body.profile.declaration ? now : null,
          updated_at: now,
        },
        { onConflict: "business_id" },
      )
      .select(select)
      .single();
    if (result.error)
      throw new ApiError(
        "Could not save verification readiness. Please retry.",
        503,
      );
    return json({
      verification: result.data,
      providerConfigured: false,
      message: body.submit
        ? "Readiness recorded. Verification remains pending provider setup; no identity check or lender submission has occurred."
        : "Verification draft saved.",
    });
  } catch (error) {
    return fail(error);
  }
}
export async function DELETE(request: Request) {
  try {
    const { user, workspace } = await owner(
      request,
      new URL(request.url).searchParams.get("businessId") || "",
    );
    const result = await admin()
      .from("business_verifications")
      .delete()
      .eq("business_id", workspace.businessId)
      .eq("owner_id", user.id);
    if (result.error)
      throw new ApiError(
        "Could not clear verification readiness. Please retry.",
        503,
      );
    return json({
      message:
        "Verification readiness cleared. Business records and any funding request history are unchanged.",
    });
  } catch (error) {
    return fail(error);
  }
}
