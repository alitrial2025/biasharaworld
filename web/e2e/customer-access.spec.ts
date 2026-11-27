import { expect, test, type Page } from "@playwright/test";
import { createClient, type Session } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const origin = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3002";
const database = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const options = { auth: { persistSession: false, autoRefreshToken: false } };

function fixture() {
  for (const target of [origin, database])
    expect(["localhost", "127.0.0.1"]).toContain(new URL(target).hostname);
  const admin = createClient(
    database,
    process.env.SUPABASE_SECRET_KEY!,
    options,
  );
  const ids: string[] = [];
  const businesses: string[] = [];
  async function account() {
    const email = `public-${randomUUID()}@biashara-test.invalid`;
    const password = randomUUID() + "Aa1!";
    const result = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (result.error) throw result.error;
    ids.push(result.data.user.id);
    const client = createClient(
      database,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      options,
    );
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    return { email, session: login.data.session!, id: result.data.user.id };
  }

  async function merchant(type: string, verified = true) {
    const owner = await account();
    const { workspace } = await api(owner.session, "/api/workspace", {
      type: "createBusiness",
      profile: {
        name: "Owner",
        business: "Public workflow test",
        location: "Nairobi",
        type,
      },
    });
    businesses.push(workspace.businessId);
    if (verified) {
      await api(owner.session, "/api/identity-verification", {
        action: "declare",
        legalStructure: "individual",
      });
      const verified = await admin
        .from("business_identity_verifications")
        .insert({
          business_id: workspace.businessId,
          owner_id: owner.id,
          status: "Approved",
          checked_at: new Date().toISOString(),
          workflow_id: randomUUID(),
          session_id: randomUUID(),
        });
      expect(verified.error).toBeNull();
    }
    async function record(
      module: string,
      name: string,
      values: Record<string, string | number>,
    ) {
      await api(owner.session, "/api/industry", {
        action: "create",
        sector: type,
        module,
        name,
        values,
        requestId: randomUUID(),
      });
      const { records } = await api(owner.session, "/api/industry");
      return records.find((record: { name: string }) => record.name === name);
    }
    function move(
      record: { id: string; status: string },
      status: string,
      reference?: string,
    ) {
      return api(owner.session, "/api/industry", {
        action: "transition",
        sector: type,
        id: record.id,
        from: record.status,
        status,
        requestId: randomUUID(),
        reference,
      });
    }
    return { ...owner, workspace, record, move };
  }

  async function clean() {
    for (const business of businesses) {
      await admin
        .from("business_commands")
        .delete()
        .eq("business_id", business);
      await admin.from("businesses").delete().eq("id", business);
    }
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }
  return { account, merchant, clean };
}

async function request(session: Session | null, path: string, data?: unknown) {
  return fetch(origin + path, {
    method: data ? "POST" : "GET",
    headers: {
      ...(session ? { Authorization: "Bearer " + session.access_token } : {}),
      "Content-Type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}
async function api(
  session: Session | null,
  path: string,
  data?: unknown,
  expected = 200,
) {
  const response = await request(session, path, data);
  const payload = await response.json();
  expect(response.status, JSON.stringify(payload)).toBe(expected);
  return payload;
}
async function browserSession(page: Page, session: Session) {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    {
      key: "sb-" + new URL(database).hostname.split(".")[0] + "-auth-token",
      value: JSON.stringify(session),
    },
  );
  await page.setViewportSize({ width: 320, height: 740 });
}

test("published service times confirm once and appear in the merchant calendar", async ({
  page,
}) => {
  const f = fixture();
  try {
    const [merchant, client, another, unverified] = await Promise.all([
      f.merchant("services"),
      f.account(),
      f.account(),
      f.merchant("services", false),
    ]);
    async function service(owner: typeof merchant) {
      const { result } = await api(owner.session, "/api/workspace", {
        revision: owner.workspace.revision,
        requestId: randomUUID(),
        command: {
          type: "saveService",
          name: "Design consultation",
          duration: 45,
          priceMinor: 200000,
          active: true,
        },
      });
      return result.id;
    }
    const serviceId = await service(merchant);
    const startsAt = new Date(Date.now() + 86400_000).toISOString();
    await api(
      unverified.session,
      "/api/customer-access",
      {
        action: "addSlot",
        serviceId: await service(unverified),
        memberId: 1,
        startsAt,
      },
      403,
    );
    const slot = { action: "addSlot", serviceId, memberId: 1, startsAt };
    await api(merchant.session, "/api/customer-access", slot);
    const { slots } = await api(merchant.session, "/api/customer-access");
    expect(slots[0].starts_at).toBe(startsAt);
    expect(slots[0]).not.toHaveProperty("booked_by");
    const path = `/api/customer-activity/${merchant.workspace.slug}?flow=services`;
    const catalog = await api(null, path);
    expect(catalog.slots[0]).toMatchObject({
      name: "Design consultation",
      price: 200000,
      duration: 45,
    });
    expect(catalog.slots[0]).not.toHaveProperty("member_id");
    const claim = { slot: catalog.slots[0].id, price: 200000, duration: 45 };
    await api(null, path, claim, 401);
    await api(client.session, path, { ...claim, price: 100 }, 409);
    const attempts = await Promise.all([
      request(client.session, path, claim),
      request(another.session, path, claim),
    ]);
    expect(attempts.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const winner = attempts[0].ok ? client : another;
    const booking = await attempts.find((response) => response.ok)!.json();
    expect(await api(winner.session, path, claim)).toEqual(booking);
    expect((await api(null, path)).bookings).toEqual([]);
    expect(
      (await api(merchant.session, "/api/workspace")).workspace.state.operations
        .bookings,
    ).toHaveLength(1);
    await api(merchant.session, "/api/customer-access", {
      ...slot,
      startsAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
    });
    const servicePage = `/portal/${merchant.workspace.slug}/services`;
    await page.goto(servicePage);
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }),
    ).toHaveAttribute("href", "/login?next=" + encodeURIComponent(servicePage));
    await browserSession(page, winner.session);
    await page.goto(servicePage);
    await expect(
      page.getByRole("heading", { name: "Your appointments" }),
    ).toBeVisible();
    await expect(page.getByText("Scheduled · KES 2,000")).toBeVisible();
    await page.getByRole("button", { name: "Book this time" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Appointment confirmed." }),
    ).toBeVisible();
    await expect(page.getByText("Scheduled · KES 2,000")).toHaveCount(2);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(321);
  } finally {
    await f.clean();
  }
});

test("rent receipts require the right verified email and can be replaced or revoked", async ({
  page,
}) => {
  const f = fixture();
  try {
    const [owner, tenant, stranger] = await Promise.all([
      f.merchant("real-estate"),
      f.account(),
      f.account(),
    ]);
    const unit = await owner.record("properties", "Flat 2A", {
      address: "Nairobi",
      unit: "2A",
    });
    const renter = await owner.record("tenants", "Tenant reference", {
      reference: "TEN-001",
    });
    const lease = await owner.record("leases", "Lease 1", {
      property: unit.id,
      tenant: renter.id,
      start: "2026-01-01",
      end: "2027-01-01",
      amount: 650000,
    });
    await owner.move(lease, "Active");
    const rent = await owner.record("rent", "Rent-November", {
      lease: lease.id,
      amount: 650000,
      due: "2026-11-01",
    });
    const issue = {
      action: "issueReceiptLink",
      rentId: rent.id,
      email: tenant.email,
    };
    await api(owner.session, "/api/customer-access", issue, 409);
    await owner.move(rent, "Received", "BANK-REFERENCE-22");
    const first = await api(owner.session, "/api/customer-access", issue);
    const second = await api(owner.session, "/api/customer-access", issue);
    function receipt(path: string) {
      return `/api/customer-activity/${owner.workspace.slug}?flow=rent&token=${path.split("/").at(-1)}`;
    }
    await api(null, receipt(second.path), undefined, 401);
    await api(stranger.session, receipt(second.path), undefined, 404);
    await api(tenant.session, receipt(first.path), undefined, 404);
    expect(await api(tenant.session, receipt(second.path))).toMatchObject({
      amount: 650000,
      unit: "Flat 2A",
      paymentReference: "BANK-REFERENCE-22",
    });
    await browserSession(page, tenant.session);
    await page.goto(second.path);
    await expect(
      page.getByText("BANK-REFERENCE-22", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Print or save receipt" }),
    ).toBeVisible();
    await api(owner.session, "/api/customer-access", {
      action: "revokeReceiptLink",
      rentId: rent.id,
    });
    await api(tenant.session, receipt(second.path), undefined, 404);
  } finally {
    await f.clean();
  }
});

test("public free and paid seats lead to valid single-use mobile tickets", async ({
  page,
}) => {
  const f = fixture();
  try {
    const [host, guest, another] = await Promise.all([
      f.merchant("entertainment"),
      f.account(),
      f.account(),
    ]);
    const event = await host.record("events", "Nairobi performance", {
      venue: "City theatre",
    });
    await host.move(event, "Scheduled");
    const future = new Date(Date.now() + 3600_000).toISOString();
    const end = new Date(Date.now() + 7200_000).toISOString();
    const free = await host.record("showtimes", "Free screening", {
      event: event.id,
      start: future,
      end,
      room: "Hall 1",
    });
    const paid = await host.record("showtimes", "Paid screening", {
      event: event.id,
      start: future,
      end,
      room: "Hall 2",
    });
    const path = `/api/customer-activity/${host.workspace.slug}?flow=events`;
    expect((await api(null, path)).shows).toEqual([]);
    for (const [show, price] of [
      [free, 0],
      [paid, 150000],
    ] as const) {
      await host.record("seats", price ? "B-1" : "A-1", {
        show: show.id,
        section: "Stalls",
      });
      await api(host.session, "/api/customer-access", {
        action: "publishShow",
        showId: show.id,
        price,
      });
    }
    await host.record("seats", "A-2", { show: free.id, section: "Stalls" });
    const catalog = await api(null, path);
    const freeSeat = catalog.shows
      .find((row: { id: string }) => row.id === free.id)
      .seats.find((seat: { name: string }) => seat.name === "A-1").id;
    const paidSeat = catalog.shows.find(
      (row: { id: string }) => row.id === paid.id,
    ).seats[0].id;
    const freeRequest = { seat: freeSeat, requestId: randomUUID(), price: 0 };
    const freeTicket = await api(guest.session, path, freeRequest);
    expect(await api(guest.session, path, freeRequest)).toEqual(freeTicket);
    await api(
      another.session,
      path,
      { ...freeRequest, requestId: randomUUID() },
      409,
    );
    await api(
      guest.session,
      path,
      { seat: paidSeat, requestId: randomUUID(), price: 0 },
      409,
    );
    await api(guest.session, path, {
      seat: paidSeat,
      requestId: randomUUID(),
      price: 150000,
    });
    const before = (await api(guest.session, path)).tickets;
    const code = before.find(
      (row: { id: string }) => row.id === freeTicket.id,
    ).code;
    expect(
      before.find((row: { seat: string }) => row.seat === "B-1"),
    ).toMatchObject({ status: "Reserved" });
    expect(
      before.find((row: { seat: string }) => row.seat === "B-1"),
    ).not.toHaveProperty("code");
    expect((await api(another.session, path)).tickets).toEqual([]);
    const { records } = await api(host.session, "/api/industry");
    const held = records.find(
      (row: { module: string; values: { seat: string } }) =>
        row.module === "tickets" && row.values.seat === paidSeat,
    );
    await host.move(held, "Issued", "VENUE-PAYMENT-BOOK");
    await host.move(free, "Admission open");
    await api(host.session, "/api/industry", {
      action: "admit",
      sector: "entertainment",
      requestId: randomUUID(),
      code,
    });
    await api(
      host.session,
      "/api/industry",
      {
        action: "admit",
        sector: "entertainment",
        requestId: randomUUID(),
        code,
      },
      409,
    );
    await browserSession(page, guest.session);
    await page.goto(`/portal/${host.workspace.slug}/events`);
    await expect(
      page.getByRole("heading", { name: "Your tickets" }),
    ).toBeVisible();
    await expect(page.getByText("Checked in · Free")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download admission ticket" }),
    ).toHaveCount(2);
    await page
      .getByLabel("Available seat")
      .selectOption({ label: "Stalls · A-2" });
    await page.getByRole("button", { name: "Get free ticket" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Ticket issued." }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download admission ticket" }),
    ).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(321);
  } finally {
    await f.clean();
  }
});
