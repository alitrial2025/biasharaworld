"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button, Field, PageHeading, SelectField } from "@/components/ui";
import { cash } from "@/lib/operations";
import { kesMinor } from "@/lib/settlements";
import { useDemo } from "@/lib/store";
import { workspaceRequest } from "@/lib/workspace-request";
import { exchangeAction, exchangeStatus, type ExchangeWorkspace, type ExchangeAction, type ExchangeEvent, type SupplierExchange, type SupplierProfile } from "@/lib/supplier-exchange";

const path = "/api/supplier-exchange";
type Detail = { exchange: SupplierExchange; events: ExchangeEvent[]; stockReceipt: { branch: string; recorded_at: string } | null };
type Draft = { item: string; unit: string; quantity: string; unitKes: string };
function blankLine(): Draft { return { item: "", unit: "each", quantity: "1", unitKes: "" }; }

function Items({ rows, onChange, mode }: { rows: Draft[]; onChange: (items: Draft[]) => void; mode: "catalogue" | "request" | "quote" }) {
  return <>
    {rows.map((row, index) => <fieldset className="form-grid" key={index}>
      <legend>Item {index + 1}</legend>
      <Field label="Product or service" required value={row.item} maxLength={120} onChange={event => {
        onChange(rows.map((line, i) => i === index ? { ...line, item: event.target.value } : line));
      }} />
      <Field label="Unit" required value={row.unit} maxLength={120} onChange={event => {
        onChange(rows.map((line, i) => i === index ? { ...line, unit: event.target.value } : line));
      }} />
      {mode !== "catalogue" && <Field label="Quantity" type="number" min={1} max={100000} required value={row.quantity} onChange={event => {
        onChange(rows.map((line, i) => i === index ? { ...line, quantity: event.target.value } : line));
      }} />}
      {mode !== "request" && <Field label="Unit price (KES)" inputMode="decimal" required value={row.unitKes} onChange={event => {
        onChange(rows.map((line, i) => i === index ? { ...line, unitKes: event.target.value } : line));
      }} />}
      {(rows.length > 1 || mode === "catalogue") && <Button variant="secondary" onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove item</Button>}
    </fieldset>)}
    <Button variant="secondary" onClick={() => onChange([...rows, blankLine()])} disabled={rows.length >= 20}>Add item</Button>
  </>;
}

export function SupplierExchangePage() {
  const { store } = useDemo();
  const workspace = store.workspace;
  if (!workspace || !["Owner", "Manager"].includes(workspace.role)) {
    return <PageHeading title="Supplier network" description="An owner or manager can manage supplier requests and orders." />;
  }
  return <Network key={workspace.businessId} owner={workspace.role === "Owner"} />;
}

function Network({ owner }: { owner: boolean }) {
  const { store } = useDemo();
  const [data, setData] = useState<ExchangeWorkspace>();
  const [detail, setDetail] = useState<Detail>();
  const [profile, editProfile] = useState(false);
  const [target, setTarget] = useState<SupplierProfile>();
  const [action, setAction] = useState<ExchangeAction>();
  const [search, setSearch] = useState("");
  const [supplierPages, setSupplierPages] = useState<string[]>([]);
  const [inboxPage, setInboxPage] = useState(0);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const last = useRef<{ signature: string; id: string; requestId: string } | null>(null);
  const params = new URLSearchParams({ search, page: String(inboxPage) });
  if (supplierPages.length) params.set("supplierAfter", supplierPages.at(-1)!);
  const query = `${path}?${params}`;

  useEffect(() => {
    const controller = new AbortController();
    workspaceRequest<ExchangeWorkspace>(query, undefined, controller.signal).then(setData).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [query, reload]);

  async function open(id: string) {
    setBusy(true);
    setError("");
    setAction(undefined);
    try { setDetail(await workspaceRequest<Detail>(`${path}?exchange=${id}`)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not open this exchange."); }
    finally { setBusy(false); }
  }

  async function submit(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      let input = payload;
      if (payload.action !== "profile") {
        const signature = JSON.stringify(payload);
        if (last.current?.signature !== signature) {
          last.current = { signature, id: typeof payload.id === "string" ? payload.id : crypto.randomUUID(), requestId: crypto.randomUUID() };
        }
        input = { ...payload, id: last.current.id, requestId: last.current.requestId };
      }
      const result = await workspaceRequest<{ id?: string; stocked?: boolean }>(path, input);
      last.current = null;
      setTarget(undefined);
      setAction(undefined);
      editProfile(false);
      setReload(value => value + 1);
      if (result.id) setDetail(await workspaceRequest<Detail>(`${path}?exchange=${result.id}`));
      if (result.stocked) await store.hydrate();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this exchange."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading title="Supplier network" description="Find verified suppliers and exchange quotes, purchase orders, delivery records and invoices." />
    {error && <p className="operation-error" role="alert">{error}</p>}
    {data && !data.verified && <p>Complete <Link href="/dashboard/verification">merchant verification</Link> to publish a listing or commit to a new purchase order.</p>}
    {owner && data && <section className="panel settings-panel">
      <h2>Your supplier listing</h2>
      <p>{data.profile?.visible && data.verified ? "Visible to businesses using the supplier network." : "Your listing is hidden."}</p>
      {profile && data.verified
        ? <Listing key={data.profile?.business_id ?? "new"} current={data.profile} busy={busy} submit={submit} reportError={setError} />
        : <Button disabled={busy || !data.verified} onClick={() => editProfile(true)}>{data.profile ? "Edit supplier listing" : "Create supplier listing"}</Button>}
      {data.profile?.visible && <Button variant="secondary" disabled={busy} onClick={() => void submit({ action: "profile", visible: false })}>Hide listing</Button>}
    </section>}
    <section className="panel settings-panel">
      <h2>Find suppliers</h2>
      <form onSubmit={event => {
        event.preventDefault();
        setSupplierPages([]);
        setSearch(String(new FormData(event.currentTarget).get("search") ?? ""));
        setError("");
      }}>
        <Field label="Find by name, coverage, or item" name="search" maxLength={120} />
        <Button type="submit" disabled={busy}>Search suppliers</Button>
      </form>
      {data && !data.suppliers.length && <p>No verified supplier listings match this search.</p>}
      <div className="supplier-grid">
        {data?.suppliers.map(supplier => <article className="panel supplier-card" key={supplier.business_id}>
          <h3>{supplier.display_name}</h3>
          <p>{supplier.coverage} · {supplier.lead_days} day lead time · {cash(supplier.minimum_minor)} minimum</p>
          {supplier.terms && <p>{supplier.terms}</p>}
          {!!supplier.catalogue.length && <ul>{supplier.catalogue.map((line, index) => <li key={index}>{line.item} · {cash(line.unitMinor)} per {line.unit}</li>)}</ul>}
          <Button disabled={busy || !data.verified} onClick={() => { setTarget(supplier); setDetail(undefined); }}>Request a quote</Button>
        </article>)}
      </div>
      <div className="button-row">
        {!!supplierPages.length && <Button variant="secondary" onClick={() => setSupplierPages(supplierPages.slice(0, -1))}>Previous suppliers</Button>}
        {data?.nextSupplier && <Button variant="secondary" onClick={() => setSupplierPages([...supplierPages, data.nextSupplier!])}>Next suppliers</Button>}
      </div>
      {target && <ExchangeForm key={target.business_id} supplier={target} busy={busy} submit={submit} reportError={setError} close={() => setTarget(undefined)} />}
    </section>
    <section className="panel settings-panel">
      <h2>Quotes and orders</h2>
      {data && !data.exchanges.length && <p>No exchanges on this page.</p>}
      {data?.exchanges.map(entry => <p key={entry.id}>
        <Button variant="secondary" disabled={busy} onClick={() => { setTarget(undefined); void open(entry.id); }}>
          {entry.side === "buyer" ? entry.supplier_name : entry.buyer_name} · {exchangeStatus[entry.status]}
        </Button>
      </p>)}
      <div className="button-row">
        {inboxPage > 0 && <Button variant="secondary" onClick={() => setInboxPage(inboxPage - 1)}>Previous orders</Button>}
        {data?.nextPage && <Button variant="secondary" onClick={() => setInboxPage(data.nextPage!)}>Next orders</Button>}
      </div>
      {detail && <ExchangeDetails key={detail.exchange.id} detail={detail} action={action} setAction={setAction} busy={busy} submit={submit} reportError={setError} />}
    </section>
  </>;
}

function Listing({ current, busy, submit, reportError }: {
  current: SupplierProfile | null; busy: boolean; submit: (value: Record<string, unknown>) => Promise<void>; reportError: (value: string) => void;
}) {
  const [rows, setRows] = useState<Draft[]>((current?.catalogue ?? []).map(row => ({ ...row, quantity: "1", unitKes: (row.unitMinor / 100).toFixed(2) })));
  return <form onSubmit={(event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      void submit({ action: "profile", visible: true, coverage: fields.get("coverage"), terms: fields.get("terms"),
        leadDays: Number(fields.get("leadDays")), minimumMinor: kesMinor(String(fields.get("minimum"))),
        catalogue: rows.map(({ item, unit, unitKes }) => ({ item, unit, unitMinor: kesMinor(unitKes) })) });
    } catch (error) { reportError(error instanceof Error ? error.message : "Check the listing details."); }
  }}>
    <Field label="Coverage area" name="coverage" defaultValue={current?.coverage} maxLength={120} required />
    <Field label="Terms" name="terms" defaultValue={current?.terms} maxLength={1000} />
    <Field label="Lead time (days)" name="leadDays" type="number" min={0} max={365} defaultValue={current?.lead_days ?? 0} required />
    <Field label="Minimum order (KES)" name="minimum" inputMode="decimal" defaultValue={((current?.minimum_minor ?? 0) / 100).toFixed(2)} required />
    <Items mode="catalogue" rows={rows} onChange={setRows} />
    <Button type="submit" disabled={busy}>Publish supplier listing</Button>
  </form>;
}

function ExchangeDetails({ detail, action, setAction, busy, submit, reportError }: {
  detail: Detail; action: ExchangeAction | undefined; setAction: (value?: ExchangeAction) => void;
  busy: boolean; submit: (value: Record<string, unknown>) => Promise<void>; reportError: (value: string) => void;
}) {
  const { exchange, events } = detail;
  const [stockIntake, setStockIntake] = useState(false);
  return <article className="panel settings-panel">
    <h3>{exchange.buyer_name} and {exchange.supplier_name}</h3>
    <p role="status">{exchangeStatus[exchange.status]}</p>
    <h4>Requested items</h4><ul>{exchange.requested_lines.map((line, i) => <li key={i}>{line.quantity} {line.unit} · {line.item}</li>)}</ul>
    {exchange.offered_lines && <><h4>Quoted items</h4><ul>{exchange.offered_lines.map((line, i) => <li key={i}>
      {line.quantity} {line.unit} · {line.item} · {cash(line.unitMinor)} per unit
    </li>)}</ul><p>Delivery {cash(exchange.delivery_fee_minor ?? 0)} · Total {cash(exchange.quote_minor ?? 0)}</p></>}
    {exchange.invoice_reference && <p>Invoice {exchange.invoice_reference} · Due {exchange.due_on}</p>}
    {!!events.length && <><h4>Activity</h4><ul>{events.map((event, index) => <li key={index}>
      {event.recorded_at.slice(0, 10)} · {event.side === "buyer" ? "Buyer" : "Supplier"} · {event.action === "request" ? "Requested quote" : exchangeAction[event.action]}
      {[event.note, event.dispatchReference, event.proofReference, event.paymentReference].filter(Boolean).map((info, i) => <div key={i}>{info}</div>)}
    </li>)}</ul></>}
    <div className="button-row">{exchange.actions.map(step => <Button key={step} variant="secondary" disabled={busy} onClick={() => setAction(step)}>{exchangeAction[step]}</Button>)}</div>
    {action && <ExchangeForm key={`${exchange.id}:${exchange.version}:${action}`} exchange={exchange} action={action} busy={busy} submit={submit} reportError={reportError} close={() => setAction(undefined)} />}
    {detail.stockReceipt && <p>Stock recorded · {detail.stockReceipt.recorded_at.slice(0, 10)}</p>}
    {exchange.side === "buyer" && !detail.stockReceipt && ["received", "invoiced", "paid"].includes(exchange.status) && (
      stockIntake ? <StockIntake exchange={exchange} busy={busy} submit={submit} reportError={reportError} />
        : <Button variant="secondary" onClick={() => setStockIntake(true)}>Record inventory receipt</Button>
    )}
  </article>;
}

function StockIntake({ exchange, busy, submit, reportError }: {
  exchange: SupplierExchange; busy: boolean; submit: (value: Record<string, unknown>) => Promise<void>; reportError: (value: string) => void;
}) {
  const { state } = useDemo();
  const branch = state.operations.activeBranch;
  const products = state.products.filter(product => !product.components?.length);
  if (!products.length) return <p>Add stock items in <Link href="/dashboard/inventory">Inventory</Link> before recording receipt.</p>;
  return <form onSubmit={event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const lines = (exchange.offered_lines ?? []).flatMap((_, index) => {
      const productId = Number(fields.get(`product-${index}`));
      const expires = String(fields.get(`expires-${index}`));
      return productId ? [{ index, productId, expires }] : [];
    });
    if (!lines.length) { reportError("Select at least one stock item."); return; }
    if (lines.some(line => !line.expires)) { reportError("Enter an expiry date for each mapped item."); return; }
    void submit({ action: "receive_stock", id: exchange.id, version: exchange.version, branch, lines });
  }}>
    <h4>Stock for {state.operations.branches.find(item => item.id === branch)?.name}</h4>
    <p>Map stock goods to your products. Leave service lines unmapped. Use the actual expiry or 2099-12-31 for goods without an expiry.</p>
    {(exchange.offered_lines ?? []).map((line, index) => <fieldset className="form-grid" key={index}>
      <legend>{line.quantity} {line.unit} · {line.item}</legend>
      <SelectField name={`product-${index}`} label="Inventory product">
        <option value="">Skip this line</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
      </SelectField>
      <Field name={`expires-${index}`} label="Expiry date" type="date" />
    </fieldset>)}
    <Button type="submit" disabled={busy}>Add stock from this order</Button>
  </form>;
}

function ExchangeForm({ supplier, exchange, action, busy, submit, reportError, close }: {
  supplier?: SupplierProfile; exchange?: SupplierExchange; action?: ExchangeAction; busy: boolean;
  submit: (value: Record<string, unknown>) => Promise<void>; reportError: (value: string) => void; close: () => void;
}) {
  const [rows, setRows] = useState<Draft[]>(() => {
    if (!exchange) return [blankLine()];
    const offered = exchange.offered_lines;
    return (offered ?? exchange.requested_lines).map((line, index) => ({
      ...line, quantity: String(line.quantity), unitKes: offered ? (offered[index].unitMinor / 100).toFixed(2) : "",
    }));
  });
  const step = action ?? "request";
  return <form onSubmit={event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const input: Record<string, unknown> = { action: step, note: fields.get("note") };
    if (exchange) Object.assign(input, { id: exchange.id, version: exchange.version });
    try {
      if (step === "request" || step === "quote") {
        input.lines = rows.map(({ item, unit, quantity, unitKes }) => ({ item, unit, quantity: Number(quantity), ...(step === "quote" ? { unitMinor: kesMinor(unitKes) } : {}) }));
      }
      if (supplier) input.supplierId = supplier.business_id;
      if (step === "quote") input.deliveryFeeMinor = kesMinor(String(fields.get("deliveryFee")));
      for (const key of ["dispatchReference", "proofReference", "invoiceReference", "dueOn", "paymentReference"]) {
        if (fields.has(key)) input[key] = fields.get(key);
      }
      void submit(input);
    } catch (error) { reportError(error instanceof Error ? error.message : "Check the exchange details."); }
  }}>
    <h4>{supplier ? `Request a quote from ${supplier.display_name}` : exchangeAction[action!]}</h4>
    {(step === "quote" || step === "request") && <Items rows={rows} onChange={setRows} mode={step} />}
    {step === "quote" && <Field label="Delivery fee (KES)" name="deliveryFee" inputMode="decimal" defaultValue={((exchange?.delivery_fee_minor ?? 0) / 100).toFixed(2)} required />}
    {step === "dispatch" && <Field label="Dispatch or tracking reference" name="dispatchReference" maxLength={120} required />}
    {step === "receive" && <Field label="Delivery proof reference" name="proofReference" maxLength={120} required />}
    {step === "invoice" && <><Field label="Invoice reference" name="invoiceReference" maxLength={120} required /><Field label="Due date" name="dueOn" type="date" required /></>}
    {step === "record_payment" && <><p>Record a payment already made to the supplier.</p><Field label="Payment reference" name="paymentReference" maxLength={120} required /></>}
    <Field label={step === "dispute" ? "Describe the discrepancy" : "Note for the other business"} name="note" maxLength={1000} required={step === "dispute"} />
    <Button type="submit" disabled={busy}>{action ? exchangeAction[action] : "Send quote request"}</Button>
    <Button variant="secondary" onClick={close}>Close</Button>
  </form>;
}
