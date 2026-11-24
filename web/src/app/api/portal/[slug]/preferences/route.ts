import { z } from "zod";
import { admin, ApiError, fail, identity, json } from "@/lib/backend/server";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await identity(request);
    if (!user.email_confirmed_at) throw new ApiError("Confirm your email first.", 403);
    const raw = await request.text();
    if (raw.length > 1_000) throw new ApiError("This preference request is too large.", 413);
    const input = z.object({ id: z.uuid(), emailOptIn: z.boolean() }).strict().parse(JSON.parse(raw));
    const db = admin();
    const business = await db.from("businesses").select("id").eq("slug", (await params).slug).maybeSingle();
    if (business.error) throw new ApiError("Could not find the business.", 503);
    if (!business.data) throw new ApiError("Business not found.", 404);
    const { error } = await db.rpc("record_customer_marketing_preference", {
      target_business: business.data.id, actor: user.id, request_id: input.id, opted_in: input.emailOptIn,
    });
    if (error?.code === "42501") throw new ApiError("A verified customer account is required.", 403);
    if (error?.code === "23505") throw new ApiError("This request ID was used for another preference.", 409);
    if (error) throw new ApiError("Could not save marketing preferences.", 503);
    const latest = await db.from("customer_marketing_events").select("email_opt_in")
      .eq("business_id", business.data.id).eq("customer_user", user.id)
      .order("recorded_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle();
    if (latest.error || !latest.data) throw new ApiError("Could not confirm marketing preferences.", 503);
    return json({ emailOptIn: latest.data.email_opt_in });
  } catch (error) { return fail(error); }
}
