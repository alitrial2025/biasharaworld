import { test, expect, devices } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomUUID } from "node:crypto";

const base =
  process.env.STOREFRONT_TEST_BASE_URL ===
  "https://biasharaworld-staging.vercel.app"
    ? process.env.STOREFRONT_TEST_BASE_URL
    : "http://127.0.0.1:3002";
const database = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const databaseHost = new URL(database).hostname;
if (
  base.startsWith("https:")
    ? databaseHost !== "umwgenrzuignqmxauyzn.supabase.co"
    : !["localhost", "127.0.0.1"].includes(databaseHost)
) {
  throw new Error(
    "Use the dedicated staging project or a local database for shop fixtures.",
  );
}
const admin = createClient(database, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});
const storageKey =
  "sb-" + new URL(database).hostname.split(".")[0] + "-auth-token";

test("an owner designs and publishes a shop through the dashboard", async ({
  page,
  browser,
}) => {
  test.setTimeout(base.startsWith("https:") ? 120_000 : 60_000);
  const email = `shop-browser-${randomUUID()}@biashara-test.invalid`;
  const password = randomUUID() + "Aa9!";
  const username = `shop-browser-${randomUUID().slice(0, 8)}`;
  const account = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (account.error) throw account.error;
  const owner = account.data.user.id;
  let business = "";
  try {
    const client = createClient(
      database,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    const session = login.data.session!;
    async function post(path: string, input: unknown) {
      const response = await fetch(base + path, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + session.access_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      expect(response.status, JSON.stringify(data)).toBe(200);
      return data;
    }
    const { workspace } = await post("/api/workspace", {
      type: "createBusiness",
      profile: {
        name: "Store owner",
        business: "Design test shop",
        location: "Nairobi",
        type: "retail",
      },
    });
    business = workspace.businessId;
    await post("/api/identity-verification", {
      action: "declare",
      legalStructure: "individual",
    });
    const verification = await admin
      .from("business_identity_verifications")
      .insert({
        business_id: business,
        owner_id: owner,
        status: "Approved",
        workflow_id: randomUUID(),
        session_id: randomUUID(),
        checked_at: new Date().toISOString(),
      });
    expect(verification.error).toBeNull();

    const stocked = await post("/api/workspace", {
      revision: workspace.revision,
      requestId: randomUUID(),
      command: {
        type: "addProduct",
        product: {
          name: "Handmade gift",
          size: "1 item",
          sku: "GIFT",
          category: "Gifts",
          price: 125,
          cost: 60,
          stock: 10,
          reorder: 2,
          art: 3,
        },
      },
    });
    const productId = stocked.workspace.state.products[0].id as number;
    const legacy = await post("/api/workspace", {
      revision: stocked.workspace.revision,
      requestId: randomUUID(),
      command: { type: "shop", published: true },
    });
    const slug = legacy.workspace.slug as string;
    const legacyResponse = await page.request.get(`/shop/${slug}`, {
      maxRedirects: 0,
    });
    expect(legacyResponse.status()).toBe(200);
    expect(await legacyResponse.text()).toContain("Design test shop");

    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      { key: storageKey, value: JSON.stringify(session) },
    );
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Search anything/ }).click();
    const search = page.getByRole("dialog", { name: "Search workspace" });
    await search
      .getByPlaceholder("Search tools, products or customers…")
      .fill("Shop builder");
    await search
      .getByRole("button", { name: "Shop builder", exact: true })
      .click();
    await page.getByLabel("Shop username").fill(username);
    await page.getByRole("button", { name: "Check availability" }).click();
    await expect(page.getByText(username + " is available.")).toBeVisible();
    await page
      .getByRole("button", { name: "Save username and continue" })
      .click();
    const shopStatus = page.locator(".shop-builder-status");
    await expect(
      shopStatus.getByText(`/shop/${slug}`, { exact: true }),
    ).toBeVisible();
    await expect(
      shopStatus.getByText(`Draft address /${username}`),
    ).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(3);
    await page.getByRole("radio", { name: /Studio/ }).check();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page
      .getByLabel("Homepage headline")
      .fill("Made for the neighbourhood");
    await page
      .getByLabel("About the business")
      .fill("Custom collections and made-to-order gifts.");
    const image = await sharp({
      create: { width: 80, height: 48, channels: 3, background: "#236447" },
    })
      .png()
      .toBuffer();
    await page.getByLabel("Upload cover image").setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: image,
    });
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Image added to your draft." }),
    ).toBeVisible();
    const uploadedCover = await page
      .getByRole("textbox", { name: "Cover image URL", exact: true })
      .inputValue();
    expect(uploadedCover).toMatch(/^\/api\/storefront-media\//);
    const photo = await page.request.get(uploadedCover);
    expect(photo.status()).toBe(200);
    expect(photo.headers()["content-type"]).toBe("image/webp");
    await page.getByLabel("Upload logo").setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: image,
    });
    await expect(
      page.getByRole("textbox", { name: "Logo image URL", exact: true }),
    ).toHaveValue(/^\/api\/storefront-media\//);
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.getByLabel("Public product catalogue").selectOption("off");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.getByLabel("Public email address").fill("contact@example.com");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(
      page.getByRole("region", { name: "Publication checklist" }),
    ).toBeVisible();
    await expect(
      page.locator(".storefront-preview.storefront-studio"),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Publish shop", exact: true })
      .click();
    await page.getByRole("link", { name: "View live shop" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page).toHaveURL(base + "/" + username);
    await expect(page).toHaveTitle(/Design test shop/);
    await expect(
      page.getByRole("heading", { name: "Made for the neighbourhood" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Return to shop" }).click();
    await expect(page).toHaveURL(base + "/" + username);

    const visitor = await browser.newContext({
      ...devices["iPhone SE"],
      viewport: { width: 320, height: 700 },
      colorScheme: "dark",
    });
    try {
      const mobile = await visitor.newPage();
      for (const legacyPath of [
        `/shop/${slug}`,
        `/shop/${username}`,
        `/${username.toUpperCase()}`,
      ]) {
        const response = await mobile.goto(base + legacyPath);
        expect(response?.status()).toBe(200);
        await expect(mobile).toHaveURL(base + "/" + username);
      }

      const setupResponse = await fetch(base + "/api/storefront", {
        headers: { Authorization: "Bearer " + session.access_token },
      });
      expect(setupResponse.status).toBe(200);
      let setup = await setupResponse.json();
      const file = new FormData();
      file.set(
        "image",
        new Blob([new Uint8Array(image)], { type: "image/png" }),
        "product.png",
      );
      const uploaded = await fetch(base + "/api/storefront-media", {
        method: "POST",
        body: file,
        headers: { Authorization: "Bearer " + session.access_token },
      });
      expect(uploaded.status).toBe(200);
      const { path: productImage } = await uploaded.json();
      const draft = {
        ...setup.draft,
        catalog: "all",
        fulfillment: "pickup",
        pickup: "City Market, Nairobi",
        productDetails: {
          [productId]: {
            image: productImage,
            description: "Packed by hand and ready for pickup.",
          },
        },
        email:
          "questions-for-customers-and-order-collections@neighbourhood-gifts.example.com",
      };
      for (const template of ["market", "studio", "directory"]) {
        setup = await post("/api/storefront", {
          action: "save",
          revision: setup.revision,
          username,
          draft: { ...draft, template },
        });
        setup = await post("/api/storefront", {
          action: "publish",
          revision: setup.revision,
          requestId: randomUUID(),
        });

        const response = await mobile.goto(base + "/" + username);
        expect(response?.status()).toBe(200);
        await expect(mobile.locator(`.storefront-${template}`)).toBeVisible();
        await expect(
          mobile.getByRole("link", { name: "My orders" }),
        ).toBeVisible();
        await mobile.getByLabel("Quantity for Handmade gift").fill("1");
        await expect(
          mobile.getByRole("link", { name: "Basket (1)" }),
        ).toBeVisible();
        expect(
          await mobile.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
      }

      await mobile
        .getByRole("link", { name: "Handmade gift", exact: true })
        .click();
      await expect(mobile).toHaveURL(
        base + "/" + username + "?product=" + productId,
      );
      await expect(
        mobile.getByRole("heading", { name: "Handmade gift" }),
      ).toBeVisible();
      await expect(
        mobile.getByText("Packed by hand and ready for pickup."),
      ).toBeVisible();
      await expect(
        mobile.getByRole("img", { name: "Handmade gift" }),
      ).toBeVisible();
      expect(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);

      await mobile.getByRole("link", { name: "My orders" }).click();
      await expect(mobile).toHaveURL(base + `/portal/${slug}`);
      await mobile.getByRole("link", { name: "Sign in", exact: true }).click();
      await expect(mobile).toHaveURL(
        (url) =>
          url.pathname === "/login" &&
          url.searchParams.get("next") === `/portal/${slug}`,
      );
      await mobile.getByLabel("Email address").fill(email);
      await mobile.getByLabel("Password", { exact: true }).fill(password);
      await mobile.getByRole("button", { name: "Return to shop" }).click();
      await expect(mobile).toHaveURL(base + `/portal/${slug}`);
      const order = await post("/api/shop/" + slug, {
        requestId: randomUUID(),
        cart: { [productId]: 1 },
        address: "Contact at the desk",
      });
      await mobile.getByRole("button", { name: "Refresh orders" }).click();
      const updates = mobile.getByRole("region", { name: "Order updates" });
      await expect(
        updates.getByRole("link", { name: /Order received/ }),
      ).toBeVisible();
      for (const command of [
        { type: "orderStatus", id: order.id, status: "Confirmed" },
        { type: "orderStatus", id: order.id, status: "Packing" },
        { type: "pack", id: order.id, productId },
        { type: "orderStatus", id: order.id, status: "Dispatched" },
      ]) {
        const response = await fetch(base + "/api/workspace", {
          headers: { Authorization: "Bearer " + session.access_token },
        });
        const current = (await response.json()).workspace;
        await post("/api/workspace", {
          revision: current.revision,
          requestId: randomUUID(),
          command,
        });
      }
      await mobile.getByRole("button", { name: "Refresh orders" }).click();
      await expect(
        updates.getByRole("link", { name: /Ready for pickup/ }),
      ).toBeVisible();
      await expect(
        mobile.getByText("Pickup · City Market, Nairobi"),
      ).toBeVisible();
      await expect(
        mobile.getByText(/Ready for pickup · KES 125 · Payment pending/),
      ).toBeVisible();
    } finally {
      await visitor.close();
    }
  } finally {
    if (business) {
      const { data: files } = await admin.storage
        .from("storefront-media")
        .list(business);
      if (files?.length)
        await admin.storage
          .from("storefront-media")
          .remove(files.map((file) => business + "/" + file.name));
      await admin
        .from("business_commands")
        .delete()
        .eq("business_id", business);
      await admin.from("businesses").delete().eq("id", business);
    }
    await admin.auth.admin.deleteUser(owner);
  }
});

test("a phone gets a useful 404 for missing pages and shop links", async ({
  browser,
}) => {
  const mobile = await browser.newContext({
    ...devices["iPhone SE"],
    colorScheme: "dark",
  });
  try {
    const page = await mobile.newPage();
    const missing = `missing-${randomUUID().slice(0, 8)}`;
    for (const [path, title] of [
      [`/${missing}/details`, "Page not found"],
      [`/${missing}`, "Shop unavailable"],
      [`/shop/${missing}`, "Shop unavailable"],
    ]) {
      const response = await page.goto(base + path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Back to home" }),
      ).toBeVisible();
      if (title === "Shop unavailable")
        await expect(
          page.getByRole("link", { name: "Open Shop builder" }),
        ).toBeVisible();
      const bounds = await page.locator(".unavailable-card").boundingBox();
      expect(bounds?.x).toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  } finally {
    await mobile.close();
  }
});
