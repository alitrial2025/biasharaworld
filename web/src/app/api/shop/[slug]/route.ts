import { createHash } from "node:crypto";
import { z } from "zod";
import { admin, identity, fail, json, ApiError } from "@/lib/backend/server";
import { shopRecord, publicShop } from "@/lib/backend/shop";
import { applyCommand } from "@/lib/backend/commands";
import { splitState } from "@/lib/backend/empty";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    const { slug } = await params;
    const { state } = await shopRecord(slug);
    return json(publicShop(state, slug));
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request, { params }: Context) {
  try {
    const user = await identity(request);
    if (!user.email_confirmed_at)
      throw new ApiError("Confirm your email before ordering.", 403);
    const raw = await request.text();
    if (raw.length > 20000) throw new ApiError("Order is too large.", 413);
    const body = z
      .object({
        requestId: z.uuid(),
        cart: z.record(
          z.string().regex(/^\d+$/),
          z.number().int().min(1).max(10000),
        ),
        address: z.string().trim().min(3).max(500),
      })
      .strict()
      .parse(JSON.parse(raw));
    const shop = await shopRecord((await params).slug, false);
    const hash = createHash("sha256")
      .update(JSON.stringify({ cart: body.cart, address: body.address }))
      .digest("hex");
    const previous = await admin()
      .from("business_commands")
      .select("user_id,command_hash,result")
      .eq("business_id", shop.id)
      .eq("request_id", body.requestId)
      .maybeSingle();
    if (previous.error)
      throw new ApiError("Could not verify this order. Retry safely.", 503);
    if (previous.data) {
      if (
        previous.data.user_id !== user.id ||
        previous.data.command_hash !== hash
      )
        throw new ApiError("Request ID already used.", 409);
      return json(previous.data.result);
    }
    if (!shop.access.featuresUnlocked || !shop.state.operations.shop.published)
      throw new ApiError("This shop is not available for new orders.", 404);
    if (
      Object.keys(body.cart).some(
        (id) => !publicShop(shop.state).products.some((p) => p.id === +id),
      )
    )
      throw new ApiError("Some products are no longer available.");
    let customer = shop.state.customers.find(
      (c) => c.email.toLowerCase() === (user.email || "").toLowerCase(),
    );
    if (!customer) {
      const id = Math.max(0, ...shop.state.customers.map((c) => c.id)) + 1;
      const base = String(
        user.user_metadata?.name || user.email?.split("@")[0] || "Customer",
      ).slice(0, 160);
      customer = {
        id,
        name: shop.state.customers.some((c) => c.name === base)
          ? `${base} (${id})`
          : base,
        email: user.email || "",
        phone: "",
        balance: 0,
        purchases: 0,
        color: "mint",
      };
      shop.state.customers.push(customer);
    }
    const result = applyCommand(
      shop.state,
      {
        type: "placeOrder",
        customer: customer.name,
        cart: body.cart,
        address: body.address,
      },
      "Owner",
    );
    const { business } = splitState(result.state);
    const { data, error } = await admin().rpc("commit_customer_order", {
      p_business: shop.id,
      p_user: user.id,
      p_revision: shop.revision,
      p_request: body.requestId,
      p_hash: hash,
      p_state: business,
      p_order: result.id,
      p_input: { cart: body.cart, address: body.address },
      p_result: {
        id: result.id,
        message:
          "Order sent to the shop. Payment will be arranged with the merchant.",
      },
    });
    if (data?.conflict)
      throw new ApiError("Stock changed. Refresh and review your order.", 409);
    if (error)
      throw new ApiError(
        error.code === "40001"
          ? "Stock changed. Refresh and review your order."
          : "Order unconfirmed. Retry this request safely.",
        error.code === "40001" ? 409 : 503,
      );
    return json(data);
  } catch (e) {
    return fail(e);
  }
}
