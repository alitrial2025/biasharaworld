"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, PageHeading, SelectField } from "@/components/ui";
import { downloadCSV } from "@/lib/csv";
import { cash } from "@/lib/operations";
import { useDemo } from "@/lib/store";
import { supabase } from "@/lib/supabase";

type Entry = {
  order_id: number;
  reference: string;
  amount_minor: number;
  channel: "card" | "mobile_money" | null;
  receipt_id: number | null;
  paid_at: string | null;
  created_at: string;
};
type Activity = { entries: Entry[]; next: number | null };
type Filter = { status: string; order: string };
const defaultFilter: Filter = { status: "all", order: "" };
const dateFormat = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" });
const method = (channel: Entry["channel"]) => channel === "card" ? "Card" : channel === "mobile_money" ? "M-Pesa" : "—";

async function activityRequest<T>(query: string, order?: number, signal?: AbortSignal): Promise<T> {
  const { data: { session } } = await supabase().auth.getSession();
  if (!session) throw new Error("Sign in to continue.");
  const response = await fetch(`/api/payments/activity${query}`, {
    method: order === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, ...(order === undefined ? {} : { "Content-Type": "application/json" }) },
    body: order === undefined ? undefined : JSON.stringify({ order }),
    cache: "no-store", signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not check payment activity.");
  return result;
}

export function PaymentActivityPage() {
  const { store } = useDemo();
  const businessId = store.workspace?.businessId;
  const allowed = ["Owner", "Manager"].includes(store.workspace?.role ?? "");
  if (!allowed) return <PageHeading title="Payment activity" description="Ask an owner or manager to review payment activity." />;
  return <MerchantPaymentActivity key={businessId} />;
}

function MerchantPaymentActivity() {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [filter, setFilter] = useState(defaultFilter);
  const [pages, setPages] = useState<number[]>([]);
  const [checked, setChecked] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const params = new URLSearchParams({ status: filter.status });
  if (filter.order) params.set("order", filter.order);
  if (pages.length) params.set("before", String(pages.at(-1)));
  const query = `?${params}`;

  useEffect(() => {
    const controller = new AbortController();
    activityRequest<Activity>(query, undefined, controller.signal).then(setActivity).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [query, reload]);

  function applyFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setFilter({ status: String(form.get("status") ?? "all"), order: String(form.get("order") ?? "").trim() });
    setError(""); setPages([]); setActivity(null); setReload(value => value + 1);
  }

  async function check(order: number) {
    setChecked(order); setError("");
    try {
      await activityRequest("", order);
      setActivity(await activityRequest<Activity>(query));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not check this payment.");
    } finally { setChecked(null); }
  }

  const entries = activity?.entries ?? [];
  function exportPage() {
    downloadCSV("online-payments.csv", ["Order", "Reference", "Gross KES", "Channel", "Status", "Receipt", "Created (UTC)", "Confirmed (UTC)"],
      entries.map(entry => [entry.order_id, entry.reference, (entry.amount_minor / 100).toFixed(2), method(entry.channel),
        entry.paid_at ? "Payment confirmed" : "Pending confirmation", entry.receipt_id ?? "", entry.created_at, entry.paid_at ?? ""]));
  }

  return <>
    <PageHeading title="Payment activity" description="Track online order payments and export references for settlement reconciliation." />
    <section className="panel settings-panel">
      <p>Confirmed amounts are gross payments. Use the provider settlement report and bank statement to verify deposits and fees.</p>
      <form onSubmit={applyFilter}>
        <div className="form-grid">
          <SelectField label="Payment status" name="status" defaultValue="all">
            <option value="all">All</option><option value="pending">Pending confirmation</option><option value="confirmed">Confirmed</option>
          </SelectField>
          <Field label="Order number" name="order" inputMode="numeric" pattern="[0-9]{1,10}" maxLength={10} />
        </div>
        <div className="button-row">
          <Button type="submit" disabled={checked !== null}>Filter payments</Button>
          <Button variant="secondary" type="button" disabled={!entries.length || checked !== null} onClick={exportPage}>Export this page</Button>
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
      {!activity && !error && <p role="status">Loading payment activity…</p>}
      {activity && !entries.length && <p>No payments match this view.</p>}
      {entries.length > 0 && <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Order</th><th>Provider reference</th><th>Gross payment</th><th>Method</th><th>Receipt</th><th>Status</th><th>Updated in Kenya time</th><th>Action</th></tr></thead>
          <tbody>{entries.map(entry => <tr key={entry.reference}>
            <td>#{entry.order_id}</td><td>{entry.reference}</td><td>{cash(entry.amount_minor)}</td><td>{method(entry.channel)}</td>
            <td>{entry.receipt_id ? `#${entry.receipt_id}` : "—"}</td>
            <td>{entry.paid_at ? "Payment confirmed" : "Pending confirmation"}</td>
            <td>{dateFormat.format(new Date(entry.paid_at ?? entry.created_at))}</td>
            <td>{!entry.paid_at && <Button disabled={checked !== null} variant="secondary" onClick={() => void check(entry.order_id)}>
              {checked === entry.order_id ? "Checking…" : "Check provider"}
            </Button>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {(pages.length > 0 || activity?.next) && <div className="button-row">
        <Button variant="secondary" disabled={!pages.length || checked !== null} onClick={() => { setActivity(null); setError(""); setPages(previous => previous.slice(0, -1)); }}>Previous page</Button>
        <Button variant="secondary" disabled={!activity?.next || checked !== null} onClick={() => {
          if (activity?.next) { const next = activity.next; setActivity(null); setError(""); setPages(previous => [...previous, next]); }
        }}>Next page</Button>
      </div>}
    </section>
  </>;
}
