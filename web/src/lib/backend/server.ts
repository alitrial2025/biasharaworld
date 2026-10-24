import { ZodError } from "zod";
import { createClient, type User } from "@supabase/supabase-js";
import { emptyBusiness, mergeState } from "./empty";
import type { DemoState } from "../data";
import { businessAccess, type BusinessAccess } from "../verification";
export async function getBusinessAccess(businessId: string): Promise<BusinessAccess> {
  const result = await admin().from("business_verifications").select("status,profile,consent_version,consented_at").eq("business_id", businessId).maybeSingle();
  if (result.error) throw new ApiError("Could not check business access. Please retry.", 503);
  return businessAccess(result.data);
}
export function requireBusinessAccess(workspace: { access?: BusinessAccess }) {
  if (!workspace.access?.featuresUnlocked) throw new ApiError("Complete your business-verification details to unlock this feature.", 403);
}
/** Essential settings survive the lock; operational records stay behind the access gate. */
export function clientWorkspace<T extends { access: BusinessAccess; state: DemoState }>(workspace: T | null): T | null {
  if (!workspace || workspace.access.featuresUnlocked) return workspace;
  const state = emptyBusiness(workspace.state.profile);
  state.operations.preferences = workspace.state.operations.preferences;
  return { ...workspace, state };
}
export function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Business service is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        }),
    },
  });
}
export async function identity(request: Request): Promise<User> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer "))
    throw new ApiError("Sign in to continue.", 401);
  const { data, error } = await admin().auth.getUser(header.slice(7));
  if (error || !data.user)
    throw new ApiError(
      error && (!error.status || error.status >= 500)
        ? "Account service is temporarily unavailable. Please retry."
        : "Your session expired. Please sign in again.",
      error && (!error.status || error.status >= 500) ? 503 : 401,
    );
  return data.user;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function loadBusiness(user: User, businessId?: string) {
  const db = admin();
  const claimed = await db.rpc("claim_business_invites", {
    p_user: user.id,
    p_email: user.email || "",
  });
  if (claimed.error)
    throw new ApiError("Could not check team membership. Please retry.", 503);
  let query = db
    .from("business_members")
    .select("business_id,role")
    .eq("user_id", user.id);
  if (businessId) query = query.eq("business_id", businessId);
  const { data: members, error } = await query.order("business_id");
  if (error)
    throw new ApiError("Business records are unavailable. Please retry.", 503);
  if (!members?.length) {
    if (businessId)
      throw new ApiError("You no longer have access to this business.", 403);
    return null;
  }
  const membership = members.find((m) => m.role === "Owner") || members[0];
  const [record, workspace, business, access] = await Promise.all([
    db
      .from("business_records")
      .select("state,revision,updated_at")
      .eq("business_id", membership.business_id)
      .single(),
    db
      .from("user_workspaces")
      .select("state")
      .eq("business_id", membership.business_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    db
      .from("businesses")
      .select("slug")
      .eq("id", membership.business_id)
      .single(),
    getBusinessAccess(membership.business_id),
  ]);
  if (record.error || workspace.error || business.error)
    throw new ApiError("Could not load business records. Please retry.", 503);
  return {
    businessId: membership.business_id,
    role: membership.role,
    slug: business.data.slug,
    revision: record.data.revision,
    updatedAt: record.data.updated_at,
    access,
    state: mergeState(
      record.data.state as DemoState,
      workspace.data?.state ?? {},
    ),
  };
}
export async function ensureBusiness(
  user: User,
  profile: Record<string, string>,
) {
  const state = emptyBusiness({
    ...profile,
    email: user.email || "",
    name: profile.name || user.user_metadata?.name || "",
  });
  state.members = [
    {
      id: 1,
      name: state.profile.name,
      email: user.email || "",
      role: "Owner",
      status: "Active",
      userId: user.id,
    },
  ];
  const { error } = await admin().rpc("create_business", {
    p_user: user.id,
    p_state: state,
  });
  if (error)
    throw new ApiError("Could not create your business. Please retry.", 503);
  return loadBusiness(user);
}
export function fail(error: unknown) {
  const status = error instanceof ApiError ? error.status : 400;
  const raw =
    error instanceof ZodError
      ? "Please check the details and try again."
      : error instanceof Error
        ? error.message
        : "Please retry this request.";
  const message =
    /supabase|vercel|postgres|sqlstate|fetch failed|ECONN|timeout/i.test(raw)
      ? "Connection unavailable. Please try again."
      : raw;
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export const json = (value: unknown) =>
  Response.json(value, { headers: { "Cache-Control": "no-store" } });
