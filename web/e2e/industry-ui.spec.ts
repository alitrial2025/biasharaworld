import { test, expect, type Page } from "@playwright/test";
import { emptyBusiness } from "../src/lib/backend/empty";
import { industries } from "../src/lib/industries";

const userId = "00000000-0000-4000-a000-000000000081",
  businessId = "00000000-0000-4000-a000-000000000082";
const authKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
async function setup(
  page: Page,
  type: string,
  unlocked = true,
  role = "Owner",
) {
  const future = Math.floor(Date.now() / 1000) + 86400;
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: future })).toString("base64url")}.industry-fixture`;
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    {
      key: authKey,
      value: JSON.stringify({
        access_token: token,
        refresh_token: "fixture",
        expires_at: future,
        expires_in: 86400,
        token_type: "bearer",
        user: {
          id: userId,
          email: "industry@example.invalid",
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { name: "Industry owner" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }),
    },
  );
  const state = emptyBusiness({
    name: "Industry owner",
    business: "Industry test",
    type,
  });
  state.operations.preferences.theme = "dark";
  await page.route("**/api/workspace", (route) =>
    route.fulfill({
      json: {
        workspace: {
          businessId,
          slug: "industry-test",
          role,
          revision: 1,
          state,
          access: {
            featuresUnlocked: unlocked,
            verificationStatus: unlocked ? "submitted" : "not_started",
            identityStatus: "provider_pending",
            reason: "Readiness pending",
          },
        },
      },
    }),
  );
}
for (const industry of industries)
  test(`${industry.label} exposes its three workflows without overflow`, async ({
    page,
  }) => {
    await setup(page, industry.label);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/industry?**", (route) =>
      route.fulfill({
        json: { businessId, industry, records: [], role: "Owner" },
      }),
    );
    await page.goto("/dashboard/operations");
    for (const flow of industry.workflows) {
      await page.getByRole("button", { name: flow.label, exact: true }).click();
      await expect(
        page.getByRole("button", { name: `New ${flow.singular}`, exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: `New ${flow.singular}`, exact: true })
        .click();
      const sheet = page.getByRole("dialog");
      for (const field of flow.fields)
        await expect(
          sheet.getByLabel(field.label, { exact: true }),
        ).toBeVisible();
      await sheet
        .getByRole("button", { name: "Close sheet", exact: true })
        .click();
    }
    await page.goto("/dashboard/tools");
    await expect(page.locator(".tool-card").first()).toBeVisible();
    await expect(page.locator(".tools-category-tabs button.active")).toHaveText(
      "For your business",
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  });
test("locked direct tool routes show readiness gate and owner reminder", async ({
  page,
}) => {
  await setup(page, industries[0].label, false);
  await page.goto("/dashboard/operations");
  await expect(
    page.getByRole("heading", { name: "Your workspace is waiting for you." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Complete verification", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /New bulk order/ }),
  ).toHaveCount(0);
});
test("viewers can inspect sector records without write actions", async ({
  page,
}) => {
  const industry = industries[0];
  await setup(page, industry.label, true, "Viewer");
  await page.route("**/api/industry?**", (route) =>
    route.fulfill({
      json: { businessId, industry, records: [], role: "Viewer" },
    }),
  );
  await page.goto("/dashboard/operations");
  await expect(
    page.getByText("Your team’s operational records will appear here."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /New bulk order/ }),
  ).toHaveCount(0);
});

test("a 503 after saving preserves the operation id for a safe retry", async ({
  page,
}) => {
  const industry = industries[0],
    flow = industry.workflows[0];
  await setup(page, industry.label);
  const requestIds: string[] = [];
  let saved: Record<string, unknown> | null = null;
  await page.route("**/api/industry?**", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: {
          businessId,
          industry,
          records: saved ? [saved] : [],
          role: "Owner",
        },
      });
    const input = route.request().postDataJSON();
    requestIds.push(input.requestId);
    if (!saved) {
      saved = {
        id: input.id,
        business_id: businessId,
        industry_id: industry.id,
        workflow_id: flow.id,
        revision: 1,
        ...input.record,
        amount_minor: input.record.amountMinor,
        paid_minor: 0,
        payments: [],
        history: [],
        archived: false,
        updated_at: new Date().toISOString(),
      };
      return route.fulfill({
        status: 503,
        json: { error: "Save unconfirmed. Retry the saved operation." },
      });
    }
    return route.fulfill({ json: { record: saved, duplicate: true } });
  });
  await page.goto("/dashboard/operations");
  await page
    .getByRole("button", { name: `New ${flow.singular}`, exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Title / reference").fill("Retry order");
  for (const field of flow.fields.filter((field) => field.required)) {
    const value =
      field.type === "date"
        ? "2026-12-01"
        : field.type === "number"
          ? "1"
          : field.type === "datetime"
            ? "2026-12-01T10:00"
            : "Test reference";
    if (field.type === "select")
      await sheet
        .getByLabel(field.label, { exact: true })
        .selectOption(field.options![0]);
    else await sheet.getByLabel(field.label, { exact: true }).fill(value);
  }
  await sheet.getByRole("button", { name: "Save record", exact: true }).click();
  await page
    .getByRole("button", { name: "Retry saved operation", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Retry order", exact: true }),
  ).toBeVisible();
  expect(requestIds).toHaveLength(2);
  expect(requestIds[0]).toBe(requestIds[1]);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close sheet" })
    .click();
  await expect(page.locator(".industry-record")).toHaveCount(1);
});

test("operation history follows pagination before filtering older records", async ({
  page,
}) => {
  const industry = industries[0],
    flow = industry.workflows[0];
  await setup(page, industry.label);
  const cursors: (string | null)[] = [];
  await page.route("**/api/industry?**", (route) => {
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    cursors.push(cursor);
    const record = {
      id: cursor ? "older" : "newer",
      business_id: businessId,
      industry_id: industry.id,
      workflow_id: flow.id,
      revision: 1,
      title: cursor ? "Older order" : "Recent order",
      customer: "Test customer",
      status: flow.statuses[0],
      fields: {},
      amount_minor: 0,
      paid_minor: 0,
      payments: [],
      history: [],
      archived: false,
      updated_at: new Date().toISOString(),
    };
    return route.fulfill({
      json: {
        businessId,
        industry,
        records: cursor
          ? [
              record,
              {
                ...record,
                id: "newer",
                revision: 2,
                title: "Recent order updated",
              },
            ]
          : [record],
        role: "Owner",
        nextCursor: cursor ? null : "opaque-page-2",
      },
    });
  });
  await page.goto("/dashboard/operations");
  await expect(page.locator(".industry-record")).toHaveCount(2);
  await expect(
    page
      .locator(".industry-record")
      .filter({ hasText: "Recent order updated" }),
  ).toHaveCount(1);
  await page.getByLabel("Search operations", { exact: true }).fill("Older");
  await expect(page.locator(".industry-record")).toHaveCount(1);
  await expect(page.locator(".industry-record")).toContainText("Older order");
  expect(cursors).toEqual([null, "opaque-page-2"]);
});

test("a conflicting edit refreshes its revision and shows the other device’s changes", async ({
  page,
}) => {
  const industry = industries[0],
    flow = industry.workflows[0];
  await setup(page, industry.label);
  let record = {
    id: "00000000-0000-4000-a000-000000000083",
    business_id: businessId,
    industry_id: industry.id,
    workflow_id: flow.id,
    revision: 1,
    title: "Original order",
    customer: "Test customer",
    status: flow.statuses[0],
    fields: Object.fromEntries(
      flow.fields.map((field) => [
        field.key,
        field.type === "date"
          ? "2026-12-01"
          : field.type === "number"
            ? "1"
            : "Reference",
      ]),
    ),
    amount_minor: 0,
    paid_minor: 0,
    payments: [],
    history: [],
    archived: false,
    updated_at: new Date().toISOString(),
  };
  const revisions: number[] = [];
  await page.route("**/api/industry?**", (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({
        json: {
          businessId,
          industry,
          records: [record],
          role: "Owner",
          nextCursor: null,
        },
      });
    const input = route.request().postDataJSON();
    revisions.push(input.revision);
    if (revisions.length === 1) {
      record = { ...record, title: "Changed elsewhere", revision: 2 };
      return route.fulfill({
        status: 409,
        json: {
          error:
            "Another device updated this record. Review the latest details.",
        },
      });
    }
    record = { ...record, ...input.record, revision: 3 };
    return route.fulfill({ json: { record } });
  });
  await page.goto("/dashboard/operations");
  await page.locator(".industry-record").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit details", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Title / reference")
    .fill("Local change");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save record", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Changed elsewhere", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit details", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Title / reference"),
  ).toHaveValue("Changed elsewhere");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save record", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Changed elsewhere", exact: true }),
  ).toBeVisible();
  expect(revisions).toEqual([1, 2]);
});
