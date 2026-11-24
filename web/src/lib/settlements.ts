export const sourceLabels = { provider: "Provider settlement", bank: "Bank deposit", mobile_money: "Mobile money deposit" };
export type StatementSource = keyof typeof sourceLabels;
export const matchLabels = {
  matched: "Matched", missing_provider: "Missing provider settlement", missing_deposit: "Missing deposit",
  amount_mismatch: "Amount mismatch", multiple_deposits: "Multiple deposits",
};
export type StatementMatch = {
  reference: string;
  lines: { id: number; source: StatementSource; date: string; amountMinor: number }[];
  status: keyof typeof matchLabels;
};

export function kesMinor(value: string) {
  const match = /^(\d{1,11})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error("Enter KES using digits and up to two decimal places.");
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}
