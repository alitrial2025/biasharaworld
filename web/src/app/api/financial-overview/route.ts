import { z } from "zod";
import { admin, ApiError, fail, identity, json, loadBusiness } from "@/lib/backend/server";
import { ageBucket, emptyAgeing, type Ageing, type FinancialOverview } from "@/lib/financial-overview";
import { invoiceBalance, localDate } from "@/lib/operations";
import { paymentMethods, type PaymentChannel } from "@/lib/payment-methods";

export async function GET(request: Request) {
  try {
    const user = await identity(request);
    const workspace = await loadBusiness(user);
    if (!workspace || !["Owner", "Manager"].includes(workspace.role)) {
      throw new ApiError("Only owners and managers can view the financial overview.", 403);
    }
    const days = z.enum(["7", "30", "90"]).parse(new URL(request.url).searchParams.get("days") ?? "30");
    const through = localDate();
    const from = new Date(Date.parse(through) - (Number(days) - 1) * 86_400_000).toISOString().slice(0, 10);
    const totals = await admin().rpc("financial_workspace_totals", {
      target_business: workspace.businessId, actor: user.id, start_on: from, end_on: through,
    });
    if (totals.error || !totals.data) throw new ApiError("Could not load settlement and supplier totals.", 503);

    const { payables, online } = totals.data as { payables: Partial<Ageing>; online: Partial<Record<PaymentChannel, number>> };
    const { operations, expenses, customers } = workspace.state;
    const included = (date: string) => date >= from && date <= through;
    const inflows: Record<string, number> = {};
    const add = (method: string, amount: number) => {
      const label = method === "Bank" ? "Bank transfer" : method;
      inflows[label] = (inflows[label] ?? 0) + amount;
    };
    const financed = new Map(operations.documents.filter(doc => doc.saleId && doc.installments?.length).map(doc => [doc.saleId, doc]));
    for (const receipt of operations.receipts) {
      if (!included(receipt.date)) continue;
      for (const tender of receipt.payments) add(tender.method, tender.amount);
      for (const deposit of financed.get(receipt.id)?.installments ?? []) add(deposit.method, -deposit.amount);
    }
    const receivables = emptyAgeing();
    let returnedDeposits = 0;
    for (const doc of operations.documents) {
      if (doc.kind !== "Invoice") continue;
      for (const deposit of doc.installments ?? []) {
        if (included(deposit.date)) add(deposit.method, deposit.amount);
        if (doc.cancellation && included(doc.cancellation.date)) returnedDeposits += deposit.amount;
      }
      if (doc.status === "Issued locally") receivables[ageBucket(doc.due, through)] += invoiceBalance(doc);
    }
    const result: FinancialOverview = {
      from, through, inflows, receivables, payables: { ...emptyAgeing(), ...payables },
      online: Object.fromEntries(Object.entries(online).map(([channel, amount]) => [paymentMethods[channel as PaymentChannel], amount])),
      expenses: expenses.filter(record => included(record.date)).reduce((sum, record) => sum + Math.round(record.amount * 100), 0),
      returns: operations.returns.filter(record => included(record.date)).reduce((sum, record) => sum + record.amount, 0),
      returnedDeposits, customerBalances: customers.reduce((sum, customer) => sum + Math.round(customer.balance * 100), 0),
    };
    return json(result);
  } catch (error) { return fail(error); }
}
