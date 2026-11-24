import { z } from "zod";
import { fail, identity, json } from "@/lib/backend/server";
import { customerOrderPayment } from "@/lib/backend/payments/customer-orders";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const user = await identity(request);
    const { orderId, action } = z.object({ orderId: z.number().int().positive().max(1e9), action: z.enum(["start", "refresh"]) }).strict().parse(await request.json());
    return json(await customerOrderPayment(user, (await params).slug, orderId, action));
  } catch (error) { return fail(error); }
}
