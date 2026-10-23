"use client";
import { T, LocalButton, LocalInput } from "@/components/locale";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Check,
  CreditCard,
  FileText,
  Minus,
  Pause,
  Plus,
  Printer,
  RotateCcw,
  ScanLine,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
  ProductArt,
  SearchField,
  SelectField,
  Tabs,
} from "@/components/ui";
import {
  available,
  barcode,
  cash,
  eanBars,
  localDate,
  minor,
  pricedLines,
  type DetailedReceipt,
  type Document as ShopDocument,
  type Payment,
} from "@/lib/operations";
import { useOperations, ToolPanel, OperationError } from "./common";

export function BarcodeArt({ code }: { code: string }) {
  const bars = eanBars(code);
  return (
    <div className="barcode-art">
      <svg
        viewBox="0 0 115 55"
        role="img"
        aria-label={`EAN-13 barcode ${code}`}
      >
        <T>
          {[...bars].map((b, i) =>
            b === "1" ? (
              <rect
                key={i}
                x={i + 10}
                y={2}
                width={1}
                height={i < 3 || i > 91 || (i >= 45 && i <= 49) ? 43 : 38}
                fill="currentColor"
              />
            ) : null,
          )}
        </T>
      </svg>
      <span>
        <T>{code}</T>
      </span>
    </div>
  );
}
export function DetailedReceiptView({ receipt }: { receipt: DetailedReceipt }) {
  return (
    <div className="document-preview">
      <div className="document-brand">
        <T>Biashara</T>
        <span>
          <T>OS</T>
        </span>
        <Badge>
          <T>Recorded receipt</T>
        </Badge>
      </div>
      <h2>
        <T>{`Receipt #${receipt.id}`}</T>
      </h2>
      <p>
        <T>{receipt.customer}</T> <T>·</T> <T>{receipt.date}</T>
      </p>

      <T>
        {receipt.lines.map((l) => (
          <div className="document-line" key={l.productId}>
            <span>
              <T>{l.name}</T>
              <small>
                <T>{l.quantity}</T> <T>×</T> <T>{cash(l.unit)}</T>
              </small>
            </span>
            <strong>
              <T>{cash(l.net)}</T>
            </strong>
          </div>
        ))}
      </T>

      {receipt.deliveryFee ? (
        <div className="document-line">
          <span>
            <T>Delivery fee</T>
          </span>
          <strong>{cash(receipt.deliveryFee)}</strong>
        </div>
      ) : null}
      <div className="document-total">
        <span>
          <T>Total paid locally</T>
        </span>
        <strong>
          <T>{cash(receipt.total)}</T>
        </strong>
      </div>
      <div className="receipt-payments">
        <T>
          {receipt.payments.map((p, i) => (
            <div key={i}>
              <span>
                <T>{p.method}</T>
              </span>
              <strong>
                <T>{cash(p.amount)}</T>
              </strong>
            </div>
          ))}
        </T>
      </div>
      <p className="quiet-note">
        <T>Discount and rewards:</T> <T>{cash(receipt.discount)}</T> <T>·</T>{" "}
        <T>{receipt.earned}</T> <T>points earned ·</T> <T>{receipt.redeemed}</T>{" "}
        <T>redeemed</T>
      </p>
      <p className="quiet-note">
        <T>UI preview. Payment was recorded manually.</T>
      </p>
      <Button variant="secondary" icon={Printer} onClick={() => window.print()}>
        <T>Print / save PDF</T>
      </Button>
    </div>
  );
}
export function AdvancedCheckout({
  splitByDefault = false,
}: {
  splitByDefault?: boolean;
}) {
  const { state, op, act, error } = useOperations();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [method, setMethod] = useState("M-Pesa");
  const [split, setSplit] = useState(splitByDefault);
  const [portions, setPortions] = useState<Record<string, string>>({});
  const [discountOpen, setDiscountOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [receipt, setReceipt] = useState<number | null>(null);
  const [scanCode, setScanCode] = useState("");
  let price: {
    lines: DetailedReceipt["lines"];
    total: number;
    discount: number;
  };
  try {
    price = pricedLines(
      state,
      op.cart,
      op.discount,
      op.discountKind,
      op.redeem,
      op.promotion,
    );
  } catch {
    price = { lines: [], total: 0, discount: 0 };
  }
  const products = state.products.filter(
    (p) =>
      (p.name + " " + p.sku + " " + (p.barcode ?? barcode(p.id)))
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All" || p.category === category),
  );
  const payValue = (m: string) =>
    portions[m] ?? (m === method ? String(price.total / 100) : "0");
  async function pay() {
    try {
      const payments: Payment[] = split
        ? ["M-Pesa", "Cash", "Card"].map((m) => ({
            method: m,
            amount: minor(payValue(m)),
          }))
        : [{ method, amount: price.total }];
      const result = await act({ type: "checkout", payments });
      if (result) {
        setReceipt(result.id!);
        setPortions({});
      }
    } catch {
      await act({ type: "checkout", payments: [{ method, amount: -1 }] });
    }
  }
  async function scan(e?: FormEvent) {
    e?.preventDefault();
    const p = state.products.find(
      (p) =>
        (p.barcode ?? barcode(p.id)) === scanCode.trim() ||
        p.sku.toLowerCase() === scanCode.trim().toLowerCase(),
    );
    if (!p) {
      setQuery(scanCode);
      return;
    }
    if (await act({ type: "cart", id: p.id, quantity: (op.cart[p.id] ?? 0) + 1 })) {
      setQuery("");
      setScanOpen(false);
    }
  }
  return (
    <>
      <OperationError message={error} />
      <div className="checkout-tools">
        <Button
          variant="secondary"
          icon={ScanLine}
          onClick={() => setScanOpen(true)}
        >
          <T>Scan barcode</T>
        </Button>
        <Button
          variant="secondary"
          icon={Pause}
          disabled={!price.lines.length}
          onClick={() => setHoldOpen(true)}
        >
          <T>Hold sale</T>
        </Button>
        <Button variant="secondary" onClick={() => setDiscountOpen(true)}>
          <T>Discounts & rewards</T>
        </Button>
        <Link href="/dashboard/baskets">
          <T>{op.held.length}</T> <T>held baskets</T>
        </Link>
        <Badge tone="blue">
          <T>{op.branches.find((b) => b.id === op.activeBranch)?.name}</T>
        </Badge>
      </div>
      <div className="pos-layout">
        <section className="panel pos-catalog">
          <div className="pos-search">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Find a product or SKU…"
            />
            <Tabs
              items={["All", "Food", "Drinks", "Household", "Bundles"]}
              value={category}
              onChange={setCategory}
            />
          </div>
          <div className="product-grid">
            <T>
              {products.map((p) => {
                const stock = available(state, p.id);
                return (
                  <LocalButton
                    className={`product-card ${!stock ? "unavailable" : ""}`}
                    key={p.id}
                    disabled={!stock}
                    onClick={async () =>
                      await act(
                        {
                          type: "cart",
                          id: p.id,
                          quantity: (op.cart[p.id] ?? 0) + 1,
                        },
                        true,
                      )
                    }
                    aria-label={`Add ${p.name} to sale`}
                  >
                    <div className="product-image">
                      <ProductArt art={p.art} name={p.name} />

                      <T>
                        {op.cart[p.id] > 0 && (
                          <span className="product-cart-count">
                            <T>{op.cart[p.id]}</T>
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
                        <T>{cash(Math.round(p.price * 100))}</T>
                      </strong>
                      <span className="product-add">
                        <Plus size={16} />
                      </span>
                    </div>
                    <small className={stock ? "text-green" : "text-red"}>
                      <T>{stock ? `${stock} available` : "Unavailable"}</T>{" "}
                      <T>{p.components ? " · Bundle" : ""}</T>
                    </small>
                  </LocalButton>
                );
              })}
            </T>
          </div>

          <T>
            {!products.length && (
              <EmptyState
                title="No products found"
                description="Try a name, SKU or barcode."
              />
            )}
          </T>
        </section>
        <aside className="panel cart-panel">
          <div className="panel-heading">
            <h2>
              <T>Your sale</T>
              <Badge tone="gray">
                <T>{price.lines.reduce((s, l) => s + l.quantity, 0)}</T>{" "}
                <T>items</T>
              </Badge>
            </h2>
            <LocalButton
              className="text-button"
              onClick={async () => await act({ type: "clearCart" }, true)}
            >
              <T>Clear</T>
            </LocalButton>
          </div>
          <SelectField
            label="Customer"
            value={op.customer}
            onChange={async (customer) =>
              await act({ type: "basket", customer, redeem: 0 }, true)
            }
          >
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
              {!price.lines.length ? (
                <EmptyState
                  icon={ShoppingBag}
                  title="A little room for good things."
                  description="Choose a product to start your sale."
                />
              ) : (
                price.lines.map((l) => (
                  <div className="cart-line" key={l.productId}>
                    <ProductArt
                      art={
                        state.products.find((p) => p.id === l.productId)?.art ??
                        0
                      }
                      name={l.name}
                      small
                    />
                    <div>
                      <strong>
                        <T>{l.name}</T>
                      </strong>
                      <small>
                        <T>{cash(l.unit)}</T> <T>each</T>
                      </small>
                      <div className="quantity-control">
                        <LocalButton
                          aria-label={`Remove one ${l.name}`}
                          onClick={async () =>
                            await act(
                              {
                                type: "cart",
                                id: l.productId,
                                quantity: l.quantity - 1,
                              },
                              true,
                            )
                          }
                        >
                          <Minus size={13} />
                        </LocalButton>
                        <span>
                          <T>{l.quantity}</T>
                        </span>
                        <LocalButton
                          aria-label={`Add one ${l.name}`}
                          onClick={async () =>
                            await act(
                              {
                                type: "cart",
                                id: l.productId,
                                quantity: l.quantity + 1,
                              },
                              true,
                            )
                          }
                        >
                          <Plus size={13} />
                        </LocalButton>
                      </div>
                    </div>
                    <strong>
                      <T>{cash(l.net)}</T>
                    </strong>
                  </div>
                ))
              )}
            </T>
          </div>
          <div className="cart-summary">
            <div>
              <span>
                <T>Discounts & rewards</T>
              </span>
              <strong>
                <T>−</T> <T>{cash(price.discount)}</T>
              </strong>
            </div>
            <div className="cart-total">
              <span>
                <T>Total</T>
              </span>
              <strong>
                <T>{cash(price.total)}</T>
              </strong>
            </div>
          </div>
          <div className="payment-methods">
            <T>
              {["M-Pesa", "Cash", "Card"].map((m) => (
                <LocalButton
                  aria-pressed={method === m && !split}
                  className={method === m && !split ? "active" : ""}
                  key={m}
                  onClick={() => {
                    setMethod(m);
                    setSplit(false);
                    setPortions({});
                  }}
                >
                  <T>
                    {m === "Cash" ? (
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
          <label className="checkbox-label">
            <LocalInput
              type="checkbox"
              checked={split}
              onChange={(e) => {
                setSplit(e.target.checked);
                setPortions({});
              }}
            />
            <T>Split payment across methods</T>
          </label>

          <T>
            {split && (
              <div className="split-payments">
                <T>
                  {["M-Pesa", "Cash", "Card"].map((m) => (
                    <Field
                      key={m}
                      label={`${m} portion (KES)`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={payValue(m)}
                      onChange={(e) =>
                        setPortions({ ...portions, [m]: e.target.value })
                      }
                    />
                  ))}
                </T>

                <p className="quiet-note">
                  <T>Payment portions must equal</T> <T>{cash(price.total)}</T>{" "}
                  <T>exactly.</T>
                </p>
              </div>
            )}
          </T>

          <Button disabled={!price.lines.length} onClick={pay} arrow>
            <T>Record received payment</T>
          </Button>
          <div className="document-shortcuts">
            <LocalButton
              onClick={async () =>
                await act({ type: "document", kind: "Quotation", due: localDate() })
              }
            >
              <T>Save quotation</T>
            </LocalButton>
            <LocalButton
              onClick={async () =>
                await act({ type: "document", kind: "Invoice", due: localDate() })
              }
            >
              <T>Save invoice</T>
            </LocalButton>
          </div>
          <p className="quiet-note centered">
            <T>No payment request is sent. Sample stock will update.</T>
          </p>
        </aside>
      </div>
      <Modal
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        title="A little thank-you at checkout."
        description="Review a discount, promotion or customer reward."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await act({
                type: "basket",
                discountKind: String(f.get("kind")) as "percent" | "fixed",
                discount:
                  String(f.get("kind")) === "percent"
                    ? Number(f.get("discount"))
                    : minor(String(f.get("discount"))),
                promotion: String(f.get("promotion")),
                redeem: Number(f.get("redeem")),
              })
            )
              setDiscountOpen(false);
          }}
        >
          <div className="form-grid">
            <SelectField
              label="Discount type"
              name="kind"
              defaultValue={op.discountKind}
            >
              <option value="percent">
                <T>Percentage</T>
              </option>
              <option value="fixed">
                <T>Amount (KES)</T>
              </option>
            </SelectField>
            <Field
              label="Discount value"
              name="discount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={
                op.discountKind === "fixed" ? op.discount / 100 : op.discount
              }
            />
          </div>
          <SelectField
            label="Promotion (replaces manual discount)"
            name="promotion"
            defaultValue={op.promotion}
          >
            <option value="">
              <T>No promotion</T>
            </option>

            <T>
              {op.promotions.map((p) => (
                <option key={p.id} value={p.id}>
                  <T>{p.name}</T> <T>·</T> <T>{p.percent}</T> <T>% · Ends</T>{" "}
                  <T>{p.ends}</T>
                </option>
              ))}
            </T>
          </SelectField>
          <Field
            label={`Reward points to redeem (${op.loyalty[op.customer] ?? 0} available)`}
            name="redeem"
            type="number"
            min={0}
            defaultValue={op.redeem}
            hint="1 point = KES 1. Select a named customer to use rewards."
          />
          <div className="modal-actions">
            <Button type="submit">
              <T>Apply to basket</T>
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={holdOpen}
        onClose={() => setHoldOpen(false)}
        title="Save a little space for later."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await act({
                type: "hold",
                name: String(new FormData(e.currentTarget).get("name")),
              })
            )
              setHoldOpen(false);
          }}
        >
          <Field
            label="Basket name"
            name="name"
            placeholder="e.g. Ann’s afternoon order"
            required
          />
          <div className="modal-actions">
            <Button type="submit">
              <T>Hold this sale</T>
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        title="Find it in a little flash."
        description="Sample scanner UI. Camera decoding is not connected."
      >
        <div className="scanner-window">
          <ScanLine size={56} />
          <span>
            <T>Place a barcode inside the frame</T>
          </span>
          <Badge tone="white">
            <T>Camera preview</T>
          </Badge>
        </div>
        <form onSubmit={scan}>
          <Field
            label="Barcode or SKU"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder={barcode(1)}
          />
          <div className="button-row">
            <Button type="submit">
              <T>Find & add product</T>
            </Button>
            <Button variant="secondary" onClick={() => setScanCode(barcode(1))}>
              <T>Use sample code</T>
            </Button>
          </div>

          <T>
            {query && scanOpen && (
              <p className="operation-error">
                <T>No matching barcode. Try a SKU or use product search.</T>
              </p>
            )}
          </T>
        </form>
      </Modal>
      <Modal
        open={receipt !== null}
        onClose={() => setReceipt(null)}
        title="A sale worth keeping."
        description="Recorded receipt · no payment request was sent."
      >
        <T>
          {op.receipts.find((r) => r.id === receipt) && (
            <DetailedReceiptView
              receipt={op.receipts.find((r) => r.id === receipt)!}
            />
          )}
        </T>
      </Modal>
    </>
  );
}

export function ScannerTool() {
  const { state, op, act, error } = useOperations();
  const [code, setCode] = useState("");
  const [found, setFound] = useState<number | null>(null);
  const [missing, setMissing] = useState(false);
  const [edit, setEdit] = useState<number | null>(null);
  function find(e: FormEvent) {
    e.preventDefault();
    const p = state.products.find(
      (p) =>
        (p.barcode ?? barcode(p.id)) === code.trim() ||
        p.sku.toLowerCase() === code.trim().toLowerCase(),
    );
    setFound(p?.id ?? null);
    setMissing(!p);
  }
  return (
    <>
      <OperationError message={error} />
      <div className="tool-two-columns">
        <ToolPanel
          title="Find a familiar product"
          description="Enter a barcode, use a keyboard scanner, or try the sample scan."
        >
          <div className="scanner-window">
            <ScanLine size={64} />
            <strong>
              <T>Ready for your next product.</T>
            </strong>
            <span>
              <T>Camera decoding is a planned integration.</T>
            </span>
          </div>
          <form onSubmit={find}>
            <Field
              label="Barcode or SKU"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={barcode(1)}
              required
            />
            <div className="button-row">
              <Button type="submit">
                <T>Find product</T>
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setCode(barcode(1));
                  setFound(1);
                  setMissing(false);
                }}
              >
                <T>Sample scan</T>
              </Button>
            </div>
          </form>
          <T>
            {missing && (
              <div className="operation-error">
                <T>
                  No product matches this code. Try a SKU or search your
                  catalogue.
                </T>
              </div>
            )}
          </T>{" "}
          <T>
            {found !== null &&
              (() => {
                const p = state.products.find((p) => p.id === found)!;
                return (
                  <div className="scan-result">
                    <ProductArt art={p.art} name={p.name} />
                    <div>
                      <h3>
                        <T>{p.name}</T>
                      </h3>
                      <p>
                        <T>{p.size}</T> <T>·</T> <T>{cash(p.price * 100)}</T>
                      </p>
                      <Badge>
                        <T>{available(state, p.id)}</T> <T>available</T>
                      </Badge>
                    </div>
                    <Button
                      disabled={!available(state, p.id)}
                      onClick={async () =>
                        await act({
                          type: "cart",
                          id: p.id,
                          quantity: (op.cart[p.id] ?? 0) + 1,
                        })
                      }
                    >
                      <T>Add to basket</T>
                    </Button>
                  </div>
                );
              })()}
          </T>
          <Link href="/dashboard/sales/new" className="text-link">
            <T>Continue to checkout →</T>
          </Link>
        </ToolPanel>
        <ToolPanel
          title="A label for every shelf"
          description="EAN-13 codes with check digits. Print or save the label sheet as PDF."
        >
          <div className="barcode-labels">
            <T>
              {state.products.map((p) => (
                <div className="barcode-label" key={p.id}>
                  <strong>
                    <T>{p.name}</T>
                  </strong>
                  <span>
                    <T>{p.size}</T> <T>·</T> <T>{cash(p.price * 100)}</T>
                  </span>
                  <BarcodeArt code={p.barcode ?? barcode(p.id)} />
                  <LocalButton
                    className="text-button no-print"
                    onClick={() => setEdit(p.id)}
                  >
                    <T>Edit barcode</T>
                  </LocalButton>
                </div>
              ))}
            </T>
          </div>
          <Button
            icon={Printer}
            variant="secondary"
            onClick={() => window.print()}
          >
            <T>Print labels / save PDF</T>
          </Button>
        </ToolPanel>
      </div>
      <Modal
        open={edit !== null}
        onClose={() => setEdit(null)}
        title="Keep your labels clear."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              edit !== null &&
              await act({
                type: "barcode",
                id: edit,
                code: String(new FormData(e.currentTarget).get("barcode")),
              })
            )
              setEdit(null);
          }}
        >
          <Field
            label="EAN-13 barcode"
            name="barcode"
            pattern="[0-9]{13}"
            required
            defaultValue={
              edit === null
                ? ""
                : (state.products.find((p) => p.id === edit)?.barcode ??
                  barcode(edit))
            }
            hint="13 digits, including a valid check digit. Codes must be unique."
          />
          <div className="modal-actions">
            <Button type="submit">
              <T>Save barcode</T>
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
export function BasketsTool() {
  const { op, act, error } = useOperations();
  return (
    <>
      <OperationError message={error} />
      <div className="record-grid">
        <T>
          {op.held
            .filter((b) => (b.branch ?? "main") === op.activeBranch)
            .map((b) => (
              <ToolPanel
                key={b.id}
                title={b.name}
                description={`${b.customer} · ${Object.values(b.cart).reduce((s, n) => s + n, 0)} items`}
              >
                <Badge tone="amber">
                  <T>Held · stock unchanged</T>
                </Badge>
                <p className="quiet-note">
                  <T>Discount:</T>{" "}
                  <T>
                    {b.discountKind === "percent"
                      ? `${b.discount}%`
                      : cash(b.discount)}
                  </T>{" "}
                  <T>·</T> <T>{b.redeem}</T> <T>reward points</T>
                </p>
                <div className="button-row">
                  <Button onClick={async () => await act({ type: "resume", id: b.id })}>
                    <T>Resume basket</T>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => await act({ type: "discard", id: b.id })}
                  >
                    <T>Discard</T>
                  </Button>
                </div>
              </ToolPanel>
            ))}
        </T>
      </div>
      <T>
        {!op.held.some((b) => (b.branch ?? "main") === op.activeBranch) && (
          <ToolPanel>
            <EmptyState
              icon={Pause}
              title="A little room for later."
              description="Hold a basket at checkout and it will be waiting here."
            >
              <Button href="/dashboard/sales/new" arrow>
                <T>Start a sale</T>
              </Button>
            </EmptyState>
          </ToolPanel>
        )}
      </T>{" "}
      <T>
        {op.cart && Object.values(op.cart).some((n) => n > 0) && (
          <div className="inline-note">
            <T>
              You have a current checkout basket. Hold or clear it before
              resuming another.
            </T>{" "}
            <T> </T>
            <Link href="/dashboard/sales/new">
              <T>Open checkout →</T>
            </Link>
          </div>
        )}
      </T>
    </>
  );
}
export function PromotionsTool() {
  const { state, op, act, error } = useOperations();
  return (
    <>
      <OperationError message={error} />
      <div className="tool-two-columns">
        <ToolPanel title="A little offer, thoughtfully made.">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (
                await act({
                  type: "promotion",
                  name: String(f.get("name")),
                  percent: Number(f.get("percent")),
                  ends: String(f.get("ends")),
                  productId:
                    f.get("product") === "all"
                      ? null
                      : Number(f.get("product")),
                })
              )
                e.currentTarget.reset();
            }}
          >
            <Field
              label="Offer name"
              name="name"
              placeholder="e.g. Friday favourites"
              required
            />
            <div className="form-grid">
              <Field
                label="Percentage off"
                name="percent"
                type="number"
                min={1}
                max={100}
                required
              />
              <Field
                label="Offer ends"
                name="ends"
                type="date"
                min={localDate()}
                defaultValue={localDate()}
                required
              />
            </div>
            <SelectField label="Eligible products" name="product">
              <option value="all">
                <T>All products</T>
              </option>

              <T>
                {state.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    <T>{p.name}</T> <T>·</T> <T>{p.size}</T>
                  </option>
                ))}
              </T>
            </SelectField>
            <Button type="submit">
              <T>Create promotion</T>
            </Button>
          </form>
        </ToolPanel>
        <ToolPanel title="Good reasons to return.">
          <T>
            {op.promotions.map((p) => (
              <div className="offer-card" key={p.id}>
                <span className="offer-percent">
                  <T>{p.percent}</T>
                  <small>
                    <T>%</T>
                  </small>
                </span>
                <div>
                  <h3>
                    <T>{p.name}</T>
                  </h3>
                  <p>
                    <T>Ends</T> <T>{p.ends}</T> <T>·</T>{" "}
                    <T>
                      {p.productId === null
                        ? "All products"
                        : state.products.find((x) => x.id === p.productId)
                            ?.name}
                    </T>
                  </p>
                  <Badge tone={p.ends >= localDate() ? "green" : "gray"}>
                    <T>{p.ends >= localDate() ? "Available" : "Expired"}</T>
                  </Badge>
                </div>
                <Button href="/dashboard/sales/new" variant="ghost">
                  <T>Try at checkout</T>
                </Button>
              </div>
            ))}
          </T>
        </ToolPanel>
      </div>
    </>
  );
}
export function ReturnsTool() {
  const { state, op, act, error } = useOperations();
  const [selected, setSelected] = useState<number>(op.receipts[0]?.id ?? 0);
  const [product, setProduct] = useState<number>(
    op.receipts[0]?.lines[0]?.productId ?? 1,
  );
  const receipt = op.receipts.find((r) => r.id === selected);
  return (
    <>
      <OperationError message={error} />
      <div className="tool-two-columns">
        <ToolPanel
          title="Start with the original receipt"
          description="Detailed receipts support item-level returns."
        >
          <SelectField
            label="Receipt"
            value={String(selected)}
            onChange={(v) => {
              setSelected(+v);
              setProduct(
                op.receipts.find((r) => r.id === +v)?.lines[0]?.productId ?? 1,
              );
            }}
          >
            <T>
              {op.receipts.map((r) => (
                <option key={r.id} value={r.id}>
                  <T>#</T> <T>{r.id}</T> <T>·</T> <T>{r.customer}</T> <T>·</T>{" "}
                  <T>{cash(r.total)}</T>
                </option>
              ))}
            </T>
          </SelectField>

          <T>
            {receipt && (
              <>
                <div className="return-lines">
                  <T>
                    {receipt.lines.map((l) => (
                      <LocalButton
                        key={l.productId}
                        className={product === l.productId ? "selected" : ""}
                        onClick={() => setProduct(l.productId)}
                      >
                        <RotateCcw size={18} />
                        <span>
                          <strong>
                            <T>{l.name}</T>
                          </strong>
                          <small>
                            <T>
                              {l.quantity -
                                (receipt.returned[l.productId] ?? 0)}
                            </T>{" "}
                            <T>eligible ·</T> <T>{cash(l.net)}</T>{" "}
                            <T>originally paid</T>
                          </small>
                        </span>
                        <Check size={17} />
                      </LocalButton>
                    ))}
                  </T>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    await act({
                      type: "return",
                      id: receipt.id,
                      productId: product,
                      quantity: Number(f.get("quantity")),
                      reason: String(f.get("reason")),
                      restock: f.get("restock") === "on",
                    });
                  }}
                >
                  <Field
                    label="Quantity to return"
                    type="number"
                    min={1}
                    max={
                      (receipt.lines.find((l) => l.productId === product)
                        ?.quantity ?? 0) - (receipt.returned[product] ?? 0)
                    }
                    name="quantity"
                    defaultValue={1}
                    required
                  />
                  <Field
                    label="Reason for return"
                    name="reason"
                    placeholder="e.g. Unopened item no longer needed"
                    required
                  />
                  <label className="checkbox-label">
                    <LocalInput type="checkbox" name="restock" defaultChecked />
                    <T>Return these undamaged goods to sellable stock</T>
                  </label>
                  <Button type="submit">
                    <T>Record refund given</T>
                  </Button>
                  <p className="quiet-note">
                    <T>
                      Refunds use the original net price and payment methods. No
                      money is sent.
                    </T>
                  </p>
                </form>
              </>
            )}
          </T>

          <details className="legacy-note">
            <summary>
              <T>Why are some older receipts missing?</T>
            </summary>
            <p>
              <T>
                {
                  state.sales.filter(
                    (s) => !op.receipts.some((r) => r.id === s.id),
                  ).length
                }
              </T>{" "}
              <T>
                legacy receipts contain totals without line details. They remain
                in Sales; their item quantities cannot be safely reconstructed
                for returns.
              </T>
            </p>
          </details>
        </ToolPanel>
        <ToolPanel title="A clear return history">
          <T>
            {op.returns.length ? (
              op.returns.map((r) => (
                <div className="activity-card" key={r.id}>
                  <span className="icon-box tone-red">
                    <RotateCcw size={19} />
                  </span>
                  <div>
                    <strong>
                      <T>Receipt #</T> <T>{r.saleId}</T> <T>·</T>{" "}
                      <T>{cash(r.amount)}</T>
                    </strong>
                    <p>
                      <T>{r.quantity}</T> <T>×</T>{" "}
                      <T>
                        {state.products.find((p) => p.id === r.productId)?.name}
                      </T>{" "}
                      <T>·</T>{" "}
                      <T>{r.restock ? "Restocked" : "Not restocked"}</T>
                    </p>
                    <small>
                      <T>{r.reason}</T> <T>·</T> <T>{r.date}</T>
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={RotateCcw}
                title="A fresh page for returns."
                description="Recorded demo returns will appear here with their original receipt."
              />
            )}
          </T>
        </ToolPanel>
      </div>
    </>
  );
}
export function DocumentsTool() {
  const { op, act, error } = useOperations();
  const [kind, setKind] = useState("All documents");
  const [selected, setSelected] = useState<number | null>(null);
  const doc = op.documents.find((d) => d.id === selected);
  return (
    <>
      <OperationError message={error} />
      <ToolPanel
        title="Every agreement, a little clearer."
        action={
          <Button href="/dashboard/sales/new" icon={Plus}>
            <T>Create from a basket</T>
          </Button>
        }
      >
        <Tabs
          items={["All documents", "Quotation", "Invoice"]}
          value={kind}
          onChange={setKind}
        />
        <div className="document-list">
          <T>
            {op.documents
              .filter(
                (d) =>
                  d.branch === op.activeBranch &&
                  (kind === "All documents" || d.kind === kind),
              )
              .map((d) => (
                <LocalButton key={d.id} onClick={() => setSelected(d.id)}>
                  <span className="icon-box tone-blue">
                    <FileText size={20} />
                  </span>
                  <div>
                    <strong>
                      <T>{d.kind}</T> <T>#</T> <T>{Math.abs(d.id)}</T>
                    </strong>
                    <small>
                      <T>{d.customer}</T> <T>· Due</T> <T>{d.due}</T>
                    </small>
                  </div>
                  <Badge tone={d.status === "Paid locally" ? "green" : "amber"}>
                    <T>{d.status}</T>
                  </Badge>
                  <strong>
                    <T>{cash(d.total)}</T>
                  </strong>
                </LocalButton>
              ))}
          </T>
        </div>

        <T>
          {!op.documents.some((d) => d.branch === op.activeBranch) && (
            <EmptyState
              icon={FileText}
              title="Your next agreement starts here."
              description="Choose a named customer and products at checkout, then save a quotation or invoice."
            />
          )}
        </T>
      </ToolPanel>
      <Modal
        open={!!doc}
        onClose={() => setSelected(null)}
        title={doc ? `${doc.kind} #${Math.abs(doc.id)}` : "Document"}
        wide
      >
        <T>
          {doc && (
            <>
              <InvoicePreview doc={doc} />
              <div className="button-row no-print">
                <Button
                  variant="secondary"
                  icon={Printer}
                  onClick={() => window.print()}
                >
                  <T>Print / save PDF</T>
                </Button>
                <T>
                  {doc.kind === "Quotation" && (
                    <Button
                      onClick={async () =>
                        await act({ type: "convertDocument", id: doc.id })
                      }
                    >
                      <T>Convert to invoice</T>
                    </Button>
                  )}
                </T>{" "}
                <T>
                  {doc.status === "Draft" && (
                    <Button
                      variant="secondary"
                      onClick={async () => await act({ type: "issueDocument", id: doc.id })}
                    >
                      <T>Mark issued locally</T>
                    </Button>
                  )}
                </T>{" "}
                <T>
                  {doc.kind === "Invoice" && doc.status !== "Paid locally" && (
                    <Button
                      onClick={async () => await act({ type: "payDocument", id: doc.id })}
                    >
                      <T>Record cash received</T>
                    </Button>
                  )}
                </T>
              </div>
              <p className="quiet-note">
                <T>
                  No invoice is emailed, no payment is collected, and this is
                  not an official tax document.
                </T>
              </p>
            </>
          )}
        </T>
      </Modal>
    </>
  );
}
function InvoicePreview({ doc }: { doc: ShopDocument }) {
  return (
    <div className="document-preview">
      <div className="document-brand">
        <T>Biashara</T>
        <span>
          <T>OS</T>
        </span>
        <Badge tone="amber">
          <T>UI preview</T>
        </Badge>
      </div>
      <h2>
        <T>{doc.kind}</T> <T>#</T> <T>{Math.abs(doc.id)}</T>
      </h2>
      <p>
        <T>Prepared for</T> <T>{doc.customer}</T> <T>· Due</T> <T>{doc.due}</T>
      </p>

      <T>
        {doc.lines.map((l) => (
          <div className="document-line" key={l.productId}>
            <span>
              <T>{l.name}</T>
              <small>
                <T>{l.quantity}</T> <T>×</T> <T>{cash(l.unit)}</T>
              </small>
            </span>
            <strong>
              <T>{cash(l.net)}</T>
            </strong>
          </div>
        ))}
      </T>

      <div className="document-total">
        <span>
          <T>Total</T>
        </span>
        <strong>
          <T>{cash(doc.total)}</T>
        </strong>
      </div>
      <Badge tone={doc.status === "Paid locally" ? "green" : "amber"}>
        <T>{doc.status}</T>
      </Badge>

      <T>
        {doc.saleId && (
          <p>
            <T>Linked receipt #</T> <T>{doc.saleId}</T>
          </p>
        )}
      </T>
    </div>
  );
}
export function RegisterTool() {
  const { op, act, error } = useOperations();
  const current = op.registers.find(
    (r) => r.branch === op.activeBranch && r.status === "Open",
  );
  const [flow, setFlow] = useState("Cash in");
  return (
    <>
      <OperationError message={error} />
      <div className="tool-two-columns">
        <ToolPanel
          title={
            current
              ? "Your register is open."
              : "A clear beginning for the day."
          }
        >
          <T>
            {!current ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await act({
                    type: "openRegister",
                    amount: minor(
                      String(new FormData(e.currentTarget).get("amount")),
                    ),
                  });
                }}
              >
                <Field
                  label="Opening float (KES)"
                  name="amount"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={1000}
                  required
                />
                <Button type="submit">
                  <T>Open register</T>
                </Button>
              </form>
            ) : (
              <>
                <div className="register-expected">
                  <span>
                    <T>EXPECTED CASH IN DRAWER</T>
                  </span>
                  <strong>
                    <T>
                      {cash(
                        current.opening +
                          current.entries.reduce((s, e) => s + e.amount, 0),
                      )}
                    </T>
                  </strong>
                  <small>
                    <T>Opening float:</T> <T>{cash(current.opening)}</T>
                  </small>
                </div>
                <Tabs
                  items={["Cash in", "Cash out"]}
                  value={flow}
                  onChange={setFlow}
                />
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    if (
                      await act({
                        type: "cashEntry",
                        amount:
                          minor(String(f.get("amount"))) *
                          (flow === "Cash out" ? -1 : 1),
                        label: String(f.get("reason")),
                      })
                    )
                      e.currentTarget.reset();
                  }}
                >
                  <Field
                    label="Amount (KES)"
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                  />
                  <Field
                    label="Reason"
                    name="reason"
                    placeholder="e.g. Change added to the drawer"
                    required
                  />
                  <Button type="submit" variant="secondary">
                    <T>Record</T> <T>{flow.toLowerCase()}</T>
                  </Button>
                </form>
                <div className="section-divider" />
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await act({
                      type: "closeRegister",
                      amount: minor(
                        String(new FormData(e.currentTarget).get("counted")),
                      ),
                    });
                  }}
                >
                  <Field
                    label="Cash counted at closing (KES)"
                    name="counted"
                    type="number"
                    min={0}
                    step="0.01"
                    required
                  />
                  <Button type="submit">
                    <T>Close & reconcile register</T>
                  </Button>
                </form>
              </>
            )}
          </T>
        </ToolPanel>
        <ToolPanel title="The day, in clear records.">
          <T>
            {op.registers
              .filter((r) => r.branch === op.activeBranch)
              .map((r) => (
                <div className="register-session" key={r.id}>
                  <div>
                    <h3>
                      <T>Session #</T> <T>{r.id}</T>
                    </h3>
                    <Badge tone={r.status === "Open" ? "green" : "gray"}>
                      <T>{r.status}</T>
                    </Badge>
                  </div>
                  <p>
                    <T>Opening</T> <T>{cash(r.opening)}</T>{" "}
                    <T>
                      {r.expected !== undefined
                        ? ` · Expected ${cash(r.expected)} · Counted ${cash(r.counted ?? 0)}`
                        : ""}
                    </T>
                  </p>
                  <T>
                    {r.status === "Closed" && (
                      <Badge
                        tone={r.counted === r.expected ? "green" : "amber"}
                      >
                        <T>Variance</T>{" "}
                        <T>{cash((r.counted ?? 0) - (r.expected ?? 0))}</T>
                      </Badge>
                    )}
                  </T>{" "}
                  <T>
                    {r.entries.map((entry, i) => (
                      <div className="cash-ledger-row" key={i}>
                        <span>
                          <T>{entry.label}</T>
                        </span>
                        <strong
                          className={
                            entry.amount < 0 ? "text-red" : "text-green"
                          }
                        >
                          <T>{entry.amount > 0 ? "+" : ""}</T>{" "}
                          <T>{cash(entry.amount)}</T>
                        </strong>
                      </div>
                    ))}
                  </T>
                </div>
              ))}
          </T>{" "}
          <T>
            {!op.registers.some((r) => r.branch === op.activeBranch) && (
              <EmptyState
                icon={Wallet}
                title="A fresh start for your cash book."
                description="Open a register at this branch to record cash receipts and cash movements."
              />
            )}
          </T>
          <p className="quiet-note">
            <T>
              Only this session’s recorded cash portions affect expected cash.
              Older sample receipts are excluded.
            </T>
          </p>
        </ToolPanel>
      </div>
    </>
  );
}
