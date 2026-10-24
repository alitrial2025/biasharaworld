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
  industryRequest,
  validateIndustryRecord,
  reservationFor,
  decodeIndustryCursor,
  encodeIndustryCursor,
} from "@/lib/backend/industry";
import { resolveIndustry, type IndustryRecord } from "@/lib/industries";
export const dynamic = "force-dynamic";
const columns =
  "id,business_id,industry_id,workflow_id,revision,title,customer,status,fields,amount_minor,paid_minor,payments,history,archived,created_at,updated_at";
export async function GET(request: Request) {
  try {
    const user = await identity(request),
      params = new URL(request.url).searchParams,
      query = params.get("businessId"),
      workspace = await loadBusiness(
        user,
        query ? z.uuid().parse(query) : undefined,
      );
    if (!workspace) throw new ApiError("Create your business first.", 409);
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .parse(params.get("limit") || 100);
    const cursor = decodeIndustryCursor(
      params.get("cursor"),
      workspace.businessId,
    );
    let recordsQuery = admin()
      .from("industry_records")
      .select(columns)
      .eq("business_id", workspace.businessId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);
    // Cursor values are schema-checked before becoming PostgREST filter syntax.
    if (cursor)
      recordsQuery = recordsQuery.or(
        `updated_at.lt.${cursor.updatedAt},and(updated_at.eq.${cursor.updatedAt},id.lt.${cursor.id})`,
      );
    const result = workspace.access.featuresUnlocked
      ? await recordsQuery
      : { data: [], error: null };
    if (result.error)
      throw new ApiError("Operations could not be loaded. Please retry.", 503);
    return json({
      businessId: workspace.businessId,
      industry: resolveIndustry(workspace.state.profile.type),
      records: result.data?.slice(0, limit) || [],
      nextCursor:
        result.data && result.data.length > limit
          ? encodeIndustryCursor(workspace.businessId, result.data[limit - 1])
          : null,
      role: workspace.role,
      currency: "KES",
      timeZone: "Africa/Nairobi",
      access: workspace.access,
    });
  } catch (error) {
    return fail(error);
  }
}
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 20000)
      throw new ApiError("This record is too large.", 413);
    const input = industryRequest.parse(JSON.parse(raw)),
      user = await identity(request),
      workspace = await loadBusiness(user, input.businessId);
    if (!workspace) throw new ApiError("Create your business first.", 409);
    const db = admin(),
      hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const previous = await db
      .from("industry_request_log")
      .select("user_id,request_hash,result")
      .eq("business_id", workspace.businessId)
      .eq("request_id", input.requestId)
      .maybeSingle();
    if (previous.error)
      throw new ApiError(
        "Could not check the save. Retry the same request safely.",
        503,
      );
    if (previous.data) {
      if (
        previous.data.user_id !== user.id ||
        previous.data.request_hash !== hash
      )
        throw new ApiError("Request ID was used for another action.", 409);
      return json({ ...previous.data.result, duplicate: true });
    }
    requireBusinessAccess(workspace);
    if (
      !["Owner", "Manager", "Cashier"].includes(workspace.role) ||
      (input.action === "archive" &&
        !["Owner", "Manager"].includes(workspace.role))
    )
      throw new ApiError("Your team role cannot make this change.", 403);
    const found = await db
      .from("industry_records")
      .select(columns)
      .eq("business_id", workspace.businessId)
      .eq("id", input.id)
      .maybeSingle();
    if (found.error)
      throw new ApiError(
        "Could not load the current record. Please retry.",
        503,
      );
    const current = found.data as IndustryRecord | null;
    if (input.action !== "create" && !current)
      throw new ApiError("This record could not be found.", 404);
    if (
      (input.action === "create" && (current || input.revision !== 0)) ||
      (current && current.revision !== input.revision)
    )
      throw new ApiError(
        "This record changed. Refresh and review the latest version.",
        409,
      );
    if (current?.archived)
      throw new ApiError("Archived records cannot be changed.", 409);
    let record: NonNullable<typeof input.record>;
    if (input.action === "create" || input.action === "update") {
      if (!input.record) throw new ApiError("Enter the workflow details.");
      record = input.record;
      if (
        current &&
        (current.industry_id !== record.industryId ||
          current.workflow_id !== record.workflowId)
      )
        throw new ApiError("The record workflow cannot change.");
      if (
        !current &&
        record.industryId !== resolveIndustry(workspace.state.profile.type).id
      )
        throw new ApiError("Choose a workflow for your current business type.");
    } else {
      record = {
        industryId: current!.industry_id,
        workflowId: current!.workflow_id,
        title: current!.title,
        customer: current!.customer,
        status:
          input.action === "status" ? input.status || "" : current!.status,
        fields: current!.fields,
        amountMinor: current!.amount_minor,
      };
    }
    const workflow = validateIndustryRecord(record);
    if (input.action === "payment" && record.status === "Cancelled")
      throw new ApiError(
        "Cancelled work cannot receive payments. Record any refund instead.",
        409,
      );
    if (["payment", "refund"].includes(input.action) && !input.payment)
      throw new ApiError("Enter the payment amount and reference.");
    if (
      input.action === "archive" &&
      (!workflow.terminalStatuses.includes(record.status) ||
        (record.status === "Cancelled"
          ? current!.paid_minor !== 0
          : current!.paid_minor !== current!.amount_minor))
    )
      throw new ApiError(
        "Complete or cancel the work and settle its balance before archiving.",
        409,
      );
    const reservation = reservationFor({
      industry_id: record.industryId,
      workflow_id: record.workflowId,
      fields: record.fields,
      status: record.status,
      archived: input.action === "archive",
    });
    const result = await db.rpc("save_industry_record", {
      p_business: workspace.businessId,
      p_user: user.id,
      p_id: input.id,
      p_revision: input.revision,
      p_request: input.requestId,
      p_hash: hash,
      p_action: input.action,
      p_record: {
        industry_id: record.industryId,
        workflow_id: record.workflowId,
        title: record.title,
        customer: record.customer,
        status: record.status,
        fields: record.fields,
        amount_minor: record.amountMinor,
      },
      p_payment: input.payment || null,
      p_reservation: reservation
        ? {
            ...reservation,
            start: reservation.start + ":00+03:00",
            end: reservation.end + ":00+03:00",
          }
        : null,
    });
    if (result.error)
      throw new ApiError(
        result.error.code === "23505"
          ? "Request ID already used. Refresh and review."
          : result.error.code === "42501"
            ? "Business access changed. Refresh your workspace."
            : "The save is unconfirmed. Retry the same request safely.",
        result.error.code === "23505"
          ? 409
          : result.error.code === "42501"
            ? 403
            : 503,
      );
    if (result.data?.conflict || result.data?.locked)
      throw new ApiError(
        "This record changed. Refresh and review the latest version.",
        409,
      );
    if (result.data?.bookingConflict)
      throw new ApiError(
        "That resource is already booked during this time. Choose another resource or time.",
        409,
      );
    if (result.data?.balanceConflict)
      throw new ApiError(
        "The payment exceeds the balance, the refund exceeds payments, or the total is below payments already recorded.",
        409,
      );
    return json(result.data);
  } catch (error) {
    return fail(error);
  }
}
