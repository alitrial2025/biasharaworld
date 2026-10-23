import { test, expect } from "@playwright/test";
import { initialState } from "../../src/lib/data";
const slugs = [
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
for (const slug of slugs)
  test(`feature screen: ${slug}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/dashboard/${slug}`);
    await expect(page.locator("main h1")).toBeVisible();
    expect(await page.locator("main").innerText()).not.toContain(
      "Page not found",
    );
    expect(errors).toEqual([]);
  });
test("scanner adds a product and held baskets resume through checkout", async ({
  page,
}) => {
  await page.goto("/dashboard/scanner");
  await page.getByRole("button", { name: "Sample scan" }).click();
  await page
    .getByRole("button", { name: "Add to basket", exact: true })
    .click();
  await page.goto("/dashboard/sales/new");
  await page.getByRole("button", { name: "Hold sale", exact: true }).click();
  await page.getByLabel("Basket name").fill("Mary collection");
  await page.getByRole("button", { name: "Hold this sale" }).click();
  await page.goto("/dashboard/baskets");
  await expect(page.getByText("Mary collection")).toBeVisible();
  await page.getByRole("button", { name: "Resume basket" }).click();
  await page.goto("/dashboard/sales/new");
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await page.getByRole("button", { name: "Record demo sale" }).click();
  await expect(page.getByRole("dialog")).toContainText("KES 180");
});
test("storefront order appears for merchant and customer through delivery and payment", async ({
  page,
}) => {
  await page.goto("/shop/wanjiku");
  await page
    .getByRole("button", { name: "Add Soko Maize Flour", exact: true })
    .click();
  await page.getByLabel("Customer name").fill("Mary Wambui");
  await page
    .getByLabel("Delivery address or pickup details")
    .fill("Pickup at main shop");
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(page.getByText(/Demo order #/)).toBeVisible();
  await page.goto("/dashboard/deliveries");
  await page.locator(".delivery-board button").first().click();
  await page.getByRole("button", { name: "Confirm & reserve stock" }).click();
  await page.getByRole("button", { name: "Start packing" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Dispatch order" }).click();
  await page.getByRole("button", { name: "Mark delivered" }).click();
  await page.getByRole("button", { name: "Record demo cash payment" }).click();
  await expect(page.getByRole("dialog")).toContainText("Paid locally");
  await page.reload();
  await page.goto("/portal/6");
  await expect(
    page.getByRole("heading", { name: /Hello, Mary/ }),
  ).toBeVisible();
  await expect(page.getByText("Delivered", { exact: true })).toBeVisible();
});
test("stocktake and transfer forms update the movement ledger", async ({
  page,
}) => {
  await page.goto("/dashboard/stocktakes");
  await page.getByLabel("Count name").fill("Monday shelf");
  await page.getByRole("button", { name: "Start stocktake" }).click();
  await page
    .getByRole("spinbutton", { name: "Counted Soko Maize Flour", exact: true })
    .fill("40");
  await page.getByLabel("Adjustment reason").fill("Physical count");
  await page.getByRole("button", { name: "Finalise count" }).click();
  await expect(page.getByText(/Finalised once/)).toBeVisible();
  await page.goto("/dashboard/transfers");
  await page.getByRole("button", { name: "Prepare transfer" }).click();
  await page.getByLabel("Units to transfer").fill("2");
  await page.getByRole("button", { name: "Save transfer draft" }).click();
  await page
    .getByRole("button", { name: "Dispatch stock", exact: true })
    .click();
  await page.getByRole("button", { name: "Receive at destination" }).click();
  await expect(
    page.locator(".transfer-list").getByText("Received", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard/movements");
  await expect(page.locator("main")).toContainText("Transfer out");
});
test("language, theme and larger text persist and preserve narrow layouts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/preferences");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.getByLabel("Reading size").selectOption("130");
  await page.getByLabel("Language / Lugha").selectOption("sw");
  await expect(page.locator("html")).toHaveAttribute("lang", "sw");
  await expect(
    page.getByRole("heading", {
      name: "Lugha yako. Mwanga wako. Utaratibu wako.",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).fontSize,
    ),
  ).toBe("18.2px");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("v1 migration preserves legacy data and corrupt storage recovers", async ({
  page,
}) => {
  const legacy = {
    ...initialState(),
    version: 1,
    profile: { ...initialState().profile, business: "Legacy shop" },
  } as Record<string, unknown>;
  delete legacy.operations;
  await page.addInitScript((value) => {
    localStorage.setItem("biasharaos.demo.v1", JSON.stringify(value));
  }, legacy);
  await page.goto("/dashboard");
  await expect(page.locator(".shop-switcher")).toContainText("Legacy shop");
  await page.goto("/dashboard/branches");
  await expect(page.locator("main")).toContainText("Main shop");
  await page.goto("/dashboard/sales/new");
  await page
    .getByRole("button", { name: "Add Soko Maize Flour to sale", exact: true })
    .click();
  await page
    .getByLabel("Customer", { exact: true })
    .selectOption("Mary Wambui");
  await page.getByRole("button", { name: "Save quotation" }).click();
  await page.getByRole("button", { name: "Hold sale", exact: true }).click();
  await page.getByLabel("Basket name").fill("Main branch basket");
  await page.getByRole("button", { name: "Hold this sale" }).click();
  await page.goto("/dashboard/documents");
  await expect(page.locator(".document-list")).toContainText("Mary Wambui");
  await page.getByLabel("Active branch").selectOption("westlands");
  await expect(page.locator(".document-list button")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your next agreement starts here." }),
  ).toBeVisible();
  await page.goto("/dashboard/baskets");
  await expect(
    page.getByRole("heading", { name: "A little room for later." }),
  ).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("biasharaos.demo.v2", '{"version":2,"operations":{}}'),
  );
  await page.reload();
  await expect(page.getByText(/saved demo could not be read/)).toBeVisible();
});
test("blocked browser storage reports its limitation while checkout remains usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Unavailable", "QuotaExceededError");
    };
  });
  await page.goto("/dashboard/sales/new");
  await page
    .getByRole("button", { name: "Add Soko Maize Flour to sale", exact: true })
    .click();
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Record demo sale" }).click();
  await expect(page.getByRole("dialog")).toContainText("KES 180");
});
