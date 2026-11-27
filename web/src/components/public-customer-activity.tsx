"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brand, Button, SelectField } from "@/components/ui";
import type {
  CustomerFlow,
  publicEvents,
  publicServices,
  rentReceipt,
} from "@/lib/backend/customer-access";
import { cash } from "@/lib/operations";
import { supabase } from "@/lib/supabase";
import { downloadTicketImage, showtimeLabel } from "@/lib/ticket-image";

type Services = Awaited<ReturnType<typeof publicServices>>;
type Events = Awaited<ReturnType<typeof publicEvents>>;
type Receipt = Awaited<ReturnType<typeof rentReceipt>>;
type Data = Services | Events | Receipt;
const titles = {
  services: "Book a service",
  events: "Reserve event tickets",
  rent: "Rent receipt",
};

export function PublicCustomerActivity({
  slug,
  flow,
  token,
}: {
  slug: string;
  flow: CustomerFlow;
  token?: string;
}) {
  const [session, setSession] = useState<Session | null>();
  const [loaded, setLoaded] = useState<{ key: string; data: Data }>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ id: string; seat: string; price: number } | null>(
    null,
  );
  const path = `/portal/${slug}/${flow}${token ? "/" + token : ""}`;
  const url = `/api/customer-activity/${encodeURIComponent(slug)}?flow=${flow}${token ? "&token=" + token : ""}`;
  const login = "/login?next=" + encodeURIComponent(path);
  const signup = "/signup?next=" + encodeURIComponent(path);
  const access = session?.access_token;
  const key = url + ":" + (session?.user.id ?? "");
  const data = loaded?.key === key ? loaded.data : undefined;

  useEffect(() => {
    const auth = supabase().auth;
    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(url, {
        cache: "no-store",
        signal,
        headers: access ? { Authorization: "Bearer " + access } : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (!signal?.aborted) setLoaded({ key, data: result });
    },
    [access, key, url],
  );

  useEffect(() => {
    if (session === undefined || (flow === "rent" && !access)) return;
    const controller = new AbortController();
    void Promise.resolve()
      .then(() => load(controller.signal))
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      });
    return () => controller.abort();
  }, [access, flow, load, session]);

  async function reserve(
    id: string,
    kind: "services" | "events",
    price: number,
    duration?: number,
  ) {
    if (!access || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (
        kind === "events" &&
        (pending.current?.seat !== id || pending.current?.price !== price)
      )
        pending.current = { seat: id, id: crypto.randomUUID(), price };
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + access,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          kind === "services"
            ? { slot: id, price, duration }
            : { seat: id, price, requestId: pending.current!.id },
        ),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      pending.current = null;
      setNotice(
        kind === "services"
          ? "Appointment confirmed."
          : price === 0
            ? "Ticket issued. Find it under Your tickets."
            : "Seat held temporarily. Pay at the venue before the hold expires.",
      );
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not confirm this request.",
      );
    } finally {
      setBusy(false);
    }
  }

  const owned = session ? data : undefined;
  return (
    <main className="container customer-activity" id="main-content">
      <div className="customer-activity-brand">
        <Brand />
      </div>
      <header className="page-heading">
        <div>
          <h1>{titles[flow]}</h1>
          {data?.business && (flow !== "rent" || owned) && (
            <p>{data.business}</p>
          )}
        </div>
      </header>
      {session === null && (
        <section className="panel customer-activity-panel customer-activity-print-hidden">
          <h2>
            {flow === "rent"
              ? "Sign in with the email your property manager used"
              : "Sign in to confirm your reservation"}
          </h2>
          <div className="button-row">
            <Button href={login}>Sign in</Button>
            <Button href={signup} variant="secondary">
              Create an account
            </Button>
          </div>
        </section>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <div className="customer-activity-print-hidden">
          <p role="alert">{error}</p>
          {session !== undefined && (flow !== "rent" || access) && (
            <Button
              variant="secondary"
              onClick={() => {
                setError("");
                void load().catch((failure: Error) =>
                  setError(failure.message),
                );
              }}
            >
              Refresh
            </Button>
          )}
        </div>
      )}
      {!data && !error && (flow !== "rent" || access) && (
        <p role="status">Loading…</p>
      )}
      {flow === "services" && data && "slots" in data && (
        <>
          {session && data.bookings.length > 0 && (
            <section className="panel customer-activity-panel">
              <h2>Your appointments</h2>
              <div className="customer-activity-grid">
                {data.bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="card customer-activity-item"
                  >
                    <h3>{booking.name}</h3>
                    <p>{showtimeLabel(booking.startsAt)} EAT</p>
                    <p>
                      {booking.status} · {cash(booking.price)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
          <section className="panel customer-activity-panel">
            <h2>Available times</h2>
            {!data.slots.length && (
              <p>There are no available times right now.</p>
            )}
            <div className="customer-activity-grid">
              {data.slots.map((slot) => (
                <article key={slot.id} className="card customer-activity-item">
                  <h3>{slot.name}</h3>
                  <p>{showtimeLabel(slot.startsAt)} EAT</p>
                  <p>
                    {slot.duration} min · {cash(slot.price)}
                  </p>
                  {access && (
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void reserve(
                          slot.id,
                          "services",
                          slot.price,
                          slot.duration,
                        )
                      }
                    >
                      Book this time
                    </Button>
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      {flow === "events" && data && "shows" in data && (
        <>
          {session && data.tickets.length > 0 && (
            <section className="panel customer-activity-panel">
              <h2>Your tickets</h2>
              <div className="customer-activity-grid">
                {data.tickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="card customer-activity-item"
                  >
                    <h3>{ticket.event}</h3>
                    <p>
                      {ticket.section} · {ticket.seat}
                    </p>
                    {ticket.startsAt && (
                      <p>
                        {showtimeLabel(ticket.startsAt)} EAT · {ticket.venue}
                      </p>
                    )}
                    <p>
                      {ticket.status} ·{" "}
                      {ticket.price ? cash(ticket.price) : "Free"}
                    </p>
                    {ticket.status === "Reserved" && ticket.expiresAt && (
                      <p>
                        Pay at the venue by {showtimeLabel(ticket.expiresAt)}{" "}
                        EAT.
                      </p>
                    )}
                    {ticket.code && (
                      <>
                        <p>
                          Admission code <strong>{ticket.code}</strong>
                        </p>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            try {
                              downloadTicketImage({
                                code: ticket.code!,
                                title: ticket.event,
                                details: [
                                  ticket.venue,
                                  `${ticket.section} · ${ticket.seat}`,
                                  showtimeLabel(ticket.startsAt) + " EAT",
                                ],
                              });
                            } catch (failure) {
                              setError(
                                failure instanceof Error
                                  ? failure.message
                                  : "Ticket download unavailable.",
                              );
                            }
                          }}
                        >
                          Download admission ticket
                        </Button>
                      </>
                    )}
                  </article>
                ))}
              </div>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setError("");
                  void load().catch((failure: Error) =>
                    setError(failure.message),
                  );
                }}
              >
                Refresh tickets
              </Button>
            </section>
          )}
          <section className="panel customer-activity-panel">
            <h2>Published showtimes</h2>
            {!data.shows.length && (
              <p>There are no published showtimes right now.</p>
            )}
            <div className="customer-activity-grid">
              {data.shows.map((show) => (
                <article key={show.id} className="card customer-activity-item">
                  <h3>{show.event}</h3>
                  <p>
                    {show.show} · {show.venue}
                  </p>
                  <p>{showtimeLabel(show.startsAt)} EAT</p>
                  <p>
                    {show.price
                      ? `${cash(show.price)} per seat · pay at the venue`
                      : "Free admission"}
                  </p>
                  {!show.seats.length ? (
                    <p>No seats currently available.</p>
                  ) : (
                    access && (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          const seat = String(
                            new FormData(event.currentTarget).get("seat"),
                          );
                          void reserve(seat, "events", show.price);
                        }}
                      >
                        <SelectField
                          label="Available seat"
                          name="seat"
                          required
                          defaultValue=""
                        >
                          <option value="">Choose a seat</option>
                          {show.seats.map((seat) => (
                            <option key={seat.id} value={seat.id}>
                              {seat.section} · {seat.name}
                            </option>
                          ))}
                        </SelectField>
                        <Button type="submit" disabled={busy}>
                          {show.price
                            ? "Hold seat for 15 minutes"
                            : "Get free ticket"}
                        </Button>
                      </form>
                    )
                  )}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      {flow === "rent" && owned && "paymentReference" in owned && (
        <section className="panel customer-activity-panel customer-rent-print">
          <h2>{owned.reference}</h2>
          <dl>
            <dt>Amount received</dt>
            <dd>{cash(owned.amount)}</dd>
            {owned.unit && (
              <>
                <dt>Property or unit</dt>
                <dd>{owned.unit}</dd>
              </>
            )}
            <dt>Payment reference</dt>
            <dd>{owned.paymentReference}</dd>
            <dt>Recorded on</dt>
            <dd>{showtimeLabel(owned.recordedAt)} EAT</dd>
          </dl>
          <div className="customer-activity-print-hidden">
            <Button onClick={() => window.print()}>
              Print or save receipt
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
