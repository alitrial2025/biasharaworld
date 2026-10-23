"use client";
import { T, LocalButton } from "@/components/locale";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  Check,
  CreditCard,
  Minus,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  ProductArt,
  SearchField,
  SelectField,
  StatCard,
  Tabs,
  useToast,
} from "@/components/ui";
import { money, salesTotal, type Product, type Sale } from "@/lib/data";
import { useDemo } from "@/lib/store";
import { downloadCSV } from "@/lib/csv";

export function SalesPage() {
  const { state } = useDemo();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All payments");
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const rows = state.sales
    .filter((s) => (s.branch ?? "main") === state.operations.activeBranch)
    .filter(
      (s) =>
        (s.customer + " " + s.id).toLowerCase().includes(query.toLowerCase()) &&
        (filter === "All payments" || s.method === filter),
    );
  return (
    <>
      <PageHeading
        eyebrow="EVERY SALE IS A STEP FORWARD"
        title="Your sales"
        description="From the first customer to the last receipt. All in one place."
      >
        <Button
          variant="secondary"
          icon={ArrowDownToLine}
          onClick={() =>
            downloadCSV(
              "sales.csv",
              ["Receipt", "Customer", "Items", "KES", "Payment", "Time"],
              rows.map((s) => [
                s.id,
                s.customer,
                s.items,
                s.amount,
                s.method,
                s.time,
              ]),
            )
          }
        >
          <T>Export</T>
        </Button>
        <Button href="/dashboard/sales/new" icon={Plus}>
          <T>New sale</T>
        </Button>
      </PageHeading>
      <div className="stats-grid three-stats">
        <StatCard
          label="Today’s sales"
          value={`KES ${money(salesTotal(state))}`}
          change="12%"
          icon={ShoppingBag}
        />
        <StatCard
          label="Receipts in this preview"
          value={String(state.sales.length)}
          tone="blue"
          icon={Receipt}
          note="Includes five sample receipts"
        />
        <StatCard
          label="Average listed sale"
          value={`KES ${money(state.sales.reduce((s, r) => s + r.amount, 0) / state.sales.length)}`}
          tone="amber"
          icon={Wallet}
        />
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search customer or receipt…"
          />
          <Tabs
            items={["All payments", "M-Pesa", "Cash", "Card"]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <T>Receipt</T>
                </th>
                <th>
                  <T>Customer</T>
                </th>
                <th>
                  <T>Time</T>
                </th>
                <th>
                  <T>Items</T>
                </th>
                <th>
                  <T>Payment</T>
                </th>
                <th>
                  <T>Status</T>
                </th>
                <th className="align-right">
                  <T>Amount</T>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <T>
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>
                        <T>#</T> <T>{s.id}</T>
                      </strong>
                    </td>
                    <td>
                      <span className="table-person">
                        <Avatar name={s.customer} small />
                        <T>{s.customer}</T>
                      </span>
                    </td>
                    <td>
                      <T>{s.time}</T>
                    </td>
                    <td>
                      <T>{s.items}</T>
                    </td>
                    <td>
                      <T>{s.method}</T>
                    </td>
                    <td>
                      <Badge>
                        <T>Recorded</T>
                      </Badge>
                    </td>
                    <td className="align-right strong">
                      <T>KES</T> <T>{money(s.amount)}</T>
                    </td>
                    <td>
                      <LocalButton
                        className="text-button"
                        onClick={() => setReceipt(s)}
                      >
                        <T>View receipt</T>
                      </LocalButton>
                    </td>
                  </tr>
                ))}
              </T>
            </tbody>
          </table>
        </div>

        <T>
          {!rows.length && (
            <EmptyState
              title="No receipts found"
              description="Try a different customer name or payment filter."
            />
          )}
        </T>

        <div className="table-foot">
          <T>{rows.length}</T>{" "}
          <T>receipts shown · Sample records for this preview</T>
        </div>
      </section>
      <ReceiptModal sale={receipt} close={() => setReceipt(null)} />
    </>
  );
}

function ReceiptModal({
  sale,
  close,
}: {
  sale: Sale | null;
  close: () => void;
}) {
  const { state } = useDemo();
  return (
    <Modal
      open={!!sale}
      onClose={close}
      title="A sale worth keeping."
      description="Recorded receipt · no payment request was sent."
    >
      <T>
        {sale && (
          <div className="receipt">
            <span className="receipt-mark">
              <Check size={26} />
            </span>
            <h3>
              <T>{state.profile.business}</T>
            </h3>
            <p>
              <T>{state.profile.location}</T>
            </p>
            <div className="receipt-amount">
              <T>KES</T> <T>{money(sale.amount)}</T>
            </div>
            <dl>
              <div>
                <dt>
                  <T>Receipt</T>
                </dt>
                <dd>
                  <T>#</T> <T>{sale.id}</T>
                </dd>
              </div>
              <div>
                <dt>
                  <T>Customer</T>
                </dt>
                <dd>
                  <T>{sale.customer}</T>
                </dd>
              </div>
              <div>
                <dt>
                  <T>Items</T>
                </dt>
                <dd>
                  <T>{sale.items}</T>
                </dd>
              </div>
              <div>
                <dt>
                  <T>Payment method</T>
                </dt>
                <dd>
                  <T>{sale.method}</T> <T>(demo)</T>
                </dd>
              </div>
              <div>
                <dt>
                  <T>Time</T>
                </dt>
                <dd>
                  <T>{sale.time}</T>
                </dd>
              </div>
            </dl>
            <p>
              <T>Thank you for being part of our day.</T>
            </p>
            <Button
              variant="secondary"
              icon={ArrowDownToLine}
              onClick={() =>
                downloadCSV(
                  `receipt-${sale.id}.csv`,
                  ["Receipt", "Shop", "Customer", "Items", "KES", "Method"],
                  [
                    [
                      sale.id,
                      state.profile.business,
                      sale.customer,
                      sale.items,
                      sale.amount,
                      sale.method,
                    ],
                  ],
                )
              }
            >
              <T>Download receipt</T>
            </Button>
          </div>
        )}
      </T>
    </Modal>
  );
}

export function NewSalePage() {
  const { state, store } = useDemo();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [method, setMethod] = useState("M-Pesa");
  const [customer, setCustomer] = useState("Walk-in customer");
  const [sale, setSale] = useState<Sale | null>(null);
  const toast = useToast();
  const products = state.products.filter(
    (p) =>
      (p.name + " " + p.sku).toLowerCase().includes(query.toLowerCase()) &&
      (category === "All" || p.category === category),
  );
  const lines = state.products.filter((p) => cart[p.id] > 0);
  const amount = lines.reduce((s, p) => s + p.price * cart[p.id], 0);
  const count = Object.values(cart).reduce((s, n) => s + n, 0);
  function quantity(p: Product, change: number) {
    setCart((c) => ({
      ...c,
      [p.id]: Math.max(0, Math.min(p.stock, (c[p.id] ?? 0) + change)),
    }));
  }
  async function checkout() {
 try {

    const result = await store.checkout(cart, method, customer);
    if (!result) {
      toast("Check your stock and add at least one product.", "info");
      return;
    }
    setSale(result);
    setCart({});
    toast("Sale recorded. Shared stock updated.");
  
 } catch { /* The shared connection banner retains the server error and retry action. */ }
}
  return (
    <>
      <Link href="/dashboard/sales" className="back-link">
        <ArrowLeft size={15} />
        <T>Back to sales</T>
      </Link>
      <PageHeading
        title="A good day starts with a sale."
        description="Quick checkout. Clear records. One less thing to juggle."
      >
        <Badge>
          <T>Record a sale</T>
        </Badge>
      </PageHeading>
      <div className="pos-layout">
        <section className="panel pos-catalog">
          <div className="pos-search">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Find a product or SKU…"
            />
            <Tabs
              items={["All", "Food", "Drinks", "Household"]}
              value={category}
              onChange={setCategory}
            />
          </div>
          <div className="product-grid">
            <T>
              {products.map((p) => (
                <LocalButton
                  key={p.id}
                  className={`product-card ${!p.stock ? "unavailable" : ""}`}
                  disabled={!p.stock}
                  onClick={() => quantity(p, 1)}
                  aria-label={`Add ${p.name} to sale`}
                >
                  <div className="product-image">
                    <ProductArt art={p.art} name={p.name} />

                    <T>
                      {cart[p.id] > 0 && (
                        <span className="product-cart-count">
                          <T>{cart[p.id]}</T>
                        </span>
                      )}
                    </T>
                  </div>
                  <h3>
                    <T>{p.name}</T>
                  </h3>
                  <span>
                    <T>{p.size}</T>
                  </span>
                  <div>
                    <strong>
                      <T>KES</T> <T>{money(p.price)}</T>
                    </strong>
                    <span className="product-add">
                      <Plus size={16} />
                    </span>
                  </div>
                  <small
                    className={
                      !p.stock
                        ? "text-red"
                        : p.stock <= p.reorder
                          ? "text-amber"
                          : "text-green"
                    }
                  >
                    <T>{p.stock ? `${p.stock} in stock` : "Out of stock"}</T>
                  </small>
                </LocalButton>
              ))}
            </T>
          </div>

          <T>
            {!products.length && (
              <EmptyState
                icon={Package}
                title="No products found"
                description="Try another name or category."
              />
            )}
          </T>
        </section>
        <aside className="panel cart-panel">
          <div className="panel-heading">
            <h2>
              <T>Your sale</T>
              <Badge tone="gray">
                <T>{count}</T> <T>items</T>
              </Badge>
            </h2>

            <T>
              {count > 0 && (
                <LocalButton
                  className="text-button text-red"
                  onClick={() => setCart({})}
                >
                  <T>Clear</T>
                </LocalButton>
              )}
            </T>
          </div>
          <SelectField label="Customer" value={customer} onChange={setCustomer}>
            <option>
              <T>Walk-in customer</T>
            </option>

            <T>
              {state.customers.map((c) => (
                <option key={c.id}>
                  <T>{c.name}</T>
                </option>
              ))}
            </T>
          </SelectField>
          <div className="cart-lines">
            <T>
              {!lines.length ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="A little room for good things."
                  description="Choose products on the left to start your sale."
                />
              ) : (
                lines.map((p) => (
                  <div key={p.id} className="cart-line">
                    <ProductArt art={p.art} name={p.name} small />
                    <div>
                      <strong>
                        <T>{p.name}</T>
                      </strong>
                      <small>
                        <T>KES</T> <T>{money(p.price)}</T> <T>each</T>
                      </small>
                      <div className="quantity-control">
                        <LocalButton
                          aria-label={`Remove one ${p.name}`}
                          onClick={() => quantity(p, -1)}
                        >
                          <Minus size={13} />
                        </LocalButton>
                        <span aria-label={`${p.name} quantity`}>
                          <T>{cart[p.id]}</T>
                        </span>
                        <LocalButton
                          aria-label={`Add one ${p.name}`}
                          disabled={cart[p.id] >= p.stock}
                          onClick={() => quantity(p, 1)}
                        >
                          <Plus size={13} />
                        </LocalButton>
                      </div>
                    </div>
                    <strong>
                      <T>KES</T> <T>{money(p.price * cart[p.id])}</T>
                    </strong>
                  </div>
                ))
              )}
            </T>
          </div>
          <div className="cart-summary">
            <div>
              <span>
                <T>Subtotal</T>
              </span>
              <strong>
                <T>KES</T> <T>{money(amount)}</T>
              </strong>
            </div>
            <div>
              <span>
                <T>Discount</T>
              </span>
              <span>
                <T>KES 0</T>
              </span>
            </div>
            <div className="cart-total">
              <span>
                <T>Total</T>
              </span>
              <strong>
                <T>KES</T> <T>{money(amount)}</T>
              </strong>
            </div>
          </div>
          <div className="payment-methods" aria-label="Payment method">
            <T>
              {["M-Pesa", "Cash", "Card"].map((m) => (
                <LocalButton
                  aria-pressed={method === m}
                  className={method === m ? "active" : ""}
                  key={m}
                  onClick={() => setMethod(m)}
                >
                  <T>
                    {m === "M-Pesa" ? (
                      <span className="mpesa-icon">
                        <T>M</T>
                      </span>
                    ) : m === "Cash" ? (
                      <Wallet size={16} />
                    ) : (
                      <CreditCard size={16} />
                    )}
                  </T>

                  <span>
                    <T>{m}</T>
                  </span>
                </LocalButton>
              ))}
            </T>
          </div>
          <Button disabled={!count} onClick={checkout} arrow>
            <T>Record received payment</T>
          </Button>
          <p className="quiet-note centered">
            <T>No payment request is sent. Sample stock will update.</T>
          </p>
        </aside>
      </div>
      <ReceiptModal sale={sale} close={() => setSale(null)} />
    </>
  );
}

export function InventoryPage({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const { state, store } = useDemo();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState("All stock");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const rows = state.products.filter(
    (p) =>
      (p.name + " " + p.sku).toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All stock" ||
        (filter === "Low stock"
          ? p.stock > 0 && p.stock <= p.reorder
          : p.stock === 0)),
  );
  const value = state.products.reduce((sum, p) => sum + p.cost * p.stock, 0);
  async function submit(e: FormEvent<HTMLFormElement>) {
 try {

    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const product = {
      name: String(f.get("name")).trim(),
      size: String(f.get("size")).trim(),
      sku: String(f.get("sku")).trim(),
      category: String(f.get("category")),
      price: Number(f.get("price")),
      cost: Number(f.get("cost")),
      stock: Number(f.get("stock")),
      reorder: Number(f.get("reorder")),
      art: editing?.art ?? 0,
    };
    if (
      state.products.some(
        (p) =>
          p.id !== editing?.id &&
          p.sku.toLowerCase() === product.sku.toLowerCase(),
      )
    ) {
      toast("That SKU already belongs to another product.", "info");
      return;
    }
    if (editing) await store.updateProduct(editing.id, product);
    else await store.addProduct(product);
    setOpen(false);
    toast(
      editing
        ? "Product and stock updated."
        : "A new product, ready for your shelves.",
    );
  
 } catch { /* The shared connection banner retains the server error and retry action. */ }
}
  return (
    <>
      <PageHeading
        eyebrow="A PLACE FOR EVERYTHING"
        title="Know your shelves."
        description="The right products. The right quantities. A little more peace of mind."
      >
        <Button
          variant="secondary"
          icon={ArrowDownToLine}
          onClick={() =>
            downloadCSV(
              "inventory.csv",
              [
                "SKU",
                "Product",
                "Size",
                "Category",
                "Price KES",
                "Cost KES",
                "Stock",
                "Reorder point",
              ],
              rows.map((p) => [
                p.sku,
                p.name,
                p.size,
                p.category,
                p.price,
                p.cost,
                p.stock,
                p.reorder,
              ]),
            )
          }
        >
          <T>Export stock</T>
        </Button>
        <Button
          icon={Plus}
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <T>Add product</T>
        </Button>
      </PageHeading>
      <div className="stats-grid three-stats">
        <StatCard
          label="Products on your shelves"
          value={String(state.products.length)}
          icon={Package}
        />
        <StatCard
          label="Stock value · at cost"
          value={`KES ${money(value)}`}
          tone="blue"
          icon={Wallet}
        />
        <StatCard
          label="Need a little attention"
          value={String(
            state.products.filter((p) => p.stock <= p.reorder).length,
          )}
          tone="amber"
          icon={ShoppingBag}
          note="At or below reorder point"
        />
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search products or SKU…"
          />
          <Tabs
            items={["All stock", "Low stock", "Out of stock"]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <T>Product</T>
                </th>
                <th>
                  <T>SKU</T>
                </th>
                <th>
                  <T>Category</T>
                </th>
                <th>
                  <T>Selling price</T>
                </th>
                <th>
                  <T>In stock</T>
                </th>
                <th>
                  <T>Status</T>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <T>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="table-product">
                        <ProductArt art={p.art} name={p.name} />
                        <span>
                          <strong>
                            <T>{p.name}</T>
                          </strong>
                          <small>
                            <T>{p.size}</T>
                          </small>
                        </span>
                      </span>
                    </td>
                    <td className="muted">
                      <T>{p.sku}</T>
                    </td>
                    <td>
                      <T>{p.category}</T>
                    </td>
                    <td className="strong">
                      <T>KES</T> <T>{money(p.price)}</T>
                    </td>
                    <td>
                      <T>{p.stock}</T> <T> </T>
                      <small className="muted">
                        <T>units</T>
                      </small>
                    </td>
                    <td>
                      <Badge
                        tone={
                          p.stock === 0
                            ? "red"
                            : p.stock <= p.reorder
                              ? "amber"
                              : "green"
                        }
                      >
                        <T>
                          {p.stock === 0
                            ? "Out of stock"
                            : p.stock <= p.reorder
                              ? "Low stock"
                              : "In stock"}
                        </T>
                      </Badge>
                    </td>
                    <td>
                      <LocalButton
                        className="text-button"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <T>Edit / restock</T>
                      </LocalButton>
                    </td>
                  </tr>
                ))}
              </T>
            </tbody>
          </table>
        </div>

        <T>
          {!rows.length && (
            <EmptyState
              icon={Package}
              title="A clear shelf, for now."
              description="Try another search or add your next product."
            />
          )}
        </T>

        <div className="table-foot">
          <T>{rows.length}</T> <T>of</T> <T>{state.products.length}</T>{" "}
          <T>products</T>
        </div>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          editing
            ? "Keep your shelves in good shape."
            : "Make room for something new."
        }
        description={
          editing
            ? "Update product details or set the new stock quantity."
            : "Add a product to your demo shop."
        }
        wide
      >
        <form onSubmit={submit}>
          <div className="form-grid">
            <Field
              label="Product name"
              name="name"
              required
              maxLength={80}
              defaultValue={editing?.name}
            />
            <Field
              label="Pack size"
              name="size"
              placeholder="e.g. 500 g"
              required
              defaultValue={editing?.size}
            />
            <Field
              label="SKU"
              name="sku"
              required
              defaultValue={
                editing?.sku ??
                `BW-${String(state.products.length + 1).padStart(3, "0")}`
              }
            />
            <SelectField
              label="Category"
              name="category"
              defaultValue={editing?.category ?? "Food"}
            >
              <T>
                {["Food", "Drinks", "Household", "Services", "Other"].map(
                  (c) => (
                    <option key={c}>
                      <T>{c}</T>
                    </option>
                  ),
                )}
              </T>
            </SelectField>
            <Field
              label="Selling price (KES)"
              name="price"
              type="number"
              min={1}
              max={10000000}
              required
              defaultValue={editing?.price}
            />
            <Field
              label="Cost price (KES)"
              name="cost"
              type="number"
              min={0}
              max={10000000}
              required
              defaultValue={editing?.cost}
            />
            <Field
              label="Stock quantity"
              name="stock"
              type="number"
              min={0}
              max={1000000}
              required
              defaultValue={editing?.stock ?? 0}
            />
            <Field
              label="Reorder point"
              name="reorder"
              type="number"
              min={0}
              max={1000000}
              required
              defaultValue={editing?.reorder ?? 10}
            />
          </div>
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              <T>Cancel</T>
            </Button>
            <Button type="submit">
              <T>{editing ? "Save product" : "Add product"}</T>
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
