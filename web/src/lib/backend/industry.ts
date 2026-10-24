import { z } from "zod";
import { industries, workflowFor, type IndustryRecord } from "../industries";
import { ApiError } from "./server";
const money = z.number().int().min(0).max(1e12);
export const industryRequest = z
  .object({
    businessId: z.uuid(),
    id: z.uuid(),
    revision: z.number().int().min(0),
    requestId: z.uuid(),
    action: z.enum([
      "create",
      "update",
      "status",
      "payment",
      "refund",
      "archive",
    ]),
    record: z
      .object({
        industryId: z.string().max(60),
        workflowId: z.string().max(60),
        title: z.string().trim().min(1).max(200),
        customer: z.string().trim().max(200),
        status: z.string().max(80),
        fields: z
          .record(z.string(), z.string().max(2000))
          .refine((v) => Object.keys(v).length <= 30),
        amountMinor: money,
      })
      .strict()
      .optional(),
    status: z.string().max(80).optional(),
    payment: z
      .object({
        amountMinor: money.refine((n) => n > 0),
        method: z.enum(["Cash", "M-Pesa", "Bank transfer", "Card", "Other"]),
        reference: z.string().trim().min(1).max(200),
      })
      .strict()
      .optional(),
  })
  .strict();
export type IndustryRequest = z.infer<typeof industryRequest>;
/** Naive local datetimes are explicitly Nairobi business time, never the server timezone. */
export function businessTimestamp(value: string): number {
  return Date.parse(value.length === 16 ? value + ":00+03:00" : value);
}
function validDate(value: string) {
  const date = new Date(value + "T00:00:00Z");
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
export function validateIndustryRecord(
  record: NonNullable<IndustryRequest["record"]>,
) {
  record.fields = Object.fromEntries(
    Object.entries(record.fields).map(([key, value]) => [key, value.trim()]),
  );
  const industry = industries.find((item) => item.id === record.industryId),
    workflow = workflowFor(record.industryId, record.workflowId);
  if (!industry || !workflow)
    throw new ApiError("Choose an available business workflow.");
  if (!workflow.statuses.includes(record.status))
    throw new ApiError("Choose a valid workflow status.");
  const allowed = new Set(workflow.fields.map((field) => field.key));
  if (Object.keys(record.fields).some((key) => !allowed.has(key)))
    throw new ApiError("This workflow contains unsupported details.");
  for (const field of workflow.fields) {
    const value = (record.fields[field.key] || "").trim();
    if (field.required && !value)
      throw new ApiError(`${field.label} is required.`);
    if (!value) continue;
    if (
      field.type === "number" &&
      (!Number.isFinite(Number(value)) ||
        Number(value) < (field.min ?? 0) ||
        Number(value) > (field.max ?? 1e12))
    )
      throw new ApiError(`Check ${field.label.toLowerCase()}.`);
    if (field.type === "select" && !field.options?.includes(value))
      throw new ApiError(`Choose ${field.label.toLowerCase()}.`);
    if (
      field.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !validDate(value))
    )
      throw new ApiError(`Enter a valid ${field.label.toLowerCase()}.`);
    if (
      field.type === "datetime" &&
      (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ||
        !validDate(value.slice(0, 10)) ||
        !Number.isFinite(businessTimestamp(value)) ||
        Number(value.slice(11, 13)) > 23 ||
        Number(value.slice(14, 16)) > 59)
    )
      throw new ApiError(`Enter a valid ${field.label.toLowerCase()}.`);
  }
  if (workflow.reservation) {
    const spec = workflow.reservation,
      start = record.fields[spec.startField],
      end = record.fields[spec.endField];
    if (!start || !end || businessTimestamp(end) <= businessTimestamp(start))
      throw new ApiError("The booking end must be after its start.");
  }
  return workflow;
}
export function reservationFor(
  record: Pick<
    IndustryRecord,
    "industry_id" | "workflow_id" | "fields" | "status" | "archived"
  >,
) {
  const workflow = workflowFor(record.industry_id, record.workflow_id),
    spec = workflow?.reservation;
  if (
    !spec ||
    record.archived ||
    workflow!.terminalStatuses.includes(record.status)
  )
    return null;
  return {
    pool: `${record.industry_id}:${spec.pool}`,
    resource: (record.fields[spec.resourceField] || "")
      .trim()
      .toLocaleLowerCase(),
    start: record.fields[spec.startField],
    end: record.fields[spec.endField],
  };
}

const cursorShape = z
  .object({
    v: z.literal(1),
    businessId: z.uuid(),
    updatedAt: z
      .string()
      .max(40)
      .regex(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/,
      )
      .refine(
        (value) =>
          Number.isFinite(Date.parse(value)) &&
          validDate(value.slice(0, 10)) &&
          Number(value.slice(11, 13)) <= 23 &&
          Number(value.slice(14, 16)) <= 59 &&
          Number(value.slice(17, 19)) <= 59,
      ),
    id: z.uuid(),
  })
  .strict();
export type IndustryCursor = z.infer<typeof cursorShape>;
export function encodeIndustryCursor(
  businessId: string,
  record: { updated_at: string; id: string },
): string {
  return Buffer.from(
    JSON.stringify(
      cursorShape.parse({
        v: 1,
        businessId,
        updatedAt: record.updated_at,
        id: record.id,
      }),
    ),
  ).toString("base64url");
}
export function decodeIndustryCursor(
  value: string | null,
  businessId: string,
): IndustryCursor | null {
  if (!value) return null;
  try {
    if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value))
      throw new Error();
    const cursor = cursorShape.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    if (cursor.businessId !== businessId) throw new Error();
    return cursor;
  } catch {
    throw new ApiError(
      "This operations page link is invalid. Refresh the workspace.",
      400,
    );
  }
}
