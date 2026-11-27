"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CalendarClock,
  CircleHelp,
  ChevronDown,
  ClipboardList,
  Command,
  FileText,
  ScanLine,
  Sparkles,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { T, LocalButton, LocalSelect } from "@/components/locale";
import { ConnectionBanner } from "@/components/connection-banner";
import { Avatar, Brand, Button, Modal, SearchField } from "@/components/ui";
import {
  industryFor,
  searchWorkspace,
  workspaceCanUse,
  workspaceLabel,
  workspaceTools,
} from "@/lib/industries";
import {
  activityCount,
  dailyActionPath,
  dailyActions,
} from "@/lib/workspace-activity";
import { useIndustrySummary } from "@/lib/use-industry-summary";
import { useDemo } from "@/lib/store";

const icons: Record<string, typeof Package> = {
  industry: ClipboardList,
  reports: BarChart3,
  sales: ShoppingBag,
  inventory: Package,
  customers: Users,
  suppliers: Truck,
  bookings: CalendarDays,
  documents: FileText,
  expenses: Wallet,
  orders: ClipboardList,
  "sales/new": ScanLine,
  expiry: CalendarClock,
  stocktakes: ClipboardList,
  transfers: Truck,
  deliveries: Truck,
  "online-shop": ShoppingBag,
  "supplier-network": Users,
  register: Wallet,
};

export function IndustryHome() {
  const { state, store } = useDemo();
  const industry = industryFor(state.profile.type);
  const role = store.workspace?.role ?? "";
  const actions = dailyActions(industry.id, role);
  const summary = useIndustrySummary(
    store.workspace?.businessId,
    industry.id,
    role,
    !!actions?.some((action) => action.queue),
  );
  const businessWide =
    industry.modules.length > 0 || industry.id === "services";
  const branch = state.operations.branches.find(
    (item) => item.id === state.operations.activeBranch,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{industry.label}</p>
          <h1>
            <T>Hi</T> {state.profile.name.split(" ")[0]}
          </h1>
          <p>{state.profile.business}</p>
        </div>
      </div>
      {actions ? (
        <section className="commerce-home" aria-labelledby="daily-work">
          <div className="commerce-home-heading">
            <h2 id="daily-work">
              <T>Daily work</T>
            </h2>
            {businessWide ? (
              <p>
                <T>All branches</T>
              </p>
            ) : (
              branch && <p>{branch.name}</p>
            )}
          </div>
          <div className="industry-links">
            {actions.map((action) => {
              const Icon = icons[action.slug] ?? LayoutDashboard;
              const path = dailyActionPath(action);
              const count = action.queue
                ? summary.counts?.[action.queue.module]
                : action.metric && activityCount(state, action.metric);
              return (
                <Link
                  className="card commerce-action"
                  href={`/dashboard/${path}`}
                  key={path}
                >
                  <Icon size={20} aria-hidden="true" />
                  <strong>
                    <T>{action.label}</T>
                  </strong>
                  {typeof count === "number" && (
                    <span className="commerce-count">{count}</span>
                  )}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              );
            })}
          </div>
          {summary.error && (
            <p role="status">
              <T>{summary.error}</T>{" "}
              <LocalButton className="text-button" onClick={summary.retry}>
                <T>Retry</T>
              </LocalButton>
            </p>
          )}
          <div className="commerce-home-links">
            <Link className="text-link" href="/dashboard/assistant">
              <Sparkles size={16} />
              <T>BiasharaAI</T>
            </Link>
            <Link className="text-link" href="/contact">
              <CircleHelp size={16} />
              <T>Contact support</T>
            </Link>
          </div>
        </section>
      ) : (
        <>
          {workspaceCanUse("industry", industry, role) &&
            role !== "Cashier" && (
              <section aria-label={industry.label}>
                <h2>{industry.label}</h2>
                <div className="industry-links">
                  {industry.modules.map((module) => (
                    <Link
                      className="card industry-link"
                      href={`/dashboard/industry?module=${module.id}`}
                      key={module.id}
                    >
                      <ClipboardList size={20} />
                      <strong>{module.label}</strong>
                      <ArrowRight size={16} />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          <section aria-label="Workspace tools">
            <h2>
              <T>Workspace tools</T>
            </h2>
            <div className="industry-links">
              {workspaceTools(industry)
                .filter(
                  (slug) =>
                    workspaceCanUse(slug, industry, role) &&
                    (slug !== "industry" || role === "Cashier"),
                )
                .map((slug) => {
                  const Icon = icons[slug] ?? LayoutDashboard;
                  return (
                    <Link
                      className="card industry-link"
                      href={`/dashboard/${slug}`}
                      key={slug}
                    >
                      <Icon size={20} />
                      <strong>
                        <T>
                          {slug === "industry"
                            ? "Ticket admission"
                            : workspaceLabel(slug)}
                        </T>
                      </strong>
                      <ArrowRight size={16} />
                    </Link>
                  );
                })}
            </div>
          </section>
        </>
      )}
    </>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { state, store } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
      if (event.key === "Escape") setMobile(false);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    if (!store.ready) return;
    if (!store.authenticated) router.replace("/login");
    else if (!store.workspace && !store.error) router.replace("/onboarding");
  }, [store.ready, store.authenticated, store.workspace, store.error, router]);
  if (!store.ready || !store.authenticated || !store.workspace) {
    return (
      <main id="main-content" className="container section">
        <Brand />
        <h1>
          {store.error
            ? "Could not load your business"
            : "Opening your workspace…"}
        </h1>
        {store.error && (
          <>
            <p role="alert">{store.error}</p>
            <Button onClick={() => void store.hydrate()}>
              Retry connection
            </Button>
            <Button href="/login">Sign in</Button>
          </>
        )}
      </main>
    );
  }
  const role = store.workspace.role;
  const industry = industryFor(state.profile.type);
  const curated = dailyActions(industry.id, role);
  const links =
    curated?.map((action) => ({
      slug: action.slug,
      path: dailyActionPath(action),
      label: action.queue
        ? (industry.modules.find((module) => module.id === action.queue?.module)
            ?.label ?? action.label)
        : action.slug === "industry" ||
            (action.slug === "customers" && industry.id === "services")
          ? action.label
          : workspaceLabel(action.slug),
    })) ??
    workspaceTools(industry)
      .filter((slug) => workspaceCanUse(slug, industry, role))
      .map((slug) => ({
        slug,
        path: slug,
        label:
          slug === "industry" && role === "Cashier"
            ? "Ticket admission"
            : workspaceLabel(slug),
      }));
  const results = searchWorkspace(industry, role, query);
  const term = query.trim().toLowerCase();
  const products = term
    ? state.products
        .filter((product) => product.name.toLowerCase().includes(term))
        .slice(0, 4)
    : [];
  const customers = term
    ? state.customers
        .filter((customer) => customer.name.toLowerCase().includes(term))
        .slice(0, 4)
    : [];

  function go(href: string) {
    setMobile(false);
    setSearchOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div className="workspace">
      {mobile && (
        <LocalButton
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`workspace-sidebar ${mobile ? "sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <Brand />
          <LocalButton
            className="icon-button sidebar-close"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={20} />
          </LocalButton>
        </div>
        <Link
          href="/dashboard/settings"
          className="shop-switcher"
          onClick={() => setMobile(false)}
        >
          <span>
            <Building2 size={19} />
          </span>
          <div>
            <strong>{state.profile.business}</strong>
            <small>{industry.label}</small>
          </div>
        </Link>
        <nav aria-label="Business navigation">
          <Link
            href="/dashboard"
            className={pathname === "/dashboard" ? "active" : ""}
            onClick={() => setMobile(false)}
          >
            <LayoutDashboard size={19} />
            <span>
              <T>Overview</T>
            </span>
          </Link>
          {links.map(({ slug, path, label }) => {
            const href = `/dashboard/${path}`;
            const Icon = icons[slug] ?? LayoutDashboard;
            return (
              <Link
                key={path}
                href={href}
                className={pathname === href ? "active" : ""}
                onClick={() => setMobile(false)}
              >
                <Icon size={19} />
                <span>
                  <T>{label}</T>
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <nav>
            {role === "Owner" &&
              !curated &&
              !links.some(({ slug }) => slug === "online-shop") && (
                <Link
                  href="/dashboard/online-shop"
                  className={
                    pathname === "/dashboard/online-shop" ? "active" : ""
                  }
                  onClick={() => setMobile(false)}
                >
                  <ShoppingBag size={18} />
                  <span>
                    <T>Shop builder</T>
                  </span>
                </Link>
              )}
            <Link
              href="/dashboard/settings"
              className={pathname === "/dashboard/settings" ? "active" : ""}
              onClick={() => setMobile(false)}
            >
              <Settings size={18} />
              <span>
                <T>Settings</T>
              </span>
            </Link>
          </nav>
          <div className="sidebar-person">
            <Avatar name={state.profile.name} small />
            <div>
              <strong>{state.profile.name}</strong>
              <small>{role}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <LocalButton
            className="icon-button workspace-menu"
            aria-label="Open workspace navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </LocalButton>
          <LocalButton
            className="global-search"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={17} />
            <span>
              <T>Search anything…</T>
            </span>
            <kbd>
              <Command size={11} />K
            </kbd>
          </LocalButton>
          <div className="topbar-right">
            {state.operations.branches.length > 1 && (
              <LocalSelect
                className="branch-top-select"
                aria-label="Active branch"
                value={state.operations.activeBranch}
                onChange={(event) =>
                  void store
                    .command({ type: "branch", id: event.target.value })
                    .catch(() => {})
                }
              >
                {state.operations.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </LocalSelect>
            )}
            <Link href="/dashboard/settings" className="topbar-profile">
              <Avatar name={state.profile.name} small />
              <span>
                {state.profile.name.split(" ")[0]}
                <small>
                  <T>Account</T>
                </small>
              </span>
              <ChevronDown size={13} />
            </Link>
          </div>
        </header>
        <ConnectionBanner />
        {store.busy && (
          <>
            <div role="status" className="connection-banner">
              Saving to your business…
            </div>
            <div className="saving-overlay" aria-label="Saving changes" />
          </>
        )}
        {store.error && (
          <div role="alert" className="operation-error">
            {store.error}{" "}
            {store.hasPending ? (
              <button onClick={() => void store.retry().catch(() => {})}>
                Retry saved request
              </button>
            ) : (
              <button onClick={() => void store.hydrate()}>
                Refresh records
              </button>
            )}
          </div>
        )}
        {store.storageWarning && (
          <div className="operation-error">{store.storageWarning}</div>
        )}
        <main className="workspace-main" id="main-content">
          <T>{children}</T>
        </main>
        <footer className="workspace-footer">
          <Link href="/help">
            <T>Help & support</T>
          </Link>
          <button
            onClick={() =>
              void store
                .signOut()
                .then(() => router.replace("/login"))
                .catch(() => {})
            }
          >
            <T>Sign out</T>
          </button>
        </footer>
      </div>
      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Search workspace"
        description="Find tools, products and customers."
      >
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search tools, products or customers…"
        />
        <div className="search-results">
          {results.map(({ slug, label }) => (
            <LocalButton key={slug} onClick={() => go(`/dashboard/${slug}`)}>
              <Search size={16} />
              <span>
                <T>{label}</T>
              </span>
              <ArrowRight size={14} />
            </LocalButton>
          ))}
          {products.map((product) => (
            <LocalButton
              key={product.id}
              onClick={() =>
                go(`/dashboard/inventory?q=${encodeURIComponent(product.name)}`)
              }
            >
              <Package size={16} />
              <span>{product.name}</span>
              <ArrowRight size={14} />
            </LocalButton>
          ))}
          {customers.map((customer) => (
            <LocalButton
              key={customer.id}
              onClick={() =>
                go(
                  `/dashboard/customers?q=${encodeURIComponent(customer.name)}`,
                )
              }
            >
              <Users size={16} />
              <span>{customer.name}</span>
              <ArrowRight size={14} />
            </LocalButton>
          ))}
          {!results.length && !products.length && !customers.length && (
            <p className="search-empty">
              <T>No matches found.</T>
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
