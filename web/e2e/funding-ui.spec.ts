import { test, expect } from "@playwright/test";
import { emptyBusiness } from "../src/lib/backend/empty";
import type { FundingApplication, FundingWorkspace } from "../src/lib/funding";

// Keep UI interaction coverage independent of the live owner/RLS/RPC checks.
const userId = "00000000-0000-4000-a000-000000000011";
const businessId = "00000000-0000-4000-a000-000000000012";
const authKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
const future = Math.floor(Date.now() / 1000) + 86400;
const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: future })).toString("base64url")}.funding-ui-fixture`;

test("funding wizard saves a draft, safely resumes an interrupted recording and withdraws it", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = emptyBusiness({
    name: "Funding owner",
    business: "Funding shop",
    email: "owner@example.invalid",
    phone: "+254700123456",
  });
  state.operations.preferences.theme = "dark";
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    {
      key: authKey,
      value: JSON.stringify({
        access_token: token,
        refresh_token: "funding-ui-fixture",
        expires_at: future,
        expires_in: 86400,
        token_type: "bearer",
        user: {
          id: userId,
          email: "owner@example.invalid",
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { name: "Funding owner" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }),
    },
  );
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        workspace: {
          businessId,
          slug: "funding-ui",
          role: "Owner",
          access: {
            featuresUnlocked: true,
            verificationStatus: "submitted",
            identityStatus: "provider_pending",
            reason:
              "Business details completed. Identity verification provider coming soon.",
          },
          revision: 1,
          updatedAt: new Date().toISOString(),
          state,
        },
      },
    }),
  );
  const workspace: FundingWorkspace = {
    businessId,
    applications: [],
    providerConfigured: false,
    verificationStatus: "submitted",
    readiness: {
      sales30: 0,
      expenses30: 0,
      profit30: 0,
      receipts30: 0,
      products: 0,
      country: "KE",
      currency: "KES",
    },
  };
  const ledger = new Map<
    string,
    { application: FundingApplication; providerConfigured: false }
  >();
  const requestIds: string[] = [];
  let interrupt = true;
  await page.route("**/api/funding?**", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: workspace });
    const input = route.request().postDataJSON();
    requestIds.push(input.requestId);
    const replay = ledger.get(input.requestId);
    if (replay) return route.fulfill({ json: replay });
    const previous = workspace.applications.find((a) => a.id === input.id);
    if (previous && input.revision !== previous.revision)
      return route.fulfill({
        status: 409,
        json: {
          error:
            "This funding request changed on another device. Refresh and review the latest version.",
        },
      });
    const now = new Date().toISOString();
    const application: FundingApplication = {
      id: input.id,
      business_id: businessId,
      revision: (previous?.revision || 0) + 1,
      status:
        input.action === "submit"
          ? "submitted"
          : input.action === "withdraw"
            ? "withdrawn"
            : "draft",
      payload: input.payload,
      created_at: previous?.created_at || now,
      updated_at: now,
      submitted_at:
        input.action === "submit" ? now : previous?.submitted_at || null,
      history: [
        ...(previous?.history || []),
        { action: input.action, at: now },
      ],
    };
    workspace.applications = [
      application,
      ...workspace.applications.filter((a) => a.id !== input.id),
    ];
    const result = { application, providerConfigured: false as const };
    ledger.set(input.requestId, result);
    if (input.action === "submit" && interrupt) {
      interrupt = false;
      return route.abort("failed");
    }
    await route.fulfill({ json: result });
  });
  await page.goto("/dashboard/financing");
  await expect(
    page.getByText("Kenya · launch market", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("button", { name: "New funding request", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Requested amount (KES)").fill("10000.25");
  await sheet.getByLabel("Requested repayment months").fill("6");
  await sheet.getByRole("button", { name: "Continue", exact: true }).click();
  await sheet.getByLabel("Typical monthly revenue (KES)").fill("5000.25");
  await sheet
    .getByLabel("Typical monthly business costs (KES)")
    .fill("3000.50");
  await sheet.getByLabel("Years trading").fill("1.5");
  await sheet
    .getByLabel("How would the funding help, and how would you repay it?")
    .fill(
      "Buy additional coffee stock and repay from the shop's monthly trading surplus.",
    );
  await sheet.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await page
    .getByRole("button", { name: "Continue draft", exact: true })
    .click();
  await expect(sheet.getByLabel("Requested amount (KES)")).toHaveValue(
    "10000.25",
  );
  await sheet.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    sheet.getByLabel("Typical monthly business costs (KES)"),
  ).toHaveValue("3000.50");
  // Another device saves a newer version. Keep local fields until the owner
  // explicitly replaces them with the latest confirmed draft.
  workspace.applications[0] = {
    ...workspace.applications[0],
    revision: 2,
    payload: {
      ...workspace.applications[0].payload,
      amount: "12000.75",
      monthlyCosts: "3100.75",
    },
    history: [
      ...workspace.applications[0].history,
      { action: "save", at: new Date().toISOString() },
    ],
  };
  await sheet.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    sheet.getByRole("button", {
      name: "Load latest saved version",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    sheet.getByLabel("Typical monthly business costs (KES)"),
  ).toHaveValue("3000.50");
  await sheet
    .getByRole("button", { name: "Load latest saved version", exact: true })
    .click();
  await expect(sheet.getByLabel("Requested amount (KES)")).toHaveValue(
    "12000.75",
  );
  await sheet.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    sheet.getByLabel("Typical monthly business costs (KES)"),
  ).toHaveValue("3100.75");
  await sheet.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(sheet.getByLabel("Contact phone", { exact: true })).toHaveValue(
    "+254700123456",
  );
  await sheet.getByRole("button", { name: "Continue", exact: true }).click();
  const record = sheet.getByRole("button", {
    name: "Record funding request",
    exact: true,
  });
  await expect(record).toBeDisabled();
  await sheet
    .getByRole("checkbox", { name: "I confirm these figures", exact: false })
    .check();
  await page.screenshot({
    path: testInfo.outputPath("funding-review-mobile-dark.png"),
  });
  await record.click();
  await expect(
    sheet.getByRole("button", { name: "Retry funding request", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Retry funding request", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry funding request", exact: true }),
  ).toHaveCount(0);
  expect(requestIds.at(-2)).toBe(requestIds.at(-1));
  expect(workspace.applications).toHaveLength(1);
  expect(workspace.applications[0].history).toHaveLength(3);
  await expect(page.getByText(/Recorded · provider pending ·/)).toBeVisible();
  await page.getByRole("button", { name: "View request", exact: true }).click();
  await expect(sheet).toContainText(
    "This request has not been sent to a lender.",
  );
  await sheet.getByRole("button", { name: "Close sheet", exact: true }).click();
  await page.getByRole("button", { name: "Withdraw", exact: true }).click();
  await sheet
    .getByRole("button", { name: "Withdraw request", exact: true })
    .click();
  await expect(sheet).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Withdraw", exact: true }),
  ).toHaveCount(0);
  expect(workspace.applications[0].status).toBe("withdrawn");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
