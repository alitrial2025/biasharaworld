"use client";
import { T, LocalInput, LocalButton } from "@/components/locale";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Globe,
  MapPin,
  Plus,
  RefreshCw,
  ShoppingBag,
  Truck,
  Wifi,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
  ProductArt,
  SelectField,
  Tabs,
} from "@/components/ui";
import { available, cash, minor, type CustomerOrder } from "@/lib/operations";

import { useOperations, OperationError, ToolPanel } from "./common";

export function CompareTool() {
  const { state, op, store, error } = useOperations();
  const [quantities, setQuantities] = useState<Record<number, number>>({
    ...op.cart,
  });
  const [result, setResult] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const offers = (state.suppliers??[]).map((supplier) => {
    const items = state.products
      .filter((p) => quantities[p.id] > 0 && !p.components)
      .map((p) => ({
        productId: p.id,
        quantity: quantities[p.id],
        cost: supplier.quotes?.[p.id] ?? p.cost,
      }));
    const subtotal = items.reduce(
      (s, p) => s + Math.round(p.cost * 100) * p.quantity,
      0,
    );
    const delivery = Math.round((supplier.deliveryFee??0)*100);
    return { supplier, items, subtotal, delivery, total: subtotal + delivery };
  });
  return (
    <>
      <OperationError message={error} />
      <p className="quiet-note">Comparisons use your recorded supplier quotes and delivery fees. Product cost is used where no quote has been entered. Confirm prices with the supplier.</p>
      <Button href="/dashboard/suppliers" variant="secondary">Manage suppliers and quotes</Button>
      <div className="tool-two-columns compare-layout">
        <ToolPanel title="The same basket. A clearer comparison.">
          <div className="bundle-picker">
            <T>
              {state.products
                .filter((p) => !p.components)
                .map((p) => (
                  <label key={p.id}>
                    <span>
                      <T>{p.name}</T>
                      <small>
                        <T>{p.size}</T> <T>· Same pack across all offers</T>
                      </small>
                    </span>
                    <LocalInput
                      aria-label={`Compare quantity for ${p.name}`}
                      type="number"
                      min={0}
                      step={1}
                      value={quantities[p.id] ?? 0}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [p.id]: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
            </T>
          </div>
          <Button
            variant="secondary"
            onClick={() => setQuantities({ ...op.cart })}
          >
            <T>Use current checkout basket</T>
          </Button>
          <p className="quiet-note">
            <T>
              Supplier prices, delivery fees and lead times are illustrative. No
              supplier is contacted.
            </T>
          </p>
        </ToolPanel>
        <div className="comparison-offers">
          <T>
            {offers.map((offer, i) => (
              <ToolPanel
                key={offer.supplier.id}
                title={offer.supplier.name}
                description={offer.supplier.delivery}
              >
                <Badge tone={i === 1 ? "blue" : "green"}>
                  <T>Sample quote</T>
                </Badge>
                <dl className="offer-totals">
                  <div>
                    <dt>
                      <T>Goods</T>
                    </dt>
                    <dd>
                      <T>{cash(offer.subtotal)}</T>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <T>Delivery</T>
                    </dt>
                    <dd>
                      <T>{cash(offer.delivery)}</T>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <T>Minimum goods order</T>
                    </dt>
                    <dd>
                      <T>{cash(offer.supplier.minimum * 100)}</T>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <T>Basket total</T>
                    </dt>
                    <dd>
                      <T>{cash(offer.total)}</T>
                    </dd>
                  </div>
                </dl>
                <Button
                  disabled={
                    !offer.items.length ||
                    offer.subtotal < offer.supplier.minimum * 100
                  }
                  onClick={() => setSelected(offer.supplier.id)}
                >
                  <T>Review this offer</T>
                </Button>

                <T>
                  {offer.subtotal < offer.supplier.minimum * 100 && (
                    <p className="quiet-note text-amber">
                      <T>Add</T>{" "}
                      <T>
                        {cash(offer.supplier.minimum * 100 - offer.subtotal)}
                      </T>{" "}
                      <T>in goods to meet the minimum.</T>
                    </p>
                  )}
                </T>
              </ToolPanel>
            ))}
          </T>
        </div>
      </div>
      <Modal
        open={selected !== null}
        onClose={() => {
          setSelected(null);
          setResult("");
        }}
        title="A useful next step for your shelves."
      >
        <T>
          {selected &&
            (() => {
              const offer = offers.find((o) => o.supplier.id === selected)!;
              return result ? (
                <div className="success-state">
                  <CheckCircle2 size={36} />
                  <h3>
                    <T>{result}</T>
                  </h3>
                  <p>
                    <T>
                      Nothing was sent to a supplier. Receive the draft from
                      Purchase orders when ready.
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
                      {offer.items.map((i) => (
                        <div key={i.productId}>
                          <span>
                            <T>
                              {
                                state.products.find((p) => p.id === i.productId)
                                  ?.name
                              }
                            </T>

                            <small>
                              <T>{i.quantity}</T> <T>units at</T>{" "}
                              <T>{cash(i.cost * 100)}</T>
                            </small>
                          </span>
                          <strong>
                            <T>{cash(i.cost * 100 * i.quantity)}</T>
                          </strong>
                        </div>
                      ))}
                    </T>
                  </div>
                  <p className="quiet-note">
                    <T>
                      Your recorded delivery fee is included in the final
                      purchase order. Nothing is sent to a supplier.
                    </T>
                  </p>
                  <Button
                    onClick={async () => {
                      const order = await store.createOrder(
                        offer.supplier.name,
                        offer.items,
                        offer.delivery / 100,
                      );
                      setResult(`Demo draft #${order.id} is ready.`);
                    }}
                  >
                    <T>Prepare purchase order</T>
                  </Button>
                </>
              );
            })()}
        </T>
      </Modal>
    </>
  );
}
export function DeliveriesTool() {
  const { op, store, act, error } = useOperations();
  const [filter, setFilter] = useState("All orders");
  const [selected, setSelected] = useState<number | null>(null);
  const order = op.deliveries.find((o) => o.id === selected);
  return (
    <>
      <OperationError message={error} />
      <ToolPanel
        title="A good order, from start to doorstep."
        action={
          <Button href={`/shop/${store.workspace?.slug||""}`} variant="secondary" icon={ShoppingBag}>
            <T>Preview customer shop</T>
          </Button>
        }
      >
        <Tabs
          items={[
            "All orders",
            "New",
            "Confirmed",
            "Packing",
            "Dispatched",
            "Delivered",
            "Cancelled",
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="delivery-board">
          <T>
            {op.deliveries
              .filter(
                (o) =>
                  o.branch === op.activeBranch &&
                  (filter === "All orders" || o.status === filter),
              )
              .map((o) => (
                <LocalButton key={o.id} onClick={() => setSelected(o.id)}>
                  <div>
                    <Badge
                      tone={
                        o.status === "Delivered"
                          ? "green"
                          : o.status === "Cancelled"
                            ? "gray"
                            : "amber"
                      }
                    >
                      <T>{o.status}</T>
                    </Badge>
                    <strong>
                      <T>Order #</T> <T>{o.id}</T>
                    </strong>
                  </div>
                  <h3>
                    <T>{o.customer}</T>
                  </h3>
                  <p>
                    <T>{o.address}</T>
                  </p>
                  <div>
                    <span>
                      <T>{o.lines.reduce((s, l) => s + l.quantity, 0)}</T>{" "}
                      <T>items ·</T>{" "}
                      <T>{o.paid ? "Recorded as paid" : "Unpaid"}</T>
                    </span>
                    <strong>
                      <T>{cash(o.total)}</T>
                    </strong>
                  </div>
                </LocalButton>
              ))}
          </T>
        </div>

        <T>
          {!op.deliveries.some((o) => o.branch === op.activeBranch) && (
            <EmptyState
              icon={Truck}
              title="Your next delivery starts with an order."
              description="Place a local demo order through your shopfront and follow it here."
            />
          )}
        </T>
      </ToolPanel>
      <Modal
        open={!!order}
        onClose={() => setSelected(null)}
        title={order ? `Customer order #${order.id}` : "Order"}
        wide
      >
        <T>
          {order && (
            <>
              <div className="customer-detail">
                <Avatar name={order.customer} />
                <div>
                  <strong>
                    <T>{order.customer}</T>
                  </strong>
                  <span>
                    <T>{order.address}</T>
                  </span>
                </div>
                <Badge tone={order.paid ? "green" : "amber"}>
                  <T>{order.paid ? "Paid locally" : "Unpaid"}</T>
                </Badge>
              </div>
              <div className="packing-list">
                <T>
                  {order.lines.map((l) => (
                    <label key={l.productId}>
                      <LocalInput
                        type="checkbox"
                        disabled={order.status !== "Packing"}
                        checked={order.packed.includes(l.productId)}
                        onChange={async () =>
                          await act(
                            {
                              type: "pack",
                              id: order.id,
                              productId: l.productId,
                            },
                            true,
                          )
                        }
                      />
                      <span>
                        <strong>
                          <T>{l.name}</T>
                        </strong>
                        <small>
                          <T>{l.quantity}</T> <T>units</T>
                        </small>
                      </span>
                      <strong>
                        <T>{cash(l.net)}</T>
                      </strong>
                    </label>
                  ))}
                </T>
              </div>
              <div className="cart-summary">
                <div>
                  <span>
                    <T>Delivery fee</T>
                  </span>
                  <span>
                    <T>{cash(order.fee)}</T>
                  </span>
                </div>
                <div className="cart-total">
                  <span>
                    <T>Total</T>
                  </span>
                  <strong>
                    <T>{cash(order.total)}</T>
                  </strong>
                </div>
              </div>
              <div className="order-timeline">
                <T>
                  {order.events.map((event, i) => (
                    <div key={i}>
                      <CheckCircle2 size={15} />
                      <T>{event}</T>
                    </div>
                  ))}
                </T>
              </div>
              <div className="button-row">
                <T>
                  {!["Delivered", "Cancelled"].includes(order.status) && (
                    <Button
                      onClick={async () =>
                        await act({
                          type: "orderStatus",
                          id: order.id,
                          status: (
                            {
                              New: "Confirmed",
                              Confirmed: "Packing",
                              Packing: "Dispatched",
                              Dispatched: "Delivered",
                            } as Record<string, CustomerOrder["status"]>
                          )[order.status],
                        })
                      }
                    >
                      <T>
                        {
                          (
                            {
                              New: "Confirm & reserve stock",
                              Confirmed: "Start packing",
                              Packing: "Dispatch order",
                              Dispatched: "Mark delivered",
                            } as Record<string, string>
                          )[order.status]
                        }
                      </T>
                    </Button>
                  )}
                </T>{" "}
                <T>
                  {!order.paid && order.status === "Delivered" && (
                    <Button
                      variant="secondary"
                      onClick={async () => await act({ type: "orderPaid", id: order.id })}
                    >
                      <T>Record cash received</T>
                    </Button>
                  )}
                </T>{" "}
                <T>
                  {["New", "Confirmed", "Packing"].includes(order.status) && (
                    <Button
                      variant="danger"
                      onClick={async () =>
                        await act({
                          type: "orderStatus",
                          id: order.id,
                          status: "Cancelled",
                        })
                      }
                    >
                      <T>Cancel order</T>
                    </Button>
                  )}
                </T>
              </div>
              <p className="quiet-note">
                <T>
                  Local fulfilment preview. No driver, customer or payment
                  service is contacted.
                </T>
              </p>
            </>
          )}
        </T>
      </Modal>
    </>
  );
}
export function LoyaltyTool() {
  const { state, op, act, error } = useOperations();
  const [customer, setCustomer] = useState(state.customers[0]?.name ?? "");
  return (
    <>
      <OperationError message={error} />
      <div className="tool-two-columns">
        <ToolPanel title="A little thank-you, every visit.">
          <SelectField label="Customer" value={customer} onChange={setCustomer}>
            <T>
              {state.customers.map((c) => (
                <option key={c.id}>
                  <T>{c.name}</T>
                </option>
              ))}
            </T>
          </SelectField>
          <div className="loyalty-card">
            <Gift size={35} />
            <span>
              <T>A LITTLE SOMETHING FOR NEXT TIME</T>
            </span>
            <strong>
              <T>{op.loyalty[customer] ?? 0}</T>
              <small>
                <T>points</T>
              </small>
            </strong>
            <p>
              <T>{customer}</T>
            </p>
            <Badge tone="white">
              <T>1 point = KES 1 at checkout</T>
            </Badge>
          </div>
          <Button href="/dashboard/sales/new" arrow>
            <T>Earn or redeem at checkout</T>
          </Button>
          <p className="quiet-note">
            <T>
              Select this customer at checkout to use their points. Returns
              adjust earned and redeemed points proportionally.
            </T>
          </p>
        </ToolPanel>
        <ToolPanel title="Clear rules. Familiar faces.">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await act({
                type: "rewardRate",
                amount: minor(
                  String(new FormData(e.currentTarget).get("rate")),
                ),
              });
            }}
          >
            <Field
              label="Spend required to earn one point (KES)"
              name="rate"
              type="number"
              min={1}
              step="0.01"
              defaultValue={op.rewardRate / 100}
              required
            />
            <Button variant="secondary" type="submit">
              <T>Save earning rule</T>
            </Button>
          </form>
          <div className="section-divider" />
          <h3 className="small-heading">
            <T>Points activity</T>
          </h3>
          <T>
            {op.rewards
              .filter((r) => r.customer === customer)
              .map((r) => (
                <div className="reward-event" key={r.id}>
                  <span className="icon-box tone-purple">
                    <Gift size={17} />
                  </span>
                  <div>
                    <strong>
                      <T>{r.reason}</T>
                    </strong>
                    <small>
                      <T>{r.date}</T>
                    </small>
                  </div>
                  <strong className={r.points < 0 ? "text-red" : "text-green"}>
                    <T>{r.points > 0 ? "+" : ""}</T> <T>{r.points}</T>
                  </strong>
                </div>
              ))}
          </T>{" "}
          <T>
            {!op.rewards.some((r) => r.customer === customer) && (
              <EmptyState
                icon={Gift}
                title="A little history, still to come."
                description="This customer’s earned, redeemed and adjusted points will appear here."
              />
            )}
          </T>
        </ToolPanel>
      </div>
    </>
  );
}
export function BranchesTool() {
  const { state, op, act, error } = useOperations();
  const [open, setOpen] = useState(false);
  return (
    <>
      <OperationError message={error} />
      <div className="branch-overview">
        <div>
          <span>
            <T>YOUR BUSINESS, TOGETHER</T>
          </span>
          <strong>
            <T>{op.branches.length}</T> <T>places to grow.</T>
          </strong>
          <p>
            <T>
              Customers and loyalty are shared business-wide. Stock, sales and
              registers belong to their branch.
            </T>
          </p>
        </div>
        <Button variant="white" icon={Plus} onClick={() => setOpen(true)}>
          <T>Add branch</T>
        </Button>
      </div>
      <div className="branch-grid">
        <T>
          {op.branches.map((b) => {
            const physical = Object.values(
              b.id === op.activeBranch
                ? Object.fromEntries(
                    state.products
                      .filter((p) => !p.components)
                      .map((p) => [p.id, p.stock]),
                  )
                : (op.stock[b.id] ?? {}),
            ).reduce((s, n) => s + n, 0);
            const sales = op.receipts
              .filter((r) => r.branch === b.id)
              .reduce((s, r) => s + r.total, 0);
            return (
              <article
                className={`panel branch-card ${b.id === op.activeBranch ? "active" : ""}`}
                key={b.id}
              >
                <div>
                  <span className="icon-box tone-green">
                    <MapPin size={23} />
                  </span>
                  <Badge tone={b.id === op.activeBranch ? "green" : "gray"}>
                    <T>
                      {b.id === op.activeBranch ? "Current branch" : "Branch"}
                    </T>
                  </Badge>
                </div>
                <h2>
                  <T>{b.name}</T>
                </h2>
                <p>
                  <T>{b.location}</T>
                </p>
                <dl>
                  <div>
                    <dt>
                      <T>Physical stock</T>
                    </dt>
                    <dd>
                      <T>{physical}</T> <T>units</T>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <T>Detailed receipts</T>
                    </dt>
                    <dd>
                      <T>{cash(sales)}</T>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <T>Open register</T>
                    </dt>
                    <dd>
                      <T>
                        {op.registers.some(
                          (r) => r.branch === b.id && r.status === "Open",
                        )
                          ? "Yes"
                          : "No"}
                      </T>
                    </dd>
                  </div>
                </dl>
                <Button
                  variant={b.id === op.activeBranch ? "secondary" : "primary"}
                  disabled={b.id === op.activeBranch}
                  onClick={async () => await act({ type: "branch", id: b.id })}
                >
                  <T>
                    {b.id === op.activeBranch
                      ? "You’re here"
                      : "Switch to this branch"}
                  </T>
                </Button>
                <Link className="text-link" href="/dashboard/transfers">
                  <T>Manage stock transfers</T>
                  <ArrowRight size={14} />
                </Link>
              </article>
            );
          })}
        </T>
      </div>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="A new place for your ambition."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await act({
                type: "addBranch",
                name: String(f.get("name")),
                location: String(f.get("location")),
              })
            )
              setOpen(false);
          }}
        >
          <Field
            label="Branch name"
            name="name"
            placeholder="e.g. Ngara shop"
            required
          />
          <Field
            label="Location"
            name="location"
            placeholder="Neighbourhood, town"
            required
          />
          <p className="quiet-note">
            <T>
              A new branch starts with zero stock. Transfer or receive products
              to fill its shelves.
            </T>
          </p>
          <Button type="submit">
            <T>Create branch</T>
          </Button>
        </form>
      </Modal>
    </>
  );
}
export function OnlineShopTool() {
  const { state, op, store, act, error } = useOperations();
  return (
    <>
      <OperationError message={error} />
      <div className="tool-two-columns">
        <ToolPanel
          title="A shopfront that feels like you."
          action={
            <Badge tone={op.shop.published ? "green" : "gray"}>
              <T>{op.shop.published ? "Published online" : "Hidden"}</T>
            </Badge>
          }
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await act({
                type: "shop",
                name: String(f.get("name")),
                description: String(f.get("description")),
                branch: String(f.get("branch")),
                fee: minor(String(f.get("fee"))),
              });
            }}
          >
            <Field
              label="Shop name"
              name="name"
              defaultValue={op.shop.name}
              required
            />
            <Field
              label="A little about your shop"
              name="description"
              defaultValue={op.shop.description}
              required
            />
            <SelectField
              label="Fulfilment branch"
              name="branch"
              defaultValue={op.shop.branch}
            >
              <T>
                {op.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    <T>{b.name}</T>
                  </option>
                ))}
              </T>
            </SelectField>
            <Field
              label="Delivery fee (KES)"
              name="fee"
              type="number"
              min={0}
              step="0.01"
              defaultValue={op.shop.fee / 100}
              required
            />
            <div className="button-row">
              <Button type="submit">
                <T>Save shop details</T>
              </Button>
              <Button
                variant="secondary"
                onClick={async () =>
                  await act({ type: "shop", published: !op.shop.published })
                }
              >
                <T>
                  {op.shop.published ? "Unpublish shop" : "Publish shop"}
                </T>
              </Button>
            </div>
          </form>
          <p className="quiet-note">
            <T>
              Publishing makes your selected products, prices and availability public. Customer orders are saved to your business.
            </T>
          </p>
          <Button href={`/shop/${store.workspace?.slug||""}`} variant="dark" icon={Globe}>
            <T>Open your online shop</T>
          </Button>
        </ToolPanel>
        <ToolPanel title="Choose what’s on the online shelf.">
          <div className="visibility-list">
            <T>
              {state.products.map((p) => (
                <label key={p.id}>
                  <ProductArt art={p.art} name={p.name} small />
                  <span>
                    <strong>
                      <T>{p.name}</T>
                    </strong>
                    <small>
                      <T>{p.size}</T> <T>·</T> <T>{cash(p.price * 100)}</T>
                    </small>
                  </span>
                  <LocalInput
                    type="checkbox"
                    aria-label={`Show ${p.name} online`}
                    checked={!op.shop.hidden.includes(p.id)}
                    onChange={async () =>
                      await act(
                        {
                          type: "shop",
                          hidden: op.shop.hidden.includes(p.id)
                            ? op.shop.hidden.filter((id) => id !== p.id)
                            : [...op.shop.hidden, p.id],
                        },
                        true,
                      )
                    }
                  />
                </label>
              ))}
            </T>
          </div>
        </ToolPanel>
      </div>
    </>
  );
}
export function PortalTool() {
  const { state, op, store } = useOperations();
  const [customer, setCustomer] = useState(String(state.customers[0]?.id ?? 1));
  const c = state.customers.find((c) => c.id === +customer);
  return (
    <div className="tool-two-columns">
      <ToolPanel title="A little clarity, from their side.">
        <SelectField
          label="Preview as customer"
          value={customer}
          onChange={setCustomer}
        >
          <T>
            {state.customers.map((c) => (
              <option key={c.id} value={c.id}>
                <T>{c.name}</T>
              </option>
            ))}
          </T>
        </SelectField>

        <T>
          {c && (
            <div className="portal-invitation">
              <Avatar name={c.name} />
              <h2>
                <T>{c.name}</T>
              </h2>
              <p>
                <T>
                  Orders, invoices, balance and rewards in a familiar place.
                </T>
              </p>
              <Button href={`/portal/${store.workspace?.slug||""}`} icon={Globe}>
                <T>Open customer preview</T>
              </Button>
              <Badge tone="amber">
                <T>Sample access · no authentication</T>
              </Badge>
            </div>
          )}
        </T>

        <p className="quiet-note">
          <T>
            This is a merchant preview of sample customer data. Secure portal
            access is available after signing in with a confirmed email.
          </T>
        </p>
      </ToolPanel>
      <ToolPanel title="A clearer customer relationship.">
        <div className="portal-preview-stats">
          <div>
            <span>
              <T>Customer balance</T>
            </span>
            <strong>
              <T>{cash((c?.balance ?? 0) * 100)}</T>
            </strong>
          </div>
          <div>
            <span>
              <T>Loyalty points</T>
            </span>
            <strong>
              <T>{op.loyalty[c?.name ?? ""] ?? 0}</T>
            </strong>
          </div>
          <div>
            <span>
              <T>Local orders</T>
            </span>
            <strong>
              <T>
                {op.deliveries.filter((o) => o.customer === c?.name).length}
              </T>
            </strong>
          </div>
          <div>
            <span>
              <T>Documents</T>
            </span>
            <strong>
              <T>{op.documents.filter((d) => d.customer === c?.name).length}</T>
            </strong>
          </div>
        </div>
      </ToolPanel>
    </div>
  );
}
export function SyncTool() {
  const { op, store, act, error } = useOperations();
  const [online, setOnline] = useState<boolean | null>(null);
  return (
    <>
      <OperationError message={error} />

      <T>
        {store.storageWarning && (
          <div className="operation-error">
            <T>{store.storageWarning}</T>
          </div>
        )}
      </T>

      <div className="tool-two-columns">
        <ToolPanel title="Your work has a home on this device.">
          <div className="connection-card">
            <span className="icon-box tone-green">
              <Wifi size={28} />
            </span>
            <h2>
              <T>Saved locally.</T>
            </h2>
            <p>
              <T>
                Products, sales, records and preferences persist in this
                browser. They are not synced to another device or the Android
                app.
              </T>
            </p>
            <Button
              variant="secondary"
              onClick={() => setOnline(navigator.onLine)}
            >
              <T>Check browser connection</T>
            </Button>

            <T>
              {online !== null && (
                <Badge tone={online ? "green" : "amber"}>
                  <T>
                    {online
                      ? "Browser reports online"
                      : "Browser reports offline"}
                  </T>
                </Badge>
              )}
            </T>
          </div>
          <SelectField
            label="Explore a sync scenario"
            value={op.sync.mode}
            onChange={async (mode) =>
              await act({ type: "syncMode", mode: mode as typeof op.sync.mode })
            }
          >
            <option>
              <T>Local only</T>
            </option>
            <option>
              <T>Offline preview</T>
            </option>
            <option>
              <T>Conflict preview</T>
            </option>
          </SelectField>
          <p className="quiet-note">
            <T>
              Scenarios are simulated. This web preview does not cache a full
              offline cold start and has no sync server.
            </T>
          </p>
        </ToolPanel>
        <ToolPanel title="A little record of your progress.">
          <T>
            {op.sync.entries.length ? (
              op.sync.entries.map((e) => (
                <div className="sync-entry" key={e.id}>
                  <span
                    className={`icon-box tone-${e.status === "Saved on device" ? "green" : "amber"}`}
                  >
                    <T>
                      {e.status === "Saved on device" ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <RefreshCw size={18} />
                      )}
                    </T>
                  </span>
                  <div>
                    <strong>
                      <T>{e.label}</T>
                    </strong>
                    <small>
                      <T>{e.status}</T>
                    </small>
                  </div>

                  <T>
                    {e.status !== "Saved on device" && (
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={async () => await act({ type: "retrySync", id: e.id })}
                      >
                        <T>Review / retry</T>
                      </Button>
                    )}
                  </T>
                </div>
              ))
            ) : (
              <EmptyState
                icon={RefreshCw}
                title="A little activity, still to come."
                description="Your saved activity will appear here."
              />
            )}
          </T>
        </ToolPanel>
      </div>
    </>
  );
}
export function PreferencesTool() {
  const { op, act, error } = useOperations();
  return (
    <>
      <OperationError message={error} />
      <div className="tool-two-columns">
        <ToolPanel title="Your language. Your light. Your pace.">
          <SelectField
            label="Language / Lugha"
            value={op.preferences.language}
            onChange={async (language) =>
              await act({ type: "preferences", language: language as "en" | "sw" })
            }
          >
            <option value="en">
              <T>English</T>
            </option>
            <option value="sw">
              <T>Kiswahili</T>
            </option>
          </SelectField>
          <SelectField
            label="Appearance"
            value={op.preferences.theme}
            onChange={async (theme) =>
              await act({
                type: "preferences",
                theme: theme as "light" | "dark" | "system",
              })
            }
          >
            <option value="light">
              <T>Light</T>
            </option>
            <option value="dark">
              <T>Dark</T>
            </option>
            <option value="system">
              <T>Follow device</T>
            </option>
          </SelectField>
          <SelectField
            label="Reading size"
            value={String(op.preferences.textSize)}
            onChange={async (textSize) =>
              await act({ type: "preferences", textSize: Number(textSize) })
            }
          >
            <option value="100">
              <T>Standard · 100%</T>
            </option>
            <option value="115">
              <T>Comfortable · 115%</T>
            </option>
            <option value="130">
              <T>Large · 130%</T>
            </option>
          </SelectField>
          <p className="quiet-note">
            <T>
              Your choices are saved on this device and apply across the
              website, workspace, shop and customer portal.
            </T>
          </p>
        </ToolPanel>
        <ToolPanel title="A familiar space, made yours.">
          <div className="preference-preview">
            <div className="icon-box tone-green">
              <ShoppingBag size={25} />
            </div>
            <h2>
              <T>
                {op.preferences.language === "sw"
                  ? "Biashara yako. Pamoja."
                  : "Your business. All together."}
              </T>
            </h2>
            <p>
              <T>
                {op.preferences.language === "sw"
                  ? "Mauzo, bidhaa na wateja wako katika sehemu moja."
                  : "Your sales, shelves and people in one clear place."}
              </T>
            </p>
            <div className="preference-swatches">
              <span />
              <span />
              <span />
              <span />
            </div>
            <Badge>
              <T>{op.preferences.theme}</T> <T>·</T>{" "}
              <T>{op.preferences.textSize}</T> <T>%</T>
            </Badge>
            <Button href="/dashboard" arrow>
              <T>
                {op.preferences.language === "sw"
                  ? "Fungua dashibodi"
                  : "Open your dashboard"}
              </T>
            </Button>
          </div>
        </ToolPanel>
      </div>
    </>
  );
}

export function Shopfront() {
  const { state, op, act, error } = useOperations();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [orderId, setOrderId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<number | null>(null);
  const products = state.products.filter(
    (p) =>
      !op.shop.hidden.includes(p.id) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const count = Object.values(cart).reduce((s, n) => s + n, 0);
  const subtotal = state.products.reduce(
    (s, p) => s + Math.round(p.price * 100) * (cart[p.id] ?? 0),
    0,
  );
  function add(id: number, delta: number) {
    setCart((c) => ({
      ...c,
      [id]: Math.max(
        0,
        Math.min(available(state, id, op.shop.branch), (c[id] ?? 0) + delta),
      ),
    }));
  }
  return (
    <div className="shopfront">
      <header className="shopfront-header container">
        <Link href="/dashboard/online-shop" className="text-link">
          <T>← Back to merchant preview</T>
        </Link>
        <Badge tone="amber">
          <T>Local demo shop · no real orders</T>
        </Badge>
        <Link href="/dashboard/customer-portal">
          <T>Customer portal</T>
        </Link>
      </header>
      <main id="main-content" className="container">
        <section className="shopfront-hero">
          <div>
            <span className="eyebrow">
              <T>YOUR NEIGHBOURHOOD, A LITTLE CLOSER.</T>
            </span>
            <h1>
              <T>{op.shop.name}</T>
            </h1>
            <p>
              <T>{op.shop.description}</T>
            </p>
            <span>
              <MapPin size={16} />
              <T>
                {op.branches.find((b) => b.id === op.shop.branch)?.location}
              </T>{" "}
              <T>· Delivery</T> <T>{cash(op.shop.fee)}</T>
            </span>
          </div>
          <Image
            src="/images/shop.webp"
            width={1024}
            height={1536}
            alt="Your neighbourhood shopkeeper"
            priority
          />
        </section>
        <OperationError message={error} />

        <T>
          {!op.shop.published ? (
            <ToolPanel>
              <EmptyState
                icon={ShoppingBag}
                title="A little pause at the shop."
                description="The merchant has hidden this local shop preview."
              >
                <Button href="/dashboard/online-shop">
                  <T>Return to shop settings</T>
                </Button>
              </EmptyState>
            </ToolPanel>
          ) : (
            <div className="shopfront-layout">
              <section>
                <div className="shop-search">
                  <LocalInput
                    aria-label="Search shop products"
                    placeholder="Find something for your day…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <Badge>
                    <T>{products.length}</T> <T>products</T>
                  </Badge>
                </div>
                <div className="store-products">
                  <T>
                    {products.map((p) => (
                      <article key={p.id} className="store-product">
                        <LocalButton
                          className="store-product-detail"
                          onClick={() => setDetail(p.id)}
                        >
                          <ProductArt art={p.art} name={p.name} />
                          <h2>
                            <T>{p.name}</T>
                          </h2>
                          <span>
                            <T>{p.size}</T>
                          </span>
                        </LocalButton>
                        <div>
                          <strong>
                            <T>{cash(p.price * 100)}</T>
                          </strong>
                          <Badge
                            tone={
                              available(state, p.id, op.shop.branch)
                                ? "green"
                                : "red"
                            }
                          >
                            <T>
                              {available(state, p.id, op.shop.branch)
                                ? "Available"
                                : "Sold out"}
                            </T>
                          </Badge>
                        </div>
                        <div className="store-quantity">
                          <LocalButton
                            disabled={!cart[p.id]}
                            onClick={() => add(p.id, -1)}
                            aria-label={`Remove ${p.name}`}
                          >
                            <T>−</T>
                          </LocalButton>
                          <span>
                            <T>{cart[p.id] ?? 0}</T>
                          </span>
                          <LocalButton
                            disabled={
                              (cart[p.id] ?? 0) >=
                              available(state, p.id, op.shop.branch)
                            }
                            onClick={() => add(p.id, 1)}
                            aria-label={`Add ${p.name}`}
                          >
                            <T>+</T>
                          </LocalButton>
                        </div>
                      </article>
                    ))}
                  </T>
                </div>

                <T>
                  {!products.length && (
                    <EmptyState
                      title="Nothing on this shelf yet."
                      description="Try another product name."
                    />
                  )}
                </T>
              </section>
              <aside className="panel shop-order">
                <h2>
                  <T>A little basket of essentials.</T>
                </h2>

                <T>
                  {orderId ? (
                    <div className="success-state">
                      <CheckCircle2 size={42} />
                      <h3>
                        <T>Demo order #</T> <T>{orderId}</T> <T>is ready.</T>
                      </h3>
                      <p>
                        <T>
                          It is saved only in this browser. No payment or
                          delivery request was sent.
                        </T>
                      </p>
                      <Button href="/dashboard/deliveries" arrow>
                        <T>View merchant deliveries</T>
                      </Button>
                      <Button variant="ghost" onClick={() => setOrderId(null)}>
                        <T>Start another basket</T>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="order-lines">
                        <T>
                          {state.products
                            .filter((p) => cart[p.id] > 0)
                            .map((p) => (
                              <div key={p.id}>
                                <span>
                                  <T>{p.name}</T>
                                  <small>
                                    <T>{cart[p.id]}</T> <T>×</T>{" "}
                                    <T>{cash(p.price * 100)}</T>
                                  </small>
                                </span>
                                <strong>
                                  <T>{cash(p.price * 100 * cart[p.id])}</T>
                                </strong>
                              </div>
                            ))}
                        </T>
                      </div>

                      <T>
                        {!count && (
                          <p className="quiet-note">
                            <T>Choose a few favourites from the shelves.</T>
                          </p>
                        )}
                      </T>

                      <div className="cart-summary">
                        <div>
                          <span>
                            <T>Items</T>
                          </span>
                          <strong>
                            <T>{count}</T>
                          </strong>
                        </div>
                        <div>
                          <span>
                            <T>Delivery</T>
                          </span>
                          <span>
                            <T>{cash(op.shop.fee)}</T>
                          </span>
                        </div>
                        <div className="cart-total">
                          <span>
                            <T>Total</T>
                          </span>
                          <strong>
                            <T>{cash(subtotal + (count ? op.shop.fee : 0))}</T>
                          </strong>
                        </div>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          const result = await act({
                            type: "placeOrder",
                            cart,
                            customer: String(f.get("customer")),
                            address: String(f.get("address")),
                          });
                          if (result) {
                            setOrderId(result.id!);
                            setCart({});
                          }
                        }}
                      >
                        <Field
                          label="Customer name"
                          name="customer"
                          placeholder="Use a sample customer name"
                          list="shop-customers"
                          required
                        />
                        <datalist id="shop-customers">
                          <T>
                            {state.customers.map((c) => (
                              <option key={c.id} value={c.name} />
                            ))}
                          </T>
                        </datalist>
                        <Field
                          label="Delivery address or pickup details"
                          name="address"
                          placeholder="e.g. Pickup at the main shop"
                          required
                        />
                        <Button type="submit" disabled={!count} arrow>
                          <T>Place demo order</T>
                        </Button>
                        <p className="quiet-note">
                          <T>
                            No money is collected. This is a local UI preview.
                          </T>
                        </p>
                      </form>
                    </>
                  )}
                </T>
              </aside>
            </div>
          )}
        </T>
      </main>
      <footer className="container shopfront-footer">
        <T>Powered by BiasharaOS · Your business. All together.</T>
      </footer>
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={state.products.find((p) => p.id === detail)?.name ?? "Product"}
      >
        <T>
          {detail !== null &&
            (() => {
              const p = state.products.find((p) => p.id === detail)!;
              return (
                <div className="store-detail">
                  <ProductArt art={p.art} name={p.name} />
                  <h3>
                    <T>{p.name}</T>
                  </h3>
                  <p>
                    <T>{p.size}</T> <T>·</T> <T>{p.category}</T>
                  </p>
                  <strong>
                    <T>{cash(p.price * 100)}</T>
                  </strong>
                  <Badge>
                    <T>{available(state, p.id, op.shop.branch)}</T>{" "}
                    <T>available</T>
                  </Badge>
                  <Button
                    disabled={!available(state, p.id, op.shop.branch)}
                    onClick={() => {
                      add(p.id, 1);
                      setDetail(null);
                    }}
                  >
                    <T>Add to basket</T>
                  </Button>
                </div>
              );
            })()}
        </T>
      </Modal>
    </div>
  );
}
export function CustomerPortal({ id }: { id: number }) {
  const { state, op, store } = useOperations();
  const c = state.customers.find((c) => c.id === id);
  const [tab, setTab] = useState("Orders");
  return (
    <div className="customer-portal">
      <header className="container portal-header">
        <Link className="document-brand" href="/">
          <T>Biashara</T>
          <span>
            <T>OS</T>
          </span>
        </Link>
        <Badge tone="amber">
          <T>Customer-view preview · no sign-in</T>
        </Badge>
        <Button href="/dashboard/customer-portal" variant="secondary">
          <T>Back to merchant</T>
        </Button>
      </header>
      <main id="main-content" className="container">
        <T>
          {!c ? (
            <ToolPanel>
              <EmptyState
                title="This sample customer was not found."
                description="Choose a customer from the merchant preview."
              >
                <Button href="/dashboard/customer-portal">
                  <T>Choose customer</T>
                </Button>
              </EmptyState>
            </ToolPanel>
          ) : (
            <>
              <section className="portal-welcome">
                <Avatar name={c.name} color={c.color} />
                <div>
                  <span className="eyebrow">
                    <T>A LITTLE CLOSER TO YOUR SHOP</T>
                  </span>
                  <h1>
                    <T>Hello,</T> <T>{c.name.split(" ")[0]}</T> <T>.</T>
                  </h1>
                  <p>
                    <T>Your orders, records and rewards with</T>{" "}
                    <T>{op.shop.name}</T> <T>.</T>
                  </p>
                </div>
                <Button href={`/shop/${store.workspace?.slug||""}`} icon={ShoppingBag}>
                  <T>Visit the demo shop</T>
                </Button>
              </section>
              <div className="portal-stat-grid">
                <div>
                  <WalletIcon />
                  <span>
                    <T>Outstanding sample balance</T>
                  </span>
                  <strong>
                    <T>{cash(c.balance * 100)}</T>
                  </strong>
                </div>
                <div>
                  <Gift size={22} />
                  <span>
                    <T>Your loyalty points</T>
                  </span>
                  <strong>
                    <T>{op.loyalty[c.name] ?? 0}</T>
                    <small>
                      <T>points</T>
                    </small>
                  </strong>
                </div>
                <div>
                  <ShoppingBag size={22} />
                  <span>
                    <T>Your local orders</T>
                  </span>
                  <strong>
                    <T>
                      {
                        op.deliveries.filter((o) => o.customer === c.name)
                          .length
                      }
                    </T>
                  </strong>
                </div>
              </div>
              <ToolPanel title="Everything in its familiar place.">
                <Tabs
                  items={["Orders", "Invoices", "Rewards"]}
                  value={tab}
                  onChange={setTab}
                />

                <T>
                  {tab === "Orders" ? (
                    <div className="portal-records">
                      <T>
                        {op.deliveries
                          .filter((o) => o.customer === c.name)
                          .map((o) => (
                            <article key={o.id}>
                              <div>
                                <h3>
                                  <T>Order #</T> <T>{o.id}</T>
                                </h3>
                                <Badge
                                  tone={
                                    o.status === "Delivered" ? "green" : "amber"
                                  }
                                >
                                  <T>{o.status}</T>
                                </Badge>
                              </div>
                              <p>
                                <T>
                                  {o.lines
                                    .map((l) => `${l.quantity} × ${l.name}`)
                                    .join(", ")}
                                </T>
                              </p>
                              <strong>
                                <T>{cash(o.total)}</T>
                              </strong>
                              <div className="order-timeline">
                                <T>
                                  {o.events.map((e, i) => (
                                    <span key={i}>
                                      <CheckCircle2 size={14} />
                                      <T>{e}</T>
                                    </span>
                                  ))}
                                </T>
                              </div>
                            </article>
                          ))}
                      </T>{" "}
                      <T>
                        {!op.deliveries.some((o) => o.customer === c.name) && (
                          <EmptyState
                            icon={ShoppingBag}
                            title="Your next order is waiting to happen."
                            description="Explore the demo shop and place a local sample order using this customer’s name."
                          >
                            <Button href={`/shop/${store.workspace?.slug||""}`}>
                              <T>Explore the shop</T>
                            </Button>
                          </EmptyState>
                        )}
                      </T>
                    </div>
                  ) : tab === "Invoices" ? (
                    <div className="portal-records">
                      <T>
                        {op.documents
                          .filter(
                            (d) =>
                              d.customer === c.name && d.kind === "Invoice",
                          )
                          .map((d) => (
                            <article key={d.id}>
                              <div>
                                <h3>
                                  <T>Invoice #</T> <T>{Math.abs(d.id)}</T>
                                </h3>
                                <Badge>
                                  <T>{d.status}</T>
                                </Badge>
                              </div>
                              <p>
                                <T>Due</T> <T>{d.due}</T> <T>·</T>{" "}
                                <T>{d.lines.length}</T> <T>products</T>
                              </p>
                              <strong>
                                <T>{cash(d.total)}</T>
                              </strong>
                              <p className="quiet-note">
                                <T>UI preview, not an official tax document.</T>
                              </p>
                            </article>
                          ))}
                      </T>{" "}
                      <T>
                        {!op.documents.some(
                          (d) => d.customer === c.name && d.kind === "Invoice",
                        ) && (
                          <EmptyState
                            title="A clear page for your invoices."
                            description="Invoices prepared for this sample customer appear here."
                          />
                        )}
                      </T>
                    </div>
                  ) : (
                    <div className="portal-records">
                      <T>
                        {op.rewards
                          .filter((r) => r.customer === c.name)
                          .map((r) => (
                            <article key={r.id}>
                              <div>
                                <h3>
                                  <T>{r.reason}</T>
                                </h3>
                                <strong>
                                  <T>{r.points > 0 ? "+" : ""}</T>{" "}
                                  <T>{r.points}</T> <T>points</T>
                                </strong>
                              </div>
                              <p>
                                <T>{r.date}</T>
                              </p>
                            </article>
                          ))}
                      </T>{" "}
                      <T>
                        {!op.rewards.some((r) => r.customer === c.name) && (
                          <EmptyState
                            icon={Gift}
                            title="Little rewards, still to come."
                            description="Points from this customer’s demo purchases appear here."
                          />
                        )}
                      </T>
                    </div>
                  )}
                </T>
              </ToolPanel>
              <p className="portal-disclosure">
                <T>
                  This view displays local sample records. No authenticated
                  account, secure sharing link or live payment service is
                  active.
                </T>
              </p>
            </>
          )}
        </T>
      </main>
    </div>
  );
}
function WalletIcon() {
  return <ShoppingBag size={22} />;
}
