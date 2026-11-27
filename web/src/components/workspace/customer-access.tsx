"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button, Field, PageHeading, SelectField } from "@/components/ui";
import type { EventOffer, ServiceSlot } from "@/lib/backend/customer-access";
import { cash } from "@/lib/operations";
import { kesMinor } from "@/lib/settlements";
import { showtimeLabel } from "@/lib/ticket-image";
import { useDemo } from "@/lib/store";
import { workspaceRequest } from "@/lib/workspace-request";

type AccessData = { slug: string } & (
  | {
      flow: "services";
      slots: Omit<ServiceSlot, "booked_by">[];
      services: { id: number; name: string }[];
      staff: { id: number; name: string }[];
    }
  | {
      flow: "events";
      offers: EventOffer[];
      shows: { id: string; name: string; startsAt: string }[];
    }
  | {
      flow: "rent";
      links: { rent_id: string; expires_at: string }[];
      records: {
        id: string;
        reference: string;
        status: string;
        amount: number;
        due: string;
      }[];
    }
);

export function CustomerAccessPage() {
  const { store, state } = useDemo();
  const business = store.workspace?.businessId;
  const canManage = ["Owner", "Manager"].includes(store.workspace?.role ?? "");
  return canManage && business ? (
    <AccessManager
      key={business + state.profile.type}
      name={state.profile.business}
    />
  ) : (
    <PageHeading
      title="Customer access"
      description="An owner or manager can manage these links."
    />
  );
}

function AccessManager({ name }: { name: string }) {
  const [data, setData] = useState<AccessData>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<{ path: string; id: string }>();
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await workspaceRequest<AccessData>(
      "/api/customer-access",
      undefined,
      signal,
    );
    if (!signal?.aborted) setData(result);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve()
      .then(() => load(controller.signal))
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [load]);

  async function save(input: Record<string, unknown>, message: string) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const result = await workspaceRequest<{ path?: string }>(
        "/api/customer-access",
        input,
      );
      if (result.path)
        setReceipt({ path: result.path, id: String(input.rentId) });
      if (input.action === "revokeReceiptLink")
        setReceipt((item) => (item?.id === input.rentId ? undefined : item));
      setNotice(message);
      try {
        await load();
      } catch {
        setError("Change saved. Refresh the page to update the list.");
      }
      return true;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save this change.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function publishSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (
      await save(
        {
          action: "addSlot",
          serviceId: Number(values.get("service")),
          memberId: Number(values.get("member")),
          startsAt: values.get("startsAt") + ":00+03:00",
        },
        "Appointment time published.",
      )
    )
      form.reset();
  }

  return (
    <>
      <PageHeading
        title={
          data?.flow === "services"
            ? "Public appointments"
            : data?.flow === "events"
              ? "Public ticketing"
              : data?.flow === "rent"
                ? "Rent receipts and reminders"
                : "Customer access"
        }
      />
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p>Loading…</p>}
      {data?.flow === "services" && (
        <>
          <div className="button-row">
            <ShareLink path={`/portal/${data.slug}/services`} />
            <Button href="/dashboard/bookings" variant="secondary">
              Staff bookings
            </Button>
          </div>
          <section className="panel customer-activity-panel">
            <h2>Publish an appointment time</h2>
            <p>
              A customer with a confirmed email can claim one of the times you
              publish.
            </p>
            {data.services.length && data.staff.length ? (
              <form onSubmit={publishSlot}>
                <div className="industry-fields">
                  <SelectField label="Service" name="service" required>
                    {data.services.map((service) => (
                      <option value={service.id} key={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Team member" name="member" required>
                    {data.staff.map((person) => (
                      <option value={person.id} key={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </SelectField>
                  <Field
                    type="datetime-local"
                    name="startsAt"
                    label="Start (Kenya time)"
                    required
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  Publish time
                </Button>
              </form>
            ) : (
              <Link className="text-link" href="/dashboard/bookings">
                Add an active service in Staff bookings
              </Link>
            )}
          </section>
          <section className="panel customer-activity-panel">
            <h2>Upcoming published times</h2>
            {!data.slots.length && <p>No upcoming times.</p>}
            <div className="customer-activity-grid">
              {data.slots.map((slot) => (
                <article className="card customer-activity-item" key={slot.id}>
                  <h3>
                    {data.services.find(
                      (service) => service.id === slot.service_id,
                    )?.name ?? "Service"}
                  </h3>
                  <p>{showtimeLabel(slot.starts_at)} EAT</p>
                  <p>
                    {data.staff.find((person) => person.id === slot.member_id)
                      ?.name ?? "Team member"}
                  </p>
                  {slot.booking_id ? (
                    <p>Booked · #{slot.booking_id}</p>
                  ) : (
                    <Button
                      disabled={busy}
                      variant="secondary"
                      onClick={() =>
                        void save(
                          { action: "closeSlot", id: slot.id },
                          "Time removed from public booking.",
                        )
                      }
                    >
                      Close time
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      {data?.flow === "events" && (
        <>
          <div className="button-row">
            <ShareLink path={`/portal/${data.slug}/events`} />
            <Button
              href="/dashboard/industry?module=tickets"
              variant="secondary"
            >
              Ticket admission
            </Button>
          </div>
          <section className="panel customer-activity-panel">
            <h2>Available showtimes</h2>
            <p>
              Free tickets are issued immediately. For paid shows, guests hold a
              seat for 15 minutes and pay at the venue. Record the payment
              reference in Tickets to issue their barcode.
            </p>
            {!data.shows.length && (
              <Link
                className="text-link"
                href="/dashboard/industry?module=showtimes"
              >
                Set up a showtime and add seats
              </Link>
            )}
            <div className="customer-activity-grid">
              {data.shows.map((show) => {
                const offer = data.offers.find(
                  (item) => item.show_id === show.id,
                );
                return (
                  <article
                    className="card customer-activity-item"
                    key={show.id}
                  >
                    <h3>{show.name}</h3>
                    <p>{showtimeLabel(show.startsAt)} EAT</p>
                    <p>{offer?.enabled ? "Published" : "Private"}</p>
                    <form
                      key={offer?.price_minor ?? 0}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const values = new FormData(event.currentTarget);
                        try {
                          void save(
                            {
                              action: "publishShow",
                              showId: show.id,
                              price: kesMinor(String(values.get("price"))),
                            },
                            "Showtime published.",
                          );
                        } catch (failure) {
                          setError(
                            failure instanceof Error
                              ? failure.message
                              : "Check the price.",
                          );
                        }
                      }}
                    >
                      <Field
                        name="price"
                        label="Price per seat (KES)"
                        inputMode="decimal"
                        required
                        defaultValue={((offer?.price_minor ?? 0) / 100).toFixed(
                          2,
                        )}
                      />
                      <div className="button-row">
                        <Button type="submit" disabled={busy}>
                          {offer?.enabled ? "Update offer" : "Publish showtime"}
                        </Button>
                        {offer?.enabled && (
                          <Button
                            type="button"
                            disabled={busy}
                            variant="secondary"
                            onClick={() =>
                              void save(
                                { action: "hideShow", showId: show.id },
                                "Public seat reservations closed.",
                              )
                            }
                          >
                            Close public offer
                          </Button>
                        )}
                      </div>
                    </form>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
      {data?.flow === "rent" && (
        <section className="panel customer-activity-panel">
          <h2>Rent records</h2>
          <p>
            Prepare a reminder in your mail app, or share a private receipt for
            rent you’ve recorded as received.
          </p>
          {!data.records.length && (
            <Link className="text-link" href="/dashboard/industry?module=rent">
              Open rent records
            </Link>
          )}
          <div className="customer-activity-grid">
            {data.records.map((rent) => {
              const currentLink = data.links.find(
                (link) => link.rent_id === rent.id,
              );
              return (
                <article className="card customer-activity-item" key={rent.id}>
                  <h3>{rent.reference}</h3>
                  <p>
                    {cash(rent.amount)} · {rent.status}
                  </p>
                  <p>Due {rent.due}</p>
                  {rent.status === "Due" ? (
                    <Button
                      href={`mailto:?subject=${encodeURIComponent("Rent reminder · " + rent.reference)}&body=${encodeURIComponent(
                        `Hello, this is a reminder from ${name}. Rent ref ${rent.reference} for ${cash(rent.amount)} is due on ${rent.due}. Please contact us if you have already paid or need help.`,
                      )}`}
                      variant="secondary"
                    >
                      Prepare email reminder
                    </Button>
                  ) : (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        const email = new FormData(event.currentTarget).get(
                          "email",
                        );
                        void save(
                          {
                            action: "issueReceiptLink",
                            rentId: rent.id,
                            email,
                          },
                          "Private receipt link created.",
                        );
                      }}
                    >
                      <Field
                        label="Tenant email"
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                      />
                      <p>
                        Links expire after 30 days. Creating a new link replaces
                        the current one.
                      </p>
                      <div className="button-row">
                        <Button type="submit" disabled={busy}>
                          {currentLink
                            ? "Replace receipt link"
                            : "Create receipt link"}
                        </Button>
                        {currentLink && (
                          <Button
                            type="button"
                            disabled={busy}
                            variant="secondary"
                            onClick={() =>
                              void save(
                                {
                                  action: "revokeReceiptLink",
                                  rentId: rent.id,
                                },
                                "Receipt link revoked.",
                              )
                            }
                          >
                            Revoke link
                          </Button>
                        )}
                      </div>
                      {receipt?.id === rent.id && (
                        <ShareLink path={receipt.path} />
                      )}
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

function ShareLink({ path }: { path: string }) {
  const [note, setNote] = useState("");
  return (
    <div className="button-row customer-activity-print-hidden">
      <Button href={path} variant="secondary">
        Open customer page
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              new URL(path, window.location.origin).href,
            );
            setNote("Link copied.");
          } catch {
            setNote("Open the customer page to copy its address.");
          }
        }}
      >
        Copy link
      </Button>
      {note && <span role="status">{note}</span>}
    </div>
  );
}
