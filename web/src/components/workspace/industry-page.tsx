"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  dailyActions,
  dailyActionPath,
  industryQueueMatcher,
} from "@/lib/workspace-activity";
import { Badge, Button, Field, SelectField } from "@/components/ui";
import { BankCaseDecision } from "./bank-case-decision";
import { TicketCamera } from "./ticket-camera";
import {
  industryActionReference,
  industryFor,
  ticketBars,
  workspaceCanUse,
  type Industry,
  type IndustryRecord,
} from "@/lib/industries";
import { downloadTicketImage, showtimeLabel } from "@/lib/ticket-image";
import { kesMinor } from "@/lib/settlements";
import { useDemo } from "@/lib/store";
import { workspaceRequest } from "@/lib/workspace-request";

type RecordView = Omit<IndustryRecord, "createdBy"> & { own: boolean };
type Records = {
  records: RecordView[];
  manage: boolean;
  scan: boolean;
  sector: string;
};
type Command =
  | {
      action: "create";
      name: string;
      module: string;
      values: IndustryRecord["values"];
    }
  | {
      action: "transition";
      id: string;
      from: string;
      status: string;
      reference?: string;
    }
  | { action: "admit"; code: string }
  | {
      action: "createSeats";
      show: string;
      section: string;
      row: string;
      first: number;
      count: number;
    };

export function IndustryPage({
  moduleId,
  attention,
}: {
  moduleId?: string;
  attention: boolean;
}) {
  const { state, store } = useDemo();
  const industry = industryFor(state.profile.type);
  const role = store.workspace?.role ?? "";
  if (!workspaceCanUse("industry", industry, role))
    return (
      <div className="page-heading">
        <div>
          <h1>Industry operations</h1>
          <p>
            Specialized records are unavailable for your current business type
            or role.
          </p>
        </div>
      </div>
    );
  return (
    <IndustryRecords
      key={`${store.workspace?.businessId}:${industry.id}:${role}`}
      industry={industry}
      role={role}
      moduleId={moduleId}
      attention={attention}
    />
  );
}

function IndustryRecords({
  industry,
  role,
  moduleId,
  attention,
}: {
  industry: Industry;
  role: string;
  moduleId?: string;
  attention: boolean;
}) {
  const [data, setData] = useState<Records>();
  const [loadedAt, setLoadedAt] = useState(() => Date.now());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<{ record: RecordView; status: string }>();
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(30);
  const inflight = useRef(false);
  const pending = useRef<{ signature: string; requestId: string } | null>(null);
  const selectedModule =
    industry.modules.find((item) => item.id === moduleId) ??
    industry.modules[0];
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const result = await workspaceRequest<Records>(
        "/api/industry",
        undefined,
        signal,
      );
      if (result.sector !== industry.id)
        throw new Error("Your business type changed. Refresh the workspace.");
      setData(result);
      setLoadedAt(Date.now());
    },
    [industry.id],
  );
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve()
      .then(() => load(controller.signal))
      .catch((issue) => {
        if (!controller.signal.aborted) setError(String(issue.message));
      });
    return () => controller.abort();
  }, [load]);

  async function save(command: Command) {
    if (inflight.current) return false;
    inflight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const signature = JSON.stringify(command);
    if (pending.current?.signature !== signature)
      pending.current = { signature, requestId: crypto.randomUUID() };
    try {
      const result = await workspaceRequest<{
        status?: string;
        duplicate?: boolean;
        created?: number;
      }>("/api/industry", {
        ...command,
        sector: industry.id,
        requestId: pending.current.requestId,
      });
      pending.current = null;
      setNotice(
        result.duplicate
          ? "Change already saved."
          : command.action === "admit"
            ? "Ticket accepted. Guest checked in."
            : command.action === "createSeats"
              ? `Seats added: ${result.created}`
              : `Saved · ${result.status}`,
      );
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Could not save this record.",
      );
      return false;
    } finally {
      inflight.current = false;
      setBusy(false);
    }
    void load().catch(() =>
      setError("Change saved. Select Refresh to update the list."),
    );
    return true;
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const values: IndustryRecord["values"] = {};
      for (const field of selectedModule.fields) {
        const raw = String(fields.get(field.key) ?? "").trim();
        if (!raw && field.optional) continue;
        values[field.key] =
          field.type === "money"
            ? kesMinor(raw)
            : field.type === "count"
              ? Number(raw)
              : field.type === "datetime" && raw
                ? `${raw}:00+03:00`
                : raw;
      }
      if (
        await save({
          action: "create",
          module: selectedModule.id,
          name: String(fields.get("name")),
          values,
        })
      )
        form.reset();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Check the record fields.",
      );
    }
  }

  async function createSeats(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const saved = await save({
      action: "createSeats",
      show: String(fields.get("show")),
      section: String(fields.get("section")),
      row: String(fields.get("row")),
      first: Number(fields.get("first")),
      count: Number(fields.get("count")),
    });
    if (saved) form.reset();
  }

  const records = data?.records ?? [];
  function downloadTicket(ticket: RecordView) {
    const seat = records.find((record) => record.id === ticket.values.seat);
    const show = records.find((record) => record.id === seat?.values.show);
    const event = records.find((record) => record.id === show?.values.event);
    if (!ticket.code || !seat || !show || !event) {
      setError("Ticket details are incomplete. Refresh the record.");
      return;
    }
    try {
      setError("");
      downloadTicketImage({
        code: ticket.code,
        title: event.name,
        details: [
          `${event.values.venue} · ${show.values.room}`,
          `${showtimeLabel(String(show.values.start))} EAT`,
          `Seat ${seat.name} · ${seat.values.section}`,
          `Booking ${ticket.name}`,
        ],
      });
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Could not download the ticket.",
      );
    }
  }

  const names = new Map(records.map((record) => [record.id, record.name]));
  const nameOf = (value: string | number) =>
    names.get(String(value)) ?? String(value);
  const action = dailyActions(industry.id, role)?.find(
    (item) => item.queue?.module === selectedModule.id,
  );
  const matchQueue =
    attention && action?.queue ? industryQueueMatcher(action.queue) : null;
  const term = filter.trim().toLowerCase();
  const matches = records.filter(
    (record) =>
      record.module === selectedModule.id &&
      (!matchQueue || matchQueue(record)) &&
      `${record.name} ${record.status} ${Object.values(record.values).map(nameOf).join(" ")}`
        .toLowerCase()
        .includes(term),
  );

  return (
    <div className="industry-page">
      <div className="page-heading">
        <div>
          <h1>{industry.label}</h1>
          {industry.id === "finance" && (
            <p>
              Managers submit cases. A different owner reviewer records the
              decision with an authenticator code and a reason.
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setError("");
            void load().catch((issue) => setError(String(issue.message)));
          }}
          disabled={busy}
        >
          Refresh
        </Button>
      </div>
      {data?.manage &&
        ["entertainment", "real-estate"].includes(industry.id) && (
          <Link className="text-link" href="/dashboard/customer-access">
            {industry.id === "entertainment"
              ? "Public ticketing"
              : "Rent receipts and reminders"}
          </Link>
        )}
      {error && (
        <p role="alert" className="operation-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="connection-banner">
          {notice}
        </p>
      )}
      {!data && !error && <p role="status">Loading industry records…</p>}
      {data?.scan &&
        (!data.manage || !moduleId || selectedModule.id === "tickets") && (
          <form
            className="card industry-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              if (
                await save({
                  action: "admit",
                  code: String(new FormData(form).get("code")),
                })
              )
                form.reset();
            }}
          >
            <h2>Ticket admission</h2>
            <Field
              label="Scan or enter ticket code"
              name="code"
              required
              maxLength={16}
              pattern="[A-Fa-f0-9]{16}"
              autoComplete="off"
            />
            <Button type="submit" disabled={busy}>
              Check in guest
            </Button>
            <TicketCamera
              disabled={busy}
              onScan={(code) => void save({ action: "admit", code })}
            />
          </form>
        )}
      {data?.manage && (
        <>
          <nav className="industry-tabs" aria-label="Industry records">
            {industry.modules.map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/industry?module=${item.id}`}
                aria-current={
                  item.id === selectedModule.id ? "page" : undefined
                }
                onClick={() => {
                  setFilter("");
                  setLimit(30);
                  setNext(undefined);
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {selectedModule.id === "seats" && (
            <details className="card industry-form">
              <summary>Add numbered seats</summary>
              <form onSubmit={createSeats} className="industry-seat-form">
                <p>Create up to 250 seats in one row, such as A-1 to A-50.</p>
                <div className="industry-fields">
                  <SelectField
                    name="show"
                    label="Showtime for seat range"
                    required
                    defaultValue=""
                  >
                    <option value="">Choose a showtime</option>
                    {records
                      .filter(
                        (record) =>
                          record.module === "showtimes" &&
                          record.status === "Scheduled" &&
                          Date.parse(String(record.values.end)) > loadedAt,
                      )
                      .map((show) => (
                        <option value={show.id} key={show.id}>
                          {show.name}
                        </option>
                      ))}
                  </SelectField>
                  <Field
                    name="section"
                    label="Section for seat range"
                    required
                    maxLength={240}
                  />
                  <Field
                    name="row"
                    label="Row name"
                    required
                    pattern="[A-Za-z0-9\-]{1,16}"
                    maxLength={16}
                  />
                  <Field
                    name="first"
                    label="First seat number"
                    type="number"
                    required
                    min={1}
                    max={9999}
                    defaultValue={1}
                  />
                  <Field
                    name="count"
                    label="Number of seats"
                    type="number"
                    required
                    min={1}
                    max={250}
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  Create seat range
                </Button>
              </form>
            </details>
          )}
          {!matchQueue && !(industry.id === "finance" && role === "Owner") && (
            <form
              className="card industry-form"
              key={selectedModule.id}
              onSubmit={create}
            >
              <h2>Add {selectedModule.label.toLowerCase()} record</h2>
              <div className="industry-fields">
                <Field
                  label={selectedModule.name}
                  name="name"
                  required
                  maxLength={240}
                />
                {selectedModule.fields.map((field) =>
                  field.type === "reference" ? (
                    <SelectField
                      key={field.key}
                      label={field.label}
                      name={field.key}
                      required={!field.optional}
                      defaultValue=""
                    >
                      <option value="">
                        Choose {field.label.toLowerCase()}
                      </option>
                      {records
                        .filter((record) => record.module === field.module)
                        .map((record) => (
                          <option value={record.id} key={record.id}>
                            {record.name}
                            {record.module === "seats" &&
                              ` · ${record.values.section} · ${nameOf(record.values.show)}`}{" "}
                            · {record.status}
                          </option>
                        ))}
                    </SelectField>
                  ) : (
                    <Field
                      key={field.key}
                      label={field.label}
                      name={field.key}
                      required={!field.optional}
                      maxLength={240}
                      type={
                        field.type === "date"
                          ? "date"
                          : field.type === "datetime"
                            ? "datetime-local"
                            : field.type === "count"
                              ? "number"
                              : "text"
                      }
                      inputMode={field.type === "money" ? "decimal" : undefined}
                      min={field.type === "count" ? 1 : undefined}
                    />
                  ),
                )}
              </div>
              <Button type="submit" disabled={busy}>
                Save record
              </Button>
            </form>
          )}
          {action && (
            <nav className="industry-tabs" aria-label="Record view">
              <Link
                href={`/dashboard/${dailyActionPath(action)}`}
                aria-current={attention ? "page" : undefined}
              >
                {action.label}
              </Link>
              <Link
                href={`/dashboard/industry?module=${selectedModule.id}`}
                aria-current={!attention ? "page" : undefined}
              >
                All records
              </Link>
            </nav>
          )}
          <Field
            label={`Search ${selectedModule.label.toLowerCase()}`}
            name="record-search"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setLimit(30);
            }}
          />
          <div className="industry-records">
            {!matches.length && <p className="muted">No matching records.</p>}
            {matches.slice(0, limit).map((record) => (
              <article className="card industry-record" key={record.id}>
                <header>
                  <h3>{record.name}</h3>
                  <Badge tone="gray">
                    {record.status === "Reserved" &&
                    (record.expiresAt ?? "") < new Date().toISOString()
                      ? "Reservation expired"
                      : record.status}
                  </Badge>
                </header>
                <dl>
                  {selectedModule.fields.map((field) => {
                    const value = record.values[field.key];
                    if (value === undefined) return null;
                    return (
                      <div key={field.key}>
                        <dt>{field.label}</dt>
                        <dd>
                          {field.type === "money"
                            ? new Intl.NumberFormat("en-KE", {
                                style: "currency",
                                currency: "KES",
                              }).format(Number(value) / 100)
                            : field.type === "reference"
                              ? nameOf(value)
                              : field.type === "datetime"
                                ? new Intl.DateTimeFormat("en-KE", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                    timeZone: "Africa/Nairobi",
                                  }).format(new Date(String(value)))
                                : value}
                        </dd>
                      </div>
                    );
                  })}
                  {selectedModule.id === "tickets" && record.values.payment && (
                    <div>
                      <dt>Payment reference</dt>
                      <dd>{record.values.payment}</dd>
                    </div>
                  )}
                </dl>
                {record.code &&
                  ["Issued", "Checked in"].includes(record.status) && (
                    <div className="industry-ticket">
                      <div className="industry-barcode" aria-hidden="true">
                        {Array.from(`*${record.code}*`).flatMap(
                          (letter, index) =>
                            [...ticketBars[letter], "n"].map((width, bar) => (
                              <span
                                key={`${index}-${bar}`}
                                style={{
                                  flexGrow: width === "w" ? 3 : 1,
                                  background: bar % 2 === 0 ? "#000" : "#fff",
                                }}
                              />
                            )),
                        )}
                      </div>
                      <code>{record.code}</code>
                    </div>
                  )}
                {!!record.history?.length && (
                  <details className="industry-history">
                    <summary>Activity history</summary>
                    <ol>
                      {[...record.history].reverse().map((entry, index) => (
                        <li key={index}>
                          <strong>{entry.status}</strong>
                          <span>
                            {entry.role} ·{" "}
                            <time dateTime={entry.at}>
                              {showtimeLabel(entry.at)} EAT
                            </time>
                          </span>
                          {entry.note && <p>{entry.note}</p>}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
                <div className="industry-actions">
                  {record.code && record.status === "Issued" && (
                    <Button
                      variant="secondary"
                      onClick={() => downloadTicket(record)}
                    >
                      Download ticket
                    </Button>
                  )}
                  {selectedModule.flow[record.status]
                    ?.filter(
                      (status) =>
                        !(
                          industry.id === "finance" &&
                          ["Approved", "Declined"].includes(status) &&
                          (role !== "Owner" || record.own)
                        ),
                    )
                    .map((status) => {
                      const reference = industryActionReference(
                        selectedModule.id,
                        status,
                        record.values,
                      );
                      return (
                        <Button
                          key={status}
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            reference
                              ? setNext({ record, status })
                              : void save({
                                  action: "transition",
                                  id: record.id,
                                  from: record.status,
                                  status,
                                })
                          }
                        >
                          Mark as {status.toLowerCase()}
                        </Button>
                      );
                    })}
                </div>
                {next?.record.id === record.id &&
                industry.id === "finance" &&
                ["Approved", "Declined"].includes(next.status) ? (
                  <BankCaseDecision
                    key={next.status}
                    busy={busy}
                    cancel={() => setNext(undefined)}
                    save={async (reference) => {
                      if (
                        await save({
                          action: "transition",
                          id: record.id,
                          from: record.status,
                          status: next.status,
                          reference,
                        })
                      )
                        setNext(undefined);
                    }}
                  />
                ) : (
                  next?.record.id === record.id && (
                    <form
                      className="industry-form"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const reference = String(
                          new FormData(event.currentTarget).get("reference"),
                        );
                        if (
                          await save({
                            action: "transition",
                            id: record.id,
                            from: record.status,
                            status: next.status,
                            reference,
                          })
                        )
                          setNext(undefined);
                      }}
                    >
                      <Field
                        label={industryActionReference(
                          selectedModule.id,
                          next.status,
                          record.values,
                        )}
                        name="reference"
                        maxLength={240}
                        required
                      />
                      <div className="industry-actions">
                        <Button type="submit" disabled={busy}>
                          Confirm
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => setNext(undefined)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )
                )}
              </article>
            ))}
          </div>
          {matches.length > limit && (
            <Button variant="secondary" onClick={() => setLimit(limit + 30)}>
              Show more records
            </Button>
          )}
        </>
      )}
    </div>
  );
}
