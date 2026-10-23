import { test, expect } from "@playwright/test";
import { initialState, salesTotal } from "../src/lib/data";
import {
  execute,
  available,
  pricedLines,
  barcode,
  validBarcode,
  eanBars,
  minor,
  type Action,
} from "../src/lib/operations";
import fixture from "../../shared/operation-contracts.json";
function demo() {
  let state = initialState();
  return {
    get state() {
      return state;
    },
    act(a: Action) {
      const r = execute(state, a);
      state = r.state;
      return r;
    },
  };
}
function fail(d: ReturnType<typeof demo>, a: Action, p: RegExp) {
  const before = JSON.stringify(d.state);
  expect(() => d.act(a)).toThrow(p);
  expect(JSON.stringify(d.state)).toBe(before);
}
test("currency and EAN-13 preserve units and check digits", () => {
  expect(minor("0.29")).toBe(29);
  expect(minor("120.01")).toBe(12001);
  for (const v of ["-1", "1.001", "NaN", "1e3", ""])
    expect(() => minor(v)).toThrow();
  for (const id of [1, 2, 12, 999]) {
    expect(validBarcode(barcode(id))).toBe(true);
    expect(eanBars(barcode(id))).toHaveLength(95);
  }
  expect(validBarcode("6160000000010")).toBe(false);
});
test("discounts, split checkout and partial refunds conserve money and rewards", () => {
  const d = demo(),
    f = fixture.checkout;
  d.act({ type: "cart", id: 1, quantity: 3 });
  d.act({ type: "cart", id: 2, quantity: 1 });
  d.act({ type: "basket", customer: "Mary Wambui", discount: 7, redeem: 2 });
  const p = pricedLines(d.state, d.state.operations.cart, 7, "percent", 2);
  expect(p.total).toBe(f.totalMinor);
  expect(p.lines.map((l) => l.net)).toEqual([
    f.flourNetMinor,
    f.butterNetMinor,
  ]);
  fail(
    d,
    { type: "checkout", payments: [{ method: "Cash", amount: 1 }] },
    /exact amount/,
  );
  const id = d.act({
    type: "checkout",
    payments: [
      { method: "Cash", amount: f.cashMinor },
      { method: "M-Pesa", amount: f.mpesaMinor },
    ],
  }).id!;
  expect(d.state.operations.receipts[0].earned).toBe(f.earnedPoints);
  d.state.products[0].price = 999;
  d.act({
    type: "return",
    id,
    productId: 1,
    quantity: 1,
    restock: true,
    reason: "Unopened",
  });
  expect(d.state.operations.returns[0].amount).toBe(f.firstRefundMinor);
  d.act({
    type: "return",
    id,
    productId: 1,
    quantity: 2,
    restock: true,
    reason: "Unopened",
  });
  d.act({
    type: "return",
    id,
    productId: 2,
    quantity: 1,
    restock: true,
    reason: "Unopened",
  });
  expect(d.state.operations.returns.reduce((s, r) => s + r.amount, 0)).toBe(
    f.totalMinor,
  );
  for (const method of ["Cash", "M-Pesa"]) {
    expect(
      d.state.operations.returns
        .flatMap((r) => r.payments)
        .filter((p) => p.method === method)
        .reduce((s, p) => s + p.amount, 0),
    ).toBe(method === "Cash" ? f.cashMinor : f.mpesaMinor);
  }
  expect(d.state.operations.loyalty["Mary Wambui"]).toBe(f.finalPoints);
  fail(
    d,
    {
      type: "return",
      id,
      productId: 1,
      quantity: 1,
      restock: true,
      reason: "Again",
    },
    /remaining|quantity/,
  );
  expect(d.state.products[0].stock).toBe(42);
  expect(salesTotal(d.state)).toBe(360); // Only the seeded receipt remains; no synthetic daily baseline.
});
test("product promotions and held baskets respect eligibility and branch", () => {
  const d = demo();
  d.act({
    type: "promotion",
    name: "Flour",
    percent: 10,
    ends: "2099-12-31",
    productId: 1,
  });
  expect(
    pricedLines(
      d.state,
      { 1: 1, 2: 1 },
      0,
      "percent",
      0,
      String(d.state.operations.promotions[0].id),
    ).total,
  ).toBe(51200);
  d.act({ type: "cart", id: 1, quantity: 2 });
  d.act({ type: "hold", name: "Mary" });
  expect(available(d.state, 1)).toBe(42);
  d.act({ type: "branch", id: "westlands" });
  fail(d, { type: "resume", id: 1 }, /branch/);
  d.act({ type: "branch", id: "main" });
  d.act({ type: "resume", id: 1 });
  expect(d.state.operations.cart[1]).toBe(2);
  d.act({ type: "branch", id: "westlands" });
  expect(d.state.operations.held[0].branch).toBe("main");
  expect(d.state.products[0].stock).toBe(21);
});
test("quotes snapshot prices and invoices pay once", () => {
  const d = demo();
  d.act({ type: "cart", id: 1, quantity: 2 });
  d.act({ type: "basket", customer: "Mary Wambui" });
  const id = d.act({
    type: "document",
    kind: "Quotation",
    due: "2099-12-31",
  }).id!;
  expect(available(d.state, 1)).toBe(42);
  d.act({ type: "convertDocument", id });
  fail(d, { type: "convertDocument", id }, /already/);
  d.act({ type: "issueDocument", id: -id });
  d.state.products[0].price = 999;
  d.act({ type: "payDocument", id: -id });
  expect(d.state.sales[0].amount).toBe(360);
  expect(d.state.products[0].stock).toBe(40);
  fail(d, { type: "payDocument", id: -id }, /already paid/);
});
test("register expected cash and variance exclude pre-session sales", () => {
  const d = demo(),
    f = fixture.register;
  d.act({ type: "openRegister", amount: f.openingMinor });
  fail(d, { type: "openRegister", amount: 0 }, /already/);
  d.act({ type: "cart", id: 1, quantity: 1 });
  d.act({
    type: "checkout",
    payments: [{ method: "Cash", amount: f.saleMinor }],
  });
  d.act({ type: "cashEntry", amount: -f.cashOutMinor, label: "Delivery" });
  d.act({ type: "closeRegister", amount: f.countedMinor });
  const r = d.state.operations.registers[0];
  expect(r.expected).toBe(f.expectedMinor);
  expect(r.counted! - r.expected!).toBe(f.varianceMinor);
  fail(d, { type: "closeRegister", amount: 0 }, /Open a register/);
});
test("stale stocktakes reject and expiry excludes unsellable stock", () => {
  const d = demo();
  d.act({ type: "startCount", name: "Shelf" });
  d.act({ type: "count", id: 1, productId: 1, quantity: 40 });
  d.act({
    type: "batch",
    productId: 1,
    quantity: 2,
    expires: "2000-01-01",
    code: "EXPIRED",
  });
  expect(available(d.state, 1)).toBe(42);
  fail(d, { type: "finaliseCount", id: 1, reason: "Counted" }, /Stock changed/);
  const b = d.state.operations.batches.find((b) => b.code === "EXPIRED")!;
  d.act({ type: "writeOff", id: b.id, reason: "Expired" });
  fail(d, { type: "writeOff", id: b.id, reason: "Again" }, /batch/);
  d.act({ type: "refreshCount", id: 1 });
  d.act({ type: "finaliseCount", id: 1, reason: "Counted" });
  expect(d.state.products[0].stock).toBe(40);
  fail(d, { type: "finaliseCount", id: 1, reason: "Again" }, /draft/);
});
test("variants validate SKUs and bundles consume and return components", () => {
  const d = demo(),
    f = fixture.bundle;
  d.act({
    type: "variant",
    parentId: 1,
    name: "Soko small",
    size: "1 kg",
    sku: "SOKO-1KG",
    price: 10000,
    stock: 5,
  });
  fail(
    d,
    {
      type: "variant",
      parentId: 1,
      name: "Duplicate",
      size: "1kg",
      sku: "soko-1kg",
      price: 10000,
      stock: 0,
    },
    /SKU/,
  );
  d.act({
    type: "bundle",
    name: "Breakfast",
    price: f.priceMinor,
    components: [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 },
    ],
  });
  const id = d.state.products.at(-1)!.id;
  expect(available(d.state, id)).toBe(21);
  d.act({ type: "cart", id, quantity: 2 });
  const sale = d.act({
    type: "checkout",
    payments: [{ method: "Cash", amount: 130000 }],
  }).id!;
  expect(d.state.products[0].stock).toBe(38);
  expect(d.state.products[1].stock).toBe(22);
  d.act({
    type: "return",
    id: sale,
    productId: id,
    quantity: 1,
    restock: true,
    reason: "Unopened",
  });
  expect(d.state.products[0].stock).toBe(40);
  expect(d.state.products[1].stock).toBe(23);
});
test("transfers receive once and cancellation returns dispatched stock", () => {
  const d = demo(),
    f = fixture.transfer;
  d.act({
    type: "transfer",
    productId: 1,
    quantity: f.quantity,
    to: "westlands",
  });
  d.act({ type: "dispatchTransfer", id: 1 });
  expect(available(d.state, 1)).toBe(38);
  d.act({ type: "receiveTransfer", id: 1 });
  expect(available(d.state, 1, "westlands")).toBe(25);
  fail(d, { type: "receiveTransfer", id: 1 }, /in-transit/);
  d.act({ type: "transfer", productId: 1, quantity: 2, to: "westlands" });
  d.act({ type: "dispatchTransfer", id: 2 });
  d.act({ type: "cancelTransfer", id: 2 });
  expect(available(d.state, 1)).toBe(38);
});
test("customer orders reserve, dispatch and record delivered revenue once", () => {
  const d = demo(),
    f = fixture.delivery;
  d.act({
    type: "placeOrder",
    customer: "Mary Wambui",
    address: "Pickup",
    cart: { 1: 2 },
  });
  expect(available(d.state, 1)).toBe(42);
  d.act({ type: "orderStatus", id: 1, status: "Confirmed" });
  expect(available(d.state, 1)).toBe(40);
  fail(d, { type: "orderPaid", id: 1 }, /Deliver/);
  d.act({ type: "orderStatus", id: 1, status: "Packing" });
  fail(d, { type: "orderStatus", id: 1, status: "Dispatched" }, /packing list/);
  d.act({ type: "pack", id: 1, productId: 1 });
  d.act({ type: "orderStatus", id: 1, status: "Dispatched" });
  expect(available(d.state, 1)).toBe(40);
  d.act({ type: "orderStatus", id: 1, status: "Delivered" });
  d.act({ type: "orderPaid", id: 1 });
  expect(d.state.sales[0].amount).toBe(f.totalMinor / 100);
  expect(d.state.products[0].stock).toBe(40);
  fail(d, { type: "orderPaid", id: 1 }, /once/);
  d.act({
    type: "placeOrder",
    customer: "John Mwangi",
    address: "Pickup",
    cart: { 1: 1 },
  });
  d.act({ type: "orderStatus", id: 2, status: "Confirmed" });
  d.act({ type: "orderStatus", id: 2, status: "Cancelled" });
  expect(available(d.state, 1)).toBe(40);
});
test("preferences and offline activity survive serialisation", () => {
  const d = demo();
  d.act({ type: "preferences", language: "sw", theme: "dark", textSize: 130 });
  d.act({ type: "syncMode", mode: "Offline preview" });
  d.act({ type: "cart", id: 1, quantity: 1 });
  d.act({ type: "hold", name: "Saved offline" });
  const restored = JSON.parse(JSON.stringify(d.state));
  expect(restored.operations.preferences).toEqual({
    language: "sw",
    theme: "dark",
    textSize: 130,
  });
  expect(restored.operations.held).toHaveLength(1);
  expect(restored.operations.sync.entries[0].status).toBe("Retry preview");
});
