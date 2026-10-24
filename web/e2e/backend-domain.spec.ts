import { test, expect } from "@playwright/test";
import {
  emptyBusiness,
  mergeState,
  splitState,
} from "../src/lib/backend/empty";
import { applyCommand, parseCommand } from "../src/lib/backend/commands";
import { businessReport } from "../src/lib/backend/reports";
import { accountReturn } from "../src/lib/account-return";
import { barcode } from "../src/lib/operations";
const product = {
  name: "Coffee",
  size: "250 g",
  sku: "COFFEE",
  category: "Food",
  price: 10.25,
  cost: 6.75,
  stock: 5,
  reorder: 1,
  art: 0,
};
function business() {
  let state = emptyBusiness();
  return {
    get state() {
      return state;
    },
    save(command: unknown, role = "Owner") {
      const result = applyCommand(state, command, role);
      state = result.state;
      return result;
    },
  };
}
test("new accounts have no sample financial baseline or public shop", () => {
  const s = emptyBusiness();
  expect(businessReport(s).sales).toBe(0);
  expect(businessReport(s).profit).toBe(0);
  expect(s.operations.shop.published).toBe(false);
  expect(s.operations.loyalty).toEqual({});
  expect(s.suppliers).toEqual([]);
});
test("authoritative money validation preserves cents and rejects fractional minor units", () => {
  expect(() => parseCommand({ type: "addProduct", product })).not.toThrow();
  expect(() =>
    parseCommand({ type: "addProduct", product: { ...product, price: 1.001 } }),
  ).toThrow();
  expect(() =>
    parseCommand({ type: "payBalance", id: 1, amount: -1 }),
  ).toThrow();
  expect(() =>
    parseCommand({ type: "updateProfile", profile: { plan: "Business" } }),
  ).toThrow();
});
test("every accepted manual payment method settles the same exact minor-unit total", () => {
  for (const method of ["Cash", "M-Pesa", "Card", "Bank transfer", "Bank"]) {
    const d = business();
    const created = d.save({ type: "addProduct", product });
    d.save({ type: "cart", id: created.id, quantity: 1 });
    d.save({ type: "checkout", payments: [{ method, amount: 1025 }] });
    expect(d.state.operations.receipts[0].payments).toEqual([
      { method, amount: 1025 },
    ]);
    expect(d.state.operations.receipts[0].total).toBe(1025);
    expect(d.state.products[0].stock).toBe(4);
  }
});
test("product SKUs remain unique across case-insensitive client searches", () => {
  const d = business();
  d.save({ type: "addProduct", product });
  expect(() =>
    d.save({ type: "addProduct", product: { ...product, sku: "coffee" } }),
  ).toThrow(/SKU/);
  const second = d.save({
    type: "addProduct",
    product: { ...product, sku: "TEA" },
  });
  expect(() =>
    d.save({
      type: "updateProduct",
      id: second.id,
      changes: { sku: "Coffee" },
    }),
  ).toThrow(/SKU/);
  expect(d.state.products).toHaveLength(2);
});
test("product forms cannot bypass barcode uniqueness or check digits", () => {
  const d = business();
  const first = d.save({ type: "addProduct", product });
  const code = barcode(first.id!);
  expect(() =>
    d.save({
      type: "addProduct",
      product: { ...product, sku: "TEA", barcode: code },
    }),
  ).toThrow(/Barcode/);
  expect(() =>
    d.save({
      type: "addProduct",
      product: { ...product, sku: "TEA", barcode: "6160000000010" },
    }),
  ).toThrow();
  const second = d.save({
    type: "addProduct",
    product: { ...product, sku: "TEA" },
  });
  expect(() =>
    d.save({
      type: "updateProduct",
      id: second.id,
      changes: { barcode: code },
    }),
  ).toThrow(/Barcode/);
  expect(() =>
    d.save({
      type: "updateProduct",
      id: second.id,
      changes: { barcode: "6160000000010" },
    }),
  ).toThrow();
  expect(d.state.products).toHaveLength(2);
});
test("a bundle cannot become a purchase order that can never be received", () => {
  const d = business();
  const first = d.save({ type: "addProduct", product });
  const second = d.save({
    type: "addProduct",
    product: { ...product, sku: "TEA" },
  });
  const bundle = d.save({
    type: "bundle",
    name: "Breakfast",
    price: 1500,
    components: [
      { productId: first.id, quantity: 1 },
      { productId: second.id, quantity: 1 },
    ],
  });
  expect(() =>
    d.save({
      type: "createOrder",
      supplier: "Supplier",
      items: [{ productId: bundle.id, quantity: 1, cost: 10 }],
      deliveryFee: 0,
    }),
  ).toThrow(/individual/);
  expect(d.state.orders).toEqual([]);
});
test("roles enforce financial and staff boundaries before mutation", () => {
  const d = business();
  expect(() => d.save({ type: "addProduct", product }, "Cashier")).toThrow(
    /role/,
  );
  expect(d.state.products).toEqual([]);
  expect(() =>
    d.save(
      { type: "checkout", payments: [{ method: "Cash", amount: 0 }] },
      "Viewer",
    ),
  ).toThrow(/role/);
  expect(() =>
    d.save(
      {
        type: "inviteMember",
        member: { name: "Staff", email: "staff@example.com", role: "Cashier" },
      },
      "Manager",
    ),
  ).toThrow(/owner/i);
});
test("transfer creation returns an actionable identifier and branch projection preserves bundle availability", () => {
  const d = business();
  d.save({ type: "addProduct", product });
  d.save({
    type: "addProduct",
    product: { ...product, name: "Tea", sku: "TEA", stock: 3 },
  });
  d.save({
    type: "bundle",
    name: "Coffee and tea",
    price: 1900,
    components: [
      { productId: 1, quantity: 1 },
      { productId: 2, quantity: 1 },
    ],
  });
  d.save({ type: "addBranch", name: "Second shop", location: "Nairobi" });
  const to = d.state.operations.branches.at(-1)!.id;
  const transfer = d.save({ type: "transfer", productId: 1, quantity: 1, to });
  expect(transfer.id).toBeGreaterThan(0);
  d.save({ type: "dispatchTransfer", id: transfer.id });
  d.save({ type: "receiveTransfer", id: transfer.id });
  const { business: canonical, workspace } = splitState(d.state);
  const main = mergeState(canonical, workspace);
  expect(main.products.find((p) => p.components)?.stock).toBe(3);
  const second = mergeState(canonical, { activeBranch: to });
  expect(second.products[0].stock).toBe(1);
  expect(second.products.find((p) => p.components)?.stock).toBe(0);
});
test("invoice conversion accepts its signed ID and cannot record payment twice", () => {
  const d = business();
  d.save({ type: "addProduct", product });
  d.save({ type: "cart", id: 1, quantity: 1 });
  d.save({ type: "basket", customer: "Amina" });
  const quote = d.save({
    type: "document",
    kind: "Quotation",
    due: "2027-12-31",
  });
  d.save({ type: "convertDocument", id: quote.id });
  const invoice = d.state.operations.documents.find(
    (x) => x.kind === "Invoice",
  )!;
  expect(invoice.id).toBeLessThan(0);
  d.save({ type: "payDocument", id: invoice.id });
  expect(d.state.operations.receipts[0].lines[0].cost).toBe(675);
  expect(d.state.operations.receipts[0].createdAt).toBeTruthy();
  expect(() => d.save({ type: "payDocument", id: invoice.id })).toThrow();
  expect(d.state.products[0].stock).toBe(4);
});
test("cost history and non-restocked refunds retain incurred cost", () => {
  const d = business();
  d.save({ type: "addProduct", product });
  d.save({ type: "cart", id: 1, quantity: 2 });
  const receipt = d.save({
    type: "checkout",
    payments: [{ method: "Cash", amount: 2050 }],
  });
  d.save({ type: "updateProduct", id: 1, changes: { cost: 99 } });
  expect(businessReport(d.state).profit).toBe(7);
  d.save({
    type: "return",
    id: receipt.id,
    productId: 1,
    quantity: 1,
    restock: false,
    reason: "Damaged",
  });
  expect(businessReport(d.state).sales).toBe(10.25);
  expect(businessReport(d.state).profit).toBe(-3.25);
  expect(businessReport(d.state).series.reduce((s, n) => s + n, 0)).toBe(10.25);
  expect(
    businessReport(d.state, "Month").profitSeries!.reduce((s, n) => s + n, 0),
  ).toBe(-3.25);
});
test("account return paths keep customers on local shop/portal pages", () => {
  expect(accountReturn("/shop/abc")).toBe("/shop/abc");
  expect(accountReturn("/portal/customer-shop")).toBe("/portal/customer-shop");
  for (const invalid of [
    "https://attacker.example",
    "//attacker.example",
    "/shop/a/../../admin",
    "/dashboard",
    "javascript:alert(1)",
  ])
    expect(accountReturn(invalid)).toBeNull();
});
