"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, RefreshCw, BriefcaseBusiness } from "lucide-react";
import { useDemo } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { resolveIndustry, workflowFor } from "@/lib/industries";
import {
  Button,
  Field,
  SelectField,
  Modal,
  PageHeading,
  Badge,
  EmptyState,
} from "@/components/ui";

type WorkRecord = {
  id: string;
  business_id: string;
  industry_id: string;
  workflow_id: string;
  revision: number;
  title: string;
  customer: string;
  status: string;
  fields: Record<string, string>;
  amount_minor: number;
  paid_minor: number;
  archived: boolean;
  updated_at: string;
  history: { action: string; at: string; status: string }[];
  payments: {
    action: string;
    amountMinor: number;
    method: string;
    reference: string;
    at: string;
  }[];
};
type Command = {
  businessId: string;
  id: string;
  revision: number;
  requestId: string;
  action: string;
  [key: string]: unknown;
};
const currency = (minor: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(
    minor / 100,
  );
const minor = (value: FormDataEntryValue | null) => {
  const input = String(value || "0");
  if (!/^\d+(\.\d{1,2})?$/.test(input))
    throw new Error("Use a positive amount with at most two decimal places.");
  const result = Math.round(Number(input) * 100);
  if (!Number.isSafeInteger(result))
    throw new Error("This amount is too large.");
  return result;
};
export function OperationsPage() {
  const { state, store } = useDemo();
  return (
    <OperationsWorkspace
      key={`${store.workspace?.businessId}.${state.profile.type}`}
    />
  );
}
function OperationsWorkspace() {
  const { state, store } = useDemo();
  const industry = resolveIndustry(state.profile.type);
  const [selected, setSelected] = useState(industry.workflows[0].id);
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [query, setQuery] = useState(""),
    [showArchived, setShowArchived] = useState(false);
  const [sheet, setSheet] = useState<
    "edit" | "detail" | "payment" | "refund" | null
  >(null);
  const [active, setActive] = useState<WorkRecord | null>(null);
  const [pending, setPending] = useState<Command | null>(null);
  const generation = useRef(0);
  const scope = store.workspace?.businessId || "";
  const role = store.workspace?.role;
  const canWrite = ["Owner", "Manager", "Cashier"].includes(role || "");
  const canArchive = ["Owner", "Manager"].includes(role || "");
  const flow = workflowFor(industry.id, selected) || industry.workflows[0];
  const activeFlow = active
    ? workflowFor(active.industry_id, active.workflow_id)
    : flow;
  async function request(command?: Command, cursor?: string) {
    const requestGeneration = generation.current;
    const {
      data: { session },
    } = await supabase().auth.getSession();
    if (requestGeneration !== generation.current)
      throw new Error(
        "The active account changed. Reopen your business workspace.",
      );
    if (!session) throw new Error("Sign in to continue.");
    const response = await fetch(
      "/api/industry?businessId=" +
        encodeURIComponent(scope) +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
      {
        method: command ? "POST" : "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: "Bearer " + session.access_token,
          ...(command ? { "Content-Type": "application/json" } : {}),
        },
        body: command ? JSON.stringify(command) : undefined,
      },
    );
    const result = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(result.error || "Could not confirm this operation."),
        { status: response.status },
      );
    return result;
  }
  async function load() {
    const current = generation.current;
    setLoading(true);
    try {
      const allRecords: WorkRecord[] = [];
      const cursors = new Set<string>();
      let cursor: string | undefined;
      do {
        if (current !== generation.current) return;
        const data = await request(undefined, cursor);
        if (current !== generation.current) return;
        if (data.access?.featuresUnlocked === false) {
          setRecords([]);
          setActive(null);
          setSheet(null);
          await store.hydrate();
          return;
        }
        allRecords.push(...data.records);
        cursor = data.nextCursor || undefined;
        if (cursor && cursors.has(cursor))
          throw new Error(
            "The record list changed while loading. Refresh to try again.",
          );
        if (cursor) cursors.add(cursor);
      } while (cursor);
      if (current === generation.current) {
        const byId = new Map<string, WorkRecord>();
        for (const record of allRecords) {
          const previous = byId.get(record.id);
          if (!previous || record.revision > previous.revision)
            byId.set(record.id, record);
        }
        const combinedRecords = Array.from(byId.values());
        setRecords(combinedRecords);
        setActive((previous) =>
          previous
            ? combinedRecords.find(
                (record: WorkRecord) => record.id === previous.id,
              ) || previous
            : null,
        );
      }
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : "Could not load operations.");
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    generation.current++;
    let live = true;
    void (async () => {
      const {
        data: { session },
      } = await supabase().auth.getSession();
      if (!live || !session) return;
      try {
        const saved = sessionStorage.getItem(
          `biashara.operations.pending.${session.user.id}.${scope}`,
        );
        if (saved) {
          const command = JSON.parse(saved);
          if (command.businessId === scope) {
            setPending(command);
            setError(
              "A previous operation is unconfirmed. Retry it before making another change.",
            );
          }
        }
      } catch {
        setError(
          "An unconfirmed operation could not be restored. Review your records before entering it again.",
        );
      }
      if (live) void load();
    })();
    return () => {
      live = false;
      // This is an async-request generation counter, not a DOM ref.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
    // Requests are scoped to the current authenticated business.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  async function execute(command: Command) {
    if (busy) return;
    const current = generation.current;
    setBusy(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase().auth.getSession();
      if (current !== generation.current) return;
      if (!session) throw new Error("Sign in to continue.");
      const key = `biashara.operations.pending.${session.user.id}.${scope}`;
      sessionStorage.setItem(key, JSON.stringify(command));
      setPending(command);
      try {
        const result = await request(command);
        sessionStorage.removeItem(key);
        if (current === generation.current) {
          setPending(null);
          setActive(result.record);
          setRecords((old) => [
            result.record,
            ...old.filter((r) => r.id !== result.record.id),
          ]);
          setSheet("detail");
        }
      } catch (e) {
        // A definite rejection is safe to edit; transport failures retain the exact idempotent request.
        if (
          [400, 401, 403, 404, 409, 422].includes(
            (e as { status?: number }).status || 0,
          )
        ) {
          sessionStorage.removeItem(key);
          if (current === generation.current) setPending(null);
          if ((e as { status?: number }).status === 409) {
            await load();
            if (current === generation.current)
              setSheet(active ? "detail" : null);
          }
        } else if (current === generation.current) setSheet(null);
        throw e;
      }
    } catch (e) {
      if (current === generation.current)
        setError(
          e instanceof Error ? e.message : "Could not confirm this operation.",
        );
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  function command(action: string, extra: Record<string, unknown> = {}) {
    return {
      businessId: scope,
      id: active?.id || crypto.randomUUID(),
      revision: active?.revision || 0,
      requestId: crypto.randomUUID(),
      action,
      ...extra,
    };
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const data = new FormData(e.currentTarget);
      const fields = Object.fromEntries(
        flow.fields.map((field) => [
          field.key,
          String(data.get(field.key) || ""),
        ]),
      );
      await execute(
        command(active ? "update" : "create", {
          record: {
            industryId: industry.id,
            workflowId: flow.id,
            title: String(data.get("title")),
            customer: String(data.get("customer") || ""),
            status: active?.status || flow.statuses[0],
            fields,
            amountMinor: minor(data.get("amount")),
          },
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review these details.");
    }
  }
  const visible = records.filter(
    (record) =>
      (showArchived || !record.archived) &&
      record.workflow_id === selected &&
      record.industry_id === industry.id &&
      `${record.title} ${record.customer} ${record.status}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const previous = records.filter(
    (record) => record.industry_id !== industry.id && !record.archived,
  );
  return (
    <>
      <PageHeading
        eyebrow={industry.label}
        title={industry.labels.operations}
        description={industry.description}
      >
        <Button
          variant="secondary"
          icon={RefreshCw}
          onClick={() => void load()}
          disabled={loading || busy}
        >
          Refresh
        </Button>
        {canWrite && (
          <Button
            icon={Plus}
            disabled={busy || !!pending}
            onClick={() => {
              setActive(null);
              setError("");
              setSheet("edit");
            }}
          >
            New {flow.singular}
          </Button>
        )}
      </PageHeading>
      <p className="inline-note">
        Operational records use Kenya time and KES. Payments here are records of
        money received or refunded; they do not move money. Stock and accounting
        entries are recorded separately.
      </p>
      {error && (
        <div className="operation-error" role="alert">
          {error}
        </div>
      )}
      {pending && (
        <Button
          disabled={busy}
          variant="secondary"
          onClick={() => void execute(pending)}
        >
          Retry saved operation
        </Button>
      )}
      <div className="tools-category-tabs" aria-label="Operational workflows">
        {industry.workflows.map((workflow) => (
          <button
            key={workflow.id}
            className={workflow.id === selected ? "active" : ""}
            onClick={() => setSelected(workflow.id)}
          >
            {workflow.label}
          </button>
        ))}
      </div>
      <p>{flow.description}</p>
      <div className="industry-filters">
        <Field
          label="Search operations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Include archived records
        </label>
      </div>
      {loading ? (
        <p role="status">Loading your operations…</p>
      ) : visible.length ? (
        <div className="industry-records">
          {visible.map((record) => (
            <button
              className="panel industry-record"
              key={record.id}
              onClick={() => {
                setActive(record);
                setError("");
                setSheet("detail");
              }}
            >
              <div>
                <strong>{record.title}</strong>
                <span>{record.customer || "No customer assigned"}</span>
              </div>
              <Badge tone={record.archived ? "gray" : "green"}>
                {record.archived ? "Archived" : record.status}
              </Badge>
              <div>
                <strong>{currency(record.amount_minor)}</strong>
                <span>
                  {currency(record.amount_minor - record.paid_minor)}{" "}
                  outstanding
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BriefcaseBusiness}
          title={`No ${flow.label.toLowerCase()} yet`}
          description={
            canWrite
              ? `Create your first ${flow.singular} to track its progress, details and payments.`
              : "Your team’s operational records will appear here."
          }
        />
      )}
      {!!previous.length && (
        <section className="panel industry-previous">
          <h2>Previous business workflows</h2>
          <p>Changing your business type keeps earlier records available.</p>
          {previous.map((record) => (
            <Button
              key={record.id}
              variant="ghost"
              onClick={() => {
                setActive(record);
                setSheet("detail");
              }}
            >
              {record.title} · {record.status}
            </Button>
          ))}
        </section>
      )}
      <Modal
        open={sheet === "edit"}
        onClose={() => {
          if (!busy) setSheet(null);
        }}
        title={`${active ? "Edit" : "New"} ${flow.singular}`}
        description={flow.description}
      >
        <form onSubmit={save}>
          <fieldset className="sheet-fields" disabled={busy || !!pending}>
            <Field
              label="Title / reference"
              name="title"
              defaultValue={active?.title || ""}
              required
              maxLength={200}
            />
            <Field
              label="Customer / contact name"
              name="customer"
              defaultValue={active?.customer || ""}
              maxLength={200}
            />
            {flow.fields.map((field) =>
              field.type === "select" ? (
                <SelectField
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  defaultValue={active?.fields[field.key] || ""}
                  required={field.required}
                >
                  <option value="">Choose…</option>
                  {field.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </SelectField>
              ) : field.type === "textarea" ? (
                <label className="field" key={field.key}>
                  <span>{field.label}</span>
                  <textarea
                    className="input"
                    name={field.key}
                    defaultValue={active?.fields[field.key] || ""}
                    required={field.required}
                    maxLength={2000}
                    rows={3}
                  />
                </label>
              ) : (
                <Field
                  key={field.key}
                  label={field.label}
                  name={field.key}
                  type={
                    field.type === "datetime" ? "datetime-local" : field.type
                  }
                  defaultValue={active?.fields[field.key] || ""}
                  required={field.required}
                  min={field.min}
                  max={field.max}
                  step={field.type === "number" ? "any" : undefined}
                  maxLength={500}
                />
              ),
            )}
            <Field
              label={flow.amountLabel || "Agreed total (KES)"}
              name="amount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={(active?.amount_minor || 0) / 100}
              required
            />
            {error && (
              <p role="alert" className="operation-error">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy || !!pending}>
              {busy ? "Saving…" : "Save record"}
            </Button>
          </fieldset>
        </form>
      </Modal>
      <Modal
        open={sheet === "detail" && !!active}
        onClose={() => {
          if (!busy) setSheet(null);
        }}
        title={active?.title || "Operation"}
        description={activeFlow?.description}
      >
        {active && (
          <>
            <Badge>{active.archived ? "Archived" : active.status}</Badge>
            <dl className="detail-list">
              <div>
                <dt>Customer / contact</dt>
                <dd>{active.customer || "—"}</dd>
              </div>
              {activeFlow?.fields.map((field) => (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>{active.fields[field.key] || "—"}</dd>
                </div>
              ))}
              <div>
                <dt>Agreed total</dt>
                <dd>{currency(active.amount_minor)}</dd>
              </div>
              <div>
                <dt>Recorded payments</dt>
                <dd>{currency(active.paid_minor)}</dd>
              </div>
              <div>
                <dt>Outstanding</dt>
                <dd>{currency(active.amount_minor - active.paid_minor)}</dd>
              </div>
            </dl>
            {!active.archived && canWrite && !pending && (
              <fieldset className="sheet-fields" disabled={busy}>
                <SelectField
                  label="Status"
                  value={active.status}
                  onChange={(status) =>
                    void execute(command("status", { status }))
                  }
                >
                  {activeFlow?.statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </SelectField>
                <div className="button-row">
                  {active.industry_id === industry.id && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelected(active.workflow_id);
                        setSheet("edit");
                      }}
                    >
                      Edit details
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    disabled={active.paid_minor >= active.amount_minor}
                    onClick={() => setSheet("payment")}
                  >
                    Record payment
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={active.paid_minor <= 0}
                    onClick={() => setSheet("refund")}
                  >
                    Record refund
                  </Button>
                  {canArchive && (
                    <Button
                      variant="ghost"
                      disabled={
                        !activeFlow?.terminalStatuses.includes(active.status) ||
                        (active.status === "Cancelled"
                          ? active.paid_minor !== 0
                          : active.paid_minor !== active.amount_minor)
                      }
                      onClick={() => void execute(command("archive"))}
                    >
                      Archive record
                    </Button>
                  )}
                </div>
              </fieldset>
            )}
            <p className="quiet-note">
              Archive a completed record once its balance is settled, or a
              cancelled record once payments have been refunded.
            </p>
            <details className="industry-history">
              <summary>History and payment references</summary>
              <ul>
                {active.payments.map((payment, index) => (
                  <li key={`payment-${index}`}>
                    {payment.action === "refund" ? "Refund" : "Payment"} ·{" "}
                    {currency(payment.amountMinor)} · {payment.method}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                    <small>
                      {new Date(payment.at).toLocaleString("en-KE", {
                        timeZone: "Africa/Nairobi",
                      })}
                    </small>
                  </li>
                ))}
                {active.history.map((entry, index) => (
                  <li key={`history-${index}`}>
                    {entry.action} · {entry.status}
                    <small>
                      {new Date(entry.at).toLocaleString("en-KE", {
                        timeZone: "Africa/Nairobi",
                      })}
                    </small>
                  </li>
                ))}
              </ul>
            </details>
            {error && (
              <p role="alert" className="operation-error">
                {error}
              </p>
            )}
          </>
        )}
      </Modal>
      <Modal
        open={sheet === "payment" || sheet === "refund"}
        onClose={() => {
          if (!busy) setSheet("detail");
        }}
        title={sheet === "refund" ? "Record a refund" : "Record a payment"}
        description="Record money already received or returned outside BiasharaOS. No money is moved."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const data = new FormData(e.currentTarget);
              void execute(
                command(sheet || "payment", {
                  payment: {
                    amountMinor: minor(data.get("amount")),
                    method: String(data.get("method")),
                    reference: String(data.get("reference") || ""),
                  },
                }),
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "Review the amount.");
            }
          }}
        >
          <fieldset className="sheet-fields" disabled={busy || !!pending}>
            <Field
              label="Amount (KES)"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              max={
                (sheet === "refund"
                  ? active?.paid_minor || 0
                  : (active?.amount_minor || 0) - (active?.paid_minor || 0)) /
                100
              }
              required
            />
            <SelectField label="Method" name="method">
              <option>Cash</option>
              <option>M-Pesa</option>
              <option>Bank transfer</option>
              <option>Card</option>
              <option>Other</option>
            </SelectField>
            <Field
              label="Receipt / transfer reference"
              name="reference"
              maxLength={200}
              required
            />
            {error && (
              <p role="alert" className="operation-error">
                {error}
              </p>
            )}
            <Button type="submit">
              {busy ? "Saving…" : "Save payment record"}
            </Button>
          </fieldset>
        </form>
      </Modal>
    </>
  );
}
