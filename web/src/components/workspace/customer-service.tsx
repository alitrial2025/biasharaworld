"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Field, PageHeading, SelectField } from "@/components/ui";
import { useDemo } from "@/lib/store";
import { workspaceRequest } from "@/lib/workspace-request";

const path = "/api/customer-service";
type Notes = {
  notes: { id: string; body: string | null; recorded_at: string; redacted_at: string | null; redact_reason: string | null }[];
  nextPage: number | null;
};

export function CustomerServicePage() {
  const { store } = useDemo();
  const workspace = store.workspace;
  if (!workspace || !["Owner", "Manager"].includes(workspace.role)) {
    return <PageHeading title="Customer service notes" description="An owner or manager can view notes for this business." />;
  }
  return <NotesPanel key={workspace.businessId} owner={workspace.role === "Owner"} />;
}

function NotesPanel({ owner }: { owner: boolean }) {
  const { state } = useDemo();
  const [customer, setCustomer] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<Notes>();
  const [body, setBody] = useState("");
  const [redact, setRedact] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const retry = useRef<{ id: string; customer: string; body: string } | null>(null);
  useEffect(() => {
    if (!customer) return;
    const controller = new AbortController();
    workspaceRequest<Notes>(`${path}?customer=${customer}&page=${page}`, undefined, controller.signal).then(setData).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [customer, page, revision]);

  async function save(input: unknown, message: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      await workspaceRequest(path, input);
      setPage(0);
      setRevision(value => value + 1);
      setBody(""); setRedact(undefined);
      setNotice(message);
      retry.current = null;
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save the note."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading title="Customer service notes" description="Keep follow-ups and service history with the customer’s record." />
    <section className="panel settings-panel">
      <SelectField label="Customer" value={customer} onChange={value => {
        setCustomer(value); setData(undefined); setPage(0); setBody(""); setRedact(undefined); setError(""); setNotice("");
      }}>
        <option value="">Choose a customer</option>
        {state.customers.map(record => <option key={record.id} value={record.id}>{record.name}</option>)}
      </SelectField>
      {!state.customers.length && <p>Add a customer before saving a note.</p>}
      {customer && <form onSubmit={event => {
        event.preventDefault();
        const note = body.trim();
        if (!note) return;
        if (retry.current?.body !== note || retry.current.customer !== customer) retry.current = { id: crypto.randomUUID(), customer, body: note };
        void save({ action: "add", id: retry.current.id, customer: Number(customer), body: note }, "Note saved.");
      }}>
        <label className="field">Service note<textarea className="input" value={body} onChange={event => setBody(event.target.value)} rows={4} maxLength={2000} required /></label>
        <Button type="submit" disabled={busy || !body.trim()}>Save note</Button>
      </form>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
    {customer && <section className="panel settings-panel">
      <h2>Note history</h2>
      {!data && !error && <p role="status">Loading notes…</p>}
      {data && !data.notes.length && <p>No notes for this customer.</p>}
      {data?.notes.map(note => <article key={note.id} className="panel record-note">
        <p>{note.body ?? "Note content removed"}</p>
        <p>{note.recorded_at.slice(0, 10)}{note.redact_reason ? ` · ${note.redact_reason}` : ""}</p>
        {owner && note.body && <Button variant="secondary" disabled={busy} onClick={() => setRedact(note.id)}>Redact note</Button>}
        {redact === note.id && <form onSubmit={event => {
          event.preventDefault();
          void save({ action: "redact", id: note.id, reason: new FormData(event.currentTarget).get("reason") }, "Note content removed.");
        }}>
          <Field label="Reason for redaction" name="reason" maxLength={200} required />
          <Button type="submit" disabled={busy}>Remove note content</Button>
          <Button variant="secondary" onClick={() => setRedact(undefined)}>Cancel</Button>
        </form>}
      </article>)}
      {page > 0 && <Button variant="secondary" disabled={busy} onClick={() => setPage(page - 1)}>Previous page</Button>}
      {data?.nextPage && <Button variant="secondary" disabled={busy} onClick={() => setPage(data.nextPage!)}>Next page</Button>}
    </section>}
  </>;
}
