import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Email capture is deliberately local: this does not claim hosted SMTP delivery.
const local =
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname === "127.0.0.1";
test.skip(!local, "Requires the isolated local email-capture service.");
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const accounts: string[] = [];

async function emailLink(address: string) {
  let id = "";
  await expect
    .poll(
      async () => {
        const inbox = await fetch(
          "http://127.0.0.1:54324/api/v1/messages",
        ).then((r) => r.json());
        const message = inbox.messages.find(
          (m: { To: { Address: string }[] }) =>
            m.To.some((t) => t.Address === address),
        );
        id = message?.ID || "";
        return !!id;
      },
      { timeout: 15000 },
    )
    .toBe(true);
  const message = await fetch(
    "http://127.0.0.1:54324/api/v1/message/" + id,
  ).then((r) => r.json());
  const link = (message.HTML as string)
    .match(/href="([^"]+)"/i)?.[1]
    ?.replaceAll("&amp;", "&");
  if (!link?.startsWith("http://127.0.0.1:54321/auth/v1/verify?"))
    throw new Error("Account email did not contain a local verification link.");
  return link;
}
test.afterAll(async () => {
  for (const id of accounts) await admin.auth.admin.deleteUser(id);
});

test("signup email confirms the account and preserves the customer destination", async ({
  page,
}) => {
  const email = `confirm-${randomUUID()}@biashara.test`;
  await page.goto("/signup?next=%2Fshop%2Fverification");
  await page.getByLabel("Your name").fill("Amina");
  await page.getByLabel("Business name").fill("Amina shop");
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(randomUUID() + "Ab1!");
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Check your email" }),
  ).toBeVisible();
  const users = await admin.auth.admin.listUsers();
  const user = users.data.users.find((u) => u.email === email)!;
  accounts.push(user.id);
  expect(user.email_confirmed_at).toBeFalsy();
  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/shop\/verification$/, { timeout: 15000 });
  expect(
    (await admin.auth.admin.getUserById(user.id)).data.user?.email_confirmed_at,
  ).toBeTruthy();
});

test("password recovery email opens the reset form and the new password works", async ({
  page,
}) => {
  const email = `recover-${randomUUID()}@biashara.test`,
    password = randomUUID() + "Ab1!";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  accounts.push(created.data.user.id);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: /Send.*link|Send.*email/i }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email." }),
  ).toBeVisible();
  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/reset-password$/, { timeout: 15000 });
  const replacement = randomUUID() + "Zb8!";
  await page.getByLabel("New password", { exact: true }).fill(replacement);
  await page.getByLabel("Confirm password").fill(replacement);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(
    page.getByRole("heading", { name: "Password updated" }),
  ).toBeVisible();
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (await client.auth.signInWithPassword({ email, password: replacement }))
      .error,
  ).toBeNull();
  expect(
    (await client.auth.signInWithPassword({ email, password })).error,
  ).toBeTruthy();
});
