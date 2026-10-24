export const fundingPurposes = [
  "Stock",
  "Equipment",
  "Working capital",
  "Expansion",
  "Other",
] as const;
export type FundingDraft = {
  country: "KE";
  amount: string;
  purpose: string;
  months: string;
  monthlyRevenue: string;
  monthlyCosts: string;
  monthlyDebtPayments: string;
  tradingYears: string;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  plan: string;
  consent: boolean;
};
export const emptyFundingDraft = (email = "", phone = ""): FundingDraft => ({
  country: "KE",
  amount: "",
  purpose: "Stock",
  months: "6",
  monthlyRevenue: "",
  monthlyCosts: "",
  monthlyDebtPayments: "0",
  tradingYears: "",
  registrationNumber: "",
  contactEmail: email,
  contactPhone: phone,
  plan: "",
  consent: false,
});
export type FundingApplication = {
  id: string;
  business_id: string;
  revision: number;
  status: "draft" | "submitted" | "withdrawn";
  payload: FundingDraft;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  history: { action: "save" | "submit" | "withdraw"; at: string }[];
};
export type FundingWorkspace = {
  businessId: string;
  applications: FundingApplication[];
  providerConfigured: false;
  verificationStatus: "not_started" | "draft" | "submitted";
  readiness: {
    sales30: number;
    expenses30: number;
    profit30: number;
    receipts30: number;
    products: number;
    currency: "KES";
    country: "KE";
  };
};
export const fundingStatus = (status: FundingApplication["status"]) =>
  status === "submitted"
    ? "Recorded · provider pending"
    : status === "withdrawn"
      ? "Withdrawn"
      : "Draft";

/** User-entered comparison terms only. Amounts are integer minor units. */
export function compareFundingTerms(
  principal: number,
  months: number,
  annualRate: number,
  fees: number,
) {
  if (
    !Number.isSafeInteger(principal) ||
    principal <= 0 ||
    principal > 1_000_000_000 ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 120 ||
    !Number.isFinite(annualRate) ||
    annualRate < 0 ||
    annualRate > 100 ||
    !Number.isSafeInteger(fees) ||
    fees < 0 ||
    fees > 1_000_000_000
  )
    throw new Error(
      "Enter a positive amount, 1–120 months, an annual rate from 0–100%, and non-negative fees.",
    );
  const rate = annualRate / 1200;
  const monthly = Math.round(
    rate
      ? (principal * rate) / (1 - Math.pow(1 + rate, -months))
      : principal / months,
  );
  const total =
    Math.round(
      rate
        ? ((principal * rate) / (1 - Math.pow(1 + rate, -months))) * months
        : principal,
    ) + fees;
  return { monthly, total, cost: total - principal };
}
