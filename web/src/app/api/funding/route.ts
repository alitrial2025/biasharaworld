import { createHash } from "node:crypto";
import { z } from "zod";
import {
  admin,
  ApiError,
  identity,
  loadBusiness,
  json,
  fail,
  requireBusinessAccess,
} from "@/lib/backend/server";
import {
  fundingReadiness,
  fundingRequestSchema,
  validateFundingSubmission,
} from "@/lib/backend/funding";

export const dynamic = "force-dynamic";
async function owner(request: Request, businessId?: string) {
  const user = await identity(request);
  if (!user.email_confirmed_at)
    throw new ApiError(
      "Confirm your email before preparing a funding request.",
      403,
    );
  const workspace = await loadBusiness(user, businessId);
  if (!workspace || workspace.role !== "Owner")
    throw new ApiError(
      "Only the business owner can access funding requests.",
      403,
    );
  return { user, workspace };
}
async function readiness(
  workspace: NonNullable<Awaited<ReturnType<typeof loadBusiness>>>,
) {
  const verification = await admin()
    .from("business_verifications")
    .select("status")
    .eq("business_id", workspace.businessId)
    .maybeSingle();
  if (verification.error)
    throw new ApiError(
      "Business verification readiness is unavailable. Try again shortly.",
      503,
    );
  return {
    verificationStatus: verification.data?.status || "not_started",
    readiness: fundingReadiness(workspace.state),
  };
}
export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("businessId");
    const { workspace } = await owner(
      request,
      query ? z.uuid().parse(query) : undefined,
    );
    requireBusinessAccess(workspace);
    const records = await admin()
      .from("funding_applications")
      .select(
        "id,business_id,revision,status,payload,history,created_at,updated_at,submitted_at",
      )
      .eq("business_id", workspace.businessId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (records.error)
      throw new ApiError(
        "Funding requests could not be loaded. Try again shortly.",
        503,
      );
    return json({
      businessId: workspace.businessId,
      providerConfigured: false,
      applications: records.data,
      ...(await readiness(workspace)),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 16000)
      throw new ApiError("This funding request is too large.", 413);
    const body = fundingRequestSchema.parse(JSON.parse(raw));
    const { user, workspace } = await owner(request, body.businessId);
    const hash = createHash("sha256")
      .update(JSON.stringify(body))
      .digest("hex");
    const previous = await admin()
      .from("funding_request_log")
      .select("user_id,request_hash,result")
      .eq("business_id", body.businessId)
      .eq("request_id", body.requestId)
      .maybeSingle();
    if (previous.error)
      throw new ApiError(
        "Could not check this funding request. Retry safely.",
        503,
      );
    if (previous.data) {
      if (
        previous.data.user_id !== user.id ||
        previous.data.request_hash !== hash
      )
        throw new ApiError(
          "That request ID was already used. Refresh your funding requests.",
          409,
        );
      return json({
        ...previous.data.result,
        duplicate: true,
        providerConfigured: false,
      });
    }
    if (body.action !== "withdraw") requireBusinessAccess(workspace);
    const snapshot = await readiness(workspace);
    if (body.action === "submit") {
      validateFundingSubmission(body.payload);
      if (snapshot.verificationStatus !== "submitted")
        throw new ApiError(
          "Complete and submit your business verification readiness before recording a funding request.",
          409,
        );
    }
    const result = await admin().rpc("save_funding_request", {
      p_business: workspace.businessId,
      p_user: user.id,
      p_id: body.id,
      p_revision: body.revision,
      p_request: body.requestId,
      p_hash: hash,
      p_action: body.action,
      p_payload: body.payload,
      p_readiness: snapshot.readiness,
    });
    if (result.error?.code === "42501")
      throw new ApiError(
        "Funding request not found or no longer accessible.",
        404,
      );
    if (result.error)
      throw new ApiError(
        result.error.code === "23505"
          ? "That request ID was already used. Refresh your funding requests."
          : "The save is unconfirmed. Retry the same request safely.",
        result.error.code === "23505" ? 409 : 503,
      );
    if (result.data?.conflict)
      throw new ApiError(
        "This funding request changed on another device. Refresh and review the latest version.",
        409,
      );
    if (result.data?.locked)
      throw new ApiError(
        "Recorded or withdrawn requests cannot be edited. Create a new draft instead.",
        409,
      );
    return json({ ...result.data, providerConfigured: false });
  } catch (e) {
    return fail(e);
  }
}
