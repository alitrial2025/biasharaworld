"use client";
import { FundingPageContent } from "./funding";
import { ProductPhoto } from "@/components/product-photo";
import { T, LocalButton, LocalInput } from "@/components/locale";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FileText,
  LockKeyhole,
  Plus,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  IconBox,
  Modal,
  PageHeading,
  SalesChart,
  SearchField,
  SelectField,
  StatCard,
  Tabs,
  useToast,
} from "@/components/ui";
import { lowStock, money, salesTotal, today } from "@/lib/data";
import { businessReport } from "@/lib/backend/reports";
import { useDemo } from "@/lib/store";
import { downloadCSV } from "@/lib/csv";

export function ExpensesPage() {
  const { state, store } = useDemo();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remove, setRemove] = useState<number | null>(null);
  const toast = useToast();
  const rows = state.expenses.filter((e) =>
    (e.name + e.category).toLowerCase().includes(query.toLowerCase()),
  );
  async function add(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      await store.addExpense({
        name: String(f.get("name")).trim(),
        category: String(f.get("category")),
        amount: Number(f.get("amount")),
        date: String(f.get("date")),
        method: String(f.get("method")),
      });
      setOpen(false);
      toast("Expense recorded. A clearer view of where your money goes.");
    } catch {
      /* The shared connection banner retains the server error and retry action. */
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="THE LITTLE THINGS ADD UP"
        title="Keep your spending in sight."
        description="From transport to electricity. Give every business expense a place."
      >
        <Button
          variant="secondary"
          icon={ArrowDownToLine}
          onClick={() =>
            downloadCSV(
              "expenses.csv",
              ["Expense", "Category", "Date", "Method", "KES"],
              rows.map((e) => [e.name, e.category, e.date, e.method, e.amount]),
            )
          }
        >
          <T>Export</T>
        </Button>
        <Button icon={Plus} onClick={() => setOpen(true)}>
          <T>Record expense</T>
        </Button>
      </PageHeading>
      <div className="stats-grid three-stats">
        <StatCard
          label="Total recorded expenses"
          value={`KES ${money(state.expenses.reduce((s, e) => s + e.amount, 0))}`}
          tone="red"
          icon={Wallet}
        />
        <StatCard
          label="Expense records"
          value={String(state.expenses.length)}
          tone="blue"
          icon={FileText}
        />
        <StatCard
          label="Categories used"
          value={String(new Set(state.expenses.map((e) => e.category)).size)}
          tone="amber"
          icon={BarChart3}
        />
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <h2>
            <T>Every little outlay.</T>
          </h2>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search expenses…"
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <T>Expense</T>
                </th>
                <th>
                  <T>Category</T>
                </th>
                <th>
                  <T>Date</T>
                </th>
                <th>
                  <T>Payment</T>
                </th>
                <th>
                  <T>Amount</T>
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <T>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="table-person">
                        <IconBox icon={Wallet} tone="red" />
                        <strong>
                          <T>{e.name}</T>
                        </strong>
                      </span>
                    </td>
                    <td>
                      <Badge tone="gray">
                        <T>{e.category}</T>
                      </Badge>
                    </td>
                    <td>
                      <T>{e.date}</T>
                    </td>
                    <td>
                      <T>{e.method}</T>
                    </td>
                    <td className="strong">
                      <T>KES</T> <T>{money(e.amount)}</T>
                    </td>
                    <td>
                      <LocalButton
                        className="icon-button text-red"
                        aria-label={`Delete ${e.name}`}
                        onClick={() => setRemove(e.id)}
                      >
                        <Trash2 size={16} />
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
              icon={Wallet}
              title="No expenses here yet."
              description="Record an expense or try another search."
            />
          )}
        </T>

        <div className="table-foot">
          <T>{rows.length}</T> <T>expense records · Saved to your business</T>
        </div>
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Give that expense a place."
        description="Add a business cost to your records."
      >
        <form onSubmit={add}>
          <Field
            label="What was it for?"
            name="name"
            placeholder="e.g. Shop electricity"
            required
            maxLength={100}
          />
          <div className="form-grid">
            <Field
              label="Amount (KES)"
              name="amount"
              type="number"
              step="0.01"
              min={0.01}
              max={10000000}
              required
            />
            <Field
              label="Date"
              name="date"
              type="date"
              defaultValue={today()}
              required
            />
          </div>
          <div className="form-grid">
            <SelectField label="Category" name="category">
              <T>
                {[
                  "Transport",
                  "Utilities",
                  "Supplies",
                  "Rent",
                  "Wages",
                  "Other",
                ].map((c) => (
                  <option key={c}>
                    <T>{c}</T>
                  </option>
                ))}
              </T>
            </SelectField>
            <SelectField label="Payment method" name="method">
              <option>
                <T>M-Pesa</T>
              </option>
              <option>
                <T>Cash</T>
              </option>
              <option>
                <T>Bank transfer</T>
              </option>
            </SelectField>
          </div>
          <div className="modal-actions">
            <Button type="submit">
              <T>Record expense</T>
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        open={remove !== null}
        onClose={() => setRemove(null)}
        title="Remove this expense?"
        description="Your expense total will update."
      >
        <div className="modal-actions">
          <Button variant="secondary" onClick={() => setRemove(null)}>
            <T>Keep expense</T>
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                if (remove !== null) await store.removeExpense(remove);
                setRemove(null);
                toast("Expense removed.");
              } catch {
                /* The shared connection banner retains the server error and retry action. */
              }
            }}
          >
            <T>Remove expense</T>
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function ReportsPage() {
  const { state } = useDemo();
  const [period, setPeriod] = useState("Month");
  const [metric, setMetric] = useState("Sales");
  const report = businessReport(state, period);
  const expenses = report.expenses;
  const value =
    metric === "Sales"
      ? report.sales
      : metric === "Profit"
        ? report.profit
        : metric === "Expenses"
          ? expenses
          : state.products.reduce((s, p) => s + p.cost * p.stock, 0);
  function exportReport() {
    downloadCSV(
      "business-report.csv",
      ["Metric", "Value KES", "Basis"],
      [
        [`${period} sales`, report.sales, "Recorded receipts less returns"],
        [
          "Operating profit",
          report.profit,
          "Recorded receipts less item costs and expenses",
        ],
        ["Expenses", expenses, "Recorded expenses for this period"],
        [
          "Stock value",
          state.products.reduce((s, p) => s + p.cost * p.stock, 0),
          "Current stock at recorded cost",
        ],
        [
          "Customer balances",
          state.customers.reduce((s, c) => s + c.balance, 0),
          "Current customer balances",
        ],
      ],
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="SEE THE BIGGER PICTURE"
        title="A clearer view. A smarter next step."
        description="Make a little space to look back, so you can move forward."
      >
        <Button
          variant="secondary"
          icon={ArrowDownToLine}
          onClick={exportReport}
        >
          <T>Download report</T>
        </Button>
      </PageHeading>
      <div className="report-notice">
        <Sparkles size={18} />
        <span>
          <T>
            Reports use recorded receipts, refunds, item costs and expenses.
            Payments are recorded manually after you receive them.
          </T>
        </span>
      </div>
      <section className="panel report-main">
        <div className="panel-heading">
          <Tabs
            items={["Sales", "Profit", "Expenses", "Stock"]}
            value={metric}
            onChange={setMetric}
          />
          <Tabs
            items={["Day", "Week", "Month"]}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <div className="report-value">
          <span>
            <T>
              {metric === "Stock"
                ? "Stock value at cost"
                : metric === "Expenses"
                  ? "All recorded expenses"
                  : `${period} ${metric.toLowerCase()}`}
            </T>
          </span>
          <strong>
            <T>KES</T> <T>{money(value)}</T>
          </strong>
          <Badge tone={metric === "Expenses" ? "red" : "green"}>
            <T>
              {metric === "Sales" ? "Recorded receipts" : "Recorded totals"}
            </T>
          </Badge>
        </div>
        {metric === "Sales" ? (
          <SalesChart period={period} series={report.series} />
        ) : metric === "Stock" ? (
          <p className="muted">
            Current stock at recorded cost. Historical stock values are not
            available.
          </p>
        ) : (
            metric === "Profit" ? report.profitSeries : report.expenseSeries
          ) ? (
          <SalesChart
            period={period}
            series={
              (metric === "Profit"
                ? report.profitSeries
                : report.expenseSeries)!
            }
            label={metric.toLowerCase()}
          />
        ) : (
          <p className="muted">
            Select Week or Month to see the daily trend. Expenses are recorded
            by date.
          </p>
        )}
        {metric === "Sales" && report.timingIncomplete && (
          <p className="muted">
            Some older records have no transaction time and appear only in the
            total.
          </p>
        )}
      </section>
      <div className="report-bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                <T>Your shelf favourites.</T>
              </h2>
              <p>
                <T>Ranked by recorded net sales</T>
              </p>
            </div>
            <Badge tone="blue">
              <T>Top products</T>
            </Badge>
          </div>

          <T>
            {report.products
              .filter((r) => r.product)
              .slice(0, 5)
              .map(({ product: p, amount }, i) => (
                <div className="ranking-row" key={p!.id}>
                  <span className="ranking-number">
                    <T>0</T> <T>{i + 1}</T>
                  </span>
                  <ProductPhoto product={p!} small />
                  <div>
                    <strong>
                      <T>{p!.name}</T>
                    </strong>
                    <span>
                      <T>{p!.size}</T>
                    </span>
                  </div>
                  <div className="ranking-bar">
                    <span style={{ width: `${95 - i * 16}%` }} />
                  </div>
                  <strong>
                    <T>KES</T> <T>{money(amount)}</T>
                  </strong>
                </div>
              ))}
          </T>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                <T>How customers pay.</T>
              </h2>
              <p>
                <T>Recorded payment portions</T>
              </p>
            </div>
          </div>

          <T>
            {["M-Pesa", "Cash", "Card"].map((method, i) => {
              const amount = state.sales
                .filter((s) => s.method === method)
                .reduce((s, r) => s + r.amount, 0);
              const total = state.sales.reduce((s, r) => s + r.amount, 0);
              return (
                <div className="payment-breakdown" key={method}>
                  <div>
                    <span>
                      <span className={`chart-dot chart-dot-${i}`} />
                      <T>{method}</T>
                    </span>
                    <strong>
                      <T>KES</T> <T>{money(amount)}</T>
                    </strong>
                  </div>
                  <div className={`breakdown-track track-${i}`}>
                    <span style={{ width: `${(amount / total) * 100}%` }} />
                  </div>
                  <small>
                    <T>{Math.round((amount / total) * 100)}</T>{" "}
                    <T>% of listed receipts</T>
                  </small>
                </div>
              );
            })}
          </T>

          <Link href="/dashboard/sales" className="text-link">
            <T>Look at your sales</T>
            <ArrowRight size={15} />
          </Link>
        </section>
      </div>
    </>
  );
}

type Message = { id: number; role: "user" | "assistant"; text: string };
export function AssistantPage() {
  const { state } = useDemo();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    let response: string;
    const lower = q.toLowerCase();
    if (/stock|restock|shelf|shelves/.test(lower)) {
      const products = lowStock(state);
      response = products.length
        ? `A little shelf check: ${products.map((p) => `${p.name} (${p.stock} left)`).join(", ")}. These are at or below their reorder points. Review demand and supplier lead times before preparing your next order.`
        : "Your products are all above their reorder points. Review what’s selling fastest before your next order.";
    } else if (/owe|debt|balance|credit|customer/.test(lower)) {
      const customers = state.customers
        .filter((c) => c.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      response = `Your customers have KES ${money(customers.reduce((s, c) => s + c.balance, 0))} outstanding. ${customers
        .slice(0, 3)
        .map((c) => `${c.name}: KES ${money(c.balance)}`)
        .join(
          "; ",
        )}. Open Customers to record a repayment. No reminders are sent.`;
    } else if (/expense|spend|cost/.test(lower)) {
      response = `Your recorded expenses add up to KES ${money(state.expenses.reduce((s, e) => s + e.amount, 0))}. ${state.expenses.length} records are in your expense book. Review the categories in Expenses to see what is keeping the shop running.`;
    } else if (/sale|today|business|profit|week/.test(lower)) {
      response = `Here’s a little clarity for ${state.profile.business}: today’s recorded sales are KES ${money(salesTotal(state))}, recorded expenses are KES ${money(state.expenses.reduce((s, e) => s + e.amount, 0))}, and ${lowStock(state).length} products need a stock check. Operating profit from these records is KES ${money(businessReport(state).profit)}.`;
    } else {
      response =
        "I can summarize your recorded sales, stock, expenses and customer balances. Try ‘What should I restock?’ or ‘Who owes me money?’ These are rule-based summaries; a live AI service is planned for a later phase.";
    }
    setMessages((m) => [
      ...m,
      { id: Date.now(), role: "user", text: q },
      { id: Date.now() + 1, role: "assistant", text: response },
    ]);
    setInput("");
  }
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE EXTRA CLARITY"
        title="Good questions. Brighter next steps."
        description="Your business assistant, with room for your next idea."
      >
        <Badge tone="purple">
          <Sparkles size={12} />
          <T>BiasharaAI preview</T>
        </Badge>
      </PageHeading>
      <section className="panel assistant-workspace">
        <div className="assistant-top">
          <span className="ai-orb">
            <Sparkles size={20} />
          </span>
          <div>
            <strong>
              <T>BiasharaAI</T>
            </strong>
            <span>
              <T>Your business at a glance</T>
            </span>
          </div>
          <LocalButton
            className="text-button"
            disabled={!messages.length}
            onClick={() => setMessages([])}
          >
            <T>New conversation</T>
          </LocalButton>
        </div>
        <div className="chat-messages" aria-live="polite">
          <T>
            {!messages.length ? (
              <div className="assistant-empty">
                <span className="ai-orb large-orb">
                  <Sparkles size={32} />
                </span>
                <h2>
                  <T>What’s on your mind,</T>{" "}
                  <T>{state.profile.name.split(" ")[0]}</T> <T>?</T>
                </h2>
                <p>
                  <T>A clearer picture can start with one good question.</T>
                </p>
                <div className="suggestion-grid">
                  <T>
                    {[
                      "How is my business doing today?",
                      "What should I restock?",
                      "Who owes me money?",
                      "Where is my money going?",
                    ].map((q) => (
                      <LocalButton key={q} onClick={() => ask(q)}>
                        <Sparkles size={15} />
                        <span>
                          <T>{q}</T>
                        </span>
                        <ArrowRight size={14} />
                      </LocalButton>
                    ))}
                  </T>
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div className={`chat-message message-${m.role}`} key={m.id}>
                  <T>
                    {m.role === "assistant" ? (
                      <span className="ai-orb">
                        <Sparkles size={15} />
                      </span>
                    ) : (
                      <Avatar name={state.profile.name} small />
                    )}
                  </T>

                  <div>
                    <small>
                      <T>
                        {m.role === "assistant" ? "Business summary" : "You"}
                      </T>
                    </small>
                    <p>
                      <T>{m.text}</T>
                    </p>
                  </div>
                </div>
              ))
            )}
          </T>
        </div>
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <LocalInput
            aria-label="Ask BiasharaAI"
            placeholder="Ask a little question about your business…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
          />
          <LocalButton
            className="send-button"
            type="submit"
            aria-label="Send question"
            disabled={!input.trim()}
          >
            <ArrowRight size={20} />
          </LocalButton>
        </form>
        <p className="quiet-note centered">
          <T>
            Summaries from your recorded business activity. Check your records
            before making a business decision.
          </T>
        </p>
      </section>
    </>
  );
}

export function FinancingPage() {
  return <FundingPageContent />;
}

export function SettingsPage() {
  const { state, store } = useDemo();
  const [tab, setTab] = useState("Business profile");
  const [billing, setBilling] = useState(false);
  const toast = useToast();
  async function save(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      await store.updateProfile({
        name: String(f.get("name")).trim(),
        business: String(f.get("business")).trim(),
        email: String(f.get("email")).trim(),
        phone: String(f.get("phone")),
        location: String(f.get("location")).trim(),
        type: String(f.get("type")),
      });
      toast("Business profile saved.");
    } catch {
      /* The shared connection banner retains the server error and retry action. */
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your business. Your way."
        description="The details, preferences and little things that make it yours."
      />
      <div className="settings-extra-links">
        <Link className="text-link" href="/dashboard/preferences">
          <T>Language, theme & reading size →</T>
        </Link>
        <Link className="text-link" href="/dashboard/sync">
          <T>Connection & saved activity →</T>
        </Link>
      </div>
      <div className="settings-layout">
        <aside className="settings-nav" aria-label="Settings sections">
          <T>
            {[
              "Business profile",
              "Notifications",
              "Plan & billing",
              "Your data",
            ].map((t) => (
              <LocalButton
                aria-pressed={tab === t}
                className={tab === t ? "active" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                <T>{t}</T>
                <ArrowRight size={14} />
              </LocalButton>
            ))}
          </T>
        </aside>
        <section className="panel settings-panel">
          <T>
            {tab === "Business profile" ? (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>
                      <T>A little about your business.</T>
                    </h2>
                    <p>
                      <T>
                        Confirmed changes are saved to your business account.
                      </T>
                    </p>
                  </div>
                  <Avatar name={state.profile.name} photo />
                </div>
                <form onSubmit={save} key={state.profile.email}>
                  <div className="form-grid">
                    <Field
                      label="Your full name"
                      name="name"
                      defaultValue={state.profile.name}
                      required
                      maxLength={80}
                    />
                    <Field
                      label="Business name"
                      name="business"
                      defaultValue={state.profile.business}
                      required
                      maxLength={100}
                    />
                    <Field
                      label="Email address"
                      name="email"
                      type="email"
                      defaultValue={state.profile.email}
                      required
                    />
                    <Field
                      label="Phone number"
                      name="phone"
                      type="tel"
                      defaultValue={state.profile.phone}
                    />
                    <Field
                      label="Location"
                      name="location"
                      defaultValue={state.profile.location}
                      required
                    />
                    <SelectField
                      label="Business type"
                      name="type"
                      defaultValue={state.profile.type}
                    >
                      <T>
                        {[
                          "Retail shop",
                          "Mini market",
                          "Wholesale",
                          "Service business",
                          "Other",
                        ].map((t) => (
                          <option key={t}>
                            <T>{t}</T>
                          </option>
                        ))}
                      </T>
                    </SelectField>
                  </div>
                  <div className="settings-fixed-value">
                    <span>
                      <T>Currency</T>
                    </span>
                    <strong>
                      <T>🇰🇪 KES · Kenyan Shilling</T>
                    </strong>
                  </div>
                  <div className="modal-actions">
                    <Button type="submit">
                      <T>Save changes</T>
                    </Button>
                  </div>
                </form>
              </>
            ) : tab === "Notifications" ? (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>
                      <T>A little nudge, at the right time.</T>
                    </h2>
                    <p>
                      <T>
                        Preview your preferences. No emails or push messages are
                        sent.
                      </T>
                    </p>
                  </div>
                </div>

                <T>
                  {[
                    [
                      "lowStock",
                      "Stock reminders",
                      "When products reach their reorder point.",
                    ],
                    [
                      "salesSummary",
                      "Daily sales summary",
                      "A quick look at the day’s progress.",
                    ],
                    [
                      "payments",
                      "Payment updates",
                      "Keep a clear view of customer payments.",
                    ],
                    [
                      "weeklyReport",
                      "Weekly business report",
                      "Make a little time for the bigger picture.",
                    ],
                  ].map(([key, title, desc]) => (
                    <div className="notification-setting" key={key}>
                      <div>
                        <strong>
                          <T>{title}</T>
                        </strong>
                        <p>
                          <T>{desc}</T>
                        </p>
                      </div>
                      <LocalButton
                        type="button"
                        className={`toggle ${state.notifications[key] ? "on" : ""}`}
                        role="switch"
                        aria-checked={state.notifications[key]}
                        aria-label={title}
                        onClick={async () =>
                          await store.toggleNotification(key)
                        }
                      >
                        <span />
                      </LocalButton>
                    </div>
                  ))}
                </T>
              </>
            ) : tab === "Plan & billing" ? (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>
                      <T>A little room to grow.</T>
                    </h2>
                    <p>
                      <T>Proposed plans · billing is not connected.</T>
                    </p>
                  </div>
                </div>
                <div className="current-plan">
                  <Badge>
                    <T>YOUR PLAN</T>
                  </Badge>
                  <h3>
                    <T>{state.profile.plan}</T>
                  </h3>
                  <p>
                    <T>Free development access. Billing is not connected.</T>
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => setBilling(true)}
                    icon={CreditCard}
                  >
                    <T>Compare preview plans</T>
                  </Button>
                </div>
                <div className="billing-empty">
                  <LockKeyhole size={22} />
                  <div>
                    <strong>
                      <T>No payment method on file.</T>
                    </strong>
                    <p>
                      <T>
                        Online payments are not available yet. You can record
                        payments you receive.
                      </T>
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="panel-heading">
                  <div>
                    <h2>
                      <T>A fresh start, whenever you need it.</T>
                    </h2>
                    <p>
                      <T>Manage your shared business records.</T>
                    </p>
                  </div>
                </div>
                <div className="data-setting">
                  <div>
                    <h3>
                      <T>Take your records with you.</T>
                    </h3>
                    <p>
                      <T>
                        Export your products, customers, sales and expenses as
                        separate CSV files from their pages.
                      </T>
                    </p>
                  </div>
                  <Button
                    href="/dashboard/reports"
                    variant="secondary"
                    icon={ArrowDownToLine}
                  >
                    <T>Export a snapshot</T>
                  </Button>
                </div>
                <div className="data-setting">
                  <p>
                    Your business records are private. You can export a copy
                    whenever you need it.
                  </p>
                  <Button onClick={() => void store.signOut()}>
                    Sign out of this device
                  </Button>
                </div>
                <Link href="/" className="text-link">
                  <T>Back to the public website</T>
                  <ArrowRight size={15} />
                </Link>
              </>
            )}
          </T>
        </section>
      </div>
      <Modal
        open={billing}
        onClose={() => setBilling(false)}
        title="Room for every stage."
        description="Proposed launch plans. Choosing a plan does not start a subscription."
      >
        <div className="plan-picker">
          <T>
            {[
              ["Starter", "KES 0", "The everyday essentials."],
              ["Growth", "KES 990 / month", "More insight, more room."],
              ["Business", "KES 2,490 / month", "Tools for a growing team."],
            ].map(([name, price, text]) => (
              <LocalButton
                key={name}
                onClick={async () => {
                  toast(
                    "Billing is not connected. Your free development account is unchanged.",
                    "info",
                  );
                  setBilling(false);
                }}
              >
                <div>
                  <strong>
                    <T>{name}</T>
                  </strong>
                  <span>
                    <T>{text}</T>
                  </span>
                </div>
                <strong>
                  <T>{price}</T>
                </strong>

                <T>
                  {state.profile.plan === name && <CheckCircle2 size={19} />}
                </T>
              </LocalButton>
            ))}
          </T>
        </div>
        <Link href="/pricing" className="text-link">
          <T>See full plan comparison</T>
          <ArrowRight size={15} />
        </Link>
      </Modal>
    </>
  );
}
