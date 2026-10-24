import { test, expect } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  emptyVerification,
  verificationMissing,
  verificationProfile,
} from "../src/lib/verification";

test("verification readiness validates Kenya, consent, contact phone and registration without implying verified identity", () => {
  const draft = emptyVerification();
  expect(verificationProfile.safeParse(draft).success).toBe(true);
  expect(verificationMissing(draft)).toContain("Owner declaration");
  expect(
    verificationProfile.safeParse({ ...draft, country: "UG" }).success,
  ).toBe(false);
  const ready = emptyVerification({
    legalName: "Amina retail",
    tradingName: "Amina shop",
    contactName: "Amina",
    phone: "+254 700 123456",
    email: "amina@example.com",
    businessAddress: "Nairobi",
    declaration: true,
  });
  expect(verificationMissing(ready)).toEqual([]);
  expect(verificationMissing({ ...ready, phone: "not a phone" })).toContain(
    "Valid contact phone",
  );
  expect(
    verificationMissing({ ...ready, registrationStatus: "registered" }),
  ).toContain("Business registration number");
});

const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const clients: { id: string; session: Session; businessId?: string }[] = [];
async function actor() {
  const email = `onboarding-${randomUUID()}@biashara-test.invalid`,
    password = randomUUID() + "Aa1!";
  const made = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "Readiness owner" },
  });
  if (made.error) throw made.error;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  const result = { id: made.data.user.id, session: login.data.session! };
  clients.push(result);
  return result;
}
async function request(
  actor: { session: Session },
  path: string,
  method = "GET",
  body?: unknown,
) {
  return fetch(base + path, {
    method,
    headers: {
      Authorization: "Bearer " + actor.session.access_token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function business(actor: { session: Session; businessId?: string }) {
  const response = await request(actor, "/api/workspace", "POST", {
    type: "createBusiness",
    profile: {
      name: "Readiness owner",
      business: "Readiness test",
      location: "Nairobi",
      type: "Retail shop",
    },
  });
  expect(response.status).toBe(200);
  const result = await response.json();
  actor.businessId = result.workspace.businessId;
  return result.workspace.businessId as string;
}
test.afterAll(async () => {
  for (const client of clients) {
    const memberships = await admin
      .from("business_members")
      .select("business_id,role")
      .eq("user_id", client.id);
    for (const membership of memberships.data || [])
      if (membership.role === "Owner") {
        await admin
          .from("business_commands")
          .delete()
          .eq("business_id", membership.business_id);
        await admin
          .from("businesses")
          .delete()
          .eq("id", membership.business_id);
      }
    await admin.auth.admin.deleteUser(client.id);
  }
});
test("readiness API and direct-table policies isolate owner details and never auto-verify", async () => {
  test.setTimeout(60000);
  const owner = await actor(),
    outsider = await actor(),
    viewer = await actor();
  const businessId = await business(owner);
  await business(outsider);
  expect(
    (
      await admin
        .from("business_members")
        .insert({ business_id: businessId, user_id: viewer.id, role: "Viewer" })
    ).error,
  ).toBeNull();
  const path = "/api/verification?businessId=" + businessId;
  expect((await fetch(base + path)).status).toBe(401);
  expect((await request(outsider, path)).status).toBe(403);
  expect((await request(viewer, path)).status).toBe(403);
  let response = await request(owner, path, "PUT", {
    businessId,
    profile: emptyVerification(),
    submit: false,
  });
  expect(response.status).toBe(200);
  expect((await response.json()).verification.status).toBe("draft");
  const ownerClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: "Bearer " + owner.session.access_token },
      },
    },
  );
  expect(
    (
      await ownerClient
        .from("business_verifications")
        .update({ status: "submitted", profile: {} })
        .eq("business_id", businessId)
    ).error,
  ).not.toBeNull();
  expect(
    (
      await request(owner, path, "PUT", {
        businessId,
        profile: emptyVerification(),
        submit: true,
      })
    ).status,
  ).toBe(400);
  const profile = emptyVerification({
    legalName: "Amina owner",
    tradingName: "Amina shop",
    contactName: "Amina",
    phone: "+254700123456",
    email: "amina@example.com",
    businessAddress: "Nairobi",
    declaration: true,
  });
  expect(
    (
      await request(owner, path, "PUT", {
        businessId,
        profile: { ...profile, country: "NG" },
        submit: true,
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await request(owner, path, "PUT", {
        businessId,
        profile: { ...profile, phone: "abcdefg" },
        submit: true,
      })
    ).status,
  ).toBe(400);
  response = await request(owner, path, "PUT", {
    businessId,
    profile,
    submit: true,
  });
  expect(response.status).toBe(200);
  const saved = await response.json();
  expect(saved.providerConfigured).toBe(false);
  expect(saved.verification.status).toBe("submitted");
  expect(saved.verification.consent_version).toBeTruthy();
  for (const client of [outsider, viewer]) {
    const scoped = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: { persistSession: false },
        global: {
          headers: { Authorization: "Bearer " + client.session.access_token },
        },
      },
    );
    expect(
      (
        await scoped
          .from("business_verifications")
          .select("profile")
          .eq("business_id", businessId)
      ).data,
    ).toEqual([]);
    expect((await request(client, path, "DELETE")).status).toBe(403);
  }
  expect((await request(owner, path, "DELETE")).status).toBe(200);
  expect((await (await request(owner, path)).json()).verification).toBeNull();
});

test("new owners complete six-step onboarding, resume their tab draft and save readiness", async ({
  page,
}) => {
  test.setTimeout(90000);
  const owner = await actor();
  const key =
    "sb-" +
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0] +
    "-auth-token";
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key, value: JSON.stringify(owner.session) },
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/onboarding");
  await page
    .getByLabel("Business or trading name", { exact: true })
    .fill("Readiness shop");
  await page
    .getByLabel("Legal business or owner name", { exact: true })
    .fill("Readiness owner");
  await page
    .getByLabel("Business address or trading location", { exact: true })
    .fill("Nairobi market");
  await expect(
    page
      .getByLabel("Country", { exact: true })
      .locator('option[value="Uganda"]'),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Contact phone", { exact: true }).fill("+254700123456");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Everyday operations", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Years trading", { exact: true }).fill("2");
  await page
    .getByLabel("People working in the business", { exact: true })
    .fill("3");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Do not upload or email", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "I am authorised", exact: false })
    .check();
  // Business creation can succeed while the following readiness request fails.
  // Reload must retain the owner's detailed draft and consent for a safe retry.
  await page.route("**/api/verification?businessId=*", async (route) => {
    if (route.request().method() === "PUT")
      await route.fulfill({
        status: 503,
        json: { error: "Readiness is temporarily unavailable. Retry safely." },
      });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await expect(page.locator("main [role='alert']")).toContainText(
    "Retry safely",
  );
  await page.unroute("**/api/verification?businessId=*");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Review & declaration", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "I am authorised", exact: false }),
  ).toBeChecked();
  await expect(page.getByText("Readiness shop", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish setup", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Your workspace is ready.",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20000 });
  const memberships = await admin
    .from("business_members")
    .select("business_id")
    .eq("user_id", owner.id)
    .single();
  const row = await admin
    .from("business_verifications")
    .select("status,profile")
    .eq("business_id", memberships.data!.business_id)
    .single();
  expect(row.data!.status).toBe("submitted");
  expect(row.data!.profile.phone).toBe("+254700123456");
  expect(row.data!.profile.employees).toBe(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("owners can defer verification and return from the locked workspace banner", async ({
  page,
}) => {
  test.setTimeout(60000);
  const owner = await actor();
  const key =
    "sb-" +
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0] +
    "-auth-token";
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key, value: JSON.stringify(owner.session) },
  );
  await page.goto("/onboarding");
  await page
    .getByLabel("Business or trading name", { exact: true })
    .fill("Deferred setup business");
  await page
    .getByLabel("Business address or trading location", { exact: true })
    .fill("Nairobi");
  await page
    .getByRole("button", {
      name: "Verify later · open limited workspace",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Your workspace is waiting for you.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Complete verification", exact: true }),
  ).toBeVisible();
  const workspace = await (await request(owner, "/api/workspace")).json();
  expect(workspace.workspace.access.featuresUnlocked).toBe(false);
  expect(workspace.workspace.access.identityStatus).toBe("provider_pending");
  await page
    .getByRole("link", { name: "Complete verification", exact: true })
    .click();
  await expect(
    page.getByLabel("Business or trading name", { exact: true }),
  ).toHaveValue("Deferred setup business");
});
