import { test, expect } from "@playwright/test";
import { compareFundingTerms, emptyFundingDraft } from "../src/lib/funding";
import {
  fundingReadiness,
  fundingRequestSchema,
  validateFundingSubmission,
} from "../src/lib/backend/funding";
import { emptyBusiness } from "../src/lib/backend/empty";
import { localDate, type DetailedReceipt } from "../src/lib/operations";

test("funding comparison uses user-entered terms and conserves cents and fees", () => {
  expect(compareFundingTerms(100000, 3, 0, 125)).toEqual({
    monthly: 33333,
    total: 100125,
    cost: 125,
  });
  expect(compareFundingTerms(100000, 12, 12, 125)).toEqual({
    monthly: 8885,
    total: 106744,
    cost: 6744,
  });
  expect(() => compareFundingTerms(0, 12, 12, 0)).toThrow();
  expect(() => compareFundingTerms(1000, 12, NaN, 0)).toThrow();
  expect(() => compareFundingTerms(1000, 12, 12, -1)).toThrow();
});
test("recording a funding request requires complete figures, consent and Kenya market", () => {
  const payload = {
    ...emptyFundingDraft("owner@example.com", "+254700123456"),
    amount: "10000.25",
    monthlyRevenue: "5000.25",
    monthlyCosts: "3000.50",
    monthlyDebtPayments: "0",
    tradingYears: "1.5",
    plan: "Buy additional coffee stock and repay from the shop's monthly trading surplus.",
    consent: true,
  };
  expect(validateFundingSubmission(payload)).toEqual(payload);
  expect(() =>
    validateFundingSubmission({ ...payload, consent: false }),
  ).toThrow(/consent/);
  expect(() =>
    validateFundingSubmission({ ...payload, amount: "1.001" }),
  ).toThrow();
  expect(() =>
    validateFundingSubmission({ ...payload, contactEmail: "bad" }),
  ).toThrow(/email/);
  for (const contactPhone of [
    "-------",
    "+++++++",
    "123456",
    "1234567890123456",
  ])
    expect(() =>
      validateFundingSubmission({ ...payload, contactPhone }),
    ).toThrow(/phone/);
  expect(() =>
    validateFundingSubmission({ ...payload, country: "UG" }),
  ).toThrow();
  expect(() =>
    fundingRequestSchema.parse({
      businessId: crypto.randomUUID(),
      id: crypto.randomUUID(),
      revision: 0,
      requestId: crypto.randomUUID(),
      action: "approve",
      payload,
    }),
  ).toThrow();
});
test("funding readiness includes every branch and deducts business expenses once", () => {
  const state = emptyBusiness();
  state.operations.branches.push({
    id: "east",
    name: "East shop",
    location: "Nairobi",
  });
  const make = (
    id: number,
    branch: string,
    total: number,
    cost: number,
  ): DetailedReceipt => ({
    id,
    branch,
    customer: "Walk-in customer",
    date: localDate(),
    createdAt: new Date().toISOString(),
    lines: [
      {
        productId: id,
        name: "Coffee",
        quantity: 1,
        unit: total,
        net: total,
        cost,
      },
    ],
    discount: 0,
    total,
    payments: [{ method: "Cash", amount: total }],
    earned: 0,
    redeemed: 0,
    returned: {},
  });
  state.operations.receipts = [
    make(1, "main", 1000, 300),
    make(2, "east", 2000, 600),
  ];
  state.expenses = [
    {
      id: 1,
      name: "Transport",
      category: "Transport",
      amount: 1.25,
      date: localDate(),
      method: "Cash",
    },
  ];
  const first = fundingReadiness(state);
  state.operations.activeBranch = "east";
  expect(fundingReadiness(state)).toEqual(first);
  expect(first.sales30).toBe(30);
  expect(first.expenses30).toBe(1.25);
  expect(first.profit30).toBe(19.75);
  expect(first.receipts30).toBe(2);
});
