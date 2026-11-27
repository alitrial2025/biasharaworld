import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { currentAuthenticatorCode } from "../tests/totp-fixture.mjs";

test("an independent owner verifies an authenticator before deciding a banking case", async ({
  page,
}) => {
  const database = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const origin = new URL(process.env.TEST_BASE_URL ?? "http://127.0.0.1:3002");
  for (const target of [database, origin])
    expect(["127.0.0.1", "localhost"]).toContain(target.hostname);
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const admin = createClient(
    database.href,
    process.env.SUPABASE_SECRET_KEY!,
    options,
  );
  const ids: string[] = [];
  let business = "";

  async function actor() {
    const email = `case-review-${randomUUID()}@biashara-test.invalid`;
    const password = randomUUID() + "Aa9!";
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    ids.push(created.data.user.id);
    const client = createClient(
      database.href,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      options,
    );
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    const session = signed.data.session!;
    return {
      email,
      session,
      async call(path: string, body?: unknown) {
        const response = await fetch(new URL(path, origin), {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: "Bearer " + session.access_token,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        expect(response.status, path).toBe(200);
        return response.json();
      },
    };
  }

  try {
    const [owner, manager] = await Promise.all([actor(), actor()]);
    const { workspace } = await owner.call("/api/workspace", {
      type: "createBusiness",
      profile: {
        name: "Case owner",
        business: "Banking test operations",
        location: "Nairobi",
        type: "finance",
      },
    });
    business = workspace.businessId;
    await owner.call("/api/workspace", {
      revision: workspace.revision,
      requestId: randomUUID(),
      command: {
        type: "inviteMember",
        member: { name: "Case manager", email: manager.email, role: "Manager" },
      },
    });
    await manager.call("/api/industry", {
      action: "create",
      sector: "finance",
      requestId: randomUUID(),
      module: "loan-reviews",
      name: "Loan case 1",
      values: {
        customer: "Client reference",
        amount: 50000,
        purpose: "Equipment review",
      },
    });
    const { records } = await manager.call("/api/industry");
    await manager.call("/api/industry", {
      action: "transition",
      sector: "finance",
      requestId: randomUUID(),
      id: records[0].id,
      from: "Submitted",
      status: "In review",
    });

    await page.addInitScript(
      ({ key, value }) => localStorage.setItem(key, value),
      {
        key: "sb-" + database.hostname.split(".")[0] + "-auth-token",
        value: JSON.stringify(owner.session),
      },
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    await page
      .getByRole("region", { name: "Daily work" })
      .getByRole("link", { name: "Open lending reviews 1" })
      .click();
    await page.getByRole("button", { name: "Mark as approved" }).click();
    await page
      .getByLabel("Decision reason")
      .fill("Independent review complete");
    await page
      .getByRole("button", { name: "Set up or check authenticator" })
      .click();
    const key = (await page.locator(".authenticator-key").textContent())!;
    await page
      .getByLabel("Authenticator code")
      .fill(currentAuthenticatorCode(key));
    await page
      .getByRole("button", { name: "Verify and confirm decision" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Saved · Approved" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "All records", exact: true }).click();
    await page.getByText("Activity history", { exact: true }).click();
    await expect(
      page.getByText("Independent review complete", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".authenticator-key")).toHaveCount(0);
  } finally {
    if (business) {
      await admin
        .from("business_commands")
        .delete()
        .eq("business_id", business);
      await admin.from("businesses").delete().eq("id", business);
    }
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
});
