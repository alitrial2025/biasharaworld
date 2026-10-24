import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const admin = createClient(url, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3002";
const users = [],
  businesses = [],
  images = [];
let passed = 0;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0U8AAAAASUVORK5CYII=",
  "base64",
);
function check(name, fn = () => {}) {
  fn();
  passed++;
  console.log("PASS", name);
}
async function actor() {
  const email = `images-${randomUUID()}@biashara-test.invalid`,
    password = randomUUID() + "Aa1!";
  const made = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (made.error) throw made.error;
  users.push(made.data.user.id);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await client.auth.signInWithPassword({ email, password });
  if (login.error) throw login.error;
  return {
    id: made.data.user.id,
    client,
    token: login.data.session.access_token,
  };
}
async function req(a, body) {
  const response = await fetch(base + "/api/workspace", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + a.token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json() };
}
async function business(a) {
  const r = await req(a, {
    type: "createBusiness",
    profile: {
      name: "Photo verification",
      business: "Temporary image verification",
      location: "Nairobi",
      type: "Retail shop",
    },
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  businesses.push(r.data.workspace.businessId);
  return r.data.workspace;
}
async function command(a, w, cmd) {
  return req(a, {
    businessId: w.businessId,
    revision: w.revision,
    requestId: randomUUID(),
    command: cmd,
  });
}
try {
  const a = await actor(),
    b = await actor(),
    viewer = await actor();
  let wa = await business(a);
  const wb = await business(b);
  const bucket = await admin.storage.getBucket("product-images");
  check("Product bucket is private with file limits", () => {
    assert.equal(bucket.data.public, false);
    assert.equal(bucket.data.file_size_limit, 3145728);
  });
  const path = wa.businessId + "/" + randomUUID() + ".png";
  images.push(path);
  const uploaded = await a.client.storage
    .from("product-images")
    .upload(path, png, { contentType: "image/png" });
  assert.equal(uploaded.error, null);
  check("Owner uploads within own business");
  assert.equal(
    (await a.client.storage.from("product-images").download(path)).error,
    null,
  );
  check("Owner reads their image");
  assert.ok(
    (await b.client.storage.from("product-images").download(path)).error,
  );
  check("Another business cannot read the image");
  assert.ok(
    (await b.client.storage.from("product-images").createSignedUrl(path, 60))
      .error,
  );
  check("Another business cannot obtain a signed URL");
  assert.ok(
    (
      await b.client.storage
        .from("product-images")
        .upload(path, Buffer.from("replacement"), {
          contentType: "image/png",
          upsert: true,
        })
    ).error,
  );
  check("Another business cannot replace the image");
  await b.client.storage.from("product-images").remove([path]);
  assert.equal(
    (await a.client.storage.from("product-images").download(path)).error,
    null,
  );
  check("Another business cannot delete the image");
  const anon = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ok((await anon.storage.from("product-images").download(path)).error);
  check("Anonymous access is denied");
  assert.ok(
    (
      await a.client.storage
        .from("product-images")
        .upload(wb.businessId + "/" + randomUUID() + ".png", png, {
          contentType: "image/png",
        })
    ).error,
  );
  check("Owner cannot upload into another business prefix");
  assert.ok(
    (
      await a.client.storage
        .from("product-images")
        .upload(
          wa.businessId + "/" + randomUUID() + ".png",
          "<script>bad</script>",
          { contentType: "text/html" },
        )
    ).error,
  );
  check("Non-image MIME types are denied");
  assert.equal(
    (
      await admin
        .from("business_members")
        .insert({
          business_id: wa.businessId,
          user_id: viewer.id,
          role: "Viewer",
        })
    ).error,
    null,
  );
  assert.equal(
    (await viewer.client.storage.from("product-images").download(path)).error,
    null,
  );
  check("Same-business viewer can read product photos");
  assert.ok(
    (
      await viewer.client.storage
        .from("product-images")
        .upload(wa.businessId + "/" + randomUUID() + ".png", png, {
          contentType: "image/png",
        })
    ).error,
  );
  check("Viewer cannot upload photos");
  const product = {
    name: "Photo product",
    size: "1 unit",
    sku: "PHOTO",
    category: "Food",
    price: 10,
    cost: 5,
    stock: 0,
    reorder: 2,
    art: 7,
    imagePath: path,
  };
  const saved = await command(a, wa, { type: "addProduct", product });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  wa = saved.data.workspace;
  assert.equal(wa.state.products[0].imagePath, path);
  check("Product retains its private image reference");
  assert.equal(
    (await command(b, wb, { type: "addProduct", product })).status,
    400,
  );
  check("Product cannot attach a different business image");
  assert.equal(
    (
      await command(a, wa, {
        type: "updateProduct",
        id: wa.state.products[0].id,
        changes: { imagePath: wa.businessId + "/" + randomUUID() + ".jpg" },
      })
    ).status,
    400,
  );
  check("Product cannot reference an image that was not uploaded");
  const published = await command(a, wa, {
    type: "shop",
    published: true,
    name: "Temporary photo shop",
    fee: 0,
  });
  assert.equal(published.status, 200);
  wa = published.data.workspace;
  const route =
    base +
    "/api/shop/" +
    wa.slug +
    "/products/" +
    wa.state.products[0].id +
    "/image";
  let photo = await fetch(route);
  assert.equal(photo.status, 200);
  assert.deepEqual(Buffer.from(await photo.arrayBuffer()), png);
  check("Published visible product serves its own photo");
  assert.match(photo.headers.get("cache-control"), /no-store/);
  check("Shop photo visibility is rechecked without public caching");
  const listing = await (await fetch(base + "/api/shop/" + wa.slug)).json();
  assert.ok(listing.products[0].imageUrl);
  assert.ok(!JSON.stringify(listing).includes(path));
  check("Public listing exposes only the checked shop photo route");
  let changed = await command(a, wa, {
    type: "shop",
    hidden: [wa.state.products[0].id],
  });
  assert.equal(changed.status, 200);
  wa = changed.data.workspace;
  assert.equal((await fetch(route)).status, 404);
  check("Hidden product photo cannot be fetched");
  changed = await command(a, wa, {
    type: "shop",
    hidden: [],
    published: false,
  });
  assert.equal(changed.status, 200);
  wa = changed.data.workspace;
  assert.equal((await fetch(route)).status, 404);
  check("Unpublished shop photo cannot be fetched");
  changed = await command(a, wa, { type: "shop", published: true });
  assert.equal(changed.status, 200);
  wa = changed.data.workspace;
  const otherShop = await command(b, wb, {
    type: "shop",
    published: true,
    name: "Another temporary shop",
    fee: 0,
  });
  assert.equal(otherShop.status, 200);
  assert.equal(
    (
      await fetch(
        base +
          "/api/shop/" +
          otherShop.data.workspace.slug +
          "/products/" +
          wa.state.products[0].id +
          "/image",
      )
    ).status,
    404,
  );
  check("Another shop cannot resolve a foreign product photo");
  const removed = await command(a, wa, {
    type: "updateProduct",
    id: wa.state.products[0].id,
    changes: { imagePath: null },
  });
  assert.equal(removed.status, 200, JSON.stringify(removed.data));
  assert.equal(removed.data.workspace.state.products[0].imagePath, null);
  check("Owner can remove a product photo reference");
  assert.equal((await fetch(route)).status, 404);
  check("Detached product photo is no longer served by the shop");
  console.log(JSON.stringify({ passed, failed: 0 }));
} finally {
  if (images.length) await admin.storage.from("product-images").remove(images);
  for (const id of businesses) {
    await admin.from("business_commands").delete().eq("business_id", id);
    await admin.from("businesses").delete().eq("id", id);
  }
  for (const id of users) await admin.auth.admin.deleteUser(id);
}
