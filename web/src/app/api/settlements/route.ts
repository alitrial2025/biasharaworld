import { z } from "zod";
import { admin, ApiError, fail, identity, json, loadBusiness } from "@/lib/backend/server";
import { kesMinor } from "@/lib/settlements";

const reference = z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/ -]{0,119}$/);
const line = z.object({
  reference,
  posted_on: z.iso.date(),
  amount_minor: z.number().int().min(1).max(1e12),
}).strict();
const input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("import"), source: z.enum(["provider", "bank", "mobile_money"]),
    csv: z.string().min(1).max(130_000),
  }).strict(),
  z.object({
    action: z.literal("discard"), id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    reason: z.string().trim().min(1).max(200),
  }).strict(),
]);

function statementLines(csv: string) {
  const rows = csv.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const cells = (row: string) => row.split(",").map(value => value.trim().replace(/^"([^"\r\n]*)"$/, "$1"));
  if (cells(rows.shift() ?? "").join(",").toLowerCase() !== "date,reference,amount_kes") {
    throw new ApiError("Use the CSV headings date,reference,amount_kes in that order.");
  }
  const parsed = rows.flatMap((row, index) => {
    if (!row.trim()) return [];
    try {
      const [date, ref, value, ...extra] = cells(row);
      if (extra.length || !value) throw new Error();
      return [line.parse({ reference: ref, posted_on: date, amount_minor: kesMinor(value) })];
    } catch {
      throw new ApiError(`Check the date, reference and positive KES amount on CSV line ${index + 2}.`);
    }
  });
  if (parsed.length < 1 || parsed.length > 500) throw new ApiError("Import between 1 and 500 statement lines at a time.");
  return parsed;
}

async function merchant(request: Request) {
  const user = await identity(request);
  const workspace = await loadBusiness(user);
  if (!workspace || !["Owner", "Manager"].includes(workspace.role)) {
    throw new ApiError("Only owners and managers can reconcile settlements.", 403);
  }
  return { businessId: workspace.businessId, userId: user.id };
}

export async function GET(request: Request) {
  try {
    const { businessId, userId } = await merchant(request);
    const { after, exceptions } = z.object({
      after: reference.optional(),
      exceptions: z.enum(["true", "false"]).default("false"),
    }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    const { data, error } = await admin().rpc("match_settlement_statements", {
      target_business: businessId, actor: userId, after_reference: after ?? null, exceptions_only: exceptions === "true",
    });
    if (error || !Array.isArray(data)) throw new ApiError("Could not load settlement matches.", 503);
    const entries = data.slice(0, 50);
    return json({ entries, next: data.length > 50 ? entries.at(-1)?.reference : null });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const { businessId, userId } = await merchant(request);
    const raw = await request.text();
    if (raw.length > 150_000) throw new ApiError("This statement is too large. Import up to 500 lines at a time.", 413);
    const command = input.parse(JSON.parse(raw));
    const base = { target_business: businessId, actor: userId };
    const db = admin();
    if (command.action === "discard") {
      const { data, error } = await db.rpc("discard_settlement_line", { ...base, statement_line: command.id, reason: command.reason });
      if (error?.code === "42501") throw new ApiError("Only the owner can correct a statement.", 403);
      if (error) throw new ApiError("Could not discard this imported line.", 503);
      if (!data) throw new ApiError("That line has already been discarded or is unavailable.", 404);
      return json({ discarded: true });
    }

    const lines = statementLines(command.csv);
    const unique = new Map<string, (typeof lines)[number]>();
    for (const row of lines) {
      const previous = unique.get(row.reference);
      if (previous && (previous.amount_minor !== row.amount_minor || previous.posted_on !== row.posted_on)) {
        throw new ApiError(`Reference ${row.reference} has conflicting details in this file.`, 409);
      }
      unique.set(row.reference, row);
    }
    const { data, error } = await db.rpc("import_settlement_statement", {
      ...base, statement_source: command.source, lines: Array.from(unique.values()),
    });
    if (error?.code === "23505") throw new ApiError("A reference is already imported with different details. Ask the owner to correct the existing line.", 409);
    if (error?.code === "42501") throw new ApiError("Your role cannot import settlement lines.", 403);
    if (error) throw new ApiError("Could not import the statement.", 503);
    return json({ added: data, duplicates: lines.length - data });
  } catch (error) { return fail(error); }
}
