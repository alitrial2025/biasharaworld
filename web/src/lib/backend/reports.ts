import type { DemoState } from "../data";
import { localDate } from "../operations";
export function businessReport(state: DemoState, period = "Day") {
  const days = period === "Month" ? 30 : period === "Week" ? 7 : 1;
  const end = localDate();
  const startDate = new Date(end + "T00:00:00Z");
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  const start = startDate.toISOString().slice(0, 10);
  const branch = state.operations.activeBranch;
  const receipts = state.operations.receipts.filter(
    (r) => r.branch === branch && r.date >= start && r.date <= end,
  );
  const refunds = state.operations.returns.filter(
    (r) =>
      r.date >= start &&
      r.date <= end &&
      state.operations.receipts.some(
        (s) => s.id === r.saleId && s.branch === branch,
      ),
  );
  const sales =
    (receipts.reduce((s, r) => s + r.total, 0) -
      refunds.reduce((s, r) => s + r.amount, 0)) /
    100;
  const expenses = state.expenses
    .filter((e) => e.date >= start && e.date <= end)
    .reduce((s, e) => s + e.amount, 0);
  const cost =
    receipts.reduce(
      (s, r) => s + r.lines.reduce((a, l) => a + (l.cost ?? 0) * l.quantity, 0),
      0,
    ) -
    refunds
      .filter((r) => r.restock)
      .reduce(
        (s, r) =>
          s +
          (state.operations.receipts
            .find((x) => x.id === r.saleId)
            ?.lines.find((l) => l.productId === r.productId)?.cost ?? 0) *
            r.quantity,
        0,
      );
  const revenue = new Map<number, number>();
  for (const r of receipts)
    for (const l of r.lines)
      revenue.set(l.productId, (revenue.get(l.productId) || 0) + l.net / 100);
  for (const r of refunds)
    revenue.set(r.productId, (revenue.get(r.productId) || 0) - r.amount / 100);
  const products = [...revenue]
    .map(([id, amount]) => ({
      product: state.products.find((p) => p.id === id),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
  // Daily charts use the actual Nairobi transaction hour; longer periods use calendar days.
  const series = Array.from({ length: days === 1 ? 24 : days }, () => 0);
  for (const r of receipts) {
    const index =
      days === 1
        ? r.createdAt
          ? Number(
              new Intl.DateTimeFormat("en-GB", {
                timeZone: "Africa/Nairobi",
                hour: "2-digit",
                hourCycle: "h23",
              }).format(new Date(r.createdAt)),
            )
          : null
        : Math.floor((Date.parse(r.date) - Date.parse(start)) / 86400000);
    if (index !== null && index >= 0 && index < series.length)
      series[index] += r.total / 100;
  }
  for (const r of refunds) {
    const index =
      days === 1
        ? r.createdAt
          ? Number(
              new Intl.DateTimeFormat("en-GB", {
                timeZone: "Africa/Nairobi",
                hour: "2-digit",
                hourCycle: "h23",
              }).format(new Date(r.createdAt)),
            )
          : null
        : Math.floor((Date.parse(r.date) - Date.parse(start)) / 86400000);
    if (index !== null && index >= 0 && index < series.length)
      series[index] -= r.amount / 100;
  }
  const expenseSeries =
    days > 1
      ? Array.from({ length: days }, (_, i) =>
          state.expenses
            .filter(
              (e) =>
                e.date ===
                new Date(Date.parse(start) + i * 86400000)
                  .toISOString()
                  .slice(0, 10),
            )
            .reduce((s, e) => s + e.amount, 0),
        )
      : null;
  const profitSeries = expenseSeries
    ? series.map((value, i) => {
        const date = new Date(Date.parse(start) + i * 86400000)
          .toISOString()
          .slice(0, 10);
        const costs = receipts
          .filter((r) => r.date === date)
          .reduce(
            (s, r) =>
              s +
              r.lines.reduce(
                (total, l) => total + (l.cost ?? 0) * l.quantity,
                0,
              ),
            0,
          );
        const recovered = refunds
          .filter((r) => r.date === date && r.restock)
          .reduce(
            (s, r) =>
              s +
              (state.operations.receipts
                .find((x) => x.id === r.saleId)
                ?.lines.find((l) => l.productId === r.productId)?.cost ?? 0) *
                r.quantity,
            0,
          );
        return value - (costs - recovered) / 100 - expenseSeries[i];
      })
    : null;
  const timingIncomplete =
    days === 1 &&
    (receipts.some((r) => !r.createdAt) || refunds.some((r) => !r.createdAt));
  return {
    sales,
    expenses,
    profit: sales - cost / 100 - expenses,
    products,
    series,
    expenseSeries,
    profitSeries,
    timingIncomplete,
    start,
    end,
    receipts,
    refunds,
  };
}
