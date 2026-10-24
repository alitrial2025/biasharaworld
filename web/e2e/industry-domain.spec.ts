import { test, expect } from "@playwright/test";
import { industries, resolveIndustry } from "../src/lib/industries";
import {
  validateIndustryRecord,
  reservationFor,
  industryRequest,
  encodeIndustryCursor,
  decodeIndustryCursor,
} from "../src/lib/backend/industry";
import {
  businessAccess,
  emptyVerification,
  verificationVersion,
} from "../src/lib/verification";
function fieldsFor(workflow: (typeof industries)[number]["workflows"][number]) {
  return Object.fromEntries(
    workflow.fields.map((field) => [
      field.key,
      field.type === "number"
        ? String(Math.max(field.min || 0, 1))
        : field.type === "select"
          ? field.options![0]
          : field.type === "date"
            ? "2026-12-01"
            : field.type === "datetime"
              ? field.key === workflow.reservation?.endField
                ? "2026-12-01T12:00"
                : "2026-12-01T10:00"
              : "Test reference",
    ]),
  );
}
test("all twenty sectors expose usable fields and sixty validated workflows", () => {
  expect(industries).toHaveLength(20);
  expect(new Set(industries.map((i) => i.id)).size).toBe(20);
  expect(industries.flatMap((i) => i.workflows)).toHaveLength(60);
  for (const industry of industries)
    for (const workflow of industry.workflows) {
      const record = {
        industryId: industry.id,
        workflowId: workflow.id,
        title: "Test work",
        customer: "Test customer",
        status: workflow.statuses[0],
        fields: fieldsFor(workflow),
        amountMinor: 10000,
      };
      expect(validateIndustryRecord(record).id).toBe(workflow.id);
      expect(() =>
        validateIndustryRecord({ ...record, status: "Invented" }),
      ).toThrow();
      expect(() =>
        validateIndustryRecord({
          ...record,
          fields: { ...record.fields, hiddenBypass: "bad" },
        }),
      ).toThrow();
      for (const field of workflow.fields.filter((f) => f.required))
        expect(() =>
          validateIndustryRecord({
            ...record,
            fields: { ...record.fields, [field.key]: "" },
          }),
        ).toThrow();
    }
  expect(resolveIndustry("Retail shop").id).toBe("retail");
  expect(resolveIndustry("Wholesale").id).toBe("wholesale");
});
test("bookings reject invalid dates, reversed slots and out-of-range values", () => {
  const industry = industries.find((i) => i.id === "rentals")!,
    workflow = industry.workflows[0],
    record = {
      industryId: industry.id,
      workflowId: workflow.id,
      title: "Booking",
      customer: "Test",
      status: workflow.statuses[0],
      fields: fieldsFor(workflow),
      amountMinor: 0,
    };
  expect(() =>
    validateIndustryRecord({
      ...record,
      fields: { ...record.fields, start: "2026-02-30T10:00" },
    }),
  ).toThrow();
  expect(() =>
    validateIndustryRecord({
      ...record,
      fields: { ...record.fields, end: "2026-12-01T09:00" },
    }),
  ).toThrow();
  expect(() =>
    validateIndustryRecord({
      ...record,
      fields: { ...record.fields, start: "2026-12-01T25:00" },
    }),
  ).toThrow();
  const dbRecord = {
    industry_id: industry.id,
    workflow_id: workflow.id,
    fields: record.fields,
    status: record.status,
    archived: false,
  };
  expect(reservationFor(dbRecord)?.pool).toBe("rentals:asset");
  expect(
    reservationFor({ ...dbRecord, status: workflow.terminalStatuses[0] }),
  ).toBeNull();
  expect(reservationFor({ ...dbRecord, archived: true })).toBeNull();
});
test("readiness fails closed and never claims identity verification", () => {
  expect(businessAccess(null).featuresUnlocked).toBe(false);
  const profile = emptyVerification({
    legalName: "Owner",
    tradingName: "Company",
    contactName: "Owner",
    phone: "+254700123456",
    email: "owner@example.com",
    businessAddress: "Nairobi",
    declaration: true,
  });
  const submitted = {
    status: "submitted",
    profile,
    consent_version: verificationVersion,
    consented_at: "2026-10-24T12:00:00Z",
  };
  expect(businessAccess(submitted)).toMatchObject({
    featuresUnlocked: true,
    identityStatus: "provider_pending",
  });
  expect(
    businessAccess({
      ...submitted,
      profile: {
        ...profile,
        legalName: "\u00a0Owner\ufeff",
        phone: "+254\u00a0700\u2000123456",
      },
    }).featuresUnlocked,
  ).toBe(true);
  expect(
    businessAccess({
      ...submitted,
      profile: { ...profile, legalName: "😀".repeat(101) },
    }).featuresUnlocked,
  ).toBe(true);
  for (const broken of [
    { ...submitted, profile: { ...profile, email: "a@b.c" } },
    { ...submitted, profile: { ...profile, email: "a..b@example.com" } },
    { ...submitted, profile: { ...profile, email: ".a@example.com" } },
    { ...submitted, profile: { ...profile, email: "a'@example.com" } },
    { ...submitted, profile: { ...profile, legalName: "😀".repeat(201) } },
    { ...submitted, profile: { ...profile, legalName: "\u00a0\ufeff" } },
    { ...submitted, consented_at: "infinity" },
    { ...submitted, status: "draft" },
    { ...submitted, consent_version: "old" },
    { ...submitted, consented_at: "invalid" },
    { ...submitted, profile: { ...profile, employees: 0 } },
    { ...submitted, profile: { ...profile, email: "" } },
    { ...submitted, profile: { ...profile, declaration: false } },
  ])
    expect(businessAccess(broken).featuresUnlocked).toBe(false);
});
test("industry payloads reject overlarge, fractional or unreferenced money", () => {
  const base = {
    businessId: "00000000-0000-4000-8000-000000000001",
    id: "00000000-0000-4000-8000-000000000002",
    requestId: "00000000-0000-4000-8000-000000000003",
    revision: 1,
    action: "payment",
    payment: { amountMinor: 1, method: "Cash", reference: "Receipt1" },
  };
  expect(industryRequest.safeParse(base).success).toBe(true);
  for (const amountMinor of [0, -1, 0.5, 1e13])
    expect(
      industryRequest.safeParse({
        ...base,
        payment: { ...base.payment, amountMinor },
      }).success,
    ).toBe(false);
  expect(
    industryRequest.safeParse({
      ...base,
      payment: { ...base.payment, reference: "" },
    }).success,
  ).toBe(false);
});

test("operation cursors preserve timestamp precision and reject tampering or another business", () => {
  const businessId = "00000000-0000-4000-8000-000000000001",
    id = "00000000-0000-4000-8000-000000000002",
    updated_at = "2026-10-24T12:00:00.123456+00:00";
  const cursor = encodeIndustryCursor(businessId, { id, updated_at });
  expect(decodeIndustryCursor(cursor, businessId)).toMatchObject({
    businessId,
    id,
    updatedAt: updated_at,
  });
  expect(decodeIndustryCursor(null, businessId)).toBeNull();
  for (const invalid of [
    "broken",
    "a".repeat(513),
    Buffer.from(
      JSON.stringify({
        v: 1,
        businessId,
        id,
        updatedAt: "2026-10-24),id.gt.0",
      }),
    ).toString("base64url"),
  ])
    expect(() => decodeIndustryCursor(invalid, businessId)).toThrow();
  expect(() =>
    decodeIndustryCursor(cursor, "00000000-0000-4000-8000-000000000003"),
  ).toThrow();
});
