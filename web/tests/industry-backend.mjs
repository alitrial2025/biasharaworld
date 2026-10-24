import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { readinessProfile, submitReadiness } from "./helpers/readiness.mjs";
const catalog = JSON.parse(
  readFileSync(
    new URL("../../shared/industry-catalog.json", import.meta.url),
    "utf8",
  ),
);
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const users = [],
  businesses = [];
let passed = 0;
function check(name, fn) {
  fn();
  console.log("PASS", name);
  passed++;
}
async function actor() {
  const email = `industry-${randomUUID()}@biashara-test.invalid`,
    password = randomUUID() + "Aa9!";
  const r = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (r.error) throw r.error;
  users.push(r.data.user.id);
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  return { id: r.data.user.id, token: login.data.session.access_token, client };
}
async function req(a, path, body, method = body ? "POST" : "GET") {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: "Bearer " + a.token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, body: await response.json() };
}
async function create(a, type = "Event Equipment Rental Services") {
  const r = await req(a, "/api/workspace", {
    type: "createBusiness",
    profile: {
      name: "Temporary test",
      business: "Disposable industry test",
      location: "Nairobi",
      type,
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  businesses.push(r.body.workspace.businessId);
  return r.body.workspace;
}
function recordFor(industryId, workflowId) {
  const industry = catalog.find((i) => i.id === industryId),
    workflow = industry.workflows.find((w) => w.id === workflowId);
  return {
    industryId,
    workflowId,
    title: "Test operations record",
    customer: "Disposable client",
    status: workflow.statuses[0],
    amountMinor: 10000,
    fields: Object.fromEntries(
      workflow.fields.map((f) => [
        f.key,
        f.type === "number"
          ? String(Math.max(f.min || 0, 1))
          : f.type === "select"
            ? f.options[0]
            : f.type === "date"
              ? "2027-01-01"
              : f.type === "datetime"
                ? f.key === workflow.reservation?.endField
                  ? "2027-01-01T12:00"
                  : "2027-01-01T10:00"
                : "TEST-RESOURCE",
      ]),
    ),
  };
}
try {
  const owner = await actor(),
    other = await actor(),
    viewer = await actor();
  let workspace = await create(owner),
    otherBusiness = await create(other);
  const businessId = workspace.businessId;
  const input = {
    businessId,
    id: randomUUID(),
    revision: 0,
    requestId: randomUUID(),
    action: "create",
    record: recordFor("rentals", "reservations"),
  };
  check("new business is locked without an identity verification claim", () => {
    assert.equal(workspace.access.featuresUnlocked, false);
    assert.equal(workspace.access.identityStatus, "provider_pending");
  });
  let r = await req(owner, "/api/industry?businessId=" + businessId);
  check("locked catalog has no operational data", () => {
    assert.equal(r.status, 200);
    assert.equal(r.body.records.length, 0);
  });
  check("locked industry writes blocked", () => {});
  assert.equal((await req(owner, "/api/industry", input)).status, 403);
  const direct = await owner.client
    .from("business_records")
    .select("*")
    .eq("business_id", businessId);
  check("locked direct business record reads blocked", () => {
    assert.equal(direct.error, null);
    assert.equal(direct.data.length, 0);
  });
  const upload = await owner.client.storage
    .from("product-images")
    .upload(
      `${businessId}/${randomUUID()}.jpg`,
      Buffer.from([255, 216, 255, 217]),
      { contentType: "image/jpeg" },
    );
  check("locked direct photo upload blocked", () => assert.ok(upload.error));
  r = await req(
    owner,
    "/api/verification",
    { businessId, profile: readinessProfile, submit: false },
    "PUT",
  );
  assert.equal(r.status, 200);
  check("draft readiness remains locked", () => {});
  assert.equal((await req(owner, "/api/industry", input)).status, 403);
  r = await req(
    owner,
    "/api/verification",
    { businessId, profile: { ...readinessProfile, email: "" }, submit: true },
    "PUT",
  );
  check("incomplete readiness cannot submit", () =>
    assert.equal(r.status, 400),
  );
  workspace = await submitReadiness(base, owner.token, businessId);
  await submitReadiness(base, other.token, otherBusiness.businessId);
  const predicate = await owner.client.rpc("business_features_unlocked", {
    p_business: businessId,
  });
  check("SQL readiness predicate unlocks same complete profile", () => {
    assert.equal(predicate.error, null);
    assert.equal(predicate.data, true);
  });
  r = await req(owner, "/api/industry", input);
  check("create operation succeeds", () =>
    assert.equal(r.status, 200, JSON.stringify(r.body)),
  );
  let record = r.body.record;
  const replay = await req(owner, "/api/industry", input);
  check("same request replay does not duplicate", () => {
    assert.equal(replay.status, 200);
    assert.equal(replay.body.duplicate, true);
    assert.equal(replay.body.record.id, record.id);
  });
  const collision = await req(owner, "/api/industry", {
    ...input,
    id: randomUUID(),
    requestId: randomUUID(),
  });
  check("same resource overlapping reservation blocked", () =>
    assert.equal(collision.status, 409),
  );
  const maintenance = recordFor("rentals", "maintenance");
  r = await req(owner, "/api/industry", {
    ...input,
    id: randomUUID(),
    requestId: randomUUID(),
    record: maintenance,
  });
  check("maintenance blocks shared asset resource pool", () =>
    assert.equal(r.status, 409),
  );
  const adjacent = recordFor("rentals", "reservations");
  adjacent.fields.start = "2027-01-01T12:00";
  adjacent.fields.end = "2027-01-01T13:00";
  r = await req(owner, "/api/industry", {
    ...input,
    id: randomUUID(),
    requestId: randomUUID(),
    record: adjacent,
  });
  check("adjacent bookings allowed", () =>
    assert.equal(r.status, 200, JSON.stringify(r.body)),
  );
  const timestampUpdate = await db
    .from("industry_records")
    .update({ updated_at: "2026-10-24T12:00:00.123456+00:00" })
    .eq("business_id", businessId);
  if (timestampUpdate.error) throw timestampUpdate.error;
  const pageOne = await req(
    owner,
    "/api/industry?businessId=" + businessId + "&limit=1",
  );
  check("operations first page returns opaque continuation", () => {
    assert.equal(pageOne.status, 200, JSON.stringify(pageOne.body));
    assert.equal(pageOne.body.records.length, 1);
    assert.equal(typeof pageOne.body.nextCursor, "string");
  });
  const pageTwo = await req(
    owner,
    "/api/industry?businessId=" +
      businessId +
      "&limit=1&cursor=" +
      encodeURIComponent(pageOne.body.nextCursor),
  );
  check(
    "equal timestamps paginate by ID without missing or repeating records",
    () => {
      assert.equal(pageTwo.status, 200, JSON.stringify(pageTwo.body));
      assert.equal(pageTwo.body.records.length, 1);
      assert.equal(pageTwo.body.nextCursor, null);
      assert.notEqual(pageTwo.body.records[0].id, pageOne.body.records[0].id);
    },
  );
  const badCursor = await req(
    owner,
    "/api/industry?businessId=" + businessId + "&cursor=bad",
  );
  check("malformed operations cursors rejected", () =>
    assert.equal(badCursor.status, 400),
  );
  const crossedCursor = await req(
    other,
    "/api/industry?businessId=" +
      otherBusiness.businessId +
      "&cursor=" +
      encodeURIComponent(pageOne.body.nextCursor),
  );
  check("operations cursor bound to its business", () =>
    assert.equal(crossedCursor.status, 400),
  );
  const badLimit = await req(
    owner,
    "/api/industry?businessId=" + businessId + "&limit=201",
  );
  check("page sizes are bounded", () => assert.equal(badLimit.status, 400));
  r = await req(other, "/api/industry?businessId=" + businessId);
  check("another business cannot read operations", () =>
    assert.equal(r.status, 403),
  );
  r = await req(other, "/api/industry", {
    ...input,
    businessId: otherBusiness.businessId,
    action: "status",
    revision: 1,
    status: "Completed",
    requestId: randomUUID(),
  });
  check("another business cannot mutate known record ID", () =>
    assert.equal(r.status, 404),
  );
  const rawRead = await owner.client.from("industry_records").select("*");
  check("direct operations table cannot bypass API", () =>
    assert.ok(rawRead.error),
  );
  const added = await db
    .from("business_members")
    .insert({ business_id: businessId, user_id: viewer.id, role: "Viewer" });
  if (added.error) throw added.error;
  r = await req(viewer, "/api/industry", {
    ...input,
    requestId: randomUUID(),
    id: randomUUID(),
  });
  check("viewer cannot write operational records", () =>
    assert.equal(r.status, 403),
  );
  const payment = {
    businessId,
    id: record.id,
    revision: record.revision,
    requestId: randomUUID(),
    action: "payment",
    payment: { amountMinor: 4000, method: "Cash", reference: "TEST-RECEIPT" },
  };
  r = await req(owner, "/api/industry", payment);
  check("manual payment records correct balance", () => {
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.record.paid_minor, 4000);
  });
  record = r.body.record;
  r = await req(owner, "/api/industry", {
    ...payment,
    revision: record.revision,
    requestId: randomUUID(),
    payment: { ...payment.payment, amountMinor: 7000 },
  });
  check("overpayment blocked", () => assert.equal(r.status, 409));
  r = await req(owner, "/api/industry", {
    ...payment,
    requestId: randomUUID(),
  });
  check("stale revision blocked", () => assert.equal(r.status, 409));
  r = await req(owner, "/api/industry", {
    ...payment,
    revision: record.revision,
    requestId: randomUUID(),
    action: "refund",
    payment: {
      ...payment.payment,
      amountMinor: 1000,
      reference: "TEST-REFUND",
    },
  });
  check("manual refund reduces paid balance with history", () => {
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.record.paid_minor, 3000);
    assert.equal(r.body.record.payments.length, 2);
    assert.equal(r.body.record.payments[1].action, "refund");
  });
  record = r.body.record;
  r = await req(owner, "/api/industry", {
    ...payment,
    revision: record.revision,
    requestId: randomUUID(),
    action: "refund",
    payment: { ...payment.payment, amountMinor: 4000 },
  });
  check("refund above recorded payments blocked", () =>
    assert.equal(r.status, 409),
  );
  await req(
    owner,
    "/api/verification?businessId=" + businessId,
    undefined,
    "DELETE",
  );
  r = await req(owner, "/api/industry", payment);
  check("confirmed payment replay survives relock safely", () => {
    assert.equal(r.status, 200);
    assert.equal(r.body.duplicate, true);
  });
  r = await req(owner, "/api/industry", {
    ...payment,
    requestId: randomUUID(),
    revision: record.revision,
  });
  check("new writes blocked after clearing readiness", () =>
    assert.equal(r.status, 403),
  );
  r = await req(owner, "/api/industry?businessId=" + businessId);
  check("relocked operations redacted", () => {
    assert.equal(r.status, 200);
    assert.equal(r.body.records.length, 0);
  });
  r = await req(owner, "/api/workspace");
  check("relocked workspace retains profile but not records", () => {
    assert.equal(r.body.workspace.access.featuresUnlocked, false);
    assert.equal(r.body.workspace.state.products.length, 0);
    assert.equal(r.body.workspace.state.sales.length, 0);
  });
  // Corrupt service-side legacy rows must also fail both the JS and SQL gate.
  const invalid = await db.from("business_verifications").upsert({
    business_id: businessId,
    owner_id: owner.id,
    status: "submitted",
    profile: { ...readinessProfile, employees: 0 },
    consent_version: "2026-10-24",
    consented_at: new Date().toISOString(),
  });
  if (invalid.error) throw invalid.error;
  const denied = await owner.client.rpc("business_features_unlocked", {
    p_business: businessId,
  });
  check("malformed submitted row fails SQL gate", () =>
    assert.equal(denied.data, false),
  );
  for (const [label, profile, expected] of [
    ["short email TLD", { ...readinessProfile, email: "a@b.c" }, false],
    [
      "consecutive email dots",
      { ...readinessProfile, email: "a..b@example.com" },
      false,
    ],
    [
      "leading email dot",
      { ...readinessProfile, email: ".a@example.com" },
      false,
    ],
    [
      "terminal email apostrophe",
      { ...readinessProfile, email: "a'@example.com" },
      false,
    ],
    [
      "Unicode name exceeds Zod length",
      { ...readinessProfile, legalName: "😀".repeat(201) },
      false,
    ],
    [
      "Unicode name uses codepoint length",
      { ...readinessProfile, legalName: "😀".repeat(101) },
      true,
    ],
    [
      "Unicode whitespace-only owner",
      { ...readinessProfile, legalName: "\u00a0\ufeff" },
      false,
    ],
    [
      "Unicode trim matches JavaScript",
      { ...readinessProfile, legalName: "\u00a0Owner\ufeff" },
      true,
    ],
    [
      "Unicode phone whitespace matches JavaScript",
      { ...readinessProfile, phone: "+254\u00a0700\u2000123456" },
      true,
    ],
  ]) {
    const result = await db.rpc("business_readiness_valid", { p: profile });
    check("SQL profile parity: " + label, () => {
      assert.equal(result.error, null, JSON.stringify(result.error));
      assert.equal(result.data, expected);
    });
  }
  const invalidEmail = await db
    .from("business_verifications")
    .update({ profile: { ...readinessProfile, email: "a@b.c" } })
    .eq("business_id", businessId);
  if (invalidEmail.error) throw invalidEmail.error;
  const emailGate = await owner.client.rpc("business_features_unlocked", {
    p_business: businessId,
  });
  r = await req(owner, "/api/workspace");
  check("malformed legacy email fails both API and SQL access", () => {
    assert.equal(emailGate.data, false);
    assert.equal(r.body.workspace.access.featuresUnlocked, false);
  });
  const infiniteConsent = await db
    .from("business_verifications")
    .update({ profile: readinessProfile, consented_at: "infinity" })
    .eq("business_id", businessId);
  if (infiniteConsent.error) throw infiniteConsent.error;
  const consentGate = await owner.client.rpc("business_features_unlocked", {
    p_business: businessId,
  });
  check("non-finite consent timestamp fails SQL access", () =>
    assert.equal(consentGate.data, false),
  );
  console.log(`${passed} industry/access integration checks passed`);
} finally {
  for (const id of businesses) {
    const r = await db.from("businesses").delete().eq("id", id);
    if (r.error) console.error("Business cleanup failed", r.error.message);
  }
  for (const id of users) {
    const r = await db.auth.admin.deleteUser(id);
    if (r.error) console.error("Test account cleanup failed", r.error.message);
  }
}
