import { test, expect } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { barcode, eanBars } from "../src/lib/operations";
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
    const photos = await admin.storage.from("product-images").list(businessId);
    if (photos.data?.length)
      await admin.storage
        .from("product-images")
        .remove(photos.data.map((p) => businessId + "/" + p.name));
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

test("product photos upload, persist across pages, publish safely, change and detach", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await freshSession();
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: storageKey, value: JSON.stringify(session) },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/inventory");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Product name").fill("Photo verification");
  await sheet.getByLabel("Pack size").fill("250 g");
  await sheet.getByLabel("SKU", { exact: true }).fill("PHOTO-VERIFY");
  await sheet.getByLabel("Selling price (KES)").fill("10.25");
  await sheet.getByLabel("Cost price (KES)").fill("6.75");
  await sheet.getByLabel("Stock quantity").fill("5");
  await sheet.getByLabel("Add product photo", { exact: true }).setInputFiles({
    name: "wrong.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Not an image"),
  });
  await expect(sheet.getByRole("alert")).toContainText("JPEG, PNG or WebP");
  // Use a real large PNG so the browser's resize/reencode path is exercised.
  const image = Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 2400;
      c.height = 1200;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#df7538";
      ctx.fillRect(0, 0, c.width, c.height);
      return c.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await sheet.getByLabel("Add product photo", { exact: true }).setInputFiles({
    name: "coffee.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(
    sheet.getByLabel("Change product photo", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    sheet.getByRole("img", { name: "New product photo", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("photo-sheet-mobile.png"),
  });
  await sheet.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(sheet).not.toBeVisible({ timeout: 20000 });
  const photo = page.getByRole("img", {
    name: "Photo verification photo",
    exact: true,
  });
  await expect(photo).toBeVisible();
  await page.reload();
  await expect(photo).toBeVisible({ timeout: 20000 });
  let workspace = (
    await (
      await fetch(base + "/api/workspace", {
        headers: { Authorization: "Bearer " + session.access_token },
      })
    ).json()
  ).workspace;
  let product = workspace.state.products.find(
    (p: { sku: string }) => p.sku === "PHOTO-VERIFY",
  );
  const original = product.imagePath;
  expect(original).toMatch(new RegExp("^" + businessId + "/[0-9a-f-]+\\.jpg$"));
  async function save(command: unknown) {
    const r = await fetch(base + "/api/workspace", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessId,
        requestId: randomUUID(),
        revision: workspace.revision,
        command,
      }),
    });
    expect(r.status, await r.clone().text()).toBe(200);
    workspace = (await r.json()).workspace;
  }
  await page.goto("/dashboard/sales/new");
  await expect(photo).toBeVisible({ timeout: 20000 });
  await save({ type: "shop", published: true, name: "Photo shop", fee: 0 });
  const imageUrl = `/api/shop/${workspace.slug}/products/${product.id}/image`;
  await page.goto("/shop/" + workspace.slug);
  await expect(photo).toBeVisible();
  expect((await page.request.get(imageUrl)).status()).toBe(200);
  const listing = await (
    await page.request.get("/api/shop/" + workspace.slug)
  ).json();
  expect(JSON.stringify(listing)).not.toContain(original);
  await save({ type: "shop", hidden: [product.id] });
  expect((await page.request.get(imageUrl)).status()).toBe(404);
  await save({ type: "shop", hidden: [] });
  await save({ type: "shop", published: false });
  expect((await page.request.get(imageUrl)).status()).toBe(404);
  await save({ type: "shop", published: true });
  await page.goto("/dashboard/inventory");
  const row = page.getByRole("row").filter({ hasText: "Photo verification" });
  await row.getByRole("button", { name: "Edit product", exact: true }).click();
  await expect(sheet.getByLabel("Stock quantity", { exact: true })).toHaveCount(
    0,
  );
  await sheet
    .getByLabel("Change product photo", { exact: true })
    .setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: image,
    });
  await expect(
    sheet.getByText("Uploading photo…", { exact: true }),
  ).not.toBeVisible({ timeout: 20000 });
  await sheet
    .getByRole("button", { name: "Save product", exact: true })
    .click();
  await expect(sheet).not.toBeVisible({ timeout: 20000 });
  workspace = (
    await (
      await fetch(base + "/api/workspace", {
        headers: { Authorization: "Bearer " + session.access_token },
      })
    ).json()
  ).workspace;
  product = workspace.state.products.find(
    (p: { sku: string }) => p.sku === "PHOTO-VERIFY",
  );
  expect(product.imagePath).not.toBe(original);
  expect(product.stock).toBe(5);
  await row.getByRole("button", { name: "Edit product", exact: true }).click();
  await sheet
    .getByRole("button", { name: "Remove photo", exact: true })
    .click();
  await sheet
    .getByRole("button", { name: "Save product", exact: true })
    .click();
  await expect(sheet).not.toBeVisible({ timeout: 20000 });
  await page.reload();
  await expect(row).toBeVisible();
  await expect(
    row.getByRole("img", { name: "Photo verification: no photo", exact: true }),
  ).toBeVisible();
  expect((await page.request.get(imageUrl)).status()).toBe(404);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
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
  await expect(dialog.getByRole("alert")).toBeVisible();
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

test("connected customer, repayment, expense, checkout, refund and stocktake flows preserve cents", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await freshSession();
  let workspace = (
    await (
      await fetch(base + "/api/workspace", {
        headers: { Authorization: "Bearer " + session.access_token },
      })
    ).json()
  ).workspace;
  const created = await fetch(base + "/api/workspace", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + session.access_token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessId,
      requestId: randomUUID(),
      revision: workspace.revision,
      command: {
        type: "addProduct",
        product: {
          name: "Workflow coffee",
          size: "250 g",
          sku: "WORKFLOW-COFFEE",
          category: "Food",
          price: 10.25,
          cost: 6.75,
          stock: 5,
          reorder: 1,
          art: 0,
        },
      },
    }),
  });
  expect(created.status).toBe(200);
  workspace = (await created.json()).workspace;
  const product = workspace.state.products.find(
    (p: { sku: string }) => p.sku === "WORKFLOW-COFFEE",
  );
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: storageKey, value: JSON.stringify(session) },
  );
  await page.goto("/dashboard/customers");
  await page.getByRole("button", { name: "Add customer", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Full name").fill("Workflow customer");
  await sheet.getByLabel("Phone number (optional)").fill("0700123456");
  await sheet.getByLabel("Opening balance (KES)").fill("5.25");
  await sheet
    .getByRole("button", { name: "Add customer", exact: true })
    .click();
  await expect(sheet).not.toBeVisible({ timeout: 20000 });
  const customerRow = page
    .getByRole("row")
    .filter({ hasText: "Workflow customer" });
  await customerRow.getByRole("button", { name: "View details" }).click();
  await sheet.getByLabel("Record repayment (KES)").fill("0.25");
  await sheet
    .getByRole("button", { name: "Record repayment", exact: true })
    .click();
  await expect(sheet).not.toBeVisible({ timeout: 20000 });
  await page.goto("/dashboard/expenses");
  await page
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await sheet.getByLabel("What was it for?").fill("Workflow transport");
  await sheet.getByLabel("Amount (KES)").fill("1.25");
  await sheet
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await expect(sheet).not.toBeVisible({ timeout: 20000 });
  await page.goto("/dashboard/sales/new");
  await page
    .getByRole("button", { name: "Add Workflow coffee to sale", exact: true })
    .click();
  await expect(page.locator(".saving-overlay")).toHaveCount(0);
  await page
    .getByLabel("Customer", { exact: true })
    .selectOption({ label: "Workflow customer" });
  await expect(page.locator(".saving-overlay")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Bank transfer", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Record received payment", exact: true })
    .click();
  await expect(
    sheet.getByText("Payment was recorded manually.", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(sheet.locator(".document-total")).toContainText("10.25");
  await page.screenshot({ path: testInfo.outputPath("connected-receipt.png") });
  await sheet.getByRole("button", { name: "Close sheet", exact: true }).click();
  await page.goto("/dashboard/returns");
  await page.getByLabel("Quantity to return").fill("1");
  await page.getByLabel("Reason for return").fill("Unopened pack");
  await page
    .getByRole("button", { name: "Record refund given", exact: true })
    .click();
  await expect(page.locator(".saving-overlay")).toHaveCount(0);
  await page.goto("/dashboard/stocktakes");
  await page.getByLabel("Count name").fill("Workflow shelf check");
  await page
    .getByRole("button", { name: "Start stocktake", exact: true })
    .click();
  await page.getByLabel("Counted Workflow coffee", { exact: true }).fill("7");
  await page.getByLabel("Adjustment reason").fill("Physical shelf count");
  await expect(page.locator(".saving-overlay")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Review & finalise count", exact: true })
    .click();
  await expect(page.locator(".saving-overlay")).toHaveCount(0);
  await expect(page.getByText("Finalised", { exact: true })).toBeVisible();
  const record = await admin
    .from("business_records")
    .select("state")
    .eq("business_id", businessId)
    .single();
  const state = record.data!.state;
  expect(
    state.products.find((p: { id: number }) => p.id === product.id).stock,
  ).toBe(7);
  expect(
    state.customers.find(
      (c: { name: string }) => c.name === "Workflow customer",
    ).balance,
  ).toBe(5);
  expect(
    state.expenses.find(
      (e: { name: string }) => e.name === "Workflow transport",
    ).amount,
  ).toBe(1.25);
  const receipt = state.operations.receipts.find(
    (r: { customer: string }) => r.customer === "Workflow customer",
  );
  expect(receipt.total).toBe(1025);
  expect(receipt.payments).toEqual([{ method: "Bank transfer", amount: 1025 }]);
  expect(receipt.returned[product.id]).toBe(1);
  await page.goto("/dashboard/reports");
  await expect(page.locator(".workspace-main h1")).toBeVisible();
  await expect(page.locator('.workspace [role="alert"]')).toHaveCount(0);
});

test("camera decodes a barcode locally, releases its stream and keeps manual fallback", async ({
  page,
}) => {
  test.setTimeout(60000);
  await freshSession();
  let workspace = (
    await (
      await fetch(base + "/api/workspace", {
        headers: { Authorization: "Bearer " + session.access_token },
      })
    ).json()
  ).workspace;
  if (!workspace.state.products.length) {
    const created = await fetch(base + "/api/workspace", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + session.access_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessId,
        requestId: randomUUID(),
        revision: workspace.revision,
        command: {
          type: "addProduct",
          product: {
            name: "Scanner coffee",
            size: "250 g",
            sku: "SCANNER",
            category: "Food",
            price: 10.25,
            cost: 6.75,
            stock: 5,
            reorder: 1,
            art: 0,
          },
        },
      }),
    });
    expect(created.status).toBe(200);
    workspace = (await created.json()).workspace;
  }
  const product = workspace.state.products[0];
  const code = product.barcode || barcode(product.id);
  await page.addInitScript(
    ({ key, value, bars }) => {
      localStorage.setItem(key, value);
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: async () => {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 360;
          const context = canvas.getContext("2d")!;
          context.fillStyle = "#fff";
          context.fillRect(0, 0, 640, 360);
          context.fillStyle = "#000";
          [...bars].forEach((bar, index) => {
            if (bar === "1") context.fillRect(130 + index * 4, 80, 4, 180);
          });
          const stream = canvas.captureStream(12);
          Object.assign(window, { testCameraTracks: stream.getTracks() });
          return stream;
        },
      });
    },
    { key: storageKey, value: JSON.stringify(session), bars: eanBars(code) },
  );
  await page.goto("/dashboard/scanner");
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByLabel("Barcode or SKU", { exact: true })).toHaveValue(
    code,
    { timeout: 20000 },
  );
  await expect(page.locator(".scan-result")).toContainText(product.name);
  await expect(
    page.getByRole("button", { name: "Start camera", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => {
      const tracks = (
        window as unknown as { testCameraTracks: MediaStreamTrack[] }
      ).testCameraTracks;
      return (
        tracks.length > 0 &&
        tracks.every((track) => track.readyState === "ended")
      );
    }),
  ).toBe(true);
  await page.evaluate(() =>
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        throw new DOMException("Denied", "NotAllowedError");
      },
    }),
  );
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Camera permission was denied" }),
  ).toBeVisible();
  await page.getByLabel("Barcode or SKU", { exact: true }).fill(product.sku);
  await page.getByRole("button", { name: "Find product", exact: true }).click();
  await expect(page.locator(".scan-result")).toContainText(product.name);
});

test("repeated product submission sends one write and preserves the editor after validation errors", async ({
  page,
}) => {
  await freshSession();
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: storageKey, value: JSON.stringify(session) },
  );
  await page.goto("/dashboard/inventory");
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Product name").fill("Single submission");
  await sheet.getByLabel("Pack size").fill("250 g");
  await sheet.getByLabel("SKU", { exact: true }).fill("SINGLE-SUBMIT");
  await sheet.getByLabel("Selling price (KES)").fill("10.25");
  await sheet.getByLabel("Cost price (KES)").fill("6.75");
  let requests = 0;
  await page.route("**/api/workspace", async (route) => {
    const body = route.request().postDataJSON();
    if (
      route.request().method() === "POST" &&
      body?.command?.type === "addProduct"
    ) {
      requests++;
      if (requests === 1)
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Check this product before saving." }),
        });
      else await route.continue();
    } else await route.continue();
  });
  await sheet.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(sheet.getByRole("alert")).toContainText("Check this product");
  await expect(sheet.getByLabel("Product name")).toHaveValue(
    "Single submission",
  );
  await sheet.locator('button[type="submit"]').evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect(sheet).not.toBeVisible({ timeout: 20000 });
  expect(requests).toBe(2);
  const record = await admin
    .from("business_records")
    .select("state")
    .eq("business_id", businessId)
    .single();
  expect(
    record.data!.state.products.filter(
      (p: { sku: string }) => p.sku === "SINGLE-SUBMIT",
    ),
  ).toHaveLength(1);
});
