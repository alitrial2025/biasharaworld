export const ageingLabels = {
  current: "Current", overdue30: "1–30 days overdue", overdue60: "31–60 days overdue",
  overdue90: "61–90 days overdue", overdue91: "91+ days overdue",
} as const;
export type Ageing = Record<keyof typeof ageingLabels, number>;
export type FinancialOverview = {
  from: string; through: string;
  inflows: Record<string, number>;
  online: Record<string, number>;
  expenses: number;
  returns: number;
  returnedDeposits: number;
  receivables: Ageing;
  payables: Ageing;
  customerBalances: number;
};
export function emptyAgeing(): Ageing {
  return { current: 0, overdue30: 0, overdue60: 0, overdue90: 0, overdue91: 0 };
}
export function ageBucket(due: string, now: string): keyof Ageing {
  const delta = (Date.parse(now) - Date.parse(due)) / 86_400_000;
  if (delta <= 0) return "current";
  if (delta <= 30) return "overdue30";
  if (delta <= 60) return "overdue60";
  if (delta <= 90) return "overdue90";
  return "overdue91";
}
