import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { refreshCompanyFromWebhook } from "@/lib/backend/company-verification";
import { refreshVerificationFromWebhook } from "@/lib/backend/identity-verification";
import { ApiError, fail, json } from "@/lib/backend/server";

export async function POST(request: Request) {
  try {
    const key = process.env.DIDIT_WEBHOOK_SECRET?.trim();
    if (!key) throw new ApiError("Verification is not configured.", 503);
    const timestamp = Number(request.headers.get("x-timestamp"));
    const signature = request.headers.get("x-signature") ?? "";
    if (!Number.isInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300 || !/^[a-f0-9]{64}$/i.test(signature)) {
      throw new ApiError("Invalid notification signature.", 401);
    }
    const body = Buffer.from(await request.arrayBuffer());
    if (body.length > 1_000_000) throw new ApiError("Notification is too large.", 413);
    const expected = createHmac("sha256", key).update(body).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
      throw new ApiError("Invalid notification signature.", 401);
    }
    const event = z.object({ session_id: z.uuid() }).safeParse(JSON.parse(body.toString("utf8")));
    // Fetch the latest provider state. Events can arrive late or out of order.
    if (event.success && !await refreshVerificationFromWebhook(event.data.session_id)) {
      await refreshCompanyFromWebhook(event.data.session_id);
    }
    return json({ received: true });
  } catch (error) { return fail(error); }
}
