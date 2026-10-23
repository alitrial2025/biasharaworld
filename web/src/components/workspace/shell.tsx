"use client";
import { T, LocalButton, LocalSelect } from "@/components/locale";

import Link from "next/link";
import { ConnectionBanner } from "@/components/connection-banner";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  Command,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Sprout,
  Store,
  Truck,
  Users,
  UsersRound,
  Wallet,
  X,
  Grid2X2,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Brand,
  Button,
  Modal,
  ProductArt,
  SearchField,
} from "@/components/ui";
import { useDemo } from "@/lib/store";
import { lowStock } from "@/lib/data";

const mainLinks = [
  ["Overview", "/dashboard", LayoutDashboard],
  ["Sales", "/dashboard/sales", ShoppingBag],
  ["Inventory", "/dashboard/inventory", Package],
  ["Customers", "/dashboard/customers", Users],
  ["Suppliers", "/dashboard/suppliers", Truck],
] as const;
const tools = [
  ["All business tools", "/dashboard/tools", Grid2X2],
  ["Purchase orders", "/dashboard/orders", ShoppingCart],
  ["Expenses", "/dashboard/expenses", Wallet],
  ["Reports", "/dashboard/reports", BarChart3],
  ["BiasharaAI", "/dashboard/assistant", Sparkles],
  ["Financing", "/dashboard/financing", Sprout],
  ["Your team", "/dashboard/team", UsersRound],
] as const;

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { state, store } = useDemo();
  const pathname = usePathname();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [alerts, setAlerts] = useState(false);
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") setMobile(false);
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(()=>{
    if(!store.ready)return;
    if(!store.authenticated)router.replace('/login');
    else if(!store.workspace&&!store.error)router.replace('/onboarding');
  },[store.ready,store.authenticated,store.workspace,store.error,router]);
  if(!store.ready||!store.authenticated||!store.workspace)return <main id="main-content" className="container section"><Brand/><h1>{store.error?'Could not load your business':'Opening your workspace…'}</h1>{store.error&&<><p role="alert">{store.error}</p><Button onClick={()=>void store.hydrate()}>Retry connection</Button><Button href="/login">Sign in</Button></>}</main>;
  const active = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  function go(href: string) {
    setMobile(false);
    setSearchOpen(false);
    setAlerts(false);
    router.push(href);
  }
  const matchingProducts = query
    ? state.products
        .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 4)
    : [];
  const matchingCustomers = query
    ? state.customers
        .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
    : [];
  return (
    <div className="workspace">
      <T>
        {mobile && (
          <LocalButton
            className="sidebar-scrim"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          />
        )}
      </T>

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
            <Store size={19} />
          </span>
          <div>
            <strong>
              <T>{state.profile.business}</T>
            </strong>
            <small>
              <T>Business workspace</T>
            </small>
          </div>
          <ChevronDown size={14} />
        </Link>
        <div className="sidebar-section-label">
          <T>YOUR BUSINESS</T>
        </div>
        <nav aria-label="Business navigation">
          <T>
            {mainLinks.map(([label, href, Icon]) => (
              <Link
                onClick={() => setMobile(false)}
                className={active(href) ? "active" : ""}
                href={href}
                key={href}
              >
                <Icon size={19} />
                <span>
                  <T>{label}</T>
                </span>

                <T>
                  {href === "/dashboard/inventory" &&
                    lowStock(state).length > 0 && (
                      <small>
                        <T>{lowStock(state).length}</T>
                      </small>
                    )}
                </T>
              </Link>
            ))}
          </T>
        </nav>
        <div className="sidebar-section-label">
          <T>ROOM TO GROW</T>
        </div>
        <nav aria-label="Business tools">
          <T>
            {tools.map(([label, href, Icon]) => (
              <Link
                onClick={() => setMobile(false)}
                className={active(href) ? "active" : ""}
                href={href}
                key={href}
              >
                <Icon size={19} />
                <span>
                  <T>{label}</T>
                </span>

                <T>
                  {label === "BiasharaAI" && <span className="ai-nav-dot" />}
                </T>
              </Link>
            ))}
          </T>
        </nav>
        <div className="sidebar-bottom">
          <Link className="sidebar-app-link" href="/download">
            <Smartphone size={20} />
            <div>
              <strong>
                <T>Your shop, in your pocket.</T>
              </strong>
              <span>
                <T>Meet the Android preview</T>
                <ArrowRight size={11} />
              </span>
            </div>
          </Link>
          <nav>
            <Link
              className={active("/dashboard/settings") ? "active" : ""}
              href="/dashboard/settings"
              onClick={() => setMobile(false)}
            >
              <Settings size={18} />
              <T>Settings</T>
            </Link>
            <Link href="/help">
              <CircleHelp size={18} />
              <T>Help & support</T>
              <ArrowRight size={13} />
            </Link>
          </nav>
          <div className="sidebar-person">
            <Avatar name={state.profile.name} small />
            <div>
              <strong>
                <T>{state.profile.name}</T>
              </strong>
              <small>
                <T>Business owner</T>
              </small>
            </div>
            <Badge tone="gray">
              <T>{store.workspace.role}</T>
            </Badge>
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
              <Command size={11} />
              <T>K</T>
            </kbd>
          </LocalButton>
          <div className="topbar-right">
            <LocalSelect
              className="branch-top-select"
              aria-label="Active branch"
              value={state.operations.activeBranch}
              onChange={async (e) =>
                await store.command({ type: "branch", id: e.target.value })
              }
            >
              <T>
                {state.operations.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    <T>{b.name}</T>
                  </option>
                ))}
              </T>
            </LocalSelect>
            <Link
              href="/help"
              className="icon-button help-top"
              aria-label="Help centre"
            >
              <CircleHelp size={20} />
            </Link>
            <LocalButton
              className="icon-button notification-button"
              aria-label="View notifications"
              onClick={() => setAlerts(true)}
            >
              <Bell size={20} />
              <T>{lowStock(state).length > 0 && <span />}</T>
            </LocalButton>
            <div className="topbar-divider" />
            <Link href="/dashboard/settings" className="topbar-profile">
              <Avatar name={state.profile.name} small />
              <span>
                <T>{state.profile.name.split(" ")[0]}</T>
                <small>
                  <T>Account</T>
                </small>
              </span>
              <ChevronDown size={13} />
            </Link>
          </div>
        </header>
        <ConnectionBanner />
        {store.busy&&<div role="status" className="connection-banner">Saving to your business…</div>}
        {store.error&&<div role="alert" className="operation-error">{store.error} {store.hasPending?<button onClick={()=>void store.retry().catch(()=>{})}>Retry saved request</button>:<button onClick={()=>void store.hydrate()}>Refresh records</button>}</div>}
        {store.busy&&<div className="saving-overlay" aria-label="Saving changes"/>}

        <T>
          {store.storageWarning && (
            <div className="operation-error">
              <T>{store.storageWarning}</T>
            </div>
          )}
        </T>

        <div className="demo-bar">
          <span>
            <span className="status-dot" />
            <T>Your private workspace · Changes saved securely.</T>
          </span>
          <Link href="/help">
            <T>How it works</T>
            <ArrowUpRightIcon />
          </Link>
        </div>
        <main className="workspace-main" id="main-content">
          <T>{children}</T>
        </main>
        <footer className="workspace-footer">
          <span>
            <T>BiasharaOS · A little less juggling. A lot more growing.</T>
          </span>
          <span>
            <button onClick={async()=>{
 try {
await store.signOut();router.replace("/login")
 } catch { /* The shared connection banner retains the server error and retry action. */ }
}}>Sign out</button>
          </span>
        </footer>
      </div>
      <Modal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="A little shortcut to anywhere."
        description="Search your products, people and business tools."
      >
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search products or customers…"
        />
        <div className="search-results">
          <T>
            {!query &&
              [...mainLinks, ...tools]
                .slice(0, 9)
                .map(([label, href, Icon]) => (
                  <LocalButton key={href} onClick={() => go(href)}>
                    <Icon size={17} />
                    <span>
                      <T>{label}</T>
                    </span>
                    <ArrowRight size={14} />
                  </LocalButton>
                ))}
          </T>{" "}
          <T>
            {matchingProducts.map((p) => (
              <LocalButton
                key={p.id}
                onClick={() =>
                  go(`/dashboard/inventory?q=${encodeURIComponent(p.name)}`)
                }
              >
                <ProductArt art={p.art} name={p.name} small />
                <span>
                  <strong>
                    <T>{p.name}</T>
                  </strong>
                  <small>
                    <T>{p.stock}</T> <T>in stock ·</T> <T>{p.category}</T>
                  </small>
                </span>
                <ArrowRight size={14} />
              </LocalButton>
            ))}
          </T>{" "}
          <T>
            {matchingCustomers.map((c) => (
              <LocalButton
                key={c.id}
                onClick={() =>
                  go(`/dashboard/customers?q=${encodeURIComponent(c.name)}`)
                }
              >
                <Avatar name={c.name} color={c.color} small />
                <span>
                  <T>{c.name}</T>
                </span>
                <ArrowRight size={14} />
              </LocalButton>
            ))}
          </T>{" "}
          <T>
            {query && !matchingProducts.length && !matchingCustomers.length && (
              <p className="search-empty">
                <T>No matches yet. Try a product or customer name.</T>
              </p>
            )}
          </T>
        </div>
      </Modal>
      <Modal
        open={alerts}
        onClose={() => setAlerts(false)}
        title="A few shelves need attention."
        description="Sample stock alerts from your demo business."
      >
        <div className="alert-list">
          <T>
            {lowStock(state).map((p) => (
              <LocalButton
                key={p.id}
                onClick={() =>
                  go(`/dashboard/inventory?q=${encodeURIComponent(p.name)}`)
                }
              >
                <ProductArt art={p.art} name={p.name} />
                <div>
                  <strong>
                    <T>{p.name}</T>
                  </strong>
                  <span>
                    <T>
                      {p.stock === 0
                        ? "Out of stock"
                        : `${p.stock} left · time to restock`}
                    </T>
                  </span>
                </div>
                <Badge tone={p.stock === 0 ? "red" : "amber"}>
                  <T>{p.stock}</T> <T>left</T>
                </Badge>
              </LocalButton>
            ))}
          </T>{" "}
          <T>
            {!lowStock(state).length && (
              <p className="inline-note">
                <T>All your products are above their reorder points.</T>
              </p>
            )}
          </T>
        </div>
        <div className="modal-actions">
          <Button href="/dashboard/inventory" arrow>
            <T>Open inventory</T>
          </Button>
        </div>
      </Modal>
    </div>
  );
}
function ArrowUpRightIcon() {
  return <ArrowRight size={12} style={{ transform: "rotate(-35deg)" }} />;
}
