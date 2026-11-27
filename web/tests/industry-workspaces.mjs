import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { currentAuthenticatorCode } from "./totp-fixture.mjs";

const database = process.env.NEXT_PUBLIC_SUPABASE_URL;
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3002";
for (const target of [database, base]) {
  assert.ok(
    ["127.0.0.1", "localhost"].includes(new URL(target).hostname),
    "Use the local test database.",
  );
}
const auth = { persistSession: false, autoRefreshToken: false };
const db = createClient(database, process.env.SUPABASE_SECRET_KEY, { auth });
const users = [];
const businesses = [];

async function actor() {
  const email = `industry-${randomUUID()}@biashara-test.invalid`;
  const password = randomUUID() + "Aa9!";
  const account = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.equal(account.error, null);
  users.push(account.data.user.id);
  const client = createClient(
    database,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth },
  );
  const login = await client.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null);
  return { email, token: login.data.session.access_token, client };
}

async function verifyAuthenticator(actor) {
  const enrolled = await actor.client.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Biashara test",
  });
  assert.equal(enrolled.error?.message, undefined);
  const code = currentAuthenticatorCode(enrolled.data.totp.secret);
  const verified = await actor.client.auth.mfa.challengeAndVerify({
    factorId: enrolled.data.id,
    code,
  });
  assert.equal(verified.error?.message, undefined);
  actor.token = verified.data.access_token;
}

async function call(user, path, body) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${user.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
}

async function expect(user, path, body, status = 200) {
  const result = await call(user, path, body);
  assert.equal(result.status, status, JSON.stringify(result.body));
  return result.body;
}

const workspacePath = "/api/workspace";
const industryPath = "/api/industry";
const summaryPath = industryPath + "?view=summary";
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Nairobi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
function dateOffset(days) {
  const date = new Date(today + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
async function business(owner, type) {
  const { workspace } = await expect(owner, workspacePath, {
    type: "createBusiness",
    profile: {
      name: "Owner",
      business: `Industry test ${type}`,
      type,
      location: "Nairobi",
    },
  });
  businesses.push(workspace.businessId);
  return workspace;
}
async function workspaceCommand(actor, command, status) {
  const { workspace } = await expect(actor, workspacePath);
  return expect(
    actor,
    workspacePath,
    { revision: workspace.revision, requestId: randomUUID(), command },
    status,
  );
}
function industry(user, sector, input, status = 200) {
  return expect(
    user,
    industryPath,
    { ...input, sector, requestId: input.requestId ?? randomUUID() },
    status,
  );
}
async function getRecord(user, name) {
  const { records } = await expect(user, industryPath);
  const record = records.find((item) => item.name === name);
  assert.ok(record, `Missing record ${name}`);
  return record;
}
async function add(user, sector, module, name, values, status = 200) {
  await industry(
    user,
    sector,
    { action: "create", module, name, values },
    status,
  );
  if (status === 200) return getRecord(user, name);
}
async function move(user, sector, record, next, status = 200, reference) {
  return industry(
    user,
    sector,
    {
      action: "transition",
      id: record.id,
      from: record.status,
      status: next,
      reference,
    },
    status,
  );
}

try {
  const insurer = await actor();
  await business(insurer, "Insurance");
  const viewer = await actor();
  await workspaceCommand(insurer, {
    type: "inviteMember",
    member: { name: "Viewer", email: viewer.email, role: "Viewer" },
  });
  await expect(viewer, summaryPath, undefined, 403);
  assert.deepEqual(await expect(insurer, summaryPath), {
    sector: "insurance",
    counts: { claims: 0, premiums: 0, policies: 0 },
  });
  const policy = await add(insurer, "insurance", "policies", "POL-01", {
    holder: "Customer A",
    coverage: "Home",
    start: "2025-01-01",
    end: "2027-01-01",
    premium: 12000,
  });
  await move(insurer, "insurance", policy, "Active");
  const premium = await add(insurer, "insurance", "premiums", "Premium-01", {
    policy: policy.id,
    due: dateOffset(-1),
    amount: 12000,
  });
  await add(insurer, "insurance", "premiums", "Due today", {
    policy: policy.id,
    due: today,
    amount: 2000,
  });
  assert.equal((await expect(insurer, summaryPath)).counts.premiums, 1);
  await move(insurer, "insurance", premium, "Received", 409);
  await move(insurer, "insurance", premium, "Received", 200, "Receipt-01");
  assert.equal(
    (await getRecord(insurer, "Premium-01")).values.payment,
    "Receipt-01",
  );
  await add(
    insurer,
    "insurance",
    "claims",
    "Early-claim",
    {
      policy: policy.id,
      incident: "2024-10-01",
      amount: 10000,
      summary: "Damage",
    },
    409,
  );
  const claim = await add(insurer, "insurance", "claims", "Claim-01", {
    policy: policy.id,
    incident: "2026-10-01",
    amount: 10000,
    summary: "Damage",
  });
  await move(insurer, "insurance", claim, "In review");
  const renewal = await add(insurer, "insurance", "renewals", "Renewal-01", {
    policy: policy.id,
    end: "2028-01-01",
  });
  await move(insurer, "insurance", renewal, "Renewed");
  assert.equal((await getRecord(insurer, "POL-01")).values.end, "2028-01-01");
  const due = await add(insurer, "insurance", "policies", "Due-30", {
    holder: "Customer",
    coverage: "Home",
    start: dateOffset(-30),
    end: dateOffset(30),
    premium: 1000,
  });
  await move(insurer, "insurance", due, "Active");
  const longer = await add(insurer, "insurance", "policies", "Due-31", {
    holder: "Customer",
    coverage: "Home",
    start: dateOffset(-30),
    end: dateOffset(31),
    premium: 1000,
  });
  await move(insurer, "insurance", longer, "Active");
  const summary = await expect(insurer, summaryPath);
  assert.deepEqual(summary, {
    sector: "insurance",
    counts: {
      claims: 1,
      premiums: 0,
      policies: 1 + Number("2028-01-01" <= dateOffset(30)),
    },
  });
  assert.deepEqual(
    (await expect(insurer, summaryPath + "&businessId=invalid")).counts,
    summary.counts,
  );

  const propertyOwner = await actor();
  await business(propertyOwner, "real-estate");
  const property = await add(
    propertyOwner,
    "real-estate",
    "properties",
    "Unit A2",
    { address: "Nairobi", unit: "A2" },
  );
  const tenant = await add(
    propertyOwner,
    "real-estate",
    "tenants",
    "Tenant A",
    { reference: "TEN-1" },
  );
  const lease = await add(propertyOwner, "real-estate", "leases", "LEASE-1", {
    property: property.id,
    tenant: tenant.id,
    start: "2026-01-01",
    end: "2027-01-01",
    amount: 100000,
  });
  await move(propertyOwner, "real-estate", lease, "Active");
  const overlappingLease = await add(
    propertyOwner,
    "real-estate",
    "leases",
    "LEASE-2",
    {
      property: property.id,
      tenant: tenant.id,
      start: "2026-12-01",
      end: "2027-04-01",
      amount: 100000,
    },
  );
  await move(propertyOwner, "real-estate", overlappingLease, "Active", 409);
  await add(propertyOwner, "real-estate", "rent", "Rent-1", {
    lease: lease.id,
    due: dateOffset(-1),
    amount: 100000,
  });
  const maintenance = await add(
    propertyOwner,
    "real-estate",
    "maintenance",
    "Fix lighting",
    {
      property: property.id,
      summary: "Entrance",
      due: "2026-01-05",
    },
  );
  const propertyCounts = (await expect(propertyOwner, summaryPath)).counts;
  assert.equal(propertyCounts.rent, 1);
  assert.equal(propertyCounts.maintenance, 1);
  await move(propertyOwner, "real-estate", maintenance, "In progress");
  await move(
    propertyOwner,
    "real-estate",
    await getRecord(propertyOwner, "Fix lighting"),
    "Resolved",
  );
  assert.equal(
    (await expect(propertyOwner, summaryPath)).counts.maintenance,
    0,
  );
  assert.ok(
    !(await expect(propertyOwner, industryPath)).records.some(
      (record) => record.id === policy.id,
    ),
  );
  await industry(
    propertyOwner,
    "real-estate",
    {
      action: "transition",
      id: premium.id,
      from: "Received",
      status: "Voided",
    },
    409,
  );

  const host = await actor();
  const cashier = await actor();
  await business(host, "entertainment");
  await workspaceCommand(host, {
    type: "inviteMember",
    member: { name: "Cashier", email: cashier.email, role: "Cashier" },
  });
  const event = await add(host, "entertainment", "events", "Nairobi concert", {
    venue: "Concert venue",
  });
  await move(host, "entertainment", event, "Scheduled");
  const show = await add(host, "entertainment", "showtimes", "Evening", {
    event: event.id,
    start: new Date(Date.now() - 60000).toISOString(),
    end: new Date(Date.now() + 86400000).toISOString(),
    room: "Hall 1",
  });
  const seat = await add(host, "entertainment", "seats", "A1", {
    show: show.id,
    section: "Stalls",
  });
  const range = {
    action: "createSeats",
    sector: "entertainment",
    requestId: randomUUID(),
    show: show.id,
    section: "Stalls",
    row: "b",
    first: 2,
    count: 3,
  };
  assert.equal((await expect(host, industryPath, range)).created, 3);
  assert.deepEqual(await expect(host, industryPath, range), {
    saved: true,
    duplicate: true,
    created: 3,
  });
  await expect(
    host,
    industryPath,
    { ...range, requestId: randomUUID(), first: 1, count: 2 },
    409,
  );
  await expect(
    host,
    industryPath,
    { ...range, requestId: randomUUID(), first: 9998, count: 3 },
    409,
  );
  await expect(
    cashier,
    industryPath,
    { ...range, requestId: randomUUID() },
    403,
  );
  const seats = (await expect(host, industryPath)).records.filter(
    (record) => record.module === "seats",
  );
  assert.deepEqual(seats.map((record) => record.name).sort(), [
    "A1",
    "B-2",
    "B-3",
    "B-4",
  ]);
  const reservation = {
    action: "create",
    module: "tickets",
    values: { seat: seat.id, guest: "Guest", amount: 10000 },
    sector: "entertainment",
  };
  const first = { ...reservation, requestId: randomUUID(), name: "RES-1" };
  const second = { ...reservation, requestId: randomUUID(), name: "RES-2" };
  const attempts = await Promise.all([
    call(host, industryPath, first),
    call(host, industryPath, second),
  ]);
  assert.deepEqual(
    attempts.map((attempt) => attempt.status).sort(),
    [200, 409],
  );
  const winner = attempts[0].status === 200 ? first : second;
  assert.equal((await expect(host, industryPath, winner)).duplicate, true);
  const ticket = await getRecord(host, winner.name);
  await move(host, "entertainment", ticket, "Issued", 409);
  await move(host, "entertainment", ticket, "Issued", 200, "TICKET-PAID");
  assert.deepEqual(await expect(cashier, industryPath), {
    records: [],
    manage: false,
    scan: true,
    sector: "entertainment",
  });
  await add(
    cashier,
    "entertainment",
    "events",
    "Another event",
    { venue: "Venue" },
    403,
  );
  await industry(
    cashier,
    "entertainment",
    { action: "admit", code: ticket.code },
    409,
  );
  await move(host, "entertainment", show, "Admission open");
  assert.equal((await expect(host, summaryPath)).counts.showtimes, 1);
  await expect(
    host,
    industryPath,
    { ...range, requestId: randomUUID(), row: "C" },
    409,
  );

  await industry(cashier, "entertainment", {
    action: "admit",
    code: ticket.code.toLowerCase(),
  });
  await industry(
    cashier,
    "entertainment",
    { action: "admit", code: ticket.code },
    409,
  );
  const checkedIn = await getRecord(host, winner.name);
  assert.equal(checkedIn.status, "Checked in");
  assert.deepEqual(
    checkedIn.history.map(({ status, role }) => [status, role]),
    [
      ["Reserved", "Owner"],
      ["Issued", "Owner"],
      ["Checked in", "Cashier"],
    ],
  );
  await expect(cashier, summaryPath, undefined, 403);

  const owner = await actor();
  const manager = await actor();
  await business(owner, "finance");
  await workspaceCommand(owner, {
    type: "inviteMember",
    member: { name: "Manager", email: manager.email, role: "Manager" },
  });
  const values = { customer: "CUST-1", amount: 150000, purpose: "Review 068" };
  await add(owner, "finance", "loan-reviews", "LOAN-1", values, 403);
  const loan = await add(manager, "finance", "loan-reviews", "LOAN-1", values);
  await move(manager, "finance", loan, "In review");
  const review = await getRecord(manager, "LOAN-1");
  assert.equal((await expect(owner, summaryPath)).counts["loan-reviews"], 1);
  await move(manager, "finance", review, "Approved", 403, "Review complete");
  const passwordOnly = { ...owner };
  await move(owner, "finance", review, "Approved", 403, "Review complete");
  await verifyAuthenticator(owner);
  await move(owner, "finance", review, "Approved", 409);
  await move(
    passwordOnly,
    "finance",
    review,
    "Approved",
    403,
    "Review complete",
  );
  await move(owner, "finance", review, "Approved", 200, "Review complete");
  const decided = await getRecord(manager, "LOAN-1");
  assert.equal(decided.status, "Approved");
  assert.equal(decided.history.at(-1).note, "Review complete");
  assert.equal(decided.history.at(-1).role, "Owner");
  assert.equal((await expect(owner, summaryPath)).counts["loan-reviews"], 0);
  await workspaceCommand(
    manager,
    { type: "updateProfile", profile: { type: "general" } },
    400,
  );

  await workspaceCommand(insurer, {
    type: "updateProfile",
    profile: { type: "general" },
  });
  assert.deepEqual((await expect(insurer, industryPath)).records, []);
  await industry(
    insurer,
    "insurance",
    { action: "create", module: "policies", name: "Stale", values: {} },
    409,
  );
  await workspaceCommand(insurer, {
    type: "updateProfile",
    profile: { type: "insurance" },
  });
  assert.equal((await getRecord(insurer, "POL-01")).id, policy.id);
  const catalog = JSON.parse(
    await readFile(
      new URL("../src/lib/industry-catalog/workspaces.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(catalog.length, 19);
  const additional = catalog.filter(
    ({ id }) =>
      !["insurance", "real-estate", "entertainment", "finance"].includes(id),
  );
  const sharedOwner = await actor();
  await business(sharedOwner, "general");
  for (const sector of additional) {
    await workspaceCommand(sharedOwner, {
      type: "updateProfile",
      profile: { type: sector.id },
    });
    const records = new Map();
    for (const definition of sector.modules) {
      const values = {};
      for (const field of definition.fields) {
        const examples = {
          date: field.key === "end" ? "2027-12-31" : "2027-01-01",
          datetime: "2027-01-01T09:00:00+03:00",
          count: 2,
          money: 15000,
          text: "Example",
        };
        values[field.key] =
          field.type === "reference"
            ? records.get(field.module).id
            : examples[field.type];
      }
      const record = await add(
        sharedOwner,
        sector.id,
        definition.id,
        definition.label + " example",
        values,
      );
      assert.equal(record.status, Object.keys(definition.flow)[0]);
      if (definition.id === "courses")
        await move(sharedOwner, sector.id, record, "Open");
      records.set(definition.id, record);
    }
    if (sector.id === "restaurant") {
      const table = records.get("tables");
      await move(sharedOwner, sector.id, table, "Inactive");
      await add(
        sharedOwner,
        sector.id,
        "kitchen",
        "Order for inactive table",
        { table: table.id, items: "Lunch" },
        409,
      );
    }
    if (sector.id === "hospitality") {
      await move(
        sharedOwner,
        sector.id,
        records.get("rooms"),
        "Out of service",
      );
      await move(
        sharedOwner,
        sector.id,
        records.get("stays"),
        "Checked in",
        409,
      );
    }
    if (sector.id === "manufacturing") {
      const batch = records.get("batches");
      await move(sharedOwner, sector.id, batch, "In production");
      await move(
        sharedOwner,
        sector.id,
        { ...batch, status: "In production" },
        "Quality check",
      );
      await move(
        sharedOwner,
        sector.id,
        { ...batch, status: "Quality check" },
        "Released",
        409,
      );
      await move(
        sharedOwner,
        sector.id,
        { ...batch, status: "Quality check" },
        "Released",
        200,
        "QC-101",
      );
      assert.equal((await expect(sharedOwner, summaryPath)).counts.batches, 0);
    }
    if (sector.id === "logistics") {
      const delivery = records.get("dispatch");
      await move(sharedOwner, sector.id, delivery, "Dispatched");
      await move(
        sharedOwner,
        sector.id,
        { ...delivery, status: "Dispatched" },
        "Exception",
        409,
      );
      await move(
        sharedOwner,
        sector.id,
        { ...delivery, status: "Dispatched" },
        "Exception",
        200,
        "Receiver unavailable",
      );
      assert.equal(
        (await getRecord(sharedOwner, delivery.name)).history.at(-1).note,
        "Receiver unavailable",
      );
    }
    const workspaceRecords = await expect(sharedOwner, industryPath);
    assert.equal(workspaceRecords.sector, sector.id);
    assert.equal(workspaceRecords.records.length, sector.modules.length);
  }

  const direct = await insurer.client
    .from("industry_workspaces")
    .select("records");
  assert.ok(
    direct.error || !direct.data?.length,
    "Industry records must be inaccessible directly through Supabase.",
  );
  console.log(
    "Industry contracts passed for insurance, property, events, banking, all additional sector presets, role and tenant isolation, and business-type changes.",
  );
} finally {
  for (const id of businesses.reverse()) {
    await db.from("business_commands").delete().eq("business_id", id);
    await db.from("businesses").delete().eq("id", id);
  }
  for (const id of users.reverse()) await db.auth.admin.deleteUser(id);
}
