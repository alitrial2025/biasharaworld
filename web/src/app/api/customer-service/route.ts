import { z } from "zod";
import { admin, ApiError, fail, identity, json, loadBusiness } from "@/lib/backend/server";

const customerId = z.number().int().positive().max(1e9);
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), customer: customerId, id: z.uuid(), body: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ action: z.literal("redact"), id: z.uuid(), reason: z.string().trim().min(1).max(200) }).strict(),
]);

async function support(request: Request) {
  const user = await identity(request);
  const workspace = await loadBusiness(user);
  if (!workspace || !["Owner", "Manager"].includes(workspace.role)) throw new ApiError("An owner or manager can access support notes.", 403);
  return { user, workspace };
}

export async function GET(request: Request) {
  try {
    const { workspace } = await support(request);
    const query = new URL(request.url).searchParams;
    const customer = customerId.parse(Number(query.get("customer")));
    const page = z.number().int().min(0).max(9999).parse(Number(query.get("page") ?? 0));
    if (!workspace.state.customers.some(record => record.id === customer)) throw new ApiError("Customer not found.", 404);
    const { data, error } = await admin().from("customer_service_notes")
      .select("id,body,recorded_at,redacted_at,redact_reason").eq("business_id", workspace.businessId).eq("customer_id", customer)
      .order("recorded_at", { ascending: false }).order("id", { ascending: false }).range(page * 30, page * 30 + 30);
    if (error) throw new ApiError("Could not load the customer’s support notes.", 503);
    return json({ notes: data.slice(0, 30), nextPage: data.length > 30 ? page + 1 : null });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await support(request);
    const raw = await request.text();
    if (raw.length > 11_000) throw new ApiError("This note is too long.", 413);
    const input = command.parse(JSON.parse(raw));
    const db = admin();
    const base = { actor: user.id, target_business: workspace.businessId };
    if (input.action === "redact") {
      const { data, error } = await db.rpc("redact_customer_note", { ...base, note_id: input.id, reason: input.reason });
      if (error?.code === "42501") throw new ApiError("Only the owner can redact a note.", 403);
      if (error) throw new ApiError("Could not redact the note.", 503);
      if (!data) throw new ApiError("That note is unavailable or was already redacted.", 404);
      return json({ redacted: true });
    }
    const { error } = await db.rpc("record_customer_note", {
      ...base, target_customer: input.customer, request_id: input.id, content: input.body,
    });
    if (error?.code === "42501") throw new ApiError("This customer is unavailable.", 404);
    if (error?.code === "23505") throw new ApiError("This request ID was used for another note.", 409);
    if (error) throw new ApiError("Could not save the support note.", 503);
    return json({ saved: true });
  } catch (error) { return fail(error); }
}
