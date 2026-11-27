"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, PageHeading, SelectField } from "@/components/ui";
import type { Booking, Service } from "@/lib/operations";
import { bookingNeedsAttention } from "@/lib/workspace-activity";
import { cash, localDate } from "@/lib/operations";
import { kesMinor } from "@/lib/settlements";
import { industryFor } from "@/lib/industries";
import { useDemo } from "@/lib/store";

const kenya = new Intl.DateTimeFormat("en-KE", {
  timeZone: "Africa/Nairobi",
  dateStyle: "medium",
  timeStyle: "short",
});
const toBookingInput = (date: string) =>
  new Date(Date.parse(date) + 3 * 3_600_000).toISOString().slice(0, 16);

export function ServiceBookingsPage({
  todayOnly = false,
}: {
  todayOnly?: boolean;
}) {
  const { store, state } = useDemo();
  const [service, selectService] = useState<Service | "new" | null>(null);
  const [booking, selectBooking] = useState<Booking | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(30);
  if (!["Owner", "Manager"].includes(store.workspace?.role ?? "")) {
    return (
      <PageHeading
        title="Services and bookings"
        description="An owner or manager can manage the service schedule."
      />
    );
  }
  const services = state.operations.services ?? [];
  const today = localDate();
  const bookings = (state.operations.bookings ?? [])
    .filter((item) => !todayOnly || bookingNeedsAttention(item, today))
    .sort((a, b) =>
      todayOnly
        ? a.startsAt.localeCompare(b.startsAt)
        : b.startsAt.localeCompare(a.startsAt),
    );
  const staff = state.members.filter((member) => member.status === "Active");
  const activeServices = services.filter((item) => item.active);

  async function save(input: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await store.saveRecord(input);
      setNotice(result.message);
      selectService(null);
      selectBooking(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save the booking.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Services and bookings"
        description="Set your service prices and durations, schedule a team member, and track work to completion."
      />
      {industryFor(state.profile.type).id === "services" && (
        <Link className="text-link" href="/dashboard/customer-access">
          Public appointments
        </Link>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <section className="panel settings-panel">
        <h2>Service catalogue</h2>
        <Button disabled={busy} onClick={() => selectService("new")}>
          Add service
        </Button>
        {!services.length && <p>Add a service to start taking bookings.</p>}
        {services.map((item) => (
          <div key={item.id} className="button-row">
            <span>
              {item.name} · {item.duration} min · {cash(item.priceMinor)}
              {item.active ? "" : " · Hidden"}
            </span>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => selectService(item)}
            >
              Edit {item.name}
            </Button>
          </div>
        ))}
        {service && (
          <form
            key={service === "new" ? "new" : service.id}
            onSubmit={(event) => {
              event.preventDefault();
              const input = new FormData(event.currentTarget);
              try {
                void save({
                  type: "saveService",
                  ...(service === "new" ? {} : { id: service.id }),
                  name: input.get("name"),
                  duration: Number(input.get("duration")),
                  priceMinor: kesMinor(String(input.get("price"))),
                  active: input.has("active"),
                });
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Check the service details.",
                );
              }
            }}
          >
            <Field
              label="Service name"
              name="name"
              defaultValue={service === "new" ? "" : service.name}
              required
              maxLength={120}
            />
            <Field
              label="Duration (minutes)"
              name="duration"
              type="number"
              min={5}
              max={1440}
              defaultValue={service === "new" ? 30 : service.duration}
              required
            />
            <Field
              label="Price (KES)"
              name="price"
              inputMode="decimal"
              defaultValue={
                service === "new" ? "0" : (service.priceMinor / 100).toFixed(2)
              }
              required
            />
            <label>
              <input
                type="checkbox"
                name="active"
                defaultChecked={service === "new" || service.active}
              />{" "}
              Accept bookings for this service
            </label>
            <Button type="submit" disabled={busy}>
              Save service
            </Button>
            <Button variant="secondary" onClick={() => selectService(null)}>
              Close
            </Button>
          </form>
        )}
      </section>
      <section className="panel settings-panel">
        <h2>Bookings</h2>
        <nav className="industry-tabs" aria-label="Booking view">
          <Link
            href="/dashboard/bookings?view=today"
            aria-current={todayOnly ? "page" : undefined}
          >
            Bookings today
          </Link>
          <Link
            href="/dashboard/bookings"
            aria-current={!todayOnly ? "page" : undefined}
          >
            All bookings
          </Link>
        </nav>
        <Button
          disabled={
            busy ||
            !activeServices.length ||
            !state.customers.length ||
            !staff.length
          }
          onClick={() => selectBooking("new")}
        >
          Schedule booking
        </Button>
        {(!state.customers.length || !activeServices.length) && (
          <p>Add a customer and an active service to schedule a booking.</p>
        )}
        {booking && (
          <form
            key={booking === "new" ? "new" : booking.id}
            onSubmit={(event) => {
              event.preventDefault();
              const input = new FormData(event.currentTarget);
              const people = {
                customerId: Number(input.get("customer")),
                memberId: Number(input.get("member")),
                startsAt: `${input.get("startsAt")}:00+03:00`,
              };
              void save(
                booking === "new"
                  ? {
                      type: "scheduleBooking",
                      serviceId: Number(input.get("service")),
                      ...people,
                    }
                  : { type: "rescheduleBooking", id: booking.id, ...people },
              );
            }}
          >
            {booking === "new" && (
              <SelectField label="Service" name="service">
                {activeServices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </SelectField>
            )}
            <SelectField
              label="Customer"
              name="customer"
              defaultValue={
                booking === "new" ? undefined : String(booking.customerId)
              }
            >
              {state.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Team member"
              name="member"
              defaultValue={
                booking === "new" ? undefined : String(booking.memberId)
              }
            >
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </SelectField>
            <Field
              label="Start (Kenya time)"
              name="startsAt"
              type="datetime-local"
              defaultValue={
                booking === "new" ? undefined : toBookingInput(booking.startsAt)
              }
              required
            />
            <Button type="submit" disabled={busy}>
              {booking === "new" ? "Confirm booking" : "Save new time"}
            </Button>
            <Button variant="secondary" onClick={() => selectBooking(null)}>
              Close
            </Button>
          </form>
        )}
        {!bookings.length && (
          <p>{todayOnly ? "No open bookings today." : "No bookings yet."}</p>
        )}
        {bookings.slice(0, limit).map((item) => (
          <article className="panel" key={item.id}>
            <h3>{item.serviceName}</h3>
            <p>
              {kenya.format(new Date(item.startsAt))} · {item.duration} min ·{" "}
              {cash(item.priceMinor)}
            </p>
            <p>
              {state.customers.find(
                (customer) => customer.id === item.customerId,
              )?.name ?? "Customer"}{" "}
              ·{" "}
              {staff.find((member) => member.id === item.memberId)?.name ??
                "Former team member"}
            </p>
            <p>{item.status}</p>
            <div className="button-row">
              {item.status === "Scheduled" && (
                <>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => selectBooking(item)}
                  >
                    Reschedule
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() =>
                      void save({
                        type: "bookingStatus",
                        id: item.id,
                        status: "In progress",
                      })
                    }
                  >
                    Start service
                  </Button>
                </>
              )}
              {item.status === "In progress" && (
                <Button
                  disabled={busy}
                  onClick={() =>
                    void save({
                      type: "bookingStatus",
                      id: item.id,
                      status: "Completed",
                    })
                  }
                >
                  Complete service
                </Button>
              )}
              {["Scheduled", "In progress"].includes(item.status) && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void save({
                      type: "bookingStatus",
                      id: item.id,
                      status: "Cancelled",
                    })
                  }
                >
                  Cancel booking
                </Button>
              )}
            </div>
          </article>
        ))}
        {bookings.length > limit && (
          <Button variant="secondary" onClick={() => setLimit(limit + 30)}>
            Show more bookings
          </Button>
        )}
      </section>
    </>
  );
}
