import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const base = "http://127.0.0.1:3002";
const database = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const admin = createClient(database, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const storageKey = "sb-" + new URL(database).hostname.split(".")[0] + "-auth-token";

test("an owner designs and publishes a shop through the dashboard", async ({ page }) => {
  const email = `shop-browser-${randomUUID()}@biashara-test.invalid`;
  const password = randomUUID() + "Aa9!";
  const username = `shop-browser-${randomUUID().slice(0, 8)}`;
  const account = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (account.error) throw account.error;
  const owner = account.data.user.id;
  let business = "";
  try {
    const client = createClient(database, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    const session = login.data.session!;
    async function post(path: string, input: unknown) {
      const response = await fetch(base + path, { method: "POST", headers: {
        Authorization: "Bearer " + session.access_token, "Content-Type": "application/json",
      }, body: JSON.stringify(input) });
      const data = await response.json();
      expect(response.status, JSON.stringify(data)).toBe(200);
      return data;
    }
    const { workspace } = await post("/api/workspace", { type: "createBusiness", profile: {
      name: "Store owner", business: "Design test shop", location: "Nairobi", type: "retail",
    } });
    business = workspace.businessId;
    await post("/api/identity-verification", { action: "declare", legalStructure: "individual" });
    const verification = await admin.from("business_identity_verifications").insert({
      business_id: business, owner_id: owner, status: "Approved", workflow_id: randomUUID(),
      session_id: randomUUID(), checked_at: new Date().toISOString(),
    });
    expect(verification.error).toBeNull();

    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: JSON.stringify(session) });
    await page.goto("/dashboard");
    await page.getByRole("navigation").getByRole("link", { name: "Shop builder", exact: true }).click();
    await page.getByLabel("Shop username").fill(username);
    await page.getByRole("button", { name: "Check availability" }).click();
    await expect(page.getByText(username + " is available.")).toBeVisible();
    await page.getByRole("button", { name: "Save username and continue" }).click();
    await expect(page.getByRole("radio")).toHaveCount(3);
    await page.getByRole("radio", { name: /Studio/ }).check();
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.getByLabel("Homepage headline").fill("Made for the neighbourhood");
    await page.getByLabel("About the business").fill("Custom collections and made-to-order gifts.");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.getByLabel("Public product catalogue").selectOption("off");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await page.getByLabel("Public email address").fill("contact@example.com");
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page.locator(".storefront-preview.storefront-studio")).toBeVisible();
    await page.getByRole("button", { name: "Publish shop", exact: true }).click();
    await page.getByRole("link", { name: "View live shop" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page).toHaveURL(base + "/" + username);
    await expect(page).toHaveTitle(/Design test shop/);
    await expect(page.getByRole("heading", { name: "Made for the neighbourhood" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Contact" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.getByRole("link", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Return to shop" }).click();
    await expect(page).toHaveURL(base + "/" + username);
  } finally {
    if (business) {
      await admin.from("business_commands").delete().eq("business_id", business);
      await admin.from("businesses").delete().eq("id", business);
    }
    await admin.auth.admin.deleteUser(owner);
  }
});
