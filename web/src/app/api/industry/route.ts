import { createHash } from "node:crypto";
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
  loadBusiness,
} from "@/lib/backend/server";

async function access(request: Request) {
  const user = await identity(request);
  const workspace = await loadBusiness(user);
  if (!workspace) throw new ApiError("Create your business first.", 403);
  const industry = industryFor(workspace.state.profile.type);
  const manage = ["Owner", "Manager"].includes(workspace.role);
  const scan =
    industry.id === "entertainment" && (manage || workspace.role === "Cashier");
  return { user, workspace, industry, manage, scan };
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
    const { user, workspace, industry, manage, scan } = await access(request);
    if (!manage && !scan)
      throw new ApiError("Your role cannot view industry records.", 403);
    const data = manage
      ? await stored(workspace.businessId, industry.id)
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
    const { user, workspace, industry, manage, scan } = await access(request);
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
    const db = admin();
    const hash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const previous = await db
      .from("industry_workspace_actions")
      .select("actor,command_hash")
      .eq("business_id", workspace.businessId)
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
      return json({ saved: true, duplicate: true });
    }

    const current = await stored(workspace.businessId, industry.id);
    const { records, record } = applyIndustryCommand(
      industry,
      current.records,
      input,
      user.id,
      workspace.role,
      new Date(),
    );
    const saved = await db.rpc("save_industry_workspace", {
      target_business: workspace.businessId,
      acting_user: user.id,
      expected_type: workspace.state.profile.type,
      target_sector: industry.id,
      expected_revision: current.revision,
      command_id: input.requestId,
      payload_hash: hash,
      target_record: record.id,
      command_action: input.action,
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
    return json({ saved: true, status: record.status });
  } catch (error) {
    return fail(error);
  }
}
