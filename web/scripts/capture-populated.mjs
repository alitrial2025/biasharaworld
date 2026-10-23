import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const output = { exports: {} };
  cache.set(file, output);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("require", "module", "exports", code)(
    (name) => load(path.resolve(path.dirname(file), name + ".ts")),
    output,
    output.exports,
  );
  return output.exports;
}
let state = load("src/lib/data.ts").initialState();
const { execute } = load("src/lib/operations.ts");
const act = (a) => {
  state = execute(state, a).state;
};
act({ type: "openRegister", amount: 100000 });
act({ type: "cart", id: 1, quantity: 3 });
act({ type: "basket", customer: "Mary Wambui", discount: 5 });
act({ type: "checkout", payments: [{ method: "Cash", amount: 51300 }] });
act({
  type: "return",
  id: 1049,
  productId: 1,
  quantity: 1,
  restock: true,
  reason: "Unopened item",
});
act({ type: "cart", id: 2, quantity: 2 });
act({ type: "hold", name: "Mary · afternoon collection" });
act({ type: "cart", id: 1, quantity: 2 });
act({ type: "document", kind: "Quotation", due: "2099-12-31" });
act({ type: "convertDocument", id: 1 });
act({ type: "clearCart" });
act({ type: "startCount", name: "Monday shelf check" });
act({ type: "count", id: 1, productId: 1, quantity: 39 });
act({ type: "transfer", productId: 1, quantity: 2, to: "westlands" });
act({ type: "dispatchTransfer", id: 1 });
act({
  type: "placeOrder",
  customer: "Mary Wambui",
  address: "Pickup · main shop",
  cart: { 1: 2 },
});
act({ type: "orderStatus", id: 1, status: "Confirmed" });
act({ type: "orderStatus", id: 1, status: "Packing" });
act({ type: "pack", id: 1, productId: 1 });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
for (const width of [1440, 390]) {
  const context = await browser.newContext({
    viewport: { width, height: 1000 },
  });
  await context.addInitScript(
    (value) =>
      localStorage.setItem("biasharaos.demo.v2", JSON.stringify(value)),
    state,
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  for (const slug of [
    "baskets",
    "returns",
    "documents",
    "register",
    "stocktakes",
    "movements",
    "transfers",
    "deliveries",
    "loyalty",
  ]) {
    await page.goto("http://127.0.0.1:3000/dashboard/" + slug);
    await page.evaluate(() => document.fonts.ready);
    if (slug === "deliveries")
      await page.locator(".delivery-board button").first().click();
    if (slug === "documents")
      await page.locator(".document-list button").first().click();
    await page.screenshot({
      path: `../design/web/populated-${slug}-${width}.png`,
      fullPage: true,
    });
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify({ screenshots: 18, errors }, null, 2));
if (errors.length) process.exitCode = 1;
