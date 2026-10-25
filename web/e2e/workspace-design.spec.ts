import { test, expect, type Page } from "@playwright/test";
import { initialState } from "../src/lib/data";
import { emptyBusiness } from "../src/lib/backend/empty";
import { execute, localDate, pricedLines } from "../src/lib/operations";
import { businessReport } from "../src/lib/backend/reports";

const userId = "00000000-0000-4000-a000-000000000091";
const businessId = "00000000-0000-4000-a000-000000000092";
const authKey = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
async function workspace(
  page: Page,
  theme: "light" | "dark",
  empty = false,
  sector?: string,
  large = false,
) {
  const profile = {
    name: "Wanjiku",
    business: "Biashara Market",
    type: "Retail Supermarkets & Minimarts",
  };
  let state = empty ? emptyBusiness(profile) : initialState();
  Object.assign(state.profile, profile, sector ? { type: sector } : {});
  if (large) {
    state.operations.preferences.textSize = 200;
    state.operations.preferences.language = "sw";
    state.profile.business =
      "Nairobi Wholesale Distribution and Event Equipment Services Limited";
  }
  state.operations.preferences.theme = theme;
  if (!empty) {
    // Build test history through real business commands; the chart uses ordinary reports.
    for (const [i, quantity] of [2, 5, 3, 8, 5, 10, 6].entries()) {
      state = execute(state, { type: "cart", id: 1, quantity }).state;
      state = execute(state, {
        type: "checkout",
        payments: [
          {
            method: "Cash",
            amount: pricedLines(state, state.operations.cart, 0, "percent", 0)
              .total,
          },
        ],
      }).state;
      const receipt = state.operations.receipts[0];
      receipt.date = new Date(
        Date.parse(localDate() + "T00:00:00Z") - (6 - i) * 86400000,
      )
        .toISOString()
        .slice(0, 10);
      receipt.createdAt = receipt.date + "T10:00:00+03:00";
    }
  }
  const future = Math.floor(Date.now() / 1000) + 86400;
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: future })).toString("base64url")}.workspace-design-fixture`;
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
          email: "design@example.invalid",
          email_confirmed_at: new Date().toISOString(),
          app_metadata: { provider: "email" },
          user_metadata: { name: "Design fixture" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      }),
    },
  );
  let revision = 1;
  const response = () => ({
    workspace: {
      businessId,
      slug: "design-fixture",
      role: "Owner",
      revision,
      state,
      access: {
        featuresUnlocked: true,
        verificationStatus: "submitted",
        identityStatus: "provider_pending",
        reason: "Business readiness complete",
      },
    },
  });
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "POST") {
      const command = route.request().postDataJSON().command;
      const outcome =
        command.type === "setTarget"
          ? {
              state: { ...state, target: command.target },
              message: "Target saved",
            }
          : execute(state, command);
      state = outcome.state;
      revision++;
      return route.fulfill({ json: { ...response(), result: outcome } });
    }
    await route.fulfill({ json: response() });
  });
  await page.route("**/api/industry?**", (route) =>
    route.fulfill({ json: { businessId, records: [], role: "Owner" } }),
  );
  await page.route("**/api/funding?**", (route) =>
    route.fulfill({
      json: {
        businessId,
        applications: [],
        providerConfigured: false,
        verificationStatus: "submitted",
        readiness: {
          sales30: 12600,
          profit30: 3200,
          expenses30: 2300,
          receipts30: 8,
          products: 8,
          country: "KE",
          currency: "KES",
        },
      },
    }),
  );
  return {
    get state() {
      return state;
    },
  };
}

const core = [
  "",
  "sales",
  "inventory",
  "customers",
  "suppliers",
  "orders",
  "operations",
  "reports",
  "expenses",
  "team",
  "financing",
  "settings",
  "assistant",
  "sales/new",
  "tools",
];
for (const theme of ["dark", "light"] as const) {
  test(`${theme} desktop workspace is coherent across every main tab`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await workspace(page, theme);
    await page.setViewportSize({ width: 1600, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const section of core) {
      await page.goto("/dashboard" + (section ? "/" + section : ""));
      await expect(page.locator(".workspace-main h1")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        section,
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(
          `${section.replaceAll("/", "-") || "overview"}-${theme}.png`,
        ),
        animations: "disabled",
      });
    }
    expect(errors).toEqual([]);
  });
}

test("performance chart exposes recorded values through pointer, keyboard and its data table", async ({
  page,
}) => {
  const fixture = await workspace(page, "dark");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  const chart = page.getByRole("group", {
    name: "Recorded business trends",
    exact: true,
  });
  await chart.focus();
  await chart.press("Home");
  const report = businessReport(fixture.state, "Week");
  await expect(chart.locator(".sr-only")).toContainText("Sales: KES");
  await chart.press("End");
  await expect(chart.locator(".sr-only")).toContainText(
    new Intl.NumberFormat("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(report.series.at(-1)!),
  );
  await page.getByText("View chart data", { exact: true }).click();
  await expect(page.locator(".trend-data tbody tr")).toHaveCount(7);
  await page
    .locator(".sales-panel")
    .getByRole("button", { name: "Day", exact: true })
    .click();
  await expect(page.locator(".trend-data tbody tr")).toHaveCount(24);
  await expect(page.locator(".trend-legend")).not.toContainText(
    "Operating profit",
  );
  await page
    .locator(".sales-panel")
    .getByRole("button", { name: "Month", exact: true })
    .click();
  await expect(page.locator(".trend-data tbody tr")).toHaveCount(30);
  await expect(page.locator(".trend-legend")).toContainText("Operating profit");
});

test("empty workspace does not invent growth or congratulate an unset target", async ({
  page,
}) => {
  await workspace(page, "light", true);
  await page.goto("/dashboard");
  await expect(page.locator(".target-note")).toHaveText(
    "Set a daily target to start tracking your progress.",
  );
  await expect(page.locator(".goal-ring strong")).toHaveText("0%");
  await expect(page.locator(".stats-grid")).not.toContainText("↑");
  await page
    .locator(".target-panel")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Daily target (KES)").fill("15000");
  await sheet.getByRole("button", { name: "Save target", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await expect(page.locator(".goal-numbers")).toContainText("15,000");
});

const extra = [
  "scanner",
  "baskets",
  "promotions",
  "split-payments",
  "returns",
  "documents",
  "register",
  "stocktakes",
  "expiry",
  "variants",
  "movements",
  "transfers",
  "compare",
  "deliveries",
  "loyalty",
  "branches",
  "online-shop",
  "customer-portal",
  "sync",
  "preferences",
];
test("all business tools retain usable desktop layouts at a smaller laptop width", async ({
  page,
}) => {
  test.setTimeout(120000);
  await workspace(page, "dark");
  await page.setViewportSize({ width: 1024, height: 900 });
  for (const section of extra) {
    await page.goto("/dashboard/" + section);
    await expect(page.locator(".workspace-main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      section,
    ).toBe(true);
  }
});

async function readable(page: Page, selector: string) {
  const node = page.locator(selector).first();
  await expect(node).toBeVisible();
  const ratio = await node.evaluate((element) => {
    const rgb = (value: string) => {
      const n = value.match(/[\d.]+/g)?.map(Number) || [];
      return [n[0] || 0, n[1] || 0, n[2] || 0, n[3] ?? 1];
    };
    const path: Element[] = [];
    for (
      let current: Element | null = element;
      current;
      current = current.parentElement
    )
      path.unshift(current);
    let background = [255, 255, 255, 1];
    for (const part of path) {
      const color = rgb(getComputedStyle(part).backgroundColor);
      background = color
        .slice(0, 3)
        .map((value, i) => value * color[3] + background[i] * (1 - color[3]))
        .concat(1);
    }
    const light = (color: number[]) =>
      color
        .slice(0, 3)
        .map((value) => value / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        )
        .reduce(
          (sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i],
          0,
        );
    const foreground = light(rgb(getComputedStyle(element).color));
    const behind = light(background);
    return (
      (Math.max(foreground, behind) + 0.05) /
      (Math.min(foreground, behind) + 0.05)
    );
  });
  expect(ratio, `${selector} text contrast`).toBeGreaterThanOrEqual(4.5);
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme} laptop tabs, selected controls and edit sheets remain readable`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await workspace(page, theme);
    await page.setViewportSize({ width: 1024, height: 900 });
    for (const section of core) {
      await page.goto("/dashboard" + (section ? "/" + section : ""));
      await expect(page.locator(".workspace-main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        section,
      ).toBe(true);
    }
    await page.goto("/dashboard/inventory");
    await readable(page, ".stat-label");
    await readable(page, ".tabs button.active");
    await readable(page, ".heading-actions .btn-primary");
    await readable(page, ".data-table th");
    await page
      .getByRole("button", { name: "Edit product", exact: true })
      .first()
      .click();
    const sheet = page.getByRole("dialog");
    await expect(
      sheet.getByLabel("Product name", { exact: true }),
    ).toBeVisible();
    await readable(page, "dialog h2");
    await readable(page, "dialog .input");
    await expect(sheet).toHaveCSS("position", "fixed");
    const box = await sheet.boundingBox();
    expect(Math.abs(box!.y + box!.height - 900)).toBeLessThanOrEqual(2);
    await page.screenshot({
      path: info.outputPath(`product-sheet-${theme}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible();
    await page.goto("/dashboard");
    await expect(page.locator(".sidebar-person")).toBeInViewport();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByPlaceholder("Search products or customers…")
      .fill("Blue Band");
    await expect(
      page.getByRole("dialog").getByRole("button", { name: /Blue Band/ }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
  });
}

test("service businesses receive their workflows and branding without retail clutter", async ({
  page,
}, info) => {
  await workspace(
    page,
    "dark",
    true,
    "Software Development & IT Consultancies",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard");
  await expect(page.locator(".welcome-sector")).toBeVisible();
  await expect(page.locator(".home-workflows")).toBeVisible();
  await expect(page.locator(".low-stock-panel")).toHaveCount(0);
  await expect(page.locator(".home-actions")).not.toContainText("Manage stock");
  await page.screenshot({ path: info.outputPath("service-home-dark.png") });
});

test("large Kiswahili text retains reachable laptop navigation and actions", async ({
  page,
}, info) => {
  await workspace(page, "dark", true, undefined, true);
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const section of ["", "customers", "settings", "tools"]) {
    await page.goto("/dashboard" + (section ? "/" + section : ""));
    await expect(page.locator(".workspace-main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      section,
    ).toBe(true);
    await expect(page.locator(".sidebar-person")).toBeInViewport();
  }
  await page.screenshot({ path: info.outputPath("large-kiswahili-tools.png") });
});
