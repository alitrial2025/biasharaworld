import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { initialState } from "../src/lib/data";
import { execute, localDate } from "../src/lib/operations";

// Appearance is deliberately isolated from authentication/network tests.
const userId = "00000000-0000-4000-a000-000000000001";
const businessId = "00000000-0000-4000-a000-000000000002";
const authKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
const future = Math.floor(Date.now() / 1000) + 86400;
const token =
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  ) +
  "." +
  Buffer.from(JSON.stringify({ sub: userId, exp: future })).toString(
    "base64url",
  ) +
  ".visual-fixture";
function fixture() {
  let state = initialState();
  state.operations.preferences.theme = "dark";
  state = execute(state, { type: "cart", id: 1, quantity: 1 }).state;
  state = execute(state, {
    type: "basket",
    customer: state.customers[0].name,
  }).state;
  state = execute(state, {
    type: "document",
    kind: "Quotation",
    due: localDate(),
  }).state;
  return {
    businessId,
    slug: "visual-fixture",
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
  };
}
async function prepare(page: Page) {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
      localStorage.setItem("biashara.appearance", "dark");
    },
    {
      key: authKey,
      value: JSON.stringify({
        access_token: token,
        refresh_token: "visual-fixture",
        expires_at: future,
        expires_in: 86400,
        token_type: "bearer",
        user: {
          id: userId,
          email: "visual@example.invalid",
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { name: "Visual fixture" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }),
    },
  );
  await page.route("**/api/workspace", (route) =>
    route.fulfill({ json: { workspace: fixture() } }),
  );
}
async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  if (process.env.BIASHARA_THEME_INJECT_CSS === "1")
    await page.addStyleTag({
      content: readFileSync("src/app/tools.css", "utf8"),
    });
}
async function contrast(node: Locator) {
  await expect(node).toBeVisible();
  const ratio = await node.evaluate((element) => {
    const parse = (s: string) => {
      const n = s.match(/[\d.]+/g)?.map(Number) || [];
      return [n[0] || 0, n[1] || 0, n[2] || 0, n[3] ?? 1];
    };
    const foreground = parse(getComputedStyle(element).color);
    let background = [255, 255, 255, 1];
    let current: Element | null = element;
    while (current) {
      const c = parse(getComputedStyle(current).backgroundColor);
      if (c[3] === 1) {
        background = c;
        break;
      }
      current = current.parentElement;
    }
    const luminance = (c: number[]) =>
      c
        .slice(0, 3)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
    const f = luminance(foreground),
      b = luminance(background);
    return (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
}

test("dark selected controls and catalogue sheets retain readable foregrounds", async ({
  page,
}, testInfo) => {
  await prepare(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, "/dashboard/tools");
  await contrast(page.locator(".tools-category-tabs button.active"));
  await contrast(page.locator(".tool-card h2").first());
  await open(page, "/dashboard/inventory");
  await contrast(page.locator(".tabs button.active"));
  await contrast(page.locator("tbody strong").first());
  await page
    .getByRole("button", { name: "Edit product", exact: true })
    .first()
    .click();
  await contrast(page.getByRole("dialog").locator("h2"));
  await contrast(
    page.getByRole("dialog").getByLabel("Product name", { exact: true }),
  );
  await page.screenshot({
    path: testInfo.outputPath("dark-product-sheet.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("dark documents, stock controls and checkout choices remain legible", async ({
  page,
}, testInfo) => {
  await prepare(page);
  await open(page, "/dashboard/documents");
  await contrast(page.locator(".document-list button").first());
  await page.locator(".document-list button").first().click();
  await contrast(page.getByRole("dialog").locator(".document-preview h2"));
  await page.getByRole("button", { name: "Close sheet", exact: true }).click();
  await open(page, "/dashboard/sales/new");
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await contrast(page.locator(".payment-methods button.active"));
  await page.screenshot({ path: testInfo.outputPath("dark-checkout.png") });
});

test("dark public sections retain theme and readable controls", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("biashara.appearance", "dark"),
  );
  for (const path of ["/pricing", "/help", "/privacy", "/login"]) {
    await open(page, path);
    await contrast(page.locator("h1").first());
    if (path === "/pricing")
      await contrast(page.locator(".billing-toggle button.active"));
    if (path === "/help")
      await contrast(
        page
          .getByRole("group", { name: "Help topics" })
          .getByRole("button")
          .first(),
      );
    if (path === "/login")
      await contrast(page.getByLabel("Email address", { exact: true }));
  }
});
