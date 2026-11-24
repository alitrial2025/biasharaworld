import { z } from "zod";
import { admin, ApiError, identity, loadBusiness } from "./server";
import { appOrigin, diditConfig } from "./provider-config.mjs";

const statuses = z.enum([
  "Not Started", "In Progress", "Approved", "Declined", "In Review",
  "Resubmitted", "Expired", "Abandoned", "Kyc Expired",
]);
const providerSession = z.object({
  session_id: z.uuid(),
  workflow_id: z.uuid(),
  session_kind: z.enum(["user", "business"]),
  vendor_data: z.string(),
  status: z.union([statuses, z.literal("Awaiting User")]),
  url: z.string().optional(),
  session_url: z.string().optional(),
  registry_checks: z.array(z.object({
    status: z.string(),
    data_resolved: z.boolean().optional(),
    company: z.object({ country_code: z.string().nullish() }).nullish(),
  })).nullish(),
});
type Session = z.infer<typeof providerSession>;
type Stored = { session_id: string; workflow_id: string; status: Session["status"]; checked_at: string };

const pending = new Set(["Not Started", "In Progress", "Resubmitted", "Awaiting User"]);
export const restartable = new Set(["Expired", "Abandoned", "Kyc Expired"]);
const table = "business_identity_verifications";

export const verificationAction = z.object({ action: z.enum(["start", "refresh"]) }).strict();

export async function verificationOwner(request: Request) {
  const user = await identity(request);
  const workspace = await loadBusiness(user);
  if (workspace?.role !== "Owner") throw new ApiError("Only the business owner can use verification.", 403);
  return { businessId: workspace.businessId, ownerId: user.id };
}

export function publicResult(session: Session) {
  const rawUrl = session.url ?? session.session_url;
  const url = rawUrl && URL.canParse(rawUrl) ? new URL(rawUrl) : null;
  const hosted = url?.origin === "https://verify.didit.me" && !url.username && !url.password;
  return { enabled: true, status: session.status, next: pending.has(session.status) && hosted ? url.href : null };
}

export async function requestDiditSession({ apiKey, workflowId, vendorData, kind, sessionId }: {
  apiKey: string; workflowId: string; vendorData: string; kind: Session["session_kind"]; sessionId?: string;
}) {
  const endpoint = sessionId ? `${sessionId}/decision/` : "";
  const details = kind === "business" ? { expected_details: { registry_country: "KE" } } : {};
  const origin = appOrigin();
  const callback = origin ? { callback: `${origin}/dashboard/${kind === "business" ? "company-verification" : "verification"}` } : {};
  let session: Session;
  try {
    const response = await fetch(`https://verification.didit.me/v3/session/${endpoint}`, {
      method: sessionId ? "GET" : "POST",
      headers: { "x-api-key": apiKey, ...(!sessionId ? { "Content-Type": "application/json" } : {}) },
      body: sessionId ? undefined : JSON.stringify({ workflow_id: workflowId, vendor_data: vendorData, ...details, ...callback }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error();
    session = providerSession.parse(await response.json());
  } catch {
    throw new ApiError("Could not reach the verification service. Try again shortly.", 503);
  }
  if (session.session_kind !== kind || session.workflow_id !== workflowId || session.vendor_data !== vendorData ||
      (sessionId && session.session_id !== sessionId) || (kind === "user" && session.status === "Awaiting User")) {
    throw new ApiError("Could not confirm this verification session.", 503);
  }
  return session;
}

export async function ownerVerification(businessId: string, ownerId: string, action?: "start" | "refresh") {
  const settings = diditConfig("user");
  if (!settings) {
    if (action) throw new ApiError("Identity verification is not available yet.", 503);
    return { enabled: false, status: null, next: null };
  }
  const { apiKey, workflowId } = settings;

  const db = admin();
  const { data, error } = await db.from(table)
    .select("session_id,workflow_id,status,checked_at")
    .eq("business_id", businessId).eq("owner_id", ownerId).maybeSingle<Stored>();
  if (error) throw new ApiError("Could not load the verification status.", 503);
  if (!action || (!data && action === "refresh")) {
    return { enabled: true, status: data?.status ?? null, next: null };
  }
  if (data && data.workflow_id !== workflowId) {
    throw new ApiError("This session uses an earlier workflow. Contact support for help.", 409);
  }

  const create = action === "start" && (!data || restartable.has(data.status));
  const vendorData = `${businessId}:${ownerId}`;
  const observedAt = new Date().toISOString();
  const session = await requestDiditSession({ apiKey, workflowId, vendorData, kind: "user", sessionId: create ? undefined : data?.session_id });
  const verified = publicResult(session);
  if (create && !verified.next) throw new ApiError("Could not open the verification session.", 503);

  const values = { session_id: session.session_id, workflow_id: session.workflow_id, status: session.status, checked_at: observedAt };
  const saved = data
    ? await db.from(table).update(values).eq("business_id", businessId).eq("owner_id", ownerId)
      .eq("session_id", data.session_id).eq("checked_at", data.checked_at).select("session_id").maybeSingle()
    : await db.from(table).upsert({ business_id: businessId, owner_id: ownerId, ...values }, { onConflict: "business_id", ignoreDuplicates: true })
      .select("session_id").maybeSingle();
  if (saved.error) throw new ApiError("Could not save the verification status. Please try again.", 503);
  if (!saved.data) throw new ApiError("Another request updated this verification. Refresh the status.", 409);
  return verified;
}

export async function refreshVerificationFromWebhook(sessionId: string) {
  const { data, error } = await admin().from(table).select("business_id,owner_id").eq("session_id", sessionId).maybeSingle();
  if (error) throw new ApiError("Could not load the verification session.", 503);
  if (!data) return false;
  await ownerVerification(data.business_id, data.owner_id, "refresh");
  return true;
}
