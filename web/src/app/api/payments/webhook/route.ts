import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { ApiError, fail, json } from "@/lib/backend/server";
import { paymentReference, reconcilePayment } from "@/lib/backend/payments/customer-orders";
import { paystackConfig } from "@/lib/backend/payments/paystack";

export async function POST(request: Request) {
  try {
    const config = paystackConfig();
    if (!config) throw new ApiError("Online payments are unavailable.", 503);
    const signature = request.headers.get("x-paystack-signature") ?? "";
    if (!/^[a-f0-9]{128}$/i.test(signature)) throw new ApiError("Invalid payment notification.", 401);
    const body = Buffer.from(await request.arrayBuffer());
    if (body.length > 1_000_000) throw new ApiError("Payment notification is too large.", 413);
    const expected = createHmac("sha512", config.key).update(body).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) throw new ApiError("Invalid payment notification.", 401);
    const event = z.object({ event: z.literal("charge.success"), data: z.object({ reference: z.string().regex(paymentReference) }) })
      .safeParse(JSON.parse(body.toString("utf8")));
    if (event.success) await reconcilePayment(event.data.data.reference);
    return json({ received: true });
  } catch (error) { return fail(error); }
}
