import { test, expect } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
let session: Session;
let userId = "";
let businessId = "";
const email = `browser-${randomUUID()}@biashara-test.invalid`,
  password = randomUUID() + "Ab1!";
const storageKey =
  "sb-" +
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0] +
  "-auth-token";
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
test.describe.configure({ mode: "default" });
async function freshSession() {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  session = login.data.session!;
}
test.beforeAll(async () => {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Browser Owner" },
  });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  session = login.data.session!;
  const r = await fetch(base + "/api/workspace", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "createBusiness",
      profile: {
        name: "Browser Owner",
        business: "Browser verification",
        location: "Nairobi",
        type: "Retail shop",
      },
    }),
  });
  const d = await r.json();
  expect(r.status, JSON.stringify(d)).toBe(200);
  businessId = d.workspace.businessId;
});
test.afterAll(async () => {
  if (businessId) {
    await admin
      .from("business_commands")
      .delete()
      .eq("business_id", businessId);
    await admin.from("businesses").delete().eq("id", businessId);
  }
  if (userId) await admin.auth.admin.deleteUser(userId);
});
for (const slug of slugs)
  test(`empty authenticated business: ${slug}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: storageKey, value: JSON.stringify(session) },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard/" + slug);
    await expect(page.locator(".workspace-main h1")).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('.workspace [role="alert"]')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
test("real sign-in, product creation and sign-out", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page.locator(".workspace-main h1")).toContainText("Browser", {
    timeout: 20000,
  });
  await page.goto("/dashboard/inventory");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Product name").fill("Actual inventory");
  await dialog.getByLabel("Pack size").fill("1 unit");
  await dialog.getByLabel("Selling price (KES)").fill("100");
  await dialog.getByLabel("Cost price (KES)").fill("60");
  await dialog.getByLabel("Stock quantity").fill("5");
  await dialog
    .getByRole("button", { name: "Add product", exact: true })
    .click();
  await expect(dialog).not.toBeVisible({ timeout: 20000 });
  await expect(page.locator("tbody")).toContainText("Actual inventory");
  await page.reload();
  await expect(page.locator("tbody")).toContainText("5 units");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
});
test("unauthenticated workspace and customer portal stay private", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await page.goto("/portal/6");
  await expect(page.locator('main [role="alert"]')).toContainText("Sign in");
  await expect(page.getByText("Mary Wambui")).toHaveCount(0);
});

test("a lost save response can be retried after reload without duplicating the product", async ({
  page,
}) => {
  await freshSession();
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: storageKey, value: JSON.stringify(session) },
  );
  await page.goto("/dashboard/inventory");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Product name").fill("Retry verification");
  await dialog.getByLabel("Pack size").fill("1 unit");
  await dialog.getByLabel("Selling price (KES)").fill("10.25");
  await dialog.getByLabel("Cost price (KES)").fill("6.75");
  await dialog.getByLabel("Stock quantity").fill("5");
  await page.route("**/api/workspace", async (route) => {
    const body = route.request().postDataJSON();
    if (
      route.request().method() === "POST" &&
      body?.command?.type === "addProduct"
    ) {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort("failed");
    } else await route.continue();
  });
  await dialog
    .getByRole("button", { name: "Add product", exact: true })
    .click();
  await expect(page.locator('.workspace [role="alert"]')).toBeVisible();
  await page.unroute("**/api/workspace");
  await page.reload();
  await page
    .getByRole("button", { name: "Retry saved request", exact: true })
    .click();
  await expect(page.locator('.workspace [role="alert"]')).toHaveCount(0);
  const record = await admin
    .from("business_records")
    .select("state")
    .eq("business_id", businessId)
    .single();
  expect(
    record.data!.state.products.filter(
      (p: { name: string }) => p.name === "Retry verification",
    ),
  ).toHaveLength(1);
});

test("customer sign-in retains the shop basket and records a real private order", async ({
  page,
}) => {
  await freshSession();
  async function api(body?: unknown) {
    const response = await fetch(base + "/api/workspace", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + session.access_token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    expect(response.status).toBe(200);
    return response.json();
  }
  let workspace = (await api()).workspace;
  workspace = (
    await api({
      businessId: workspace.businessId,
      requestId: randomUUID(),
      revision: workspace.revision,
      command: {
        type: "shop",
        published: true,
        name: "Browser verification shop",
        fee: 0,
      },
    })
  ).workspace;
  workspace = (
    await api({
      businessId: workspace.businessId,
      requestId: randomUUID(),
      revision: workspace.revision,
      command: {
        type: "addProduct",
        product: {
          name: "Shop verification",
          size: "1 unit",
          sku: "SHOP-VERIFY",
          category: "Food",
          price: 10.25,
          cost: 6.75,
          stock: 5,
          reorder: 1,
          art: 0,
        },
      },
    })
  ).workspace;
  const product = workspace.state.products.find(
    (p: { name: string }) => p.name === "Shop verification",
  );
  await page.goto("/shop/" + workspace.slug);
  await page.getByLabel("Quantity for " + product.name).fill("2");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue to workspace" }).click();
  await expect(page).toHaveURL(new RegExp("/shop/" + workspace.slug + "$"));
  await expect(page.getByLabel("Quantity for " + product.name)).toHaveValue(
    "2",
  );
  await page
    .getByLabel("Delivery address or pickup instructions")
    .fill("Collect at the shop");
  await page.getByRole("button", { name: "Send order", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "sent" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "My orders" }).click();
  await expect(
    page.getByRole("heading", { name: "Your orders" }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("Payment pending");
});

test("workspace theme toggle saves the account preference and survives reload", async ({
  page,
}, testInfo) => {
  await freshSession();
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: storageKey, value: JSON.stringify(session) },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Switch to dark mode", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Switch to light mode", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("dark-workspace.png"),
    animations: "disabled",
  });
  const workspace = await admin
    .from("user_workspaces")
    .select("state")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .single();
  expect(workspace.data!.state.preferences.theme).toBe("dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Switch to light mode", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("supplier order review and saved totals use the recorded quote and delivery fee", async ({
  page,
}) => {
  await freshSession();
  async function api(body?: unknown) {
    const response = await fetch(base + "/api/workspace", {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: "Bearer " + session.access_token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    expect(response.status).toBe(200);
    return response.json();
  }
  let workspace = (await api()).workspace;
  async function save(command: unknown) {
    workspace = (
      await api({
        businessId: workspace.businessId,
        requestId: randomUUID(),
        revision: workspace.revision,
        command,
      })
    ).workspace;
  }
  await save({
    type: "addProduct",
    product: {
      name: "Quoted product",
      size: "1 unit",
      sku: "QUOTE-VERIFY",
      category: "Food",
      price: 10.25,
      cost: 6.75,
      stock: 0,
      reorder: 1,
      art: 0,
    },
  });
  const product = workspace.state.products.find(
    (p: { name: string }) => p.name === "Quoted product",
  );
  await save({
    type: "addSupplier",
    name: "Quote verification supplier",
    category: "Groceries",
    description: "Recorded contact",
    delivery: "Collect or deliver",
    minimum: 0,
    deliveryFee: 12.75,
  });
  const supplier = workspace.state.suppliers.find(
    (s: { name: string }) => s.name === "Quote verification supplier",
  );
  await save({
    type: "supplierQuote",
    id: supplier.id,
    productId: product.id,
    cost: 8.25,
  });
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: storageKey, value: JSON.stringify(session) },
  );
  await page.goto("/dashboard/suppliers/" + supplier.id);
  await page
    .getByRole("button", { name: "Order Quoted product", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review your order", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator(".cart-total")).toContainText("21");
  await dialog
    .getByRole("button", { name: "Save purchase order", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Purchase order saved." }),
  ).toBeVisible();
  const record = await admin
    .from("business_records")
    .select("state")
    .eq("business_id", businessId)
    .single();
  const order = record.data!.state.orders.find(
    (o: { supplier: string }) => o.supplier === supplier.name,
  );
  expect(order.items[0].cost).toBe(8.25);
  expect(order.deliveryFee).toBe(12.75);
  expect(order.amount).toBe(21);
});
