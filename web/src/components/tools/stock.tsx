"use client";
import { T, LocalButton, LocalInput } from "@/components/locale";
import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Truck,
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
import { available, cash, localDate, minor } from "@/lib/operations";
import { downloadCSV } from "@/lib/csv";
import { useOperations, OperationError, ToolPanel } from "./common";

export function StocktakesTool() {
  const { state, op, act, error } = useOperations();
  const [selected, setSelected] = useState<number | null>(
    op.counts.find((c) => c.branch === op.activeBranch)?.id ?? null,
  );
  const [query, setQuery] = useState("");
  const count = op.counts.find(
    (c) => c.id === selected && c.branch === op.activeBranch,
  );
  const [draft, setDraft] = useState<Record<number, string>>({});
  return (
    <>
      <OperationError message={error} />
      <div className="tool-two-columns count-layout">
        <ToolPanel title="A little time with your shelves.">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await act({
                type: "startCount",
                name: String(new FormData(e.currentTarget).get("name")),
              });
              if (result) {
                setSelected(result.id!);
                setDraft({});
              }
            }}
          >
            <Field
              label="Count name"
              name="name"
              placeholder="e.g. Monday shelf check"
              required
            />
            <Button icon={Plus} type="submit">
              <T>Start stocktake</T>
            </Button>
          </form>
          <div className="count-list">
            <T>
              {op.counts
                .filter((c) => c.branch === op.activeBranch)
                .map((c) => (
                  <LocalButton
                    className={selected === c.id ? "selected" : ""}
                    key={c.id}
                    onClick={() => {
                      setSelected(c.id);
                      setDraft({});
                    }}
                  >
                    <ClipboardCheck size={20} />
                    <div>
                      <strong>
                        <T>{c.name}</T>
                      </strong>
                      <small>
                        <T>{Object.keys(c.counted).length}</T>{" "}
                        <T>products counted</T>
                      </small>
                    </div>
                    <Badge tone={c.status === "Finalised" ? "green" : "amber"}>
                      <T>{c.status}</T>
                    </Badge>
                  </LocalButton>
                ))}
            </T>
          </div>
        </ToolPanel>
        <ToolPanel
          title={count?.name ?? "Ready when you are."}
          description="Count drafts leave stock untouched until you review and finalise."
        >
          <T>
            {!count ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Every count starts with a shelf."
                description="Create or choose a stocktake to enter your physical quantities."
              />
            ) : (
              <>
                <SearchField
                  value={query}
                  onChange={setQuery}
                  placeholder="Find a product to count…"
                />
                <div className="count-worksheet">
                  <T>
                    {state.products
                      .filter(
                        (p) =>
                          !p.components &&
                          p.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((p) => (
                        <div key={p.id}>
                          <ProductArt art={p.art} name={p.name} small />
                          <div>
                            <strong>
                              <T>{p.name}</T>
                            </strong>
                            <small>
                              <T>Starting</T> <T>{count.starting[p.id] ?? 0}</T>{" "}
                              <T>· Current</T> <T>{p.stock}</T>
                            </small>
                          </div>
                          <label>
                            <span className="sr-only">
                              <T>Counted</T> <T>{p.name}</T>
                            </span>
                            <LocalInput
                              aria-label={`Counted ${p.name}`}
                              type="number"
                              min={0}
                              step={1}
                              disabled={count.status === "Finalised"}
                              value={draft[p.id] ?? count.counted[p.id] ?? ""}
                              placeholder="—"
                              onChange={(e) =>
                                setDraft({ ...draft, [p.id]: e.target.value })
                              }
                              onBlur={async () => {
                                if (
                                  draft[p.id] !== undefined &&
                                  draft[p.id] !== ""
                                )
                                  await act(
                                    {
                                      type: "count",
                                      id: count.id,
                                      productId: p.id,
                                      quantity: Number(draft[p.id]),
                                    },
                                    true,
                                  );
                              }}
                            />
                          </label>
                          <span className="count-difference">
                            <T>
                              {count.counted[p.id] === undefined
                                ? "Not counted"
                                : `${count.counted[p.id] - (count.starting[p.id] ?? 0) > 0 ? "+" : ""}${count.counted[p.id] - (count.starting[p.id] ?? 0)}`}
                            </T>
                          </span>
                        </div>
                      ))}
                  </T>
                </div>

                <T>
                  {count.status === "Draft" ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await act({
                          type: "finaliseCount",
                          id: count.id,
                          reason: String(
                            new FormData(e.currentTarget).get("reason"),
                          ),
                        });
                      }}
                    >
                      <Field
                        label="Adjustment reason"
                        name="reason"
                        placeholder="e.g. Physical shelf count completed"
                        required
                      />
                      <div className="button-row">
                        <Button type="submit" icon={CheckCircle2}>
                          <T>Review & finalise count</T>
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={async () =>
                            await act({ type: "refreshCount", id: count.id })
                          }
                        >
                          <T>Refresh starting stock</T>
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="inline-note">
                      <CheckCircle2 size={18} />
                      <T>Finalised once ·</T> <T>{count.reason}</T>
                    </div>
                  )}
                </T>
              </>
            )}
          </T>
        </ToolPanel>
      </div>
    </>
  );
}
export function ExpiryTool() {
  const { state, op, act, error } = useOperations();
  const [filter, setFilter] = useState("All batches");
  const [writeOff, setWriteOff] = useState<number | null>(null);
  const [add, setAdd] = useState(false);
  const [date, setDate] = useState("");
  const soon = new Date();
  soon.setDate(soon.getDate() + 14);
  const limit = soon.toISOString().slice(0, 10);
  const rows = op.batches.filter(
    (b) =>
      b.branch === op.activeBranch &&
      b.quantity > 0 &&
      (filter === "All batches" ||
        (filter === "Expired"
          ? b.expires < localDate()
          : b.expires >= localDate() && b.expires <= limit)) &&
      (!date || b.expires === date),
  );
  return (
    <>
      <OperationError message={error} />
      <div className="tool-metrics">
        <div>
          <span>
            <T>Physical batches</T>
          </span>
          <strong>
            <T>
              {
                op.batches.filter(
                  (b) => b.branch === op.activeBranch && b.quantity > 0,
                ).length
              }
            </T>
          </strong>
        </div>
        <div>
          <span>
            <T>Expiring in 14 days</T>
          </span>
          <strong>
            <T>
              {
                op.batches.filter(
                  (b) =>
                    b.branch === op.activeBranch &&
                    b.quantity > 0 &&
                    b.expires >= localDate() &&
                    b.expires <= limit,
                ).length
              }
            </T>
          </strong>
        </div>
        <div>
          <span>
            <T>Expired units</T>
          </span>
          <strong>
            <T>
              {op.batches
                .filter(
                  (b) =>
                    b.branch === op.activeBranch && b.expires < localDate(),
                )
                .reduce((s, b) => s + b.quantity, 0)}
            </T>
          </strong>
        </div>
      </div>
      <ToolPanel
        title="Freshness, in clear view."
        action={
          <Button onClick={() => setAdd(true)} icon={Plus}>
            <T>Receive a batch</T>
          </Button>
        }
      >
        <div className="table-toolbar">
          <Tabs
            items={["All batches", "Expiring soon", "Expired"]}
            value={filter}
            onChange={setFilter}
          />
          <Field
            label="Expiry calendar — choose a date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <T>
            {date && (
              <Button variant="ghost" onClick={() => setDate("")}>
                <T>All dates</T>
              </Button>
            )}
          </T>
        </div>
        <div className="batch-grid">
          <T>
            {rows.map((b) => {
              const p = state.products.find((p) => p.id === b.productId);
              return (
                <article
                  className={`batch-card ${b.expires < localDate() ? "expired" : ""}`}
                  key={b.id}
                >
                  <div>
                    <ProductArt art={p?.art ?? 0} name={p?.name ?? "Product"} />
                    <span>
                      <strong>
                        <T>{p?.name}</T>
                      </strong>
                      <small>
                        <T>{p?.size}</T>
                      </small>
                    </span>
                    <Badge
                      tone={
                        b.expires < localDate()
                          ? "red"
                          : b.expires <= limit
                            ? "amber"
                            : "green"
                      }
                    >
                      <T>
                        {b.expires < localDate()
                          ? "Expired"
                          : b.expires <= limit
                            ? "Expiring soon"
                            : "Fresh stock"}
                      </T>
                    </Badge>
                  </div>
                  <dl>
                    <div>
                      <dt>
                        <T>Batch</T>
                      </dt>
                      <dd>
                        <T>{b.code}</T>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <T>Quantity</T>
                      </dt>
                      <dd>
                        <T>{b.quantity}</T> <T>units</T>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <T>Expiry date</T>
                      </dt>
                      <dd>
                        <T>{b.expires}</T>
                      </dd>
                    </div>
                  </dl>
                  <LocalButton
                    className="text-button text-red"
                    onClick={() => setWriteOff(b.id)}
                  >
                    <T>Record a write-off</T>
                  </LocalButton>
                </article>
              );
            })}
          </T>
        </div>

        <T>
          {!rows.length && (
            <EmptyState
              icon={Package}
              title="No batches match this view."
              description="Try another date or filter, or receive a new batch."
            />
          )}
        </T>

        <p className="quiet-note">
          <T>
            Expired units stay in physical stock until written off, but cannot
            be sold. Checkout uses eligible batches in expiry order.
          </T>
        </p>
      </ToolPanel>
      <Modal
        open={add}
        onClose={() => setAdd(false)}
        title="A fresh batch for your shelves."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await act({
                type: "batch",
                productId: Number(f.get("product")),
                quantity: Number(f.get("quantity")),
                code: String(f.get("code")),
                expires: String(f.get("expires")),
              })
            )
              setAdd(false);
          }}
        >
          <SelectField label="Product" name="product">
            <T>
              {state.products
                .filter((p) => !p.components)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    <T>{p.name}</T> <T>·</T> <T>{p.size}</T>
                  </option>
                ))}
            </T>
          </SelectField>
          <Field label="Batch code" name="code" required />
          <div className="form-grid">
            <Field
              label="Quantity received"
              name="quantity"
              type="number"
              min={1}
              required
            />
            <Field label="Expiry date" name="expires" type="date" required />
          </div>
          <Button type="submit">
            <T>Receive batch</T>
          </Button>
        </form>
      </Modal>
      <Modal
        open={writeOff !== null}
        onClose={() => setWriteOff(null)}
        title="Give this stock change a clear reason."
        description="This removes the selected batch’s remaining units from local stock."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              writeOff !== null &&
              await act({
                type: "writeOff",
                id: writeOff,
                reason: String(new FormData(e.currentTarget).get("reason")),
              })
            )
              setWriteOff(null);
          }}
        >
          <Field
            label="Write-off reason"
            name="reason"
            placeholder="e.g. Expired or damaged packaging"
            required
          />
          <Button variant="danger" type="submit">
            <T>Record batch write-off</T>
          </Button>
        </form>
      </Modal>
    </>
  );
}
export function VariantsTool() {
  const { state, op, act, error } = useOperations();
  const [tab, setTab] = useState("Variants");
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState<Record<number, number>>({});
  return (
    <>
      <OperationError message={error} />
      <ToolPanel
        title="A place for every size and combination."
        action={
          <Button icon={Plus} onClick={() => setOpen(true)}>
            <T>{tab === "Variants" ? "Add variant" : "Build a bundle"}</T>
          </Button>
        }
      >
        <Tabs items={["Variants", "Bundles"]} value={tab} onChange={setTab} />
        <T>
          {tab === "Variants" ? (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <T>Product / variant</T>
                    </th>
                    <th>
                      <T>Pack size</T>
                    </th>
                    <th>
                      <T>SKU</T>
                    </th>
                    <th>
                      <T>Price</T>
                    </th>
                    <th>
                      <T>Available</T>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <T>
                    {state.products
                      .filter((p) => !p.components)
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <span className="table-product">
                              <ProductArt art={p.art} name={p.name} />
                              <span>
                                <strong>
                                  <T>{p.name}</T>
                                </strong>

                                <T>
                                  {p.variantOf && (
                                    <small>
                                      <T>Variant of</T>{" "}
                                      <T>
                                        {
                                          state.products.find(
                                            (x) => x.id === p.variantOf,
                                          )?.name
                                        }
                                      </T>
                                    </small>
                                  )}
                                </T>
                              </span>
                            </span>
                          </td>
                          <td>
                            <T>{p.size}</T>
                          </td>
                          <td>
                            <T>{p.sku}</T>
                          </td>
                          <td>
                            <T>{cash(p.price * 100)}</T>
                          </td>
                          <td>
                            <T>{available(state, p.id)}</T>
                          </td>
                        </tr>
                      ))}
                  </T>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bundle-grid">
              <T>
                {state.products
                  .filter((p) => p.components)
                  .map((p) => (
                    <article className="bundle-card" key={p.id}>
                      <span className="icon-box tone-purple">
                        <Layers size={23} />
                      </span>
                      <h3>
                        <T>{p.name}</T>
                      </h3>
                      <p>
                        <T>
                          {p
                            .components!.map(
                              (c) =>
                                `${c.quantity} × ${state.products.find((x) => x.id === c.productId)?.name}`,
                            )
                            .join(" + ")}
                        </T>
                      </p>
                      <strong>
                        <T>{cash(p.price * 100)}</T>
                      </strong>
                      <Badge tone="purple">
                        <T>{available(state, p.id)}</T> <T>bundles available</T>
                      </Badge>
                      <Button href="/dashboard/sales/new" variant="secondary">
                        <T>Try at checkout</T>
                      </Button>
                    </article>
                  ))}
              </T>
            </div>
          )}
        </T>{" "}
        <T>
          {tab === "Bundles" && !state.products.some((p) => p.components) && (
            <EmptyState
              icon={Layers}
              title="A little combination can go a long way."
              description="Bundle two or more individual products. Availability follows their component stock."
            />
          )}
        </T>
      </ToolPanel>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          tab === "Variants"
            ? "Make room for another size."
            : "A useful little combination."
        }
        wide
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const result =
              tab === "Variants"
                ? await act({
                    type: "variant",
                    parentId: Number(f.get("parent")),
                    name: String(f.get("name")),
                    size: String(f.get("size")),
                    sku: String(f.get("sku")),
                    price: minor(String(f.get("price"))),
                    stock: Number(f.get("stock")),
                  })
                : await act({
                    type: "bundle",
                    name: String(f.get("name")),
                    price: minor(String(f.get("price"))),
                    components: Object.entries(parts)
                      .filter(([, n]) => n > 0)
                      .map(([id, quantity]) => ({ productId: +id, quantity })),
                  });
            if (result) {
              setOpen(false);
              setParts({});
            }
          }}
        >
          <T>
            {tab === "Variants" && (
              <SelectField label="Parent product" name="parent">
                <T>
                  {state.products
                    .filter((p) => !p.components)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        <T>{p.name}</T> <T>·</T> <T>{p.size}</T>
                      </option>
                    ))}
                </T>
              </SelectField>
            )}
          </T>

          <Field
            label={tab === "Variants" ? "Variant name" : "Bundle name"}
            name="name"
            required
          />
          <div className="form-grid">
            <Field
              label="Selling price (KES)"
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              required
            />

            <T>
              {tab === "Variants" && (
                <>
                  <Field
                    label="Pack size"
                    name="size"
                    placeholder="e.g. 250 g"
                    required
                  />
                  <Field label="Unique SKU" name="sku" required />
                  <Field
                    label="Opening stock"
                    name="stock"
                    type="number"
                    min={0}
                    defaultValue={0}
                    required
                  />
                </>
              )}
            </T>
          </div>

          <T>
            {tab === "Bundles" && (
              <>
                <p className="quiet-note">
                  <T>
                    Choose at least two different individual products. Nested
                    bundles are excluded.
                  </T>
                </p>
                <div className="bundle-picker">
                  <T>
                    {state.products
                      .filter((p) => !p.components)
                      .map((p) => (
                        <label key={p.id}>
                          <span>
                            <T>{p.name}</T> <T>·</T> <T>{p.size}</T>
                          </span>
                          <LocalInput
                            aria-label={`Units of ${p.name}`}
                            type="number"
                            min={0}
                            step={1}
                            value={parts[p.id] ?? 0}
                            onChange={(e) =>
                              setParts({
                                ...parts,
                                [p.id]: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                      ))}
                  </T>
                </div>
              </>
            )}
          </T>

          <div className="modal-actions">
            <Button type="submit">
              <T>{tab === "Variants" ? "Save variant" : "Create bundle"}</T>
            </Button>
          </div>
        </form>
      </Modal>
      <p className="quiet-note">
        <T>You are working in</T>{" "}
        <T>{op.branches.find((b) => b.id === op.activeBranch)?.name}</T>{" "}
        <T>. Bundle stock is derived; it is never counted twice.</T>
      </p>
    </>
  );
}
export function MovementsTool() {
  const { state, op } = useOperations();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("This branch");
  const rows = op.movements.filter(
    (m) =>
      (scope === "All branches" || m.branch === op.activeBranch) &&
      `${state.products.find((p) => p.id === m.productId)?.name} ${m.reason} ${m.reference}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <ToolPanel
      title="Every change has a story."
      action={
        <Button
          variant="secondary"
          icon={ArrowDownToLine}
          onClick={() =>
            downloadCSV(
              "stock-movements.csv",
              ["Date", "Product", "Branch", "Change", "Reason", "Reference"],
              rows.map((m) => [
                m.date,
                state.products.find((p) => p.id === m.productId)?.name ??
                  "Product",
                op.branches.find((b) => b.id === m.branch)?.name ?? m.branch,
                m.delta,
                m.reason,
                m.reference,
              ]),
            )
          }
        >
          <T>Export ledger</T>
        </Button>
      }
    >
      <div className="table-toolbar">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search product, reason or reference…"
        />
        <Tabs
          items={["This branch", "All branches"]}
          value={scope}
          onChange={setScope}
        />
      </div>
      <div className="movement-timeline">
        <T>
          {rows.map((m) => (
            <article key={m.id}>
              <span
                className={`movement-marker ${m.delta < 0 ? "negative" : ""}`}
              >
                <RefreshCw size={15} />
              </span>
              <div>
                <h3>
                  <T>
                    {state.products.find((p) => p.id === m.productId)?.name}
                  </T>
                </h3>
                <p>
                  <T>{m.reason}</T> <T>·</T> <T>{m.reference}</T>
                </p>
                <small>
                  <T>{m.date}</T> <T>·</T>{" "}
                  <T>{op.branches.find((b) => b.id === m.branch)?.name}</T>
                </small>
              </div>
              <strong className={m.delta < 0 ? "text-red" : "text-green"}>
                <T>{m.delta > 0 ? "+" : ""}</T> <T>{m.delta}</T>
                <small>
                  <T>units</T>
                </small>
              </strong>
            </article>
          ))}
        </T>
      </div>

      <T>
        {!rows.length && (
          <EmptyState
            title="No movements match this view."
            description="Change the filter or record a stock operation."
          />
        )}
      </T>
    </ToolPanel>
  );
}
export function TransfersTool() {
  const { state, op, act, error } = useOperations();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("All transfers");
  return (
    <>
      <OperationError message={error} />
      <ToolPanel
        title="A little movement. A better-stocked business."
        action={
          <Button icon={Plus} onClick={() => setOpen(true)}>
            <T>Prepare transfer</T>
          </Button>
        }
      >
        <Tabs
          items={[
            "All transfers",
            "Draft",
            "Dispatched",
            "Received",
            "Cancelled",
          ]}
          value={status}
          onChange={setStatus}
        />
        <div className="transfer-list">
          <T>
            {op.transfers
              .filter(
                (t) =>
                  (t.from === op.activeBranch || t.to === op.activeBranch) &&
                  (status === "All transfers" || t.status === status),
              )
              .map((t) => (
                <article key={t.id}>
                  <div className="transfer-heading">
                    <span className="icon-box tone-green">
                      <Truck size={22} />
                    </span>
                    <div>
                      <h3>
                        <T>Transfer #</T> <T>{t.id}</T>
                      </h3>
                      <p>
                        <T>
                          {
                            state.products.find((p) => p.id === t.productId)
                              ?.name
                          }
                        </T>{" "}
                        <T>·</T> <T>{t.quantity}</T> <T>units</T>
                      </p>
                    </div>
                    <Badge
                      tone={
                        t.status === "Received"
                          ? "green"
                          : t.status === "Cancelled"
                            ? "gray"
                            : "amber"
                      }
                    >
                      <T>{t.status}</T>
                    </Badge>
                  </div>
                  <div className="transfer-route">
                    <span>
                      <T>{op.branches.find((b) => b.id === t.from)?.name}</T>
                    </span>
                    <ArrowRight size={18} />
                    <span>
                      <T>{op.branches.find((b) => b.id === t.to)?.name}</T>
                    </span>
                  </div>
                  <div className="button-row">
                    <T>
                      {t.status === "Draft" && (
                        <Button
                          onClick={async () =>
                            await act({ type: "dispatchTransfer", id: t.id })
                          }
                        >
                          <T>Dispatch stock</T>
                        </Button>
                      )}
                    </T>{" "}
                    <T>
                      {t.status === "Dispatched" && (
                        <Button
                          onClick={async () =>
                            await act({ type: "receiveTransfer", id: t.id })
                          }
                        >
                          <T>Receive at destination</T>
                        </Button>
                      )}
                    </T>{" "}
                    <T>
                      {["Draft", "Dispatched"].includes(t.status) && (
                        <Button
                          variant="ghost"
                          onClick={async () =>
                            await act({ type: "cancelTransfer", id: t.id })
                          }
                        >
                          <T>
                            {t.status === "Dispatched"
                              ? "Return to source"
                              : "Cancel draft"}
                          </T>
                        </Button>
                      )}
                    </T>
                  </div>
                </article>
              ))}
          </T>
        </div>

        <T>
          {!op.transfers.some(
            (t) => t.from === op.activeBranch || t.to === op.activeBranch,
          ) && (
            <EmptyState
              icon={Truck}
              title="The right shelf is one transfer away."
              description="Choose a product and another branch to prepare your first transfer."
            />
          )}
        </T>

        <p className="quiet-note">
          <T>
            Dispatched units stay in transit until received. Returning an
            in-transit transfer records the stock back at its source.
          </T>
        </p>
      </ToolPanel>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Send a little stock where it’s needed."
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (
              await act({
                type: "transfer",
                productId: Number(f.get("product")),
                quantity: Number(f.get("quantity")),
                to: String(f.get("to")),
              })
            )
              setOpen(false);
          }}
        >
          <p className="inline-note">
            <T>From</T>{" "}
            <T>{op.branches.find((b) => b.id === op.activeBranch)?.name}</T>
          </p>
          <SelectField label="Destination branch" name="to">
            <T>
              {op.branches
                .filter((b) => b.id !== op.activeBranch)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    <T>{b.name}</T>
                  </option>
                ))}
            </T>
          </SelectField>
          <SelectField label="Product" name="product">
            <T>
              {state.products
                .filter((p) => !p.components && available(state, p.id) > 0)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    <T>{p.name}</T> <T>·</T> <T>{p.size}</T> <T>·</T>{" "}
                    <T>{available(state, p.id)}</T> <T>available</T>
                  </option>
                ))}
            </T>
          </SelectField>
          <Field
            label="Units to transfer"
            name="quantity"
            type="number"
            min={1}
            required
          />
          <Button type="submit">
            <T>Save transfer draft</T>
          </Button>
        </form>
      </Modal>
    </>
  );
}
