import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { publicResult, requestDiditSession, restartable, verificationAction } from "./identity-verification";
import { admin, ApiError } from "./server";
import { diditConfig } from "./provider-config.mjs";

const table = "business_registry_verifications";
const columns = "business_id,owner_id,workflow_id,attempt_id,session_id,status,kenya_registry_passed,checked_at";
type Stored = {
  business_id: string;
  owner_id: string;
  workflow_id: string;
  attempt_id: string;
  session_id: string | null;
  status: string | null;
  kenya_registry_passed: boolean;
  checked_at: string;
};
type Action = z.infer<typeof verificationAction>["action"];

async function refresh(data: Stored, settings: NonNullable<ReturnType<typeof diditConfig>>) {
  if (data.workflow_id !== settings.workflowId) {
    throw new ApiError("This company session uses an earlier workflow. Contact support for help.", 409);
  }
  const session = await requestDiditSession({
    ...settings,
    kind: "business",
    vendorData: `company:${data.business_id}:${data.owner_id}`,
    sessionId: data.session_id ?? undefined,
  });
  const kenyaRegistryPassed = session.status === "Approved" && !!session.registry_checks?.some((check) =>
    check.status === "Approved" && check.data_resolved === true &&
    (check.company?.country_code === "KEN" || check.company?.country_code === "KE")
  );
  const { data: saved, error } = await admin().from(table).update({
    session_id: session.session_id,
    status: session.status,
    kenya_registry_passed: kenyaRegistryPassed,
    checked_at: new Date().toISOString(),
  }).eq("business_id", data.business_id).eq("attempt_id", data.attempt_id)
    .eq("checked_at", data.checked_at).select(columns).maybeSingle<Stored>();
  if (error) throw new ApiError("Could not save the company verification result.", 503);
  if (!saved) throw new ApiError("Another request updated this verification. Refresh the status.", 409);
  return { saved, next: publicResult(session).next };
}

async function representativeReview(data: Stored, identitySessionId: string) {
  if (!data.kenya_registry_passed) return null;
  const { data: review, error } = await admin().from("company_representative_reviews")
    .select("verdict").eq("business_id", data.business_id).eq("owner_id", data.owner_id)
    .eq("company_session_id", data.session_id!).eq("identity_session_id", identitySessionId)
    .order("id", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new ApiError("Could not load the representative review.", 503);
  return review?.verdict ?? "Pending";
}

export async function companyVerification(businessId: string, ownerId: string, action?: Action) {
  const settings = diditConfig("business");
  if (!settings) {
    if (action) throw new ApiError("Company verification is not available yet.", 503);
    return { enabled: false };
  }

  const db = admin();
  const [business, identity] = await Promise.all([
    db.from("businesses").select("owner_id").eq("id", businessId).single(),
    db.from("business_identity_verifications").select("session_id").eq("business_id", businessId)
      .eq("owner_id", ownerId).eq("status", "Approved").maybeSingle(),
  ]);
  if (business.error || identity.error) throw new ApiError("Could not confirm the business owner's verification.", 503);
  if (business.data.owner_id !== ownerId) throw new ApiError("Only the current business owner can use company verification.", 403);
  if (!identity.data) {
    if (action) throw new ApiError("Complete owner identity verification first.", 403);
    return { enabled: true, requiresOwner: true };
  }

  const found = await db.from(table).select(columns).eq("business_id", businessId).maybeSingle<Stored>();
  if (found.error) throw new ApiError("Could not load company verification.", 503);
  let data = found.data;
  let next: string | null = null;
  if (data && data.owner_id !== ownerId) {
    return { enabled: true, needsSupport: true, status: null, next };
  }
  if (data && data.workflow_id !== settings.workflowId) {
    return { enabled: true, needsSupport: true, status: null, next };
  }
  if (action === "start" && (!data || (data.status && restartable.has(data.status)))) {
    const reservation = {
      business_id: businessId, owner_id: ownerId, attempt_id: randomUUID(), workflow_id: settings.workflowId,
      session_id: null, status: null, kenya_registry_passed: false, checked_at: new Date().toISOString(),
    };
    const query = data
      ? db.from(table).update(reservation).eq("business_id", businessId).eq("attempt_id", data.attempt_id).eq("checked_at", data.checked_at)
      : db.from(table).upsert(reservation, { onConflict: "business_id", ignoreDuplicates: true });
    const reserved = await query.select(columns).maybeSingle<Stored>();
    if (reserved.error) throw new ApiError("Could not reserve company verification.", 503);
    if (!reserved.data) throw new ApiError("Another request updated this verification. Refresh the status.", 409);
    data = reserved.data;
    try {
      ({ saved: data, next } = await refresh(data, settings));
    } catch {
      // Leave the reservation in place if the provider may have accepted the create request.
      throw new ApiError("Could not confirm the new company session. Reload the status before trying again.", 503);
    }
  } else if (action && data?.session_id) {
    ({ saved: data, next } = await refresh(data, settings));
  }

  return {
    enabled: true,
    status: data?.status ?? null,
    next,
    starting: !!data && !data.session_id,
    kenyaRegistryPassed: data?.kenya_registry_passed ?? false,
    representativeReview: data?.session_id ? await representativeReview(data, identity.data.session_id) : null,
  };
}

export async function refreshCompanyFromWebhook(sessionId: string) {
  const { data, error } = await admin().from(table).select(columns).eq("session_id", sessionId).maybeSingle<Stored>();
  if (error) throw new ApiError("Could not load the company verification session.", 503);
  if (!data) return;
  const settings = diditConfig("business");
  if (!settings) throw new ApiError("Company verification is not configured.", 503);
  await refresh(data, settings);
}
