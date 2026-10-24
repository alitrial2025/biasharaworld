import assert from "node:assert/strict";
import { submitReadiness } from "./helpers/readiness.mjs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [],
  businesses = [];
let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log("PASS", label);
}
async function actor() {
  const email = `funding-${randomUUID()}@biashara-test.invalid`,
    password = randomUUID() + "Ab1!";
  const r = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (r.error) throw r.error;
  users.push(r.data.user.id);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  return { id: r.data.user.id, token: login.data.session.access_token, client };
}
async function api(actor, path, body, method = body ? "POST" : "GET") {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(actor ? { Authorization: "Bearer " + actor.token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, data: await r.json() };
}
async function business(a) {
  const r = await api(a, "/api/workspace", {
    type: "createBusiness",
    profile: {
      name: "Funding test owner",
      business: "Disposable funding verification",
      location: "Nairobi",
      type: "Retail shop",
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  businesses.push(r.data.workspace.businessId);
  return r.data.workspace.businessId;
}
const payload = {
  country: "KE",
  amount: "10000.25",
  purpose: "Stock",
  months: "6",
  monthlyRevenue: "5000.25",
  monthlyCosts: "3000.50",
  monthlyDebtPayments: "0",
  tradingYears: "1.5",
  registrationNumber: "",
  contactEmail: "owner@example.com",
  contactPhone: "+254700123456",
  plan: "Buy additional stock and repay from the monthly trading surplus.",
  consent: true,
};
try {
  const owner = await actor(),
    other = await actor(),
    manager = await actor();
  const businessId = await business(owner),
    otherBusiness = await business(other);
  await submitReadiness(base, other.token, otherBusiness);
  const route = "/api/funding?businessId=" + businessId;
  assert.equal((await api(null, route)).status, 401);
  check("Anonymous funding access denied", () => {});
  assert.equal((await api(other, route)).status, 403);
  check("Other tenant cannot read funding", () => {});
  assert.equal(
    (
      await admin.from("business_members").insert({
        business_id: businessId,
        user_id: manager.id,
        role: "Manager",
      })
    ).error,
    null,
  );
  assert.equal((await api(manager, route)).status, 403);
  check("Manager cannot access owner-only funding", () => {});
  assert.equal((await api(owner, route)).status, 403);
  check(
    "Funding remains locked until business readiness is complete",
    () => {},
  );
  assert.equal(
    (
      await api(owner, route, {
        businessId,
        id: randomUUID(),
        revision: 0,
        requestId: randomUUID(),
        action: "save",
        payload: { ...payload, amount: "" },
      })
    ).status,
    403,
  );
  check(
    "Locked owners cannot bypass readiness by saving a funding draft",
    () => {},
  );
  const verificationRoute = "/api/verification?businessId=" + businessId;
  const verificationProfile = {
    legalName: "Temporary funding owner",
    tradingName: "Temporary funding shop",
    contactName: "Temporary funding owner",
    phone: "+254700123456",
    email: "owner@example.com",
    country: "KE",
    businessType: "Retail shop",
    businessAddress: "Nairobi",
    registrationStatus: "unregistered",
    registrationNumber: "",
    yearsTrading: 1,
    employees: 1,
    revenueBand: "prefer_not_to_say",
    tools: ["Sales", "Stock", "Funding"],
    declaration: true,
  };
  const directVerification = await owner.client
    .from("business_verifications")
    .insert({
      business_id: businessId,
      owner_id: owner.id,
      status: "submitted",
      profile: { country: "KE" },
    });
  assert.ok(directVerification.error);
  check("Direct readiness status writes cannot bypass validation", () => {});
  const incompleteReadiness = await api(
    owner,
    verificationRoute,
    {
      businessId,
      profile: { ...verificationProfile, declaration: false },
      submit: true,
    },
    "PUT",
  );
  assert.equal(incompleteReadiness.status, 400);
  check("Readiness consent cannot be bypassed before funding", () => {});
  assert.equal(
    (
      await api(
        manager,
        verificationRoute,
        { businessId, profile: verificationProfile, submit: true },
        "PUT",
      )
    ).status,
    403,
  );
  check("Managers cannot submit owner readiness", () => {});
  const ready = await api(
    owner,
    verificationRoute,
    { businessId, profile: verificationProfile, submit: true },
    "PUT",
  );
  assert.equal(ready.status, 200, JSON.stringify(ready.data));
  check(
    "Validated readiness API unlocks funding preparation without identity verification",
    () => {
      assert.equal(ready.data.verification.status, "submitted");
      assert.equal(ready.data.providerConfigured, false);
      assert.ok(ready.data.verification.consent_version);
    },
  );
  const initial = await api(owner, route);
  assert.equal(initial.status, 200, JSON.stringify(initial.data));
  assert.equal(initial.data.providerConfigured, false);
  check("Owner sees real readiness without provider approval", () => {
    assert.equal(initial.data.readiness.sales30, 0);
    assert.equal(initial.data.verificationStatus, "submitted");
  });
  const body = {
    businessId,
    id: randomUUID(),
    revision: 0,
    requestId: randomUUID(),
    action: "save",
    payload: { ...payload, amount: "" },
  };
  const [saved, concurrentReplay] = await Promise.all([
    api(owner, route, body),
    api(owner, route, body),
  ]);
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.equal(
    concurrentReplay.status,
    200,
    JSON.stringify(concurrentReplay.data),
  );
  check("Concurrent duplicate requests create one revision", () => {
    assert.equal(
      saved.data.application.id,
      concurrentReplay.data.application.id,
    );
    assert.equal(saved.data.application.revision, 1);
    assert.equal(concurrentReplay.data.application.revision, 1);
    assert.ok(saved.data.duplicate || concurrentReplay.data.duplicate);
  });
  check("Incomplete funding draft is saved", () =>
    assert.equal(saved.data.application.status, "draft"),
  );
  const replay = await api(owner, route, body);
  assert.equal(replay.status, 200);
  check("Retry preserves application revision", () => {
    assert.equal(replay.data.duplicate, true);
    assert.equal(replay.data.application.revision, 1);
  });
  assert.equal((await api(owner, route, { ...body, payload })).status, 409);
  check("Request ID cannot be reused for different content", () => {});
  const change = { ...body, revision: 1, requestId: randomUUID(), payload };
  const changed = await api(owner, route, change);
  assert.equal(changed.status, 200);
  check("Draft revision increments once", () =>
    assert.equal(changed.data.application.revision, 2),
  );
  assert.equal(
    (await api(owner, route, { ...change, requestId: randomUUID() })).status,
    409,
  );
  check("Stale edits are rejected", () => {});
  const submit = {
    ...change,
    revision: 2,
    requestId: randomUUID(),
    action: "submit",
  };
  assert.equal(
    (
      await api(owner, route, {
        ...submit,
        requestId: randomUUID(),
        payload: { ...payload, consent: false },
      })
    ).status,
    400,
  );
  check("Funding consent cannot be skipped", () => {});
  assert.equal(
    (
      await api(owner, route, {
        ...submit,
        requestId: randomUUID(),
        payload: { ...payload, contactPhone: "-------" },
      })
    ).status,
    400,
  );
  check("Funding contact requires real phone digits", () => {});
  assert.equal(
    (
      await api(owner, route, {
        ...submit,
        requestId: randomUUID(),
        payload: { ...payload, country: "UG" },
      })
    ).status,
    400,
  );
  check("Unlaunched funding markets are rejected", () => {});
  const recorded = await api(owner, route, submit);
  assert.equal(recorded.status, 200, JSON.stringify(recorded.data));
  check("Request records provider-pending status", () => {
    assert.equal(recorded.data.application.status, "submitted");
    assert.equal(recorded.data.providerConfigured, false);
  });
  assert.equal(
    (await api(owner, verificationRoute, undefined, "DELETE")).status,
    200,
  );
  const committedReplay = await api(owner, route, submit);
  assert.equal(committedReplay.status, 200);
  check("Committed retry survives changed readiness", () =>
    assert.equal(committedReplay.data.duplicate, true),
  );
  assert.equal(
    (
      await api(owner, route, {
        ...change,
        revision: 3,
        requestId: randomUUID(),
      })
    ).status,
    403,
  );
  check("Clearing readiness relocks new funding changes", () => {});
  const withdrawn = await api(owner, route, {
    ...submit,
    revision: 3,
    requestId: randomUUID(),
    action: "withdraw",
  });
  assert.equal(withdrawn.status, 200);
  check("Withdrawal retains immutable history", () => {
    assert.equal(withdrawn.data.application.status, "withdrawn");
    assert.equal(withdrawn.data.application.history.length, 4);
  });
  assert.equal(
    (
      await api(other, route, {
        ...body,
        businessId: otherBusiness,
        id: body.id,
        requestId: randomUUID(),
      })
    ).status,
    404,
  );
  check("Cross-business application IDs cannot be overwritten", () => {});
  const direct = await owner.client
    .from("funding_applications")
    .update({ status: "submitted" })
    .eq("id", body.id);
  assert.ok(direct.error);
  check("Direct client funding writes denied", () => {});
  assert.equal(
    (await api(manager, route, { ...body, requestId: randomUUID() })).status,
    403,
  );
  check("Manager cannot write funding requests", () => {});
  const directRpc = await owner.client.rpc("save_funding_request", {
    p_business: businessId,
    p_user: owner.id,
    p_id: randomUUID(),
    p_revision: 0,
    p_request: randomUUID(),
    p_hash: "test",
    p_action: "submit",
    p_payload: payload,
    p_readiness: {},
  });
  assert.ok(directRpc.error);
  check("Funding RPC cannot bypass API validation from a client", () => {});
  const foreign = await other.client
    .from("funding_applications")
    .select("id")
    .eq("business_id", businessId);
  assert.deepEqual(foreign.data, []);
  check("Funding RLS hides other businesses", () => {});
  const managerRows = await manager.client
    .from("funding_applications")
    .select("id")
    .eq("business_id", businessId);
  assert.deepEqual(managerRows.data, []);
  check("Funding RLS excludes same-business staff", () => {});
  const ledgerRows = await owner.client
    .from("funding_request_log")
    .select("request_id")
    .eq("business_id", businessId);
  assert.deepEqual(ledgerRows.data, []);
  check("Funding idempotency ledger stays server-only", () => {});
  const records = await admin
    .from("funding_applications")
    .select("id")
    .eq("business_id", businessId);
  check("Retries did not create duplicate applications", () =>
    assert.equal(records.data.length, 1),
  );
  console.log(JSON.stringify({ passed, failed: 0 }));
} finally {
  const cleanupErrors = [];
  for (const id of businesses) {
    const result = await admin.from("businesses").delete().eq("id", id);
    if (result.error) cleanupErrors.push("business cleanup failed");
  }
  for (const id of users) {
    const result = await admin.auth.admin.deleteUser(id);
    if (result.error) cleanupErrors.push("account cleanup failed");
  }
  assert.deepEqual(
    cleanupErrors,
    [],
    "Temporary funding verification data could not be fully removed.",
  );
  console.log("Temporary funding accounts and business records cleaned up.");
}
