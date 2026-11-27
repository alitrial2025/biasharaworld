import { z } from "zod";
import {
  bookPublicSlot,
  confirmedCustomer,
  customerBusiness,
  publicEvents,
  publicServices,
  rentReceipt,
  reservePublicTicket,
} from "@/lib/backend/customer-access";
import { ApiError, fail, json } from "@/lib/backend/server";

type Context = { params: Promise<{ slug: string }> };
const flow = z.enum(["services", "events", "rent"]);
const price = z.number().int().min(0).max(1e12);
const booking = z
  .object({
    slot: z.uuid(),
    price,
    duration: z.number().int().min(5).max(1440),
  })
  .strict();
const ticket = z
  .object({ seat: z.uuid(), requestId: z.uuid(), price })
  .strict();

export async function GET(request: Request, { params }: Context) {
  try {
    const query = new URL(request.url).searchParams;
    const kind = flow.parse(query.get("flow"));
    const user =
      kind === "rent" || request.headers.has("authorization")
        ? await confirmedCustomer(request)
        : undefined;
    const business = await customerBusiness((await params).slug, kind);
    if (kind === "rent") {
      const token = z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(query.get("token"));
      return json(await rentReceipt(business, user!, token));
    }
    return json(
      await (kind === "services"
        ? publicServices(business, user)
        : publicEvents(business, user)),
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, { params }: Context) {
  try {
    const kind = z
      .enum(["services", "events"])
      .parse(new URL(request.url).searchParams.get("flow"));
    const user = await confirmedCustomer(request);
    const payload = await request.text();
    if (payload.length > 2000)
      throw new ApiError("This request is too large.", 413);
    const business = await customerBusiness((await params).slug, kind);
    if (!business.active)
      throw new ApiError("This customer page is unavailable.", 404);
    if (kind === "services") {
      const input = booking.parse(JSON.parse(payload));
      return json(
        await bookPublicSlot(
          business,
          user,
          input.slot,
          input.price,
          input.duration,
        ),
      );
    }
    const input = ticket.parse(JSON.parse(payload));
    return json(
      await reservePublicTicket(
        business,
        user,
        input.seat,
        input.requestId,
        input.price,
      ),
    );
  } catch (error) {
    return fail(error);
  }
}
