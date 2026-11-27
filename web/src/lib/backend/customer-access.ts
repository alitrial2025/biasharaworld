import { createHash } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { admin, ApiError, identity } from "./server";
import { merchantVerificationStatus } from "./merchant-verification";
import { applyBooking } from "./service-bookings";
import { applyIndustryCommand } from "./industry-records";
import { industryFor, type IndustryRecord } from "../industries";
import type { DemoState } from "../data";
import type { Booking, Service } from "../operations";

export type ServiceSlot = {
  id: string;
  service_id: number;
  member_id: number;
  starts_at: string;
  enabled: boolean;
  booked_by: string | null;
  booking_id: number | null;
};
export type EventOffer = {
  show_id: string;
  price_minor: number;
  enabled: boolean;
};
export const slotFields =
  "id,service_id,member_id,starts_at,enabled,booked_by,booking_id";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const accessSector = {
  services: "services",
  events: "entertainment",
  rent: "real-estate",
} as const;
export type CustomerFlow = keyof typeof accessSector;

export async function confirmedCustomer(request: Request) {
  const user = await identity(request);
  if (!user.email || !user.email_confirmed_at)
    throw new ApiError("Confirm your email to continue.", 403);
  return user as User & { email: string };
}

export async function customerBusiness(slug: string, flow: CustomerFlow) {
  const db = admin();
  const business = await db
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (business.error) throw new ApiError("Could not load the business.", 503);
  if (!business.data)
    throw new ApiError("This customer page is unavailable.", 404);
  const id = business.data.id as string;
  const { data, error } = await db
    .from("business_records")
    .select("state,revision")
    .eq("business_id", id)
    .single<{ state: DemoState; revision: number }>();
  if (error) throw new ApiError("Could not load the business.", 503);
  return {
    id,
    ...data,
    active: industryFor(data.state.profile.type).id === accessSector[flow],
  };
}
type Business = Awaited<ReturnType<typeof customerBusiness>>;

export async function requirePublishedMerchant(businessId: string) {
  if ((await merchantVerificationStatus(businessId)) !== "verified")
    throw new ApiError(
      "This business must complete merchant verification before accepting new customers.",
      403,
    );
}

export async function sectorRecords(
  businessId: string,
  sector: "entertainment" | "real-estate",
) {
  const { data, error } = await admin()
    .from("industry_workspaces")
    .select("revision,records")
    .eq("business_id", businessId)
    .eq("sector", sector)
    .maybeSingle<{ revision: number; records: IndustryRecord[] }>();
  if (error) throw new ApiError("Could not load the linked records.", 503);
  return data ?? { revision: 0, records: [] };
}

export function slotAvailable(
  slot: Pick<ServiceSlot, "starts_at" | "member_id">,
  service: Service,
  bookings: Booking[],
) {
  const start = Date.parse(slot.starts_at);
  const end = start + service.duration * 60_000;
  return (
    start > Date.now() &&
    !bookings.some((booking) => {
      if (
        booking.memberId !== slot.member_id ||
        !["Scheduled", "In progress"].includes(booking.status)
      )
        return false;
      const existing = Date.parse(booking.startsAt);
      return start < existing + booking.duration * 60_000 && existing < end;
    })
  );
}

export async function publicServices(business: Business, user?: User) {
  const db = admin();
  const [slots, claimed, verification] = await Promise.all([
    db
      .from("customer_service_slots")
      .select(slotFields)
      .eq("business_id", business.id)
      .eq("enabled", true)
      .is("booking_id", null)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(150)
      .returns<ServiceSlot[]>(),
    user
      ? db
          .from("customer_service_slots")
          .select("booking_id")
          .eq("business_id", business.id)
          .eq("booked_by", user.id)
          .order("starts_at", { ascending: false })
          .limit(100)
      : null,
    merchantVerificationStatus(business.id),
  ]);
  if (slots.error || claimed?.error)
    throw new ApiError("Could not load the appointment calendar.", 503);
  const services = new Map(
    business.state.operations.services
      ?.filter((item) => item.active)
      .map((item) => [item.id, item]),
  );
  const staff = new Set(
    business.state.members
      .filter((member) => member.status === "Active")
      .map((member) => member.id),
  );
  const bookings = business.state.operations.bookings ?? [];
  const owned = new Set(claimed?.data?.map((item) => item.booking_id));
  const published =
    business.active && verification === "verified" && !!slots.data?.length;
  return {
    business: published || owned.size ? business.state.profile.business : "",
    slots: published
      ? (slots.data ?? []).flatMap((slot) => {
          const service = services.get(slot.service_id);
          return service &&
            staff.has(slot.member_id) &&
            slotAvailable(slot, service, bookings)
            ? [
                {
                  id: slot.id,
                  startsAt: slot.starts_at,
                  name: service.name,
                  duration: service.duration,
                  price: service.priceMinor,
                },
              ]
            : [];
        })
      : [],
    bookings: bookings
      .filter((booking) => owned.has(booking.id))
      .map((booking) => ({
        id: booking.id,
        name: booking.serviceName,
        startsAt: booking.startsAt,
        status: booking.status,
        price: booking.priceMinor,
      })),
  };
}

export async function bookPublicSlot(
  business: Business,
  user: User & { email: string },
  id: string,
  expectedPrice: number,
  expectedDuration: number,
) {
  const { data: slot, error } = await admin()
    .from("customer_service_slots")
    .select(slotFields)
    .eq("business_id", business.id)
    .eq("id", id)
    .maybeSingle<ServiceSlot>();
  if (error) throw new ApiError("Could not load the appointment time.", 503);
  if (slot?.booking_id && slot.booked_by === user.id)
    return { id: slot.booking_id };
  if (
    !slot?.enabled ||
    slot.booking_id ||
    Date.parse(slot.starts_at) <= Date.now()
  )
    throw new ApiError(
      "This time is unavailable. Choose another appointment.",
      409,
    );
  await requirePublishedMerchant(business.id);
  const state = business.state;
  const service = state.operations.services?.find(
    (item) => item.id === slot.service_id && item.active,
  );
  if (
    !service ||
    service.priceMinor !== expectedPrice ||
    service.duration !== expectedDuration
  )
    throw new ApiError(
      "Service details changed. Refresh and review the appointment.",
      409,
    );
  let customer = state.customers.find(
    (item) => item.email.toLowerCase() === user.email.toLowerCase(),
  );
  if (!customer) {
    const id =
      state.customers.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    const name =
      String(user.user_metadata?.name || user.email.split("@")[0])
        .trim()
        .slice(0, 120) || "Customer";
    customer = {
      id,
      name: state.customers.some((item) => item.name === name)
        ? `${name} (${id})`
        : name,
      email: user.email,
      phone: "",
      balance: 0,
      purchases: 0,
      color: "mint",
    };
    state.customers.push(customer);
  }
  const scheduled = applyBooking(state, {
    type: "scheduleBooking",
    serviceId: slot.service_id,
    customerId: customer.id,
    memberId: slot.member_id,
    startsAt: new Date(slot.starts_at).toISOString(),
  });
  const result = await admin().rpc("claim_public_service_slot", {
    target_business: business.id,
    expected_type: state.profile.type,
    expected_revision: business.revision,
    target_slot: id,
    customer_user: user.id,
    next_state: state,
    new_booking: scheduled.id,
  });
  if (result.error)
    throw new ApiError(
      "Could not confirm the appointment. Retry this time.",
      503,
    );
  if (!result.data)
    throw new ApiError(
      "Availability changed. Refresh and check the calendar.",
      409,
    );
  return { id: result.data };
}

export function activeShow(
  records: IndustryRecord[],
  showId: string,
  now: number,
) {
  const show = records.find(
    (row) => row.id === showId && row.module === "showtimes",
  );
  if (
    !show ||
    !["Scheduled", "Admission open"].includes(show.status) ||
    Date.parse(String(show.values.end)) <= now
  )
    return null;
  const event = records.find(
    (row) =>
      row.id === show.values.event &&
      row.module === "events" &&
      row.status === "Scheduled",
  );
  return event ? { show, event } : null;
}
const holdsSeat = (row: IndustryRecord, now: string) =>
  row.module === "tickets" &&
  (["Issued", "Checked in"].includes(row.status) ||
    (row.status === "Reserved" && (row.expiresAt ?? "") > now));

export async function publicEvents(business: Business, user?: User) {
  const [industry, offers, verification] = await Promise.all([
    sectorRecords(business.id, "entertainment"),
    admin()
      .from("customer_event_offers")
      .select("show_id,price_minor,enabled")
      .eq("business_id", business.id)
      .eq("enabled", true)
      .returns<EventOffer[]>(),
    merchantVerificationStatus(business.id),
  ]);
  if (offers.error)
    throw new ApiError("Could not load published showtimes.", 503);
  const now = new Date();
  const records = industry.records;
  const byId = new Map(records.map((row) => [row.id, row]));
  const taken = new Set(
    records
      .filter((row) => holdsSeat(row, now.toISOString()))
      .map((row) => row.values.seat),
  );
  const shows =
    business.active && verification === "verified"
      ? (offers.data ?? []).flatMap((offer) => {
          const details = activeShow(records, offer.show_id, now.getTime());
          if (!details) return [];
          return [
            {
              id: offer.show_id,
              event: details.event.name,
              venue: String(details.event.values.venue),
              show: details.show.name,
              startsAt: String(details.show.values.start),
              price: offer.price_minor,
              seats: records
                .filter(
                  (row) =>
                    row.module === "seats" &&
                    row.values.show === offer.show_id &&
                    row.status === "Available" &&
                    !taken.has(row.id),
                )
                .map((row) => ({
                  id: row.id,
                  name: row.name,
                  section: String(row.values.section),
                })),
            },
          ];
        })
      : [];
  const tickets = user
    ? records
        .filter(
          (row) =>
            row.module === "tickets" &&
            row.createdBy === user.id &&
            row.values.publicReservation === 1,
        )
        .map((row) => {
          const seat = byId.get(String(row.values.seat));
          const show = byId.get(String(seat?.values.show));
          const event = byId.get(String(show?.values.event));
          const status =
            row.status === "Reserved" &&
            (row.expiresAt ?? "") <= now.toISOString()
              ? "Expired"
              : row.status;
          return {
            id: row.id,
            event: event?.name ?? "Event",
            seat: seat?.name ?? "",
            section: String(seat?.values.section ?? ""),
            startsAt: String(show?.values.start ?? ""),
            venue: String(event?.values.venue ?? ""),
            status,
            price: Number(row.values.amount),
            expiresAt: row.expiresAt,
            code: ["Issued", "Checked in"].includes(status)
              ? row.code
              : undefined,
          };
        })
        .slice(0, 100)
    : [];
  return {
    business:
      shows.length || tickets.length ? business.state.profile.business : "",
    shows,
    tickets,
  };
}

export async function reservePublicTicket(
  business: Business,
  user: User,
  seatId: string,
  requestId: string,
  expectedPrice: number,
) {
  const db = admin();
  const hash = digest(`public-ticket:${seatId}:${expectedPrice}`);
  const previous = await db
    .from("industry_workspace_actions")
    .select("actor,command_hash,record_id")
    .eq("business_id", business.id)
    .eq("request_id", requestId)
    .maybeSingle();
  if (previous.error)
    throw new ApiError("Could not check the ticket request.", 503);
  if (previous.data) {
    if (previous.data.actor !== user.id || previous.data.command_hash !== hash)
      throw new ApiError("This request was already used.", 409);
    return { id: previous.data.record_id };
  }
  await requirePublishedMerchant(business.id);
  const industry = await sectorRecords(business.id, "entertainment");
  const seat = industry.records.find(
    (row) => row.id === seatId && row.module === "seats",
  );
  if (!seat) throw new ApiError("This seat is unavailable.", 404);
  const showId = String(seat.values.show);
  const { data: offer, error } = await db
    .from("customer_event_offers")
    .select("show_id,price_minor,enabled")
    .eq("business_id", business.id)
    .eq("show_id", showId)
    .eq("enabled", true)
    .maybeSingle<EventOffer>();
  if (error) throw new ApiError("Could not load this ticket offer.", 503);
  if (!offer) throw new ApiError("This showtime is unavailable.", 404);
  if (offer.price_minor !== expectedPrice)
    throw new ApiError(
      "The ticket price changed. Refresh and review the offer.",
      409,
    );
  const now = new Date();
  const showSeats = new Set(
    industry.records
      .filter((row) => row.module === "seats" && row.values.show === showId)
      .map((row) => row.id),
  );
  if (
    industry.records.filter(
      (row) =>
        row.createdBy === user.id &&
        showSeats.has(String(row.values.seat)) &&
        holdsSeat(row, now.toISOString()),
    ).length >= 6
  )
    throw new ApiError(
      "This account already holds six tickets for this showtime.",
      409,
    );
  const sector = industryFor("entertainment");
  const reserved = applyIndustryCommand(
    sector,
    industry.records,
    {
      action: "create",
      sector: sector.id,
      requestId,
      module: "tickets",
      name: `Guest booking ${requestId.slice(0, 8)}`,
      values: {
        seat: seatId,
        guest:
          String(user.user_metadata?.name || "Online guest")
            .trim()
            .slice(0, 120) || "Online guest",
        amount: offer.price_minor,
      },
    },
    user.id,
    "Customer",
    now,
  );
  reserved.record.values.publicReservation = 1;
  const current =
    offer.price_minor === 0
      ? applyIndustryCommand(
          sector,
          reserved.records,
          {
            action: "transition",
            sector: sector.id,
            requestId,
            id: reserved.record.id,
            from: "Reserved",
            status: "Issued",
          },
          user.id,
          "Customer",
          now,
        )
      : reserved;
  const saved = await db.rpc("commit_public_ticket", {
    target_business: business.id,
    expected_type: business.state.profile.type,
    expected_revision: industry.revision,
    customer_user: user.id,
    target_show: showId,
    price: offer.price_minor,
    request_id: requestId,
    request_hash: hash,
    target_ticket: current.record.id,
    next_records: current.records,
  });
  if (saved.error)
    throw new ApiError("Could not confirm the ticket. Retry this seat.", 503);
  if (!saved.data)
    throw new ApiError(
      "Seat availability changed. Refresh and choose a seat.",
      409,
    );
  return { id: saved.data };
}

export async function rentReceipt(
  business: Business,
  user: User & { email: string },
  token: string,
) {
  const { data, error } = await admin()
    .from("customer_rent_links")
    .select("rent_id")
    .eq("business_id", business.id)
    .eq("token_hash", digest(token))
    .eq("recipient_email", user.email.toLowerCase())
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new ApiError("Could not check this receipt.", 503);
  if (!data) throw new ApiError("Receipt unavailable for this account.", 404);
  const { records } = await sectorRecords(business.id, "real-estate");
  const rent = records.find(
    (row) =>
      row.id === data.rent_id &&
      row.module === "rent" &&
      row.status === "Received",
  );
  if (!rent?.values.payment)
    throw new ApiError("Receipt unavailable for this account.", 404);
  const lease = records.find(
    (row) => row.id === rent.values.lease && row.module === "leases",
  );
  const property = records.find(
    (row) => row.id === lease?.values.property && row.module === "properties",
  );
  return {
    business: business.state.profile.business,
    reference: rent.name,
    amount: Number(rent.values.amount),
    recordedAt: rent.updatedAt,
    unit: property?.name ?? "",
    paymentReference: String(rent.values.payment),
  };
}
