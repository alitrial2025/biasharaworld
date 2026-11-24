"use client";

import { useEffect, useState } from "react";
import { Button, PageHeading, SelectField } from "@/components/ui";
import { downloadCSV } from "@/lib/csv";
import { ageingLabels, type Ageing, type FinancialOverview } from "@/lib/financial-overview";
import { cash } from "@/lib/operations";
import { useDemo } from "@/lib/store";
import { workspaceRequest } from "@/lib/workspace-request";

export function FinancialOverviewPage() {
  const { store } = useDemo();
  const workspace = store.workspace;
  if (!workspace || !["Owner", "Manager"].includes(workspace.role)) {
    return <PageHeading title="Financial overview" description="An owner or manager can review these figures." />;
  }
  return <Overview key={workspace.businessId} />;
}

function Overview() {
  const [days, setDays] = useState("30");
  const [report, setReport] = useState<FinancialOverview>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    workspaceRequest<FinancialOverview>(`/api/financial-overview?days=${days}`, undefined, controller.signal).then(setReport).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => controller.abort();
  }, [days]);

  const inflow = Object.values(report?.inflows ?? {}).reduce((sum, amount) => sum + amount, 0);
  const outflow = (report?.expenses ?? 0) + (report?.returns ?? 0) + (report?.returnedDeposits ?? 0);
  function exportData() {
    if (!report) return;
    const money = (amount: number) => (amount / 100).toFixed(2);
    const rows = [
      ...Object.entries(report.inflows).map(([method, amount]) => ["Recorded receipts and deposits", method, money(amount)]),
      ...Object.entries(report.online).map(([method, amount]) => ["Paystack collections", method, money(amount)]),
      ["Recorded outflows", "Expenses", money(report.expenses)],
      ["Recorded outflows", "Sales returns", money(report.returns)],
      ["Recorded outflows", "Returned invoice deposits", money(report.returnedDeposits)],
      ["Recorded net movement", "Receipts less recorded outflows", money(inflow - outflow)],
      ...Object.entries(ageingLabels).map(([key, label]) => ["Invoice balances", label, money(report.receivables[key as keyof Ageing])]),
      ...Object.entries(ageingLabels).map(([key, label]) => ["Supplier bills", label, money(report.payables[key as keyof Ageing])]),
      ["Customer accounts", "Undated balances", money(report.customerBalances)],
    ];
    downloadCSV("financial-overview.csv", ["Section", "Description", "KES", "From", "Through"], rows.map(row => [...row, report.from, report.through]));
  }

  return <>
    <PageHeading title="Financial overview" description="Review recorded collections, outflows, overdue invoices and supplier bills.">
      <Button variant="secondary" onClick={exportData} disabled={!report}>Export finance summary</Button>
    </PageHeading>
    <section className="panel settings-panel">
      <SelectField value={days} label="Cash movement period" onChange={value => { setReport(undefined); setError(""); setDays(value); }}>
        <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
      </SelectField>
      {error && <p role="alert">{error}</p>}
      {!report && !error && <p role="status">Loading financial overview…</p>}
      {report && <>
        <p>{report.from} to {report.through} · Kenya time</p>
        <dl><dt>Recorded receipts and invoice deposits</dt><dd>{cash(inflow)}</dd>
          <dt>Recorded expenses, sales returns and returned deposits</dt><dd>{cash(outflow)}</dd>
          <dt>Recorded net movement</dt><dd>{cash(inflow - outflow)}</dd></dl>
        <h2>Receipts by method</h2>
        {!!Object.keys(report.inflows).length ? <ul>{Object.entries(report.inflows).map(([method, amount]) => <li key={method}>{method} · {cash(amount)}</li>)}</ul>
          : <p>No receipts or deposits in this range.</p>}
        <h2>Provider-confirmed collections</h2>
        <p>These Paystack totals use the provider payment date. Check settlement reconciliation for bank deposits.</p>
        {!!Object.keys(report.online).length ? <ul>{Object.entries(report.online).map(([method, amount]) => <li key={method}>{method} · {cash(amount)}</li>)}</ul>
          : <p>No provider-confirmed collections in this range.</p>}
        <Button href="/dashboard/settlements" variant="secondary">Reconcile settlements</Button>
      </>}
    </section>
    {report && <section className="panel settings-panel">
      <h2>Outstanding invoices and supplier bills</h2>
      <p>Ageing as of {report.through}. Supplier bills come from the supplier network.</p>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>Age</th><th>Customer invoices</th><th>Supplier bills</th></tr></thead>
        <tbody>{Object.entries(ageingLabels).map(([key, label]) => <tr key={key}><td>{label}</td>
          <td>{cash(report.receivables[key as keyof Ageing])}</td><td>{cash(report.payables[key as keyof Ageing])}</td></tr>)}</tbody>
      </table></div>
      <p>Undated customer account balances · {cash(report.customerBalances)}</p>
    </section>}
  </>;
}
