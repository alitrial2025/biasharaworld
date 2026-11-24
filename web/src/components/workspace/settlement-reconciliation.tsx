"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button, Field, PageHeading, SelectField } from "@/components/ui";
import { downloadCSV } from "@/lib/csv";
import { cash } from "@/lib/operations";
import { matchLabels, sourceLabels, type StatementMatch } from "@/lib/settlements";
import { useDemo } from "@/lib/store";
import { workspaceRequest } from "@/lib/workspace-request";

const path = "/api/settlements";
type Page = { entries: StatementMatch[]; next: string | null };

export function SettlementReconciliationPage() {
  const { store } = useDemo();
  const workspace = store.workspace;
  if (!workspace || !["Owner", "Manager"].includes(workspace.role)) {
    return <PageHeading title="Settlement reconciliation" description="An owner or manager can reconcile settlement statements." />;
  }
  return <Statements key={workspace.businessId} owner={workspace.role === "Owner"} />;
}

function Statements({ owner }: { owner: boolean }) {
  const [report, setReport] = useState<Page>();
  const [pages, setPages] = useState<string[]>([]);
  const [exceptions, setExceptions] = useState(false);
  const [csv, setCsv] = useState("");
  const [correction, setCorrection] = useState<{ id: number; label: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const query = new URLSearchParams({ exceptions: String(exceptions) });
  if (pages.length) query.set("after", pages.at(-1)!);
  const url = `${path}?${query}`;

  useEffect(() => {
    const controller = new AbortController();
    workspaceRequest<Page>(url, undefined, controller.signal).then(setReport).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [url, revision]);

  async function run(input: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await workspaceRequest<{ added?: number; duplicates?: number; discarded?: boolean }>(path, input);
      if (result.discarded) {
        setCorrection(null);
        setNotice("Line discarded. The correction was recorded.");
      } else {
        setCsv("");
        setNotice(`Imported ${result.added} lines. Skipped ${result.duplicates} duplicates.`);
      }
      setReport(undefined);
      setPages([]);
      setRevision(value => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not update the statement.");
    } finally { setBusy(false); }
  }

  function importFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    void run({ action: "import", source: fields.get("source"), csv });
  }

  function exportReport() {
    downloadCSV("settlement-matches.csv", ["Reference", "Status", "Source", "Date", "KES"],
      (report?.entries ?? []).flatMap(entry => entry.lines.map(line =>
        [entry.reference, matchLabels[entry.status], sourceLabels[line.source], line.date, (line.amountMinor / 100).toFixed(2)])));
  }

  return <>
    <PageHeading title="Settlement reconciliation" description="Match provider payouts to bank or mobile-money deposits by reference and net amount." />
    <section className="panel settings-panel">
      <h2>Import a statement</h2>
      <p>Use a payout reference that appears in both statements. Import credits in KES with the headings <code>date,reference,amount_kes</code> and dates in YYYY-MM-DD format.</p>
      <Button variant="secondary" onClick={() => downloadCSV("settlement-import-template.csv",
        ["date", "reference", "amount_kes"], [])}>Download CSV template</Button>
      <form onSubmit={importFile}>
        <SelectField name="source" label="Statement source" required>
          {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </SelectField>
        <label>CSV file<input type="file" accept=".csv,text/csv" onChange={async event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          setError("");
          if (file.size > 130_000) { setError("Import up to 500 lines at a time."); return; }
          try { setCsv(await file.text()); }
          catch { setError("Could not read this CSV file."); }
        }} /></label>
        <label>CSV text<textarea value={csv} onChange={event => setCsv(event.target.value)} rows={5} maxLength={130_000} required /></label>
        <Button type="submit" disabled={busy || !csv.trim()}>Import statement</Button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
    <section className="panel settings-panel">
      <h2>Statement matches</h2>
      <p>Matches are based on imported statement lines. Review exceptions against the original reports.</p>
      <div className="button-row">
        <label><input type="checkbox" checked={exceptions} onChange={event => {
          setReport(undefined); setError(""); setPages([]); setExceptions(event.target.checked);
        }} /> Show exceptions only</label>
        <Button variant="secondary" onClick={exportReport} disabled={!report?.entries.length}>Export this page</Button>
      </div>
      {!report && !error && <p role="status">Loading statement matches…</p>}
      {report && !report.entries.length && <p>No statement matches in this view.</p>}
      {!!report?.entries.length && <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Reference</th><th>Result</th><th>Imported lines</th></tr></thead>
        <tbody>{report.entries.map(entry => <tr key={entry.reference}>
          <td>{entry.reference}</td><td>{matchLabels[entry.status]}</td>
          <td><ul>{entry.lines.map(line => <li key={line.id}>
            {sourceLabels[line.source]} · {line.date} · {cash(line.amountMinor)}
            {owner && <button className="text-link" onClick={() => setCorrection({ id: line.id, label: `${sourceLabels[line.source]} · ${entry.reference}` })}>Correct line</button>}
          </li>)}</ul></td>
        </tr>)}</tbody>
      </table></div>}
      {correction && <form onSubmit={event => {
        event.preventDefault();
        const reason = new FormData(event.currentTarget).get("reason");
        void run({ action: "discard", id: correction.id, reason });
      }}>
        <h3>Discard an incorrect line</h3><p>{correction.label}</p>
        <Field name="reason" label="Reason for correction" maxLength={200} required />
        <Button type="submit" disabled={busy}>Discard imported line</Button>
        <Button variant="secondary" onClick={() => setCorrection(null)}>Cancel</Button>
      </form>}
      <div className="button-row">
        {!!pages.length && <Button variant="secondary" onClick={() => { setReport(undefined); setPages(pages.slice(0, -1)); }}>Previous page</Button>}
        {report?.next && <Button variant="secondary" onClick={() => { setPages([...pages, report.next!]); setReport(undefined); }}>Next page</Button>}
      </div>
    </section>
  </>;
}
