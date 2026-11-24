import { z } from "zod";
import type { DemoState } from "../data";
import type { Booking } from "../operations";

const id = z.number().int().positive().max(1e9);
const name = z.string().trim().min(1).max(120);
const time = z.iso.datetime({ offset: true });
const scheduling = { customerId: id, memberId: id, startsAt: time };
export const bookingCommands = {
  saveService: { id: id.optional(), name, duration: z.number().int().min(5).max(1440), priceMinor: z.number().int().min(0).max(1e10), active: z.boolean() },
  scheduleBooking: { serviceId: id, ...scheduling },
  rescheduleBooking: { id, ...scheduling },
  bookingStatus: { id, status: z.enum(["In progress", "Completed", "Cancelled"]) },
};

const bookingInput = z.union([
  z.object({ type: z.literal("saveService"), ...bookingCommands.saveService }).strict(),
  z.object({ type: z.literal("scheduleBooking"), ...bookingCommands.scheduleBooking }).strict(),
  z.object({ type: z.literal("rescheduleBooking"), ...bookingCommands.rescheduleBooking }).strict(),
  z.object({ type: z.literal("bookingStatus"), ...bookingCommands.bookingStatus }).strict(),
]);
export type BookingCommand = z.infer<typeof bookingInput>;

export function applyBooking(state: DemoState, input: unknown) {
  const action = bookingInput.parse(input);
  const operation = state.operations;
  const services = operation.services ??= [];
  const bookings = operation.bookings ??= [];

  if (action.type === "saveService") {
    const { id, name, duration, priceMinor, active } = action;
    const details = { name, duration, priceMinor, active };
    const existing = services.find(service => service.id === id);
    if (id && !existing) throw new Error("Service not found.");
    if (existing) { Object.assign(existing, details); return { id, message: "Service updated." }; }
    const newId = services.reduce((last, service) => Math.max(last, service.id), 0) + 1;
    services.push({ id: newId, ...details });
    return { id: newId, message: "Service saved." };
  }

  const booking = action.type === "scheduleBooking" ? undefined : bookings.find(entry => entry.id === action.id);
  if (action.type === "bookingStatus") {
    if (!booking) throw new Error("Booking not found.");
    const allowed = booking.status === "Scheduled" ? ["In progress", "Cancelled"]
      : booking.status === "In progress" ? ["Completed", "Cancelled"] : [];
    if (!allowed.includes(action.status)) throw new Error("The booking cannot move to this status.");
    booking.status = action.status;
    return { id: booking.id, message: "Booking status saved." };
  }

  const { customerId, memberId, startsAt } = action;
  if (!state.customers.some(customer => customer.id === customerId)) throw new Error("Choose an existing customer.");
  if (!state.members.some(member => member.id === memberId && member.status === "Active")) {
    throw new Error("Choose an active team member.");
  }
  const service = action.type === "scheduleBooking" ? services.find(entry => entry.id === action.serviceId && entry.active) : undefined;
  if (action.type === "scheduleBooking" && !service) throw new Error("Choose an active service.");
  if (action.type === "rescheduleBooking" && booking?.status !== "Scheduled") throw new Error("Choose a scheduled booking to move.");
  const duration = service?.duration ?? booking!.duration;
  const start = Date.parse(startsAt);
  const end = start + duration * 60_000;
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("Choose a valid date and time.");
  if (bookings.some(entry => {
    if (entry.id === booking?.id || entry.memberId !== memberId || !["Scheduled", "In progress"].includes(entry.status)) return false;
    const bookedStart = Date.parse(entry.startsAt);
    return start < bookedStart + entry.duration * 60_000 && end > bookedStart;
  })) throw new Error("This team member already has an overlapping booking.");

  const timeAndPeople = { startsAt: new Date(start).toISOString(), customerId, memberId };
  if (booking) { Object.assign(booking, timeAndPeople); return { id: booking.id, message: "Booking rescheduled." }; }
  const newId = bookings.reduce((last, entry) => Math.max(last, entry.id), 0) + 1;
  const record: Booking = {
    id: newId, serviceId: service!.id, serviceName: service!.name, duration, priceMinor: service!.priceMinor,
    status: "Scheduled", ...timeAndPeople,
  };
  bookings.unshift(record);
  return { id: newId, message: "Booking scheduled." };
}
