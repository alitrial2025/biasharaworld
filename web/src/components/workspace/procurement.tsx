"use client";
import { T, LocalButton } from "@/components/locale";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Star,
  Truck,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  CheckList,
  EmptyState,
  Field,
  Modal,
  PageHeading,
  ProductArt,
  SearchField,
  StatCard,
  Tabs,
  useToast,
} from "@/components/ui";
import { money, type Order } from "@/lib/data";
import { useDemo } from "@/lib/store";
import { downloadCSV } from "@/lib/csv";

export function SuppliersPage() {
  const { state, store } = useDemo();
  const suppliers = state.suppliers ?? [];
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All suppliers");
  const rows = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "All suppliers" || s.category === filter),
  );
  return (
    <>
      <PageHeading
        eyebrow="GOOD BUSINESS STARTS WITH GOOD CONNECTIONS"
        title="Your next shelf, sorted."
        description="Keep your suppliers and recorded quotes together. Purchase orders are internal records; send them to your supplier separately."
      >
        <Button
          href="/dashboard/orders"
          variant="secondary"
          icon={ShoppingCart}
        >
          <T>Your purchase orders</T>
        </Button>
      </PageHeading>
      <Button onClick={() => setAdding(true)}>Add supplier</Button>
      {adding && (
        <section className="panel">
          <h2>Your supplier</h2>
          {error && <p role="alert">{error}</p>}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                await store.saveRecord({
                  type: "addSupplier",
                  name: String(f.get("name")),
                  category: String(f.get("category")),
                  description: String(f.get("description")),
                  delivery: String(f.get("delivery")),
                  minimum: Number(f.get("minimum")),
                  deliveryFee: Number(f.get("deliveryFee")),
                });
                setAdding(false);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Could not save supplier.",
                );
              }
            }}
          >
            <Field label="Supplier name" name="name" required />
            <Field
              label="Category"
              name="category"
              defaultValue="Groceries"
              required
            />
            <Field label="Notes" name="description" />
            <Field label="Delivery terms" name="delivery" />
            <Field
              label="Minimum order (KES)"
              name="minimum"
              type="number"
              min={0}
              step="0.01"
              defaultValue={0}
              required
            />
            <Field
              label="Delivery fee (KES)"
              name="deliveryFee"
              type="number"
              min={0}
              step="0.01"
              defaultValue={0}
              required
            />
            <Button type="submit">Save supplier</Button>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </form>
        </section>
      )}
      <div className="supplier-intro">
        <div>
          <Badge>
            <T>FIND YOUR NEXT SUPPLY PARTNER</T>
          </Badge>
          <h2>
            <T>Familiar essentials.</T>
            <br />
            <T>Fresh possibilities.</T>
          </h2>
          <p>
            <T>Discover a simpler way to keep your business stocked.</T>
          </p>
        </div>
        <Image
          src="/images/features.webp"
          alt="Everyday retail products and business tools"
          width={1024}
          height={1024}
        />
      </div>
      <div className="table-toolbar standalone-toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search suppliers…"
        />
        <Tabs
          items={["All suppliers", "Groceries", "Household", "Fresh produce"]}
          value={filter}
          onChange={setFilter}
        />
      </div>
      <div className="supplier-grid">
        <T>
          {rows.map((s) => (
            <article className="panel supplier-card" key={s.id}>
              <div className="supplier-card-top">
                <Avatar name={s.initial} color={s.color} />
                <Badge tone="gray">
                  <T>Your supplier</T>
                </Badge>
              </div>
              <h2>
                <T>{s.name}</T>
              </h2>
              <span className="supplier-location">
                <MapPin size={13} />
                <T>Nairobi ·</T> <T>{s.distance}</T>
                <Star size={13} className="star" />
                <T>{s.rating}</T>
              </span>
              <p>
                <T>{s.description}</T>
              </p>
              <div className="supplier-products">
                <T>
                  {[0, 1, 2, 4].map((art) => (
                    <ProductArt
                      key={art}
                      art={art}
                      name="Retail product illustration"
                    />
                  ))}
                </T>
              </div>
              <div className="supplier-meta">
                <span>
                  <Truck size={14} />
                  <T>{s.delivery}</T>
                </span>
                <span>
                  <T>Min. KES</T> <T>{money(s.minimum)}</T>
                </span>
              </div>
              <Button
                href={`/dashboard/suppliers/${s.id}`}
                variant="secondary"
                arrow
              >
                <T>View products</T>
              </Button>
            </article>
          ))}
        </T>
      </div>

      <T>
        {!rows.length && (
          <EmptyState
            icon={Truck}
            title="No supplier matches yet."
            description="Try another name or category."
          />
        )}
      </T>

      <p className="quiet-note">
        <T>
          Supplier details and quotes are entered by your business. Contact the
          supplier to confirm prices and place an external order.
        </T>
      </p>
    </>
  );
}

export function SupplierDetailPage({ id }: { id: string }) {
  const { state, store } = useDemo();
  const supplier = state.suppliers?.find((s) => s.id === id);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<Order | null>(null);
  const toast = useToast();
  const products = state.products.filter(
    (p) => filter === "All" || p.category === filter,
  );
  const lines = state.products.filter((p) => quantities[p.id] > 0);
  const subtotal = lines.reduce(
    (sum, p) => sum + (supplier?.quotes?.[p.id] ?? p.cost) * quantities[p.id],
    0,
  );
  function change(id: number, n: number) {
    setQuantities((q) => ({
      ...q,
      [id]: Math.max(0, Math.min(10000, (q[id] ?? 0) + n)),
    }));
  }
  async function create() {
    try {
      if (!supplier) return;
      const order = await store.createOrder(
        supplier.name,
        lines.map((p) => ({
          productId: p.id,
          quantity: quantities[p.id],
          cost: supplier.quotes?.[p.id] ?? p.cost,
        })),
        supplier.deliveryFee ?? 0,
      );
      setCreated(order);
      setQuantities({});
      toast(
        "Purchase order saved. Arrange ordering directly with the supplier.",
      );
    } catch {
      /* The shared connection banner retains the server error and retry action. */
    }
  }
  if (!supplier)
    return (
      <EmptyState
        icon={Truck}
        title="Supplier not found"
        description="Add your own suppliers to prepare purchase orders."
      />
    );
  return (
    <>
      <Link href="/dashboard/suppliers" className="back-link">
        <ArrowLeft size={15} />
        <T>Back to suppliers</T>
      </Link>
      <section className="panel">
        <h2>Record a supplier quote</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            try {
              await store.saveRecord({
                type: "supplierQuote",
                id,
                productId: Number(f.get("product")),
                cost: Number(f.get("cost")),
              });
              toast("Quote saved.");
            } catch (e) {
              toast(
                e instanceof Error ? e.message : "Quote could not be saved.",
                "info",
              );
            }
          }}
        >
          <label>
            Product
            <select name="product">
              {state.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Quoted unit cost (KES)"
            name="cost"
            type="number"
            min={0}
            step="0.01"
            required
          />
          <Button type="submit" disabled={!state.products.length}>
            Save quote
          </Button>
        </form>
        <p>
          Fallback values on an order use your product cost; enter confirmed
          quotes before comparing suppliers.
        </p>
      </section>
      <div className="supplier-detail-hero">
        <Avatar name={supplier.initial} color={supplier.color} />
        <div>
          <Badge>
            <T>YOUR SUPPLY PARTNER</T>
          </Badge>
          <h1>
            <T>{supplier.name}</T>
          </h1>
          <p>
            <MapPin size={15} />
            <T>Nairobi ·</T> <T>{supplier.distance}</T>
            <Star size={15} />
            <T>{supplier.rating}</T> <T> </T>
            <span>
              <T>(recorded rating)</T>
            </span>
          </p>
        </div>
        <Button
          variant="white"
          icon={ShoppingCart}
          disabled={!lines.length}
          onClick={() => {
            setCreated(null);
            setOpen(true);
          }}
        >
          <T>Review order ·</T> <T>{lines.length}</T>
        </Button>
      </div>
      <div className="procurement-layout">
        <section className="panel">
          <div className="panel-heading">
            <h2>
              <T>Everyday essentials</T>
            </h2>
            <Tabs
              items={["All", "Food", "Drinks", "Household"]}
              value={filter}
              onChange={setFilter}
            />
          </div>
          <div className="supplier-catalog">
            <T>
              {products.map((p) => (
                <div className="supplier-product-row" key={p.id}>
                  <ProductArt art={p.art} name={p.name} />
                  <div>
                    <strong>
                      <T>{p.name}</T>
                    </strong>
                    <small>
                      <T>{p.size}</T> <T>·</T> <T>{p.category}</T>
                    </small>
                    <span>
                      <T>KES</T>{" "}
                      <T>{money(supplier.quotes?.[p.id] ?? p.cost)}</T> <T> </T>
                      <small>
                        <T>per unit</T>
                      </small>
                    </span>
                  </div>
                  <div className="quantity-control">
                    <LocalButton
                      onClick={() => change(p.id, -1)}
                      aria-label={`Order one less ${p.name}`}
                      disabled={!quantities[p.id]}
                    >
                      <Minus size={14} />
                    </LocalButton>
                    <span>
                      <T>{quantities[p.id] ?? 0}</T>
                    </span>
                    <LocalButton
                      onClick={() => change(p.id, 1)}
                      aria-label={`Order ${p.name}`}
                    >
                      <Plus size={14} />
                    </LocalButton>
                  </div>
                </div>
              ))}
            </T>
          </div>
        </section>
        <aside className="panel supplier-about">
          <h2>
            <T>A little about your supplier.</T>
          </h2>
          <p>
            <T>{supplier.description}</T>
          </p>
          <CheckList
            items={[
              supplier.delivery,
              `Minimum goods order: KES ${money(supplier.minimum)}`,
              `Recorded delivery fee: KES ${money(supplier.deliveryFee ?? 0)}`,
              "Purchase orders are private business records",
            ]}
          />
          <div className="order-preview">
            <span>
              <T>Your goods subtotal</T>
            </span>
            <strong>
              <T>KES</T> <T>{money(subtotal)}</T>
            </strong>
          </div>
          <Button
            disabled={!lines.length || subtotal < supplier.minimum}
            onClick={() => {
              setCreated(null);
              setOpen(true);
            }}
            arrow
          >
            <T>Review your order</T>
          </Button>

          <T>
            {subtotal > 0 && subtotal < supplier.minimum && (
              <p className="quiet-note text-amber">
                <T>Add KES</T> <T>{money(supplier.minimum - subtotal)}</T>{" "}
                <T>to meet the recorded minimum.</T>
              </p>
            )}
          </T>
        </aside>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          created
            ? "Your next shelf is taking shape."
            : "A clear look at your next order."
        }
        description={
          created
            ? `Draft #${created.id} saved. Arrange ordering directly with the supplier.`
            : `Purchase order · ${supplier.name}`
        }
      >
        <T>
          {created ? (
            <div className="success-state">
              <CheckCircle2 size={42} />
              <h3>
                <T>Purchase order saved.</T>
              </h3>
              <p>
                <T>
                  Record the delivery in Purchase orders when goods arrive.
                  Marking it received updates your stock.
                </T>
              </p>
              <Button href="/dashboard/orders" arrow>
                <T>View purchase orders</T>
              </Button>
            </div>
          ) : (
            <>
              <div className="order-lines">
                <T>
                  {lines.map((p) => (
                    <div key={p.id}>
                      <ProductArt art={p.art} name={p.name} small />
                      <span>
                        <T>{p.name}</T>
                        <small>
                          <T>{quantities[p.id]}</T> <T>× KES</T>{" "}
                          <T>{money(supplier.quotes?.[p.id] ?? p.cost)}</T>
                        </small>
                      </span>
                      <strong>
                        <T>KES</T>{" "}
                        <T>
                          {money(
                            (supplier.quotes?.[p.id] ?? p.cost) *
                              quantities[p.id],
                          )}
                        </T>
                      </strong>
                    </div>
                  ))}
                </T>
              </div>
              <div className="cart-summary">
                <div>
                  <span>
                    <T>Subtotal</T>
                  </span>
                  <strong>
                    <T>KES</T> <T>{money(subtotal)}</T>
                  </strong>
                </div>
                <div>
                  <span>
                    <T>Delivery</T>
                  </span>
                  <span>
                    <T>KES {money(supplier.deliveryFee ?? 0)}</T>
                  </span>
                </div>
                <div className="cart-total">
                  <span>
                    <T>Total</T>
                  </span>
                  <strong>
                    <T>KES</T>{" "}
                    <T>{money(subtotal + (supplier.deliveryFee ?? 0))}</T>
                  </strong>
                </div>
              </div>
              <p className="quiet-note">
                <T>No payment is collected and no supplier is contacted.</T>
              </p>
              <div className="modal-actions">
                <Button
                  disabled={!lines.length || subtotal < supplier.minimum}
                  onClick={create}
                >
                  <T>Save purchase order</T>
                </Button>
              </div>
            </>
          )}
        </T>
      </Modal>
    </>
  );
}

export function OrdersPage() {
  const { state, store } = useDemo();
  const [filter, setFilter] = useState("All orders");
  const [selected, setSelected] = useState<Order | null>(null);
  const toast = useToast();
  const branchOrders = state.orders.filter(
    (o) => (o.branch ?? "main") === state.operations.activeBranch,
  );
  const rows = branchOrders.filter(
    (o) => filter === "All orders" || o.status === filter,
  );
  const current = selected
    ? branchOrders.find((o) => o.id === selected.id)
    : null;
  return (
    <>
      <PageHeading
        eyebrow="YOUR NEXT SHELF STARTS HERE"
        title="Purchase orders"
        description="A little planning today. A well-stocked shop tomorrow."
      >
        <Button
          variant="secondary"
          icon={ArrowDownToLine}
          onClick={() =>
            downloadCSV(
              "purchase-orders.csv",
              ["Order", "Supplier", "Date", "Status", "KES"],
              rows.map((o) => [o.id, o.supplier, o.date, o.status, o.amount]),
            )
          }
        >
          <T>Export</T>
        </Button>
        <Button href="/dashboard/suppliers" icon={Plus}>
          <T>Create order</T>
        </Button>
      </PageHeading>
      <div className="stats-grid three-stats">
        <StatCard
          label="All purchase orders"
          value={String(branchOrders.length)}
          icon={ShoppingCart}
        />
        <StatCard
          label="Draft orders"
          value={String(
            branchOrders.filter((o) => o.status === "Draft").length,
          )}
          tone="amber"
          icon={Package}
        />
        <StatCard
          label="Received into stock"
          value={String(
            branchOrders.filter((o) => o.status === "Received").length,
          )}
          tone="blue"
          icon={CheckCircle2}
        />
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <h2>
            <T>Your supply, in sight.</T>
          </h2>
          <Tabs
            items={["All orders", "Draft", "Received"]}
            value={filter}
            onChange={setFilter}
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <T>Order</T>
                </th>
                <th>
                  <T>Supplier</T>
                </th>
                <th>
                  <T>Date</T>
                </th>
                <th>
                  <T>Products</T>
                </th>
                <th>
                  <T>Status</T>
                </th>
                <th>
                  <T>Total</T>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <T>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td className="strong">
                      <T>PO-</T> <T>{o.id}</T>
                    </td>
                    <td>
                      <T>{o.supplier}</T>
                    </td>
                    <td>
                      <T>{o.date}</T>
                    </td>
                    <td>
                      <T>{o.items.length}</T>
                    </td>
                    <td>
                      <Badge tone={o.status === "Received" ? "green" : "amber"}>
                        <T>{o.status}</T>
                      </Badge>
                    </td>
                    <td className="strong">
                      <T>KES</T> <T>{money(o.amount)}</T>
                    </td>
                    <td>
                      <LocalButton
                        className="text-button"
                        onClick={() => setSelected(o)}
                      >
                        <T>View order</T>
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
              icon={ShoppingCart}
              title="A little room for your next order."
              description="Add a supplier and prepare a purchase order."
            >
              <Button href="/dashboard/suppliers" arrow>
                <T>Find a supplier</T>
              </Button>
            </EmptyState>
          )}
        </T>

        <div className="table-foot">
          <T>Internal purchase orders · Send to the supplier separately</T>
        </div>
      </section>
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`Purchase order #${current?.id ?? ""}`}
        description={`${current?.supplier ?? ""} · ${current?.date ?? ""}`}
      >
        <T>
          {current && (
            <>
              <Badge tone={current.status === "Received" ? "green" : "amber"}>
                <T>{current.status}</T>
              </Badge>
              <div className="order-lines">
                <T>
                  {current.items.map((i) => {
                    const p = state.products.find((p) => p.id === i.productId);
                    return (
                      <div key={i.productId}>
                        <ProductArt
                          art={p?.art ?? 0}
                          name={p?.name ?? "Product"}
                          small
                        />
                        <span>
                          <T>{p?.name ?? "Product"}</T>
                          <small>
                            <T>{i.quantity}</T> <T>× KES</T>{" "}
                            <T>{money(i.cost)}</T>
                          </small>
                        </span>
                        <strong>
                          <T>KES</T> <T>{money(i.quantity * i.cost)}</T>
                        </strong>
                      </div>
                    );
                  })}
                </T>
              </div>
              <div className="cart-summary">
                <div>
                  <span>
                    <T>Delivery</T>
                  </span>
                  <span>
                    <T>{money(current.deliveryFee ?? 0)}</T>
                  </span>
                </div>
                <div className="cart-total">
                  <span>
                    <T>Total</T>
                  </span>
                  <strong>
                    <T>KES</T> <T>{money(current.amount)}</T>
                  </strong>
                </div>
              </div>

              <T>
                {current.status === "Draft" ? (
                  <>
                    <p className="quiet-note">
                      <T>
                        Mark this order received after checking the goods. These
                        quantities will be added to your stock. No supplier is
                        contacted.
                      </T>
                    </p>
                    <div className="modal-actions">
                      <Button
                        icon={CheckCircle2}
                        onClick={async () => {
                          try {
                            await store.receiveOrder(current.id);
                            toast("Goods received. Shared stock updated.");
                          } catch {
                            /* The shared connection banner retains the server error and retry action. */
                          }
                        }}
                      >
                        <T>Receive goods</T>
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="inline-note">
                    <CheckCircle2 size={17} />
                    <T>These goods have been added to your inventory.</T>
                  </p>
                )}
              </T>
            </>
          )}
        </T>
      </Modal>
    </>
  );
}
