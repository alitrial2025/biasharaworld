import { z } from "zod";
import { ApiError } from "./server";
import { emptyFundingDraft, fundingPurposes } from "../funding";
import { minor } from "../operations";
import { businessReport } from "./reports";
import type { DemoState } from "../data";

const field = z.string().trim().max(160);
export const fundingDraftSchema = z
  .object({
    country: z.literal("KE"),
    amount: field,
    purpose: z.enum(fundingPurposes),
    months: field,
    monthlyRevenue: field,
    monthlyCosts: field,
    monthlyDebtPayments: field,
    tradingYears: field,
    registrationNumber: field,
    contactEmail: field,
    contactPhone: field,
    plan: z.string().trim().max(2000),
    consent: z.boolean(),
  })
  .strict();
export const fundingRequestSchema = z
  .object({
    businessId: z.uuid(),
    id: z.uuid(),
    revision: z.number().int().min(0),
    requestId: z.uuid(),
    action: z.enum(["save", "submit", "withdraw"]),
    payload: fundingDraftSchema,
  })
  .strict();
export function validateFundingSubmission(input: unknown) {
  const draft = fundingDraftSchema.parse(input);
  const amount = minor(draft.amount);
  if (amount <= 0 || amount > 1_000_000_000)
    throw new ApiError(
      "Enter a funding amount between KES 0.01 and KES 10,000,000.",
    );
  if (
    !/^\d+$/.test(draft.months) ||
    Number(draft.months) < 1 ||
    Number(draft.months) > 36
  )
    throw new ApiError("Choose a requested repayment period from 1–36 months.");
  for (const key of [
    "monthlyRevenue",
    "monthlyCosts",
    "monthlyDebtPayments",
  ] as const)
    if (minor(draft[key]) > 1_000_000_000)
      throw new ApiError("Enter monthly figures below KES 10,000,000.");
  if (
    !/^\d+(\.\d)?$/.test(draft.tradingYears) ||
    Number(draft.tradingYears) > 100
  )
    throw new ApiError(
      "Enter how many years this business has traded (0–100).",
    );
  if (!z.email().safeParse(draft.contactEmail).success)
    throw new ApiError("Enter a valid contact email.");
  const phoneDigits = draft.contactPhone.replace(/\D/g, "").length;
  if (
    !/^\+?[\d ().-]{7,30}$/.test(draft.contactPhone) ||
    phoneDigits < 7 ||
    phoneDigits > 15
  )
    throw new ApiError("Enter a valid contact phone number.");
  if (draft.plan.length < 30)
    throw new ApiError(
      "Describe how the funding would be used in at least 30 characters.",
    );
  if (!draft.consent)
    throw new ApiError(
      "Confirm the figures and storage consent before recording this request.",
    );
  return draft;
}
export { emptyFundingDraft };
/** Funding preparation is business-wide; the selected sales branch must not change it. */
export function fundingReadiness(state: DemoState) {
  const reports = state.operations.branches.map((branch) =>
    businessReport(
      {
        ...state,
        operations: { ...state.operations, activeBranch: branch.id },
      },
      "Month",
    ),
  );
  const expenses = reports[0]?.expenses ?? 0;
  return {
    sales30: reports.reduce((sum, report) => sum + report.sales, 0),
    expenses30: expenses,
    profit30:
      reports.reduce(
        (sum, report) => sum + report.profit + report.expenses,
        0,
      ) - expenses,
    receipts30: reports.reduce(
      (sum, report) => sum + report.receipts.length,
      0,
    ),
    products: state.products.length,
    currency: "KES",
    country: "KE",
  };
}
