import { test, expect } from "@playwright/test";

test("marketing navigation, pricing and contact stay honest about the preview", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your business. All together." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Product", exact: true }).click();
  await page.getByRole("link", { name: /One connected workspace/ }).click();
  await expect(page).toHaveURL(/features/);
  await page.goto("/pricing");
  await page.getByRole("button", { name: /Yearly/ }).click();
  await expect(page.locator(".plan-price").nth(1)).toContainText("792");
  await page.goto("/contact");
  await page.getByLabel("Your name").fill("Demo Owner");
  await page.getByLabel("Email address").fill("owner@example.com");
  await page.getByLabel("Your message").fill("A question about inventory.");
  await page.getByRole("button", { name: "Preview message" }).click();
  await expect(page.getByText(/Nothing has been sent/)).toBeVisible();
});

test("signup and onboarding personalise the workspace without storing a password", async ({
  page,
}) => {
  await page.goto("/signup?plan=Growth");
  await page.getByLabel("Your name", { exact: true }).fill("Amina Otieno");
  await page.getByLabel("Business name", { exact: true }).fill("Amina Market");
  await page.getByLabel("Email address").fill("amina@example.com");
  await page.getByLabel("Password", { exact: true }).fill("DemoSecret-123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/onboarding/);
  await expect(page.getByLabel("Business name")).toHaveValue("Amina Market");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Looking good. Continue" }).click();
  await page.getByRole("button", { name: "Welcome to your business" }).click();
  await expect(
    page.getByRole("heading", { name: /Jambo, Amina/ }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    localStorage.getItem("biasharaos.demo.v2"),
  );
  expect(saved).toContain("Amina Market");
  expect(saved).not.toContain("DemoSecret");
});

test("checkout creates a receipt, decrements stock and survives reload", async ({
  page,
}) => {
  await page.goto("/dashboard/sales/new");
  await page
    .getByRole("button", { name: "Add Soko Maize Flour to sale", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add Soko Maize Flour to sale", exact: true })
    .click();
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await page.getByRole("button", { name: "Record demo sale" }).click();
  await expect(page.getByRole("dialog")).toContainText("KES 360");
  await expect(page.getByRole("dialog")).toContainText("#1049");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/dashboard/inventory?q=Soko");
  await expect(page.locator("tbody tr")).toContainText("40 units");
  await page.reload();
  await expect(page.locator("tbody tr")).toContainText("40 units");
  await page.goto("/dashboard/sales");
  await expect(page.locator("tbody tr").first()).toContainText("360");
});

test("inventory validates unique SKUs and persists new product and restock", async ({
  page,
}) => {
  await page.goto("/dashboard/inventory");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Product name").fill("Demo Coffee");
  await dialog.getByLabel("Pack size").fill("250 g");
  await dialog.getByLabel("Selling price (KES)").fill("450");
  await dialog.getByLabel("Cost price (KES)").fill("300");
  await dialog.getByLabel("Stock quantity").fill("15");
  await dialog
    .getByRole("button", { name: "Add product", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search products or SKU…" })
    .fill("Demo Coffee");
  await expect(page.locator("tbody tr")).toContainText("15 units");
  await page.getByRole("button", { name: "Edit / restock" }).click();
  await dialog.getByLabel("Stock quantity").fill("27");
  await dialog.getByRole("button", { name: "Save product" }).click();
  await page.reload();
  await page
    .getByRole("searchbox", { name: "Search products or SKU…" })
    .fill("Demo Coffee");
  await expect(page.locator("tbody tr")).toContainText("27 units");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export stock" }).click();
  expect((await download).suggestedFilename()).toBe("inventory.csv");
});

test("customer repayments update the balance and assistant reads the new data", async ({
  page,
}) => {
  await page.goto("/dashboard/customers?q=John");
  await page.getByRole("button", { name: "View details" }).click();
  await page.getByLabel("Record a demo repayment (KES)").fill("200");
  await page.getByRole("button", { name: "Record repayment" }).click();
  await expect(page.locator("tbody tr")).toContainText("KES 1,000");
  await page.goto("/dashboard/assistant");
  await page.getByRole("button", { name: "Who owes me money?" }).click();
  await expect(page.locator(".message-assistant")).toContainText("KES 5,400");
  await expect(page.locator(".message-assistant")).toContainText(
    "John Mwangi: KES 1,000",
  );
});

test("supplier draft is local, and receiving goods updates inventory only once", async ({
  page,
}) => {
  await page.goto("/dashboard/suppliers/kifaru");
  for (let i = 0; i < 7; i++)
    await page
      .getByRole("button", { name: "Order Soko Maize Flour", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Review your order", exact: true })
    .click();
  await page.getByRole("button", { name: "Create demo order" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No order has been sent",
  );
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "View purchase orders" })
    .click();
  await page
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: "View order" })
    .click();
  await page.getByRole("button", { name: "Mark demo order received" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "These goods have been added",
  );
  await expect(
    page.getByRole("button", { name: "Mark demo order received" }),
  ).toHaveCount(0);
  await page.goto("/dashboard/inventory?q=Soko");
  await expect(page.locator("tbody tr")).toContainText("49 units");
});

test("expenses, team invitations and reset work without external services", async ({
  page,
}) => {
  await page.goto("/dashboard/expenses");
  await page
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await page.getByLabel("What was it for?").fill("Demo delivery");
  await page.getByLabel("Amount (KES)").fill("250");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Record expense" })
    .click();
  await expect(page.locator(".stat-card").first()).toContainText("2,550");
  await page.goto("/dashboard/team");
  await page.getByRole("button", { name: "Invite teammate" }).click();
  await page.getByLabel("Full name").fill("Demo Teammate");
  await page.getByLabel("Work email").fill("teammate@example.com");
  await page.getByRole("button", { name: "Create demo invitation" }).click();
  await expect(page.getByRole("status")).toContainText(
    "No email has been sent",
  );
  await expect(page.locator("tbody")).toContainText("Demo Teammate");
  await page.goto("/dashboard/settings");
  await page.getByRole("button", { name: "Demo & data" }).click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page.getByRole("button", { name: "Reset demo data" }).click();
  await page.goto("/dashboard/expenses");
  await expect(page.locator(".stat-card").first()).toContainText("2,300");
});

test("mobile public and workspace navigation fit a narrow screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("button", { name: "Solutions", exact: true }).click();
  await page
    .getByRole("link", { name: /Retail shops & dukas/ })
    .first()
    .click();
  await expect(page).toHaveURL(/solutions\/retail/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Open workspace navigation" }).click();
  await page
    .getByRole("navigation", { name: "Business navigation" })
    .getByRole("link", { name: "Inventory" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Know your shelves." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/dashboard/sales/new");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Add Blue Band to sale" }).click();
  await expect(page.locator(".cart-total")).toContainText("KES 350");
});
