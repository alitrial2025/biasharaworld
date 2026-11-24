"use client";

import { useState } from "react";
import { Button, PageHeading, SelectField } from "@/components/ui";
import { businessImport, importHeaders, type ImportKind } from "@/lib/business-import";
import { downloadCSV } from "@/lib/csv";
import { useDemo } from "@/lib/store";

export function BusinessImportPage() {
  const { store } = useDemo();
  const [kind, setKind] = useState<ImportKind>("products");
  const [csv, setCsv] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const allowed = ["Owner", "Manager"].includes(store.workspace?.role ?? "");
  return <>
    <PageHeading title="Import business records" description="Bring products and opening stock or customer records and opening balances into your workspace." />
    {allowed ? <section className="panel settings-panel">
      <form onSubmit={async event => {
        event.preventDefault();
        setBusy(true);
        setError("");
        setNotice("");
        try {
          businessImport(kind, csv);
          const result = await store.saveRecord({ type: "importBusiness", kind, csv });
          setNotice(result.message);
          setCsv("");
        } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not import records."); }
        finally { setBusy(false); }
      }}>
        <SelectField label="Records to import" value={kind} onChange={value => {
          setKind(value === "customers" ? "customers" : "products");
          setCsv(""); setError(""); setNotice("");
        }}><option value="products">Products and opening stock</option><option value="customers">Customers and opening balances</option></SelectField>
        {kind === "products" && <p>Opening stock will be recorded in your active branch.</p>}
        <p>Import up to 100 records at a time. The import checks each row before saving the file.</p>
        <Button variant="secondary" onClick={() => downloadCSV(`import-${kind}.csv`, [...importHeaders[kind]], [])}>Download CSV template</Button>
        <label>CSV file<input type="file" accept=".csv,text/csv" disabled={busy} onChange={async event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          setError("");
          if (file.size > 90_000) { setError("The CSV file is too large. Import up to 100 records at a time."); return; }
          try { setCsv(await file.text()); }
          catch { setError("Could not read this CSV file."); }
        }} /></label>
        <label>CSV text<textarea value={csv} onChange={event => setCsv(event.target.value)} rows={8} maxLength={90_000} required /></label>
        <Button type="submit" disabled={busy || !csv.trim()}>Import records</Button>
      </form>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
    </section> : <p>Ask an owner or manager to import records.</p>}
  </>;
}
