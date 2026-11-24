import { z } from "zod";
import { reconcilePayment } from "@/lib/backend/payments/customer-orders";
import { admin, ApiError, fail, identity, json, loadBusiness } from "@/lib/backend/server";

const pageSize = 40;
const orderId = z.number().int().positive().max(1e9);
const filters = z.object({
  status: z.enum(["all", "pending", "confirmed"]).default("all"),
  order: z.string().regex(/^\d{1,10}$/).transform(Number).pipe(orderId).optional(),
  before: z.string().regex(/^\d{1,10}$/).transform(Number).pipe(orderId).optional(),
});

async function merchant(request: Request) {
  const workspace = await loadBusiness(await identity(request));
  if (!workspace || !["Owner", "Manager"].includes(workspace.role)) {
    throw new ApiError("Only owners and managers can view payment activity.", 403);
  }
  return workspace.businessId;
}

export async function GET(request: Request) {
  try {
    const businessId = await merchant(request);
    const { status, order, before } = filters.parse(Object.fromEntries(new URL(request.url).searchParams));
    let query = admin().from("customer_order_payments")
      .select("order_id,reference,amount_minor,channel,receipt_id,paid_at,created_at")
      .eq("business_id", businessId).order("order_id", { ascending: false }).limit(pageSize + 1);
    if (status === "pending") query = query.is("paid_at", null);
    if (status === "confirmed") query = query.not("paid_at", "is", null);
    if (order) query = query.eq("order_id", order);
    if (before) query = query.lt("order_id", before);
    const { data, error } = await query;
    if (error) throw new ApiError("Could not load payment activity.", 503);
    const entries = data.slice(0, pageSize);
    return json({ entries, next: data.length > pageSize ? entries.at(-1)?.order_id : null });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const businessId = await merchant(request);
    const { order } = z.object({ order: orderId }).strict().parse(await request.json());
    const { data, error } = await admin().from("customer_order_payments").select("reference,paid_at")
      .eq("business_id", businessId).eq("order_id", order).maybeSingle();
    if (error) throw new ApiError("Could not check this payment.", 503);
    if (!data) throw new ApiError("Payment not found.", 404);
    if (!data.paid_at) await reconcilePayment(data.reference);
    return json({ checked: true });
  } catch (error) { return fail(error); }
}
