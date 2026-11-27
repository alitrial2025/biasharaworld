import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const database = process.env.NEXT_PUBLIC_SUPABASE_URL;
const origin = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3002";
for (const url of [database, origin])
  assert.ok(["127.0.0.1", "localhost"].includes(new URL(url).hostname));
const auth = { persistSession: false, autoRefreshToken: false };
const admin = createClient(database, process.env.SUPABASE_SECRET_KEY, { auth });
const users = [];
const shops = [];
const username = "shop-test-" + randomUUID().slice(0, 12);
const route = "/api/storefront";

async function actor(create = false) {
  const email = `storefront-${randomUUID()}@biashara-test.invalid`;
  const password = randomUUID() + "Aa9!";
  const account = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.equal(account.error, null);
  const id = account.data.user.id;
  users.push(id);
  const client = createClient(
    database,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth },
  );
  const login = await client.auth.signInWithPassword({ email, password });
  assert.equal(login.error, null);
  const user = { client, id, email, token: login.data.session.access_token };
  if (create) {
    const { workspace } = await expect(user, "/api/workspace", {
      type: "createBusiness",
      profile: {
        name: "Shop owner",
        business: email,
        location: "Nairobi",
        type: "retail",
      },
    });
    shops.push(workspace.businessId);
    user.business = workspace.businessId;
    user.slug = workspace.slug;
  }
  return user;
}

async function request(user, path, body) {
  const response = await fetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: {
      ...(user ? { Authorization: "Bearer " + user.token } : {}),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const responseText = await response.text();
  return {
    status: response.status,
    data: (response.headers.get("content-type") ?? "").includes("json")
      ? JSON.parse(responseText)
      : responseText,
  };
}
async function expect(user, path, body, status = 200) {
  const result = await request(user, path, body);
  assert.equal(
    result.status,
    status,
    `${path}: ${String(JSON.stringify(result.data)).slice(0, 300)}`,
  );
  return result.data;
}

async function product(user, name) {
  const { workspace } = await expect(user, "/api/workspace");
  const command = {
    type: "addProduct",
    product: {
      name,
      size: "1 item",
      category: "Gifts",
      sku: randomUUID().slice(0, 12),
      price: 125,
      cost: 60,
      stock: 12,
      reorder: 3,
      art: 2,
    },
  };
  const updated = await expect(user, "/api/workspace", {
    requestId: randomUUID(),
    revision: workspace.revision,
    command,
  });
  return updated.workspace.state.products.find(
    (product) => product.name === name,
  ).id;
}

async function publish(user, revision, action = "publish", status = 200) {
  return expect(
    user,
    route,
    { action, revision, requestId: randomUUID() },
    status,
  );
}

try {
  const first = await actor(true);
  const second = await actor(true);
  const buyer = await actor();
  const record = await expect(first, route);
  assert.equal(record.revision, 0);
  await expect(buyer, route, undefined, 403);
  const draft = {
    ...record.draft,
    name: "Nairobi gifts",
    headline: "Independent makers",
    template: "market",
    description: "Made in Kenya.",
    email: "shop@example.com",
    catalog: "all",
    fulfillment: "pickup",
    pickup: "Nairobi West",
    cover: "https://example.com/cover.jpg",
  };
  const save = { action: "save", revision: 0, username, draft };
  await expect(first, route, { ...save, username: "dashboard" }, 400);
  const attempts = await Promise.all([
    request(first, route, { ...save, username: username.toUpperCase() }),
    request(second, route, save),
  ]);
  assert.deepEqual(attempts.map((result) => result.status).sort(), [200, 409]);
  const owner = attempts[0].status === 200 ? first : second;
  const outsider = owner === first ? second : first;
  let shop = attempts.find((result) => result.status === 200).data;
  assert.equal(shop.username, username);
  const stale = await expect(owner, route, save, 409);
  assert.match(stale.error, /Reload and review your draft/);
  assert.equal(
    (await expect(outsider, route + "?username=" + username)).available,
    false,
  );
  await expect(null, "/" + username, undefined, 404);
  await publish(owner, shop.revision, "publish", 403);
  await expect(owner, "/api/identity-verification", {
    action: "declare",
    legalStructure: "individual",
  });
  const verified = await admin.from("business_identity_verifications").insert({
    business_id: owner.business,
    owner_id: owner.id,
    status: "Approved",
    workflow_id: randomUUID(),
    session_id: randomUUID(),
    checked_at: new Date().toISOString(),
  });
  assert.equal(verified.error, null);
  const selected = await product(owner, "Display only this gift");
  const hidden = await product(owner, "Keep this gift private");
  shop = await expect(owner, route, {
    ...save,
    revision: shop.revision,
    draft: { ...draft, catalog: "selected", products: [selected] },
  });
  const live = await publish(owner, shop.revision);
  assert.ok(live.published);
  const page = await expect(null, "/" + username);
  assert.match(page, /storefront-market/);
  assert.match(page, /Independent makers/);
  assert.ok(
    !page.includes("Keep this gift private"),
    "Hidden inventory never appears in the rendered site.",
  );
  await expect(
    owner,
    route,
    { ...save, username: username + "-renamed", revision: live.revision },
    409,
  );
  const added = await product(owner, "Unselected new stock");
  const checkout = "/api/shop/" + owner.slug;
  const list = await expect(null, checkout);
  assert.deepEqual(
    list.products.map((product) => product.id),
    [selected],
  );
  for (const id of [hidden, added])
    await expect(
      buyer,
      checkout,
      { requestId: randomUUID(), cart: { [id]: 1 }, address: "Tomorrow" },
      400,
    );
  const order = await expect(buyer, checkout, {
    requestId: randomUUID(),
    cart: { [selected]: 1 },
    address: "Tomorrow",
  });
  const { workspace } = await expect(owner, "/api/workspace");
  assert.match(
    workspace.state.operations.deliveries.find((entry) => entry.id === order.id)
      .address,
    /Pickup at Nairobi West/,
  );

  shop = await expect(owner, route, {
    ...save,
    revision: live.revision,
    draft: {
      ...live.draft,
      template: "studio",
      headline: "Private studio draft",
    },
  });
  assert.match(await expect(null, "/" + username), /Independent makers/);
  assert.ok(
    !(await expect(null, "/" + username)).includes("Private studio draft"),
  );
  shop = await publish(owner, shop.revision);
  assert.match(await expect(null, "/" + username), /storefront-studio/);
  shop = await expect(owner, route, {
    ...save,
    revision: shop.revision,
    draft: { ...shop.draft, catalog: "off", template: "directory" },
  });
  shop = await publish(owner, shop.revision);
  assert.match(await expect(null, "/" + username), /storefront-directory/);
  assert.deepEqual((await expect(null, checkout)).products, []);
  await expect(
    buyer,
    checkout,
    { requestId: randomUUID(), cart: { [selected]: 1 }, address: "Tomorrow" },
    400,
  );

  const direct = await owner.client
    .from("business_storefronts")
    .select("draft");
  assert.ok(direct.error || !direct.data.length);
  await publish(owner, shop.revision, "unpublish");
  await expect(null, "/" + username, undefined, 404);
  await expect(null, checkout, undefined, 404);
  console.log(
    "Storefront checks passed for username races, drafts, verification, all three layouts, product visibility, checkout and unpublishing.",
  );
} finally {
  for (const id of shops.reverse()) {
    await admin.from("business_commands").delete().eq("business_id", id);
    await admin.from("businesses").delete().eq("id", id);
  }
  for (const id of users.reverse()) await admin.auth.admin.deleteUser(id);
}
