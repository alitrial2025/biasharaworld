import { createHash } from "node:crypto";
import { dailyActions, industryQueueMatcher } from "@/lib/workspace-activity";
import { industryFor, type IndustryRecord } from "@/lib/industries";
import {
  applyIndustryCommand,
  industryCommand,
} from "@/lib/backend/industry-records";
import {
  admin,
  ApiError,
  fail,
  identity,
  json,
  businessMembership,
} from "@/lib/backend/server";

async function verifyBankReview(request: Request) {
  // Identity has already verified this same access token for the current user.
  const token = request.headers.get("authorization")?.slice(7);
  const { data, error } = await admin().auth.getClaims(token);
  const now = Math.floor(Date.now() / 1000);
  const methods = data?.claims.amr;
  const recentCode =
    Array.isArray(methods) &&
    methods.some(
      (method) =>
        typeof method === "object" &&
        method !== null &&
        method.method === "totp" &&
        typeof method.timestamp === "number" &&
        method.timestamp >= now - 300 &&
        method.timestamp <= now + 30,
    );
  if (error || data?.claims.aal !== "aal2" || !recentCode) {
    throw new ApiError(
      "Verify a current code from your authenticator app to record this banking decision.",
      403,
    );
  }
}

async function access(request: Request) {
  const user = await identity(request);
  const membership = await businessMembership(user);
  if (!membership) throw new ApiError("Create your business first.", 403);
  const { data, error } = await admin()
    .from("business_records")
    .select("business_type:state->profile->>type")
    .eq("business_id", membership.business_id)
    .single();
  if (error) throw new ApiError("Could not load your business type.", 503);
  const businessType = data.business_type ?? "";
  const industry = industryFor(businessType);
  const role = membership.role;
  const manage = ["Owner", "Manager"].includes(role);
  const scan =
    industry.id === "entertainment" && (manage || role === "Cashier");
  return {
    user,
    businessId: membership.business_id,
    businessType,
    role,
    industry,
    manage,
    scan,
  };
}

async function stored(business: string, sector: string) {
  const result = await admin()
    .from("industry_workspaces")
    .select("revision,records")
    .eq("business_id", business)
    .eq("sector", sector)
    .maybeSingle<{ revision: number; records: IndustryRecord[] }>();
  if (result.error)
    throw new ApiError("Could not load your industry records.", 503);
  return result.data ?? { revision: 0, records: [] };
}

export async function GET(request: Request) {
  try {
    const { user, businessId, industry, role, manage, scan } =
      await access(request);
    if (!manage && !scan)
      throw new ApiError("Your role cannot view industry records.", 403);
    if (new URL(request.url).searchParams.get("view") === "summary") {
      if (!manage)
        throw new ApiError("Your role cannot view industry records.", 403);
      const queues = (dailyActions(industry.id, role) ?? []).flatMap(
        (action) => (action.queue ? [action.queue] : []),
      );
      const { records } = queues.length
        ? await stored(businessId, industry.id)
        : { records: [] };
      const counts = Object.fromEntries(
        queues.map((queue) => [
          queue.module,
          records.filter(industryQueueMatcher(queue)).length,
        ]),
      );
      return json({ sector: industry.id, counts });
    }
    const data = manage
      ? await stored(businessId, industry.id)
      : { records: [] };
    const records = data.records.map(({ createdBy, ...record }) => ({
      ...record,
      own: createdBy === user.id,
    }));
    return json({ records, manage, scan, sector: industry.id });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, businessId, businessType, role, industry, manage, scan } =
      await access(request);
    const raw = await request.text();
    if (raw.length > 12_000)
      throw new ApiError("The record is too large.", 413);
    const input = industryCommand.parse(JSON.parse(raw));
    if (input.sector !== industry.id)
      throw new ApiError(
        "Your business type changed. Refresh the workspace.",
        409,
      );
    if (input.action === "admit" ? !scan : !manage)
      throw new ApiError("Your role cannot make this change.", 403);
    if (
      industry.id === "finance" &&
      input.action === "transition" &&
      ["Approved", "Declined"].includes(input.status)
    ) {
      if (role !== "Owner")
        throw new ApiError("An owner must decide this case.", 403);
      await verifyBankReview(request);
    }
    const db = admin();
    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const previous = await db
      .from("industry_workspace_actions")
      .select("actor,command_hash")
      .eq("business_id", businessId)
      .eq("request_id", input.requestId)
      .maybeSingle();
    if (previous.error)
      throw new ApiError("Could not check this request.", 503);
    if (previous.data) {
      if (
        previous.data.actor !== user.id ||
        previous.data.command_hash !== hash
      )
        throw new ApiError("This request ID has already been used.", 409);
      return json({
        saved: true,
        duplicate: true,
        created: input.action === "createSeats" ? input.count : undefined,
      });
    }

    const current = await stored(businessId, industry.id);
    const { records, record, created } = applyIndustryCommand(
      industry,
      current.records,
      input,
      user.id,
      role,
      new Date(),
    );
    const saved = await db.rpc("save_industry_workspace", {
      target_business: businessId,
      acting_user: user.id,
      expected_type: businessType,
      target_sector: industry.id,
      expected_revision: current.revision,
      command_id: input.requestId,
      payload_hash: hash,
      target_record: record.id,
      command_action: input.action === "createSeats" ? "create" : input.action,
      next_records: records,
    });
    if (saved.error?.code === "42501")
      throw new ApiError("Your role cannot make this change.", 403);
    if (saved.error?.code === "23505" || saved.data === false)
      throw new ApiError(
        "Another change was saved. Refresh and try again.",
        409,
      );
    if (saved.error || !saved.data)
      throw new ApiError(
        "Could not save the record. Retry the same request.",
        503,
      );
    return json({ saved: true, status: record.status, created });
  } catch (error) {
    return fail(error);
  }
}
