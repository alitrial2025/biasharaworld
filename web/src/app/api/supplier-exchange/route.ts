import { z } from "zod";
import type { ExchangeAction, SupplierExchange, SupplierProfile } from "@/lib/supplier-exchange";
import { merchantVerificationStatus } from "@/lib/backend/merchant-verification";
import { receiveSupplierStock, stockIntake } from "@/lib/backend/supplier-stock";
import { admin, ApiError, fail, identity, json, loadBusiness } from "@/lib/backend/server";

const text = z.string().trim().min(1).max(120);
const note = z.string().trim().max(1000).default("");
const minor = z.number().int().min(0).max(1e10);
const catalogueItem = z.object({ item: text, unit: text, unitMinor: minor }).strict();
const requested = z.object({ item: text, unit: text, quantity: z.number().int().positive().max(1e5) }).strict();
const offered = requested.extend({ unitMinor: minor });
const exchangeId = { id: z.uuid(), requestId: z.uuid() };
const step = { ...exchangeId, version: z.number().int().positive().max(1e9), note };
const dataShape = z.union([
  stockIntake,
  z.object({ action: z.literal("profile"), visible: z.literal(false) }).strict(),
  z.object({ action: z.literal("profile"), visible: z.literal(true), coverage: text, terms: note,
    leadDays: z.number().int().min(0).max(365), minimumMinor: minor, catalogue: z.array(catalogueItem).max(20) }).strict(),
  z.object({ action: z.literal("request"), ...exchangeId, supplierId: z.uuid(), lines: z.array(requested).min(1).max(20), note }).strict(),
  z.object({ action: z.literal("quote"), ...step, deliveryFeeMinor: minor, lines: z.array(offered).min(1).max(20) }).strict(),
  z.object({ action: z.literal("dispatch"), ...step, dispatchReference: text }).strict(),
  z.object({ action: z.literal("receive"), ...step, proofReference: text }).strict(),
  z.object({ action: z.literal("dispute"), ...step, note: z.string().trim().min(1).max(1000) }).strict(),
  z.object({ action: z.literal("invoice"), ...step, invoiceReference: text, dueOn: z.iso.date() }).strict(),
  z.object({ action: z.literal("record_payment"), ...step, paymentReference: text }).strict(),
  z.object({ action: z.enum(["decline", "accept", "cancel"]), ...step }).strict(),
]);

const columns = "id,buyer_id,buyer_name,supplier_name,status,requested_lines,offered_lines,quote_minor,delivery_fee_minor,invoice_reference,due_on,version,updated_at";
type Stored = Omit<SupplierExchange, "side" | "actions"> & { buyer_id: string };

function actionList(status: SupplierExchange["status"], buyer: boolean): ExchangeAction[] {
  switch (status) {
    case "requested": return buyer ? ["cancel"] : ["quote", "decline"];
    case "quoted": return buyer ? ["accept", "cancel"] : ["quote", "decline"];
    case "ordered":
    case "disputed": return buyer ? [] : ["dispatch"];
    case "dispatched": return buyer ? ["receive", "dispute"] : [];
    case "received": return buyer ? [] : ["invoice"];
    case "invoiced": return buyer ? ["record_payment"] : [];
    default: return [];
  }
}

function visibleExchange({ buyer_id, ...record }: Stored, workspaceId: string): SupplierExchange {
  const buyer = buyer_id === workspaceId;
  return { ...record, side: buyer ? "buyer" : "supplier", actions: actionList(record.status, buyer) };
}

async function merchant(request: Request) {
  const user = await identity(request);
  const workspace = await loadBusiness(user);
  if (!workspace || !["Owner", "Manager"].includes(workspace.role)) {
    throw new ApiError("Only owners and managers can use the supplier network.", 403);
  }
  return { user, workspace };
}

export async function GET(request: Request) {
  try {
    const { workspace: { businessId } } = await merchant(request);
    const { search, supplierAfter, page, exchange } = z.object({
      search: z.string().trim().max(120).default(""),
      supplierAfter: z.uuid().optional(),
      page: z.string().regex(/^\d{1,4}$/).transform(Number).default(0),
      exchange: z.uuid().optional(),
    }).strict().parse(Object.fromEntries(new URL(request.url).searchParams));
    const db = admin();
    const participation = db.from("supplier_exchanges").select(columns)
      .or(`buyer_id.eq.${businessId},supplier_id.eq.${businessId}`);
    if (exchange) {
      const { data, error } = await participation.eq("id", exchange).maybeSingle<Stored>();
      if (error) throw new ApiError("Could not load this exchange.", 503);
      if (!data) throw new ApiError("Exchange not found.", 404);
      const history = await db.from("supplier_exchange_events").select("actor_business,action,payload,recorded_at")
        .eq("exchange_id", exchange).order("version", { ascending: false }).limit(50);
      if (history.error) throw new ApiError("Could not load the exchange history.", 503);
      const events = history.data.map(({ payload, action, actor_business, recorded_at }) => ({
        action, recorded_at, side: actor_business === data.buyer_id ? "buyer" : "supplier", note: payload.note,
        dispatchReference: payload.dispatchReference, proofReference: payload.proofReference, paymentReference: payload.paymentReference,
      }));
      const stock = data.buyer_id === businessId ? await db.from("supplier_stock_receipts")
        .select("branch,recorded_at").eq("business_id", businessId).eq("exchange_id", exchange).maybeSingle() : null;
      if (stock?.error) throw new ApiError("Could not check the inventory receipt.", 503);
      return json({ exchange: visibleExchange(data, businessId), events, stockReceipt: stock?.data ?? null });
    }
    const [profile, directory, exchanges, verification] = await Promise.all([
      db.from("supplier_profiles").select("*").eq("business_id", businessId).maybeSingle<SupplierProfile>(),
      db.rpc("list_verified_suppliers", { search_text: search, excluded_business: businessId, after_id: supplierAfter ?? null }),
      participation.order("updated_at", { ascending: false }).order("id", { ascending: false }).range(page * 30, page * 30 + 30).returns<Stored[]>(),
      merchantVerificationStatus(businessId),
    ]);
    if (profile.error || directory.error || exchanges.error) throw new ApiError("Could not load the supplier network.", 503);
    const suppliers = (directory.data as SupplierProfile[]).slice(0, 30);
    return json({
      profile: profile.data, suppliers, nextSupplier: directory.data.length > 30 ? suppliers.at(-1)?.business_id : null,
      exchanges: exchanges.data.slice(0, 30).map(value => visibleExchange(value, businessId)),
      nextPage: exchanges.data.length > 30 ? page + 1 : null, verified: verification === "verified",
    });
  } catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await merchant(request);
    const raw = await request.text();
    if (raw.length > 30_000) throw new ApiError("This exchange request is too large.", 413);
    const input = dataShape.parse(JSON.parse(raw));
    if (input.action === "receive_stock") {
      await receiveSupplierStock(input, workspace, user.id);
      return json({ id: input.id, stocked: true });
    }
    const db = admin();
    if (input.action === "profile") {
      if (workspace.role !== "Owner") throw new ApiError("Only the owner can publish a supplier profile.", 403);
      const { error } = await db.rpc("save_supplier_profile", { target_business: workspace.businessId, actor: user.id, profile: input });
      if (error?.code === "42501") throw new ApiError("Complete merchant verification before publishing a supplier profile.", 403);
      if (error) throw new ApiError("Could not save your supplier profile.", 503);
      return json({ saved: true });
    }
    if (input.action === "quote") {
      const amount = input.lines.reduce((sum, line) => sum + line.unitMinor * line.quantity, input.deliveryFeeMinor);
      if (amount < 1 || amount > 1e12) throw new ApiError("The quote total must be greater than zero and within the supported KES range.", 400);
    }
    const { id, requestId, action, ...details } = input;
    const version = input.action === "request" ? 0 : input.version;
    const { data, error } = await db.rpc("advance_supplier_exchange", {
      actor_business: workspace.businessId, actor: user.id, exchange: id, request_key: requestId,
      expected_version: version, action_name: action, input: details,
    });
    if (error?.code === "P0002") throw new ApiError("This exchange or supplier listing is unavailable.", 404);
    if (error?.code === "42501") throw new ApiError("Check your team access and both businesses’ verification before confirming a new purchase.", 403);
    if (error?.code === "40001" || error?.code === "23505") throw new ApiError("This exchange changed. Reload it before trying again.", 409);
    if (error?.code === "22023") throw new ApiError("This action is unavailable at the current exchange status.", 409);
    if (error) throw new ApiError("Could not save this exchange. Retry the same request.", 503);
    return json({ id, version: data });
  } catch (error) { return fail(error); }
}
