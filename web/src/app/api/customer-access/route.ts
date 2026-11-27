import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  accessSector,
  activeShow,
  digest,
  requirePublishedMerchant,
  sectorRecords,
  slotAvailable,
} from "@/lib/backend/customer-access";
import {
  admin,
  ApiError,
  fail,
  identity,
  json,
  loadBusiness,
} from "@/lib/backend/server";
import { industryFor } from "@/lib/industries";

const payload = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("addSlot"),
      serviceId: z.number().int().positive(),
      memberId: z.number().int().positive(),
      startsAt: z.iso.datetime({ offset: true }),
    })
    .strict(),
  z.object({ action: z.literal("closeSlot"), id: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("publishShow"),
      showId: z.uuid(),
      price: z.number().int().min(0).max(1e12),
    })
    .strict(),
  z.object({ action: z.literal("hideShow"), showId: z.uuid() }).strict(),
  z
    .object({
      action: z.literal("issueReceiptLink"),
      rentId: z.uuid(),
      email: z.string().trim().email().max(254),
    })
    .strict(),
  z
    .object({ action: z.literal("revokeReceiptLink"), rentId: z.uuid() })
    .strict(),
]);

async function access(request: Request) {
  const workspace = await loadBusiness(await identity(request));
  if (!workspace || !["Owner", "Manager"].includes(workspace.role))
    throw new ApiError("An owner or manager can manage customer access.", 403);
  const sector = industryFor(workspace.state.profile.type).id;
  const flow = (
    Object.keys(accessSector) as Array<keyof typeof accessSector>
  ).find((flow) => accessSector[flow] === sector);
  if (!flow)
    throw new ApiError(
      "Customer access is unavailable for this business type.",
      404,
    );
  return { workspace, flow };
}

export async function GET(request: Request) {
  try {
    const { workspace, flow } = await access(request);
    const db = admin();
    const base = { flow, slug: workspace.slug };
    if (flow === "services") {
      const result = await db
        .from("customer_service_slots")
        .select("id,service_id,member_id,starts_at,enabled,booking_id")
        .eq("business_id", workspace.businessId)
        .gt("starts_at", new Date().toISOString())
        .eq("enabled", true)
        .order("starts_at")
        .limit(200);
      if (result.error)
        throw new ApiError("Could not load published appointment times.", 503);
      return json({
        ...base,
        slots: (result.data ?? []).map((slot) => ({
          ...slot,
          starts_at: new Date(slot.starts_at).toISOString(),
        })),
        services:
          workspace.state.operations.services?.filter(
            (service) => service.active,
          ) ?? [],
        staff: workspace.state.members
          .filter((member) => member.status === "Active")
          .map(({ id, name }) => ({ id, name })),
      });
    }
    if (flow === "events") {
      const [{ records }, offers] = await Promise.all([
        sectorRecords(workspace.businessId, "entertainment"),
        db
          .from("customer_event_offers")
          .select("show_id,price_minor,enabled")
          .eq("business_id", workspace.businessId),
      ]);
      if (offers.error)
        throw new ApiError("Could not load published showtimes.", 503);
      const seats = new Set(
        records
          .filter((row) => row.module === "seats" && row.status === "Available")
          .map((row) => row.values.show),
      );
      return json({
        ...base,
        offers: offers.data,
        shows: records.flatMap((row) =>
          row.module === "showtimes" &&
          seats.has(row.id) &&
          activeShow(records, row.id, Date.now())
            ? [{ id: row.id, name: row.name, startsAt: row.values.start }]
            : [],
        ),
      });
    }
    const [{ records }, links] = await Promise.all([
      sectorRecords(workspace.businessId, "real-estate"),
      db
        .from("customer_rent_links")
        .select("rent_id,expires_at")
        .eq("business_id", workspace.businessId),
    ]);
    if (links.error) throw new ApiError("Could not load receipt links.", 503);
    return json({
      ...base,
      links: links.data,
      records: records
        .filter(
          (row) =>
            row.module === "rent" && ["Due", "Received"].includes(row.status),
        )
        .map((row) => ({
          id: row.id,
          reference: row.name,
          status: row.status,
          amount: Number(row.values.amount),
          due: String(row.values.due),
        })),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const { workspace, flow } = await access(request);
    const business = workspace.businessId;
    const db = admin();
    const raw = await request.text();
    if (raw.length > 2000)
      throw new ApiError("This request is too large.", 413);
    const input = payload.parse(JSON.parse(raw));
    if (flow === "services" && input.action === "addSlot") {
      await requirePublishedMerchant(business);
      const service = workspace.state.operations.services?.find(
        (row) => row.id === input.serviceId && row.active,
      );
      const validMember = workspace.state.members.some(
        (row) => row.id === input.memberId && row.status === "Active",
      );
      if (!service || !validMember)
        throw new ApiError("Choose an active service and team member.");
      const date = new Date(input.startsAt).toISOString();
      if (
        !slotAvailable(
          { starts_at: date, member_id: input.memberId },
          service,
          workspace.state.operations.bookings ?? [],
        )
      )
        throw new ApiError(
          "Choose a future time when this team member is available.",
          409,
        );
      const result = await db.from("customer_service_slots").insert({
        business_id: business,
        service_id: input.serviceId,
        member_id: input.memberId,
        starts_at: date,
      });
      if (result.error?.code === "23505")
        throw new ApiError(
          "This team member already has a public slot at that time.",
          409,
        );
      if (result.error)
        throw new ApiError("Could not publish this appointment time.", 503);
    } else if (flow === "services" && input.action === "closeSlot") {
      const result = await db
        .from("customer_service_slots")
        .update({ enabled: false })
        .eq("business_id", business)
        .eq("id", input.id)
        .is("booking_id", null)
        .select("id");
      if (result.error)
        throw new ApiError("Could not close this appointment time.", 503);
      if (!result.data?.length)
        throw new ApiError("This time may already have been booked.", 409);
    } else if (flow === "events" && input.action === "publishShow") {
      await requirePublishedMerchant(business);
      const { records } = await sectorRecords(business, "entertainment");
      if (
        !activeShow(records, input.showId, Date.now()) ||
        !records.some(
          (row) =>
            row.module === "seats" &&
            row.values.show === input.showId &&
            row.status === "Available",
        )
      )
        throw new ApiError(
          "Choose an active showtime with seats in service.",
          409,
        );
      const result = await db.from("customer_event_offers").upsert(
        {
          business_id: business,
          show_id: input.showId,
          price_minor: input.price,
          enabled: true,
        },
        { onConflict: "business_id,show_id" },
      );
      if (result.error)
        throw new ApiError("Could not publish this showtime.", 503);
    } else if (flow === "events" && input.action === "hideShow") {
      const result = await db
        .from("customer_event_offers")
        .update({ enabled: false })
        .eq("business_id", business)
        .eq("show_id", input.showId);
      if (result.error) throw new ApiError("Could not close this offer.", 503);
    } else if (flow === "rent" && input.action === "issueReceiptLink") {
      await requirePublishedMerchant(business);
      const { records } = await sectorRecords(business, "real-estate");
      const rent = records.find(
        (row) =>
          row.id === input.rentId &&
          row.module === "rent" &&
          row.status === "Received",
      );
      if (!rent?.values.payment)
        throw new ApiError(
          "Record the received rent and payment reference before sharing a receipt.",
          409,
        );
      const token = randomBytes(32).toString("hex");
      const result = await db.from("customer_rent_links").upsert(
        {
          business_id: business,
          rent_id: input.rentId,
          token_hash: digest(token),
          recipient_email: input.email.toLowerCase(),
          expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
        },
        { onConflict: "business_id,rent_id" },
      );
      if (result.error)
        throw new ApiError("Could not create a receipt link.", 503);
      return json({ path: `/portal/${workspace.slug}/rent/${token}` });
    } else if (flow === "rent" && input.action === "revokeReceiptLink") {
      const result = await db
        .from("customer_rent_links")
        .delete()
        .eq("business_id", business)
        .eq("rent_id", input.rentId);
      if (result.error)
        throw new ApiError("Could not revoke this receipt link.", 503);
    } else {
      throw new ApiError(
        "This action is unavailable for your business type.",
        403,
      );
    }
    return json({ saved: true });
  } catch (error) {
    return fail(error);
  }
}
