"use client";
import { ProductPhoto } from "@/components/product-photo";
import { T, LocalButton } from "@/components/locale";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  CreditCard,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  Modal,
  SalesChart,
  StatCard,
  Tabs,
  useToast,
} from "@/components/ui";
import { lowStock, money, salesTotal } from "@/lib/data";
import { businessReport } from "@/lib/backend/reports";
import { useDemo } from "@/lib/store";
import { resolveIndustry } from "@/lib/industries";
import { downloadCSV } from "@/lib/csv";
import { WorkspaceTrend } from "./trend-chart";

export function Overview() {
  const { state, store } = useDemo();
  const industry = resolveIndustry(state.profile.type);
  const [period, setPeriod] = useState("Week");
  const [targetOpen, setTargetOpen] = useState(false);
  const toast = useToast();
  const report = businessReport(state, period);
  const todayReport = businessReport(state);
  const expenses = todayReport.expenses;
  const balance = state.customers.reduce((s, c) => s + c.balance, 0);
  const total = salesTotal(state);
  const progress = state.target
    ? Math.min((total / state.target) * 100, 100)
    : 0;
  const date = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Nairobi",
  }).format(new Date());
  function exportSnapshot() {
    downloadCSV(
      "business-snapshot.csv",
      ["Metric", "KES"],
      [
        ["Sales", total],
        ["Operating profit", todayReport.profit],
        ["Expenses", expenses],
        ["Customer balances", balance],
      ],
    );
  }
  const quickActions = [
    {
      icon: Plus,
      label: "New sale",
      href: "/dashboard/sales/new",
      tone: "green",
    },
    industry.recommendedTools.includes("inventory")
      ? {
          icon: Package,
          label: "Manage stock",
          href: "/dashboard/inventory",
          tone: "amber",
        }
      : {
          icon: Package,
          label: industry.labels.operations,
          href: "/dashboard/operations",
          tone: "amber",
        },
    {
      icon: Users,
      label: "Customers",
      href: "/dashboard/customers",
      tone: "blue",
    },
    {
      icon: BarChart3,
      label: "Reports",
      href: "/dashboard/reports",
      tone: "amber",
    },
    {
      icon: Wallet,
      label: "Expenses",
      href: "/dashboard/expenses",
      tone: "red",
    },
    {
      icon: ShoppingBag,
      label: "Operations",
      href: "/dashboard/operations",
      tone: "green",
    },
  ];
  async function saveTarget(e: FormEvent<HTMLFormElement>) {
    try {
      e.preventDefault();
      await store.setTarget(
        Number(new FormData(e.currentTarget).get("target")),
      );
      setTargetOpen(false);
      toast("Your daily target is saved.");
    } catch {
      /* The shared connection banner retains the server error and retry action. */
    }
  }
  return (
    <>
      <section className="panel industry-workbench-link">
        <div>
          <span className="eyebrow">{industry.label}</span>
          <h2>Your business, organised around your work.</h2>
          <p>
            {industry.workflows.map((workflow) => workflow.label).join(" · ")}
          </p>
        </div>
        <Button href="/dashboard/operations" arrow>
          Open operations
        </Button>
      </section>
      <div className="overview-eyebrow">
        <span>
          <T>{date}</T>
        </span>
        <LocalButton onClick={exportSnapshot}>
          <ArrowDownToLine size={15} />
          <T>Export snapshot</T>
        </LocalButton>
      </div>
      <section
        className={`dashboard-welcome ${industry.id === "retail" ? "welcome-retail" : "welcome-sector"}`}
      >
        <div className="welcome-copy">
          <span className="welcome-industry">
            <T>{industry.label}</T>
          </span>
          <span className="welcome-eyebrow">
            <T>YOUR EVERYDAY, A LITTLE CLEARER</T>
          </span>
          <h1>
            <T>Jambo,</T> <T>{state.profile.name.split(" ")[0]}</T> <T> </T>
            <span>
              <T>👋</T>
            </span>
          </h1>
          <p>
            <T>Here’s how your business is doing today.</T>
          </p>
          <span className="welcome-shop">
            <T>{state.profile.business}</T>
            <Badge tone="white">
              <T>Your business</T>
            </Badge>
          </span>
          <div className="welcome-desktop-actions">
            <Button href="/dashboard/operations" arrow>
              <T>Open operations</T>
            </Button>
            <Button href="/dashboard/sales/new" variant="ghost" icon={Plus}>
              <T>New sale</T>
            </Button>
            <LocalButton
              className="welcome-export"
              onClick={exportSnapshot}
              aria-label="Export snapshot"
              title="Export snapshot"
            >
              <ArrowDownToLine size={17} />
            </LocalButton>
          </div>
        </div>
        <Button
          className="welcome-mobile-action"
          href="/dashboard/sales/new"
          variant="white"
          icon={Plus}
        >
          <T>New sale</T>
        </Button>
      </section>
      <div className="stats-grid overview-metrics">
        <StatCard
          label="Total sales"
          value={`KES ${money(total)}`}
          note="Recorded today"
          icon={ShoppingBag}
        />
        <StatCard
          label="Operating profit"
          value={`KES ${money(todayReport.profit)}`}
          note="Recorded today"
          icon={BarChart3}
          tone="blue"
        />
        <StatCard
          label="Expenses"
          value={`KES ${money(expenses)}`}
          note="Recorded today"
          icon={Wallet}
          tone="red"
        />
        <StatCard
          label="Pending balances"
          value={`KES ${money(balance)}`}
          note={`${state.customers.filter((c) => c.balance > 0).length} customers`}
          icon={Users}
          tone="amber"
        />
      </div>
      <div className="overview-chart-grid">
        <section className="panel sales-panel">
          <div className="panel-heading">
            <div>
              <h2>
                <T>Business performance</T>
              </h2>
              <p>
                <T>Sales overview</T>
                <span className="chart-demo-label">
                  <T>· Recorded receipts</T>
                </span>
              </p>
            </div>
            <Tabs
              items={["Day", "Week", "Month"]}
              value={period}
              onChange={setPeriod}
            />
          </div>
          <div className="chart-total">
            <strong>
              <T>KES</T> <T>{money(report.sales)}</T>
            </strong>
            <Badge tone="green">
              <T>Recorded</T>
            </Badge>
            <span>
              <T>for this period</T>
            </span>
          </div>
          <div className="overview-desktop-chart">
            <WorkspaceTrend
              period={period}
              start={report.start}
              sales={report.series}
              profit={report.profitSeries}
              expenses={report.expenseSeries}
            />
          </div>
          <div className="overview-mobile-chart">
            <SalesChart
              period={period}
              bars={period === "Day"}
              series={report.series}
            />
          </div>
          {report.timingIncomplete && (
            <p className="muted">
              Some older records have no transaction time and appear only in the
              total.
            </p>
          )}
        </section>
        <section className="panel target-panel">
          <div className="panel-heading">
            <h2>
              <T>Your daily goal</T>
            </h2>
            <LocalButton
              className="text-button"
              onClick={() => setTargetOpen(true)}
            >
              <T>Edit</T>
            </LocalButton>
          </div>
          <div
            className="goal-ring"
            style={{
              background: `conic-gradient(var(--goal-accent, #00815d) ${progress}%,var(--goal-track, #eaf1ec) 0)`,
            }}
          >
            <div>
              <Target size={23} />
              <strong>
                <T>{Math.round(progress)}</T>
                <small>
                  <T>%</T>
                </small>
              </strong>
              <span>
                <T>of your daily target</T>
              </span>
            </div>
          </div>
          <div className="goal-numbers">
            <span>
              <small>
                <T>SO FAR</T>
              </small>
              <strong>
                <T>KES</T> <T>{money(total)}</T>
              </strong>
            </span>
            <span>
              <small>
                <T>YOUR TARGET</T>
              </small>
              <strong>
                <T>KES</T> <T>{money(state.target)}</T>
              </strong>
            </span>
          </div>
          <p className="target-note">
            <T>
              {!state.target
                ? "Set a daily target to start tracking your progress."
                : total >= state.target
                  ? "A lovely milestone. Keep the momentum going."
                  : `KES ${money(state.target - total)} to your next little win.`}
            </T>
          </p>
        </section>
      </div>
      <div className="quick-workspace-actions" aria-label="Quick actions">
        <T>
          {[
            [Plus, "New sale", "/dashboard/sales/new", "green"],
            industry.recommendedTools.includes("inventory")
              ? [Package, "Add stock", "/dashboard/inventory", "amber"]
              : [
                  Package,
                  industry.labels.operations,
                  "/dashboard/operations",
                  "amber",
                ],
            [Users, "Customers", "/dashboard/customers", "blue"],
            [Wallet, "Record expense", "/dashboard/expenses", "purple"],
          ].map(([Icon, title, href, tone]) => {
            const I = Icon as typeof Plus;
            return (
              <Link key={href as string} href={href as string}>
                <span className={`icon-box tone-${tone}`}>
                  <I size={20} />
                </span>
                <strong>
                  <T>{title as string}</T>
                </strong>
                <ArrowUpRight size={15} />
              </Link>
            );
          })}
        </T>
      </div>
      <div className="overview-bottom-grid">
        <section className="panel recent-sales">
          <div className="panel-heading">
            <div>
              <h2>
                <T>Recent sales</T>
              </h2>
              <p>
                <T>Latest recorded receipts</T>
              </p>
            </div>
            <Link className="text-link" href="/dashboard/sales">
              <T>View all</T>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="home-activity">
            {state.sales
              .filter(
                (sale) =>
                  (sale.branch ?? "main") === state.operations.activeBranch,
              )
              .slice(0, 3)
              .map((sale) => (
                <Link
                  key={sale.id}
                  href="/dashboard/sales"
                  className="home-activity-row"
                >
                  <span className="icon-box tone-green">
                    <ShoppingBag size={17} />
                  </span>
                  <span>
                    <strong>
                      <T>{sale.customer}</T>
                    </strong>
                    <small>
                      <T>Receipt</T> #{sale.id} · <T>{sale.method}</T>
                    </small>
                  </span>
                  <strong>KES {money(sale.amount)}</strong>
                </Link>
              ))}
            {!state.sales.some(
              (sale) =>
                (sale.branch ?? "main") === state.operations.activeBranch,
            ) && (
              <div className="home-activity-empty">
                <ShoppingBag size={25} />
                <strong>
                  <T>A fresh start for your business</T>
                </strong>
                <p>
                  <T>Your recorded sales will appear here.</T>
                </p>
                <Link className="text-link" href="/dashboard/sales/new">
                  <T>Record your first sale</T>
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <T>Customer</T>
                  </th>
                  <th>
                    <T>Receipt</T>
                  </th>
                  <th>
                    <T>Payment</T>
                  </th>
                  <th className="align-right">
                    <T>Amount</T>
                  </th>
                </tr>
              </thead>
              <tbody>
                <T>
                  {state.sales
                    .filter(
                      (s) =>
                        (s.branch ?? "main") === state.operations.activeBranch,
                    )
                    .slice(0, 5)
                    .map((sale, i) => (
                      <tr key={sale.id}>
                        <td>
                          <span className="table-person">
                            <Avatar
                              name={sale.customer}
                              color={
                                ["mint", "sand", "lavender", "blue"][i % 4]
                              }
                              small
                            />
                            <strong>
                              <T>{sale.customer}</T>
                            </strong>
                          </span>
                        </td>
                        <td className="muted">
                          <T>#</T> <T>{sale.id}</T>
                        </td>
                        <td>
                          <span className="payment-label">
                            <CreditCard size={13} />
                            <T>{sale.method}</T>
                          </span>
                        </td>
                        <td className="align-right strong">
                          <T>KES</T> <T>{money(sale.amount)}</T>
                        </td>
                      </tr>
                    ))}
                </T>
              </tbody>
            </table>
          </div>
        </section>
        {industry.recommendedTools.includes("inventory") ? (
          <section className="panel low-stock-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  <T>Stock to watch</T>
                </h2>
                <p>
                  <T>{lowStock(state).length}</T>{" "}
                  <T>products to keep an eye on.</T>
                </p>
              </div>
              <Badge tone="amber">
                <T>Stock</T>
              </Badge>
            </div>
            <T>
              {lowStock(state)
                .slice(0, 4)
                .map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/inventory?q=${encodeURIComponent(p.name)}`}
                    className="stock-alert-row"
                  >
                    <ProductPhoto product={p} />
                    <span>
                      <strong>
                        <T>{p.name}</T>
                      </strong>
                      <small>
                        <T>{p.size}</T>
                      </small>
                    </span>
                    <Badge tone={p.stock === 0 ? "red" : "amber"}>
                      <T>
                        {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                      </T>
                    </Badge>
                  </Link>
                ))}
            </T>{" "}
            <T>
              {!lowStock(state).length && (
                <p className="inline-note">
                  <T>Your shelves are looking good.</T>
                </p>
              )}
            </T>
            <Link href="/dashboard/inventory" className="text-link">
              <T>Take a look at your stock</T>
              <ChevronRight size={15} />
            </Link>
          </section>
        ) : (
          <section className="panel home-workflows">
            <div className="panel-heading">
              <div>
                <h2>
                  <T>Your operations</T>
                </h2>
                <p>
                  <T>{industry.label}</T>
                </p>
              </div>
            </div>
            {industry.workflows.map((workflow) => (
              <Link
                className="home-workflow-row"
                key={workflow.id}
                href="/dashboard/operations"
              >
                <span className="icon-box tone-green">
                  <Package size={17} />
                </span>
                <span>
                  <strong>
                    <T>{workflow.label}</T>
                  </strong>
                  <small>
                    <T>{workflow.description}</T>
                  </small>
                </span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </section>
        )}
        <section className="panel home-actions">
          <div className="panel-heading">
            <div>
              <h2>
                <T>Quick actions</T>
              </h2>
              <p>
                <T>Your everyday essentials</T>
              </p>
            </div>
          </div>
          <div className="home-action-grid">
            {quickActions.map(({ icon: Icon, label, href, tone }) => (
              <Link key={label} href={href}>
                <span className={`icon-box tone-${tone}`}>
                  <Icon size={18} />
                </span>
                <strong>
                  <T>{label}</T>
                </strong>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <Link href="/dashboard/assistant" className="assistant-banner">
        <span className="ai-orb">
          <Sparkles size={21} />
        </span>
        <div>
          <h3>
            <T>A good question can open a new possibility.</T>
          </h3>
          <p>
            <T>
              Ask BiasharaAI about your recorded stock, sales and customer
              balances.
            </T>
          </p>
        </div>
        <span>
          <T>Let’s explore</T>
          <ArrowUpRight size={17} />
        </span>
      </Link>
      <Modal
        open={targetOpen}
        onClose={() => setTargetOpen(false)}
        title="A little target to work towards."
        description="Set a daily sales goal for your shop."
      >
        <form onSubmit={saveTarget}>
          <Field
            label="Daily target (KES)"
            name="target"
            type="number"
            min={1}
            max={100000000}
            required
            defaultValue={state.target}
          />
          <div className="modal-actions">
            <Button type="submit">
              <T>Save target</T>
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
