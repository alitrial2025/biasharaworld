import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

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
    due: "2026-01-01",
    amount: 12000,
  });
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
    due: "2026-01-01",
    amount: 100000,
  });
  await add(propertyOwner, "real-estate", "maintenance", "Fix lighting", {
    property: property.id,
    summary: "Entrance",
    due: "2026-01-05",
  });
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
  assert.equal((await getRecord(host, winner.name)).status, "Checked in");

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
  await move(manager, "finance", review, "Approved", 409);
  await move(owner, "finance", review, "Approved");
  assert.equal((await getRecord(manager, "LOAN-1")).status, "Approved");
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
