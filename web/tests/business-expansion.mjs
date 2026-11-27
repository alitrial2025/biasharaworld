import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const database = process.env.NEXT_PUBLIC_SUPABASE_URL;
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
for (const target of [database, base]) {
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(target).hostname), "Use the disposable local database.");
}
const auth = { persistSession: false, autoRefreshToken: false };
const db = createClient(database, process.env.SUPABASE_SECRET_KEY, { auth });
const users = [];
const businesses = [];
const supplierPath = "/api/supplier-exchange";
const settlementPath = "/api/settlements";

async function signIn(name) {
  const email = `expansion-${randomUUID()}@biashara-test.invalid`;
  const password = randomUUID() + "Aa9!";
  const account = await db.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(account.error, null);
  const id = account.data.user.id;
  users.push(id);
  const client = createClient(database, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth });
  const login = await client.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null);
  return { id, name, email, client, token: login.data.session.access_token };
}

async function call(actor, path, body) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${actor.token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}

async function expect(actor, path, body, status = 200) {
  const response = await call(actor, path, body);
  assert.equal(response.status, status, JSON.stringify(response.body));
  return response.body;
}

async function workspace(actor, verify) {
  const { workspace } = await expect(actor, "/api/workspace", {
    type: "createBusiness", profile: { name: actor.name, business: actor.name, type: "Retail", location: "Nairobi" },
  });
  businesses.push(workspace.businessId);
  if (verify) {
    await expect(actor, "/api/identity-verification", { action: "declare", legalStructure: "individual" });
    const result = await db.from("business_identity_verifications").insert({
      business_id: workspace.businessId, owner_id: actor.id, status: "Approved",
      workflow_id: randomUUID(), session_id: randomUUID(), checked_at: new Date().toISOString(),
    });
    assert.equal(result.error, null);
  }
  return workspace;
}

function statement(source, rows) {
  return { action: "import", source, csv: ["date,reference,amount_kes", ...rows].join("\r\n") };
}

try {
  const buyer = await signIn("Buyer business");
  const supplier = await signIn("Test supplier");
  const other = await signIn("Unrelated business");
  const staff = await signIn("Test staff");
  const buyerWorkspace = await workspace(buyer, true);
  const supplierWorkspace = await workspace(supplier, true);
  await workspace(other, false);
  await expect(buyer, "/api/workspace", {
    revision: buyerWorkspace.revision, requestId: randomUUID(),
    command: { type: "inviteMember", member: { name: staff.name, email: staff.email, role: "Cashier" } },
  });

  const listing = { action: "profile", visible: true, coverage: "Nairobi", terms: "Delivery by appointment", leadDays: 2,
    minimumMinor: 500, catalogue: [{ item: "Test sacks", unit: "bag", unitMinor: 1250 }] };
  await expect(other, supplierPath, listing, 403);
  await expect(staff, supplierPath, undefined, 403);
  await expect(supplier, supplierPath, listing);
  const directory = await expect(buyer, supplierPath + "?search=test+sacks");
  assert.deepEqual(directory.suppliers.map(listing => listing.business_id), [supplierWorkspace.businessId]);
  assert.equal(directory.suppliers[0].catalogue[0].unitMinor, 1250);
  assert.equal((await expect(supplier, supplierPath)).suppliers.length, 0);

  const id = randomUUID();
  const requested = { item: "Test sacks", unit: "bag", quantity: 4 };
  const request = { action: "request", id, requestId: randomUUID(), supplierId: supplierWorkspace.businessId, lines: [requested], note: "Request for the next shipment" };
  await expect(other, supplierPath, { ...request, id: randomUUID(), requestId: randomUUID() }, 403);
  await expect(buyer, supplierPath, request);
  await expect(buyer, supplierPath, request);
  await expect(buyer, supplierPath, { ...request, note: "Changed after sending" }, 409);
  const detail = supplierPath + "?exchange=" + id;
  await expect(other, detail, undefined, 404);
  assert.equal((await expect(supplier, detail)).events.length, 1);
  const quote = { action: "quote", id, version: 1, requestId: randomUUID(), lines: [{ ...requested, unitMinor: 1000 }], deliveryFeeMinor: 400 };
  await expect(buyer, supplierPath, quote, 409);
  const race = await Promise.all([call(supplier, supplierPath, quote), call(supplier, supplierPath, { ...quote, requestId: randomUUID() })]);
  assert.deepEqual(race.map(result => result.status).sort(), [200, 409]);
  assert.match(race.find(result => result.status === 409).body.error, /Reload it before trying again/);
  const quoteView = await expect(buyer, detail);
  assert.equal(quoteView.exchange.quote_minor, 4400);
  assert.deepEqual(quoteView.exchange.actions, ["accept", "cancel"]);

  async function step(actor, action, version, fields = {}) {
    await expect(actor, supplierPath, { action, id, version, requestId: randomUUID(), ...fields });
  }
  await step(buyer, "accept", 2);
  await step(supplier, "dispatch", 3, { dispatchReference: "Dispatch-123" });
  await step(buyer, "dispute", 4, { note: "Only part of the shipment arrived" });
  await step(supplier, "dispatch", 5, { dispatchReference: "Dispatch-124" });
  await step(buyer, "receive", 6, { proofReference: "Delivery-note-124" });
  await step(supplier, "invoice", 7, { invoiceReference: "INV-124", dueOn: "2027-01-01" });
  const invoice = await expect(buyer, detail);
  assert.equal(invoice.exchange.status, "invoiced");
  assert.equal(invoice.exchange.invoice_reference, "INV-124");
  assert.equal(invoice.events.find(event => event.action === "receive").proofReference, "Delivery-note-124");
  assert.equal((await expect(buyer, "/api/financial-overview")).payables.current, 4400);
  await step(buyer, "record_payment", 8, { paymentReference: "OFFLINE-001" });
  assert.equal((await expect(supplier, detail)).exchange.status, "paid");
  assert.equal((await expect(buyer, "/api/financial-overview")).payables.current, 0);
  await expect(supplier, supplierPath, { action: "profile", visible: false });
  assert.equal((await expect(buyer, supplierPath)).suppliers.length, 0);
  assert.equal((await expect(buyer, detail)).events.length, 9);
  console.log("PASS verified supplier profiles, isolated exchange, quote revision conflict, dispatch discrepancy, receipt, invoice and payment record");

  const provider = statement("provider", ["2026-11-24,BATCH-001,123.40", "2026-11-24,BATCH-002,40.00"]);
  await expect(staff, settlementPath, undefined, 403);
  assert.deepEqual(await expect(buyer, settlementPath, provider), { added: 2, duplicates: 0 });
  assert.deepEqual(await expect(buyer, settlementPath, provider), { added: 0, duplicates: 2 });
  await expect(buyer, settlementPath, statement("provider", ["2026-11-24,BATCH-CONFLICT,1", "2026-11-24,BATCH-001,123.41"]), 409);
  await expect(buyer, settlementPath, statement("provider", ["2026-11-24,BATCH-INVALID,0.004"]), 400);
  await expect(buyer, settlementPath, statement("bank", [
    '"2026-11-25","BATCH-001","123.40"', "2026-11-25,BATCH-002,39", "2026-11-25,BATCH-003,10",
  ]));
  const report = await expect(buyer, settlementPath);
  assert.deepEqual(report.entries.map(entry => [entry.reference, entry.status]), [
    ["BATCH-001", "matched"], ["BATCH-002", "amount_mismatch"], ["BATCH-003", "missing_provider"],
  ]);
  const exceptions = await expect(buyer, settlementPath + "?exceptions=true");
  assert.equal(exceptions.entries.length, 2);
  const correction = exceptions.entries[0].lines.find(line => line.source === "bank");
  await expect(other, settlementPath, { action: "discard", id: correction.id, reason: "Wrong amount" }, 404);
  assert.deepEqual((await expect(other, settlementPath)).entries, []);
  await expect(buyer, settlementPath, { action: "discard", id: correction.id, reason: "Wrong amount imported" });
  await expect(buyer, settlementPath, statement("mobile_money", ["2026-11-25,BATCH-002,40"]));
  assert.equal((await expect(buyer, settlementPath + "?exceptions=true")).entries.length, 1);
  const audit = await buyer.client.from("settlement_statement_lines").select("*");
  assert.equal(audit.error?.code, "42501");
  console.log("PASS exact KES statement matching, atomic imports, repeated imports, exception filters, owner corrections and tenant isolation");

  let current = (await expect(buyer, "/api/workspace")).workspace;
  async function command(data, status = 200, requestId = randomUUID(), revision = current.revision) {
    const response = await expect(buyer, "/api/workspace", { requestId, revision, command: data }, status);
    if (response.workspace) current = response.workspace;
    return response;
  }
  const productHeaders = "name,sku,category,unit,price_kes,cost_kes,opening_stock,reorder_level";
  const productLine = '"Sacks, large",OPEN-STOCK,General,each,10.00,7.25,4,1';
  const importProduct = { type: "importBusiness", kind: "products", csv: `${productHeaders}\n${productLine}` };
  const badRows = await command({ ...importProduct, csv: `${importProduct.csv}\nWrong,SAME,General,each,0,5,3,2` }, 400);
  assert.match(badRows.error, /CSV line 3/);
  assert.equal((await expect(buyer, "/api/workspace")).workspace.state.products.length, 0);
  const preview = current.revision;
  const importId = randomUUID();
  assert.equal((await command(importProduct, 200, importId)).result.message, "Imported 1 product.");
  assert.equal((await command(importProduct, 200, importId, preview)).result.duplicate, true);
  const imported = current.state.products[0];
  assert.equal(imported.name, "Sacks, large");
  assert.equal(imported.stock, 4);
  const importAudit = await buyer.client.from("business_commands").select("input").eq("request_id", importId).single();
  assert.equal(importAudit.error, null);
  assert.deepEqual(importAudit.data.input.command, { type: "importBusiness", kind: "products" });
  await command({ type: "importBusiness", kind: "customers", csv: `name,email,phone,opening_balance_kes\nOpening account,${other.email},+254700000000,4.50` });
  await expect(staff, "/api/workspace", { requestId: randomUUID(), revision: current.revision, command: importProduct }, 400);
  assert.equal(current.state.customers[0].balance, 4.5);
  console.log("PASS atomic CSV business imports, quoted fields, opening stock and balances, retries, privacy and staff permissions");

  await command({ type: "addProduct", product: { name: "Supplier sacks", size: "bag", sku: "VERIFIED-SUPPLIER", category: "General", price: 14, cost: 10, stock: 0, reorder: 1, art: 0 } });
  const newStock = current.state.products.find(product => product.sku === "VERIFIED-SUPPLIER");
  const receive = { action: "receive_stock", id, version: 9, requestId: randomUUID(), branch: "main",
    lines: [{ index: 0, productId: newStock.id, expires: "2099-12-31" }] };
  await expect(supplier, supplierPath, receive, 404);
  await expect(buyer, supplierPath, receive);
  await expect(buyer, supplierPath, receive);
  await expect(buyer, supplierPath, { ...receive, requestId: randomUUID() }, 409);
  assert.equal((await expect(supplier, detail)).stockReceipt, null);
  assert.equal((await expect(buyer, detail)).stockReceipt.branch, "main");
  current = (await expect(buyer, "/api/workspace")).workspace;
  assert.equal(current.state.products.find(product => product.id === newStock.id).stock, 4);
  assert.equal(current.state.operations.batches.filter(batch => batch.code.startsWith("SUP-")).length, 1);
  console.log("PASS received supplier goods increase only the buyer’s selected branch stock, once, with a batch audit trail");

  async function newInvoice(quantity, due) {
    await command({ type: "clearCart" });
    await command({ type: "cart", id: imported.id, quantity });
    await command({ type: "basket", customer: "Opening account", discount: 0, redeem: 0 });
    return (await command({ type: "document", kind: "Invoice", due })).result.id;
  }
  await command({ type: "openRegister", amount: 0 });
  const firstInvoice = await newInvoice(3, "2000-01-01");
  await expect(staff, "/api/workspace", { requestId: randomUUID(), revision: current.revision,
    command: { type: "invoicePayment", id: firstInvoice, amount: 600, method: "Cash" } });
  current = (await expect(buyer, "/api/workspace")).workspace;
  assert.equal(current.state.operations.receipts.length, 0);
  assert.equal(current.state.products[0].stock, 4);
  const ageing = await expect(buyer, "/api/financial-overview");
  assert.equal(ageing.receivables.overdue91, 2400);
  assert.equal(ageing.inflows.Cash, 600);
  assert.equal(ageing.customerBalances, 450);
  await command({ type: "cart", id: imported.id, quantity: 2 }, 400);
  await command({ type: "invoicePayment", id: firstInvoice, amount: 2401, method: "Bank transfer" }, 400);
  await command({ type: "invoicePayment", id: firstInvoice, amount: 2400, method: "Bank transfer" });
  assert.equal(current.state.products[0].stock, 1);
  assert.deepEqual(current.state.operations.receipts[0].payments, [{ method: "Cash", amount: 600 }, { method: "Bank transfer", amount: 2400 }]);
  assert.equal(current.state.operations.registers[0].entries[0].amount, 600);
  assert.equal(current.state.operations.registers[0].entries.length, 1);
  await command({ type: "invoicePayment", id: firstInvoice, amount: 1, method: "Cash" }, 400);
  const secondInvoice = await newInvoice(1, "2027-12-31");
  await command({ type: "invoicePayment", id: secondInvoice, amount: 100, method: "Cash" });
  await command({ type: "cancelInvoice", id: secondInvoice, reason: "Order withdrawn", confirmedRefund: false }, 400);
  await command({ type: "cancelInvoice", id: secondInvoice, reason: "Order withdrawn", confirmedRefund: true });
  await command({ type: "cart", id: imported.id, quantity: 1 });
  assert.equal(current.state.operations.registers[0].entries.at(-1).amount, -100);
  const finance = await expect(buyer, "/api/financial-overview");
  assert.deepEqual(finance.inflows, { Cash: 700, "Bank transfer": 2400 });
  assert.equal(finance.returnedDeposits, 100);
  assert.equal(finance.receivables.overdue91, 0);
  await expect(staff, "/api/financial-overview", undefined, 403);
  console.log("PASS invoice deposits, stock reservations, bank balance payment, one receipt, cancellation and ageing without double counting");

  const service = (await command({ type: "saveService", name: "Fitting session", duration: 45, priceMinor: 12500, active: true })).result.id;
  const scheduled = { type: "scheduleBooking", serviceId: service, customerId: current.state.customers[0].id,
    memberId: 1, startsAt: "2027-03-18T09:00:00+03:00" };
  const bookingId = (await command(scheduled)).result.id;
  await command({ ...scheduled, startsAt: "2027-03-18T09:30:00+03:00" }, 400);
  await command({ type: "saveService", id: service, name: "Fitting and alterations", duration: 60, priceMinor: 16000, active: true });
  await command({ type: "rescheduleBooking", id: bookingId, customerId: scheduled.customerId, memberId: 1, startsAt: "2027-03-18T10:00:00+03:00" });
  assert.equal(current.state.operations.bookings[0].duration, 45);
  assert.equal(current.state.operations.bookings[0].priceMinor, 12500);
  assert.equal(current.state.operations.bookings[0].startsAt, "2027-03-18T07:00:00.000Z");
  await command({ type: "bookingStatus", id: bookingId, status: "Completed" }, 400);
  await command({ type: "bookingStatus", id: bookingId, status: "In progress" });
  await command({ type: "bookingStatus", id: bookingId, status: "Completed" });
  assert.equal(current.state.operations.bookings[0].status, "Completed");
  console.log("PASS service schedules, overlap protection, rescheduling and completion with the original price and duration");

  const notePath = "/api/customer-service";
  const portal = `/api/portal/${buyerWorkspace.slug}`;
  const customerId = current.state.customers[0].id;
  const privateNote = { action: "add", customer: customerId, id: randomUUID(), body: "Follow up about the fitting appointment" };
  await expect(staff, notePath, privateNote, 403);
  await expect(buyer, notePath, privateNote);
  await expect(buyer, notePath, privateNote);
  const notes = await expect(buyer, `${notePath}?customer=${customerId}`);
  assert.equal(notes.notes.length, 1);
  assert.equal(notes.notes[0].body, privateNote.body);
  await expect(other, `${notePath}?customer=${customerId}`, undefined, 404);
  assert.doesNotMatch(JSON.stringify(await expect(other, portal)), /Follow up/);
  assert.equal((await expect(other, portal)).emailOptIn, false);
  const optIn = { id: randomUUID(), emailOptIn: true };
  await expect(supplier, `${portal}/preferences`, optIn, 403);
  assert.equal((await expect(other, `${portal}/preferences`, optIn)).emailOptIn, true);
  assert.equal((await expect(other, `${portal}/preferences`, { id: randomUUID(), emailOptIn: false })).emailOptIn, false);
  assert.equal((await expect(other, `${portal}/preferences`, optIn)).emailOptIn, false);
  assert.equal((await expect(other, portal)).emailOptIn, false);
  await expect(buyer, notePath, { action: "redact", id: privateNote.id, reason: "Content entered by mistake" });
  const redacted = (await expect(buyer, `${notePath}?customer=${customerId}`)).notes[0];
  assert.equal(redacted.body, null);
  assert.ok(redacted.redacted_at);
  console.log("PASS private customer service notes, redaction, separate consent per merchant, and opt-out surviving an old request retry");
} finally {
  for (const id of businesses) {
    await db.from("business_commands").delete().eq("business_id", id);
    assert.equal((await db.from("businesses").delete().eq("id", id)).error, null);
  }
  for (const id of users) assert.equal((await db.auth.admin.deleteUser(id)).error, null);
}
