"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ShoppingBag, Search, Mail, MapPin, Phone } from "lucide-react";
import { Brand, Button, Field, ProductArt } from "./ui";
import { supabase } from "@/lib/supabase";
import { cash } from "@/lib/operations";
import {
  storefrontPalettes,
  type PublicStorefront,
  type ShopCatalog,
} from "@/lib/storefront";

const unstyled: PublicStorefront = {
  template: "market",
  palette: "forest",
  name: "",
  headline: "",
  description: "",
  logo: "",
  cover: "",
  fulfillment: "delivery",
  pickup: "",
  email: "",
  phone: "",
  whatsapp: "",
  hours: "",
};

export function StorefrontDesign({
  design,
  shop,
  children,
  cart,
  edit,
  preview = false,
  header,
}: {
  design: PublicStorefront;
  shop: ShopCatalog;
  children?: ReactNode;
  cart?: Record<number, number>;
  edit?: (id: number, count: number) => void;
  preview?: boolean;
  header?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const palette =
    storefrontPalettes.find((theme) => theme.id === design.palette) ??
    storefrontPalettes[0];
  const style = {
    "--shop-ink": palette.ink,
    "--shop-wash": palette.wash,
  } as CSSProperties;
  const template = design.template || "market";
  const name = design.name || shop.name || "Your shop";
  const categories = [
    ...new Set(
      shop.products.map((product) => product.category).filter(Boolean),
    ),
  ].sort();
  const products = shop.products.filter(
    (product) =>
      (!category || product.category === category) &&
      `${product.name} ${product.size} ${product.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const cover = design.cover
    ? { backgroundImage: `url(${JSON.stringify(design.cover)})` }
    : undefined;
  const logo = design.logo
    ? { backgroundImage: `url(${JSON.stringify(design.logo)})` }
    : undefined;
  return (
    <div
      className={`storefront storefront-${template} ${preview ? "storefront-preview" : ""}`}
      style={style}
    >
      <header className="storefront-bar">
        <span className="storefront-wordmark">
          {logo && (
            <span className="storefront-logo" style={logo} aria-hidden="true" />
          )}
          {name}
        </span>
        {header}
      </header>
      <section className="storefront-hero">
        <div className="storefront-intro">
          <h1>{design.headline || name}</h1>
          {(design.description || shop.description) && (
            <p>{design.description || shop.description}</p>
          )}
          {!preview && shop.products.length > 0 && (
            <a href="#catalogue">Browse products</a>
          )}
        </div>
        {(template !== "directory" || cover) && (
          <div className="storefront-cover" style={cover} aria-hidden="true">
            {!cover &&
              (shop.products[0] ? (
                <ProductArt
                  art={shop.products[0].art}
                  name={shop.products[0].name}
                />
              ) : (
                <ShoppingBag strokeWidth={1} size={62} />
              ))}
          </div>
        )}
      </section>
      <div className="storefront-content">
        {shop.products.length > 0 && (
          <section
            id={preview ? undefined : "catalogue"}
            className="storefront-catalogue"
          >
            <h2>{template === "studio" ? "The collection" : "Products"}</h2>
            <div className="storefront-filters">
              <label className="storefront-search">
                <Search size={18} />
                <input
                  aria-label="Search this shop"
                  placeholder="Find a product"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              {categories.length > 1 && (
                <div
                  className="storefront-categories"
                  aria-label="Product categories"
                >
                  <button
                    type="button"
                    aria-pressed={!category}
                    onClick={() => setCategory("")}
                  >
                    All
                  </button>
                  {categories.map((item) => (
                    <button
                      type="button"
                      key={item}
                      aria-pressed={item === category}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {products.length === 0 && <p>No products match your search.</p>}
            <div className="storefront-products">
              {products.map((product) => (
                <article key={product.id}>
                  <ProductArt art={product.art} name={product.name} />
                  <div className="storefront-product-title">
                    <h3>{product.name}</h3>
                    <span>{product.size}</span>
                  </div>
                  <strong>{cash(Math.round(product.price * 100))}</strong>
                  {edit && (
                    <label className="storefront-quantity">
                      <span>{product.stock ? "Quantity" : "Out of stock"}</span>
                      <input
                        aria-label={`Quantity for ${product.name}`}
                        type="number"
                        min={0}
                        max={product.stock}
                        value={cart?.[product.id] || 0}
                        disabled={!product.stock}
                        onChange={(event) =>
                          edit(
                            product.id,
                            Math.max(
                              0,
                              Math.min(
                                product.stock,
                                Math.floor(Number(event.target.value) || 0),
                              ),
                            ),
                          )
                        }
                      />
                    </label>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        {!!shop.services?.length && (
          <section className="storefront-services">
            <h2>Services</h2>
            {shop.services.map((service) => (
              <article key={service.id}>
                <h3>{service.name}</h3>
                <span>{service.duration} min</span>
                <strong>{cash(service.price)}</strong>
              </article>
            ))}
          </section>
        )}
        {children}
        {(design.email ||
          design.phone ||
          design.whatsapp ||
          design.hours ||
          design.pickup) && (
          <section className="storefront-contact">
            <h2>Contact</h2>
            <div>
              {design.email && (
                <a href={`mailto:${design.email}`}>
                  <Mail size={17} />
                  {design.email}
                </a>
              )}
              {design.phone && (
                <a href={`tel:${design.phone.replace(/[ ()-]/g, "")}`}>
                  <Phone size={17} />
                  {design.phone}
                </a>
              )}
              {design.whatsapp && (
                <a
                  href={`https://wa.me/${design.whatsapp.replace(/^\+/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              )}
              {design.pickup && design.fulfillment === "pickup" && (
                <span>
                  <MapPin size={17} />
                  {design.pickup}
                </span>
              )}
              {design.hours && <span>{design.hours}</span>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export function PublicShop({
  slug,
  username,
  design = unstyled,
  initial,
}: {
  slug: string;
  username?: string;
  design?: PublicStorefront;
  initial?: ShopCatalog;
}) {
  const path = username ? `/${username}` : `/shop/${slug}`;
  const key = `biashara-shop-basket:${slug}`;
  const apiPath = `/api/shop/${encodeURIComponent(slug)}`;
  const [shop, setShop] = useState<ShopCatalog | null>(initial ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [cart, setCart] = useState<Record<number, number>>({});
  const [pending, setPending] = useState<{
    requestId: string;
    cart: Record<number, number>;
    address: string;
  } | null>(null);

  useEffect(() => {
    if (initial) return;
    const controller = new AbortController();
    void fetch(apiPath, { cache: "no-store", signal: controller.signal })
      .then(async (result) => {
        const data = await result.json();
        if (!result.ok) throw new Error(data.error);
        setShop(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [apiPath, initial]);

  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        setCart(JSON.parse(browserStorage(key) || "{}"));
      } catch {
        /* The visitor starts with an empty basket. */
      }
    });
  }, [key]);

  const login = `/login?next=${encodeURIComponent(path)}`;
  const signup = `/signup?next=${encodeURIComponent(path)}`;
  const validCart = Object.fromEntries(
    (shop?.products ?? []).map((product) => [
      product.id,
      Math.max(
        0,
        Math.min(product.stock, Math.floor(Number(cart[product.id])) || 0),
      ),
    ]),
  );
  const quantity = Object.values(validCart).reduce(
    (total, count) => total + count,
    0,
  );

  function edit(id: number, count: number) {
    if (busy || pending) return;
    const changed = { ...validCart, [id]: count };
    setCart(changed);
    browserStorage(key, JSON.stringify(changed));
  }

  async function order(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const {
        data: { session },
      } = await supabase().auth.getSession();
      if (!session)
        throw new Error(
          "Sign in with your customer account before ordering. Your basket is saved.",
        );
      const body = pending ?? {
        requestId: crypto.randomUUID(),
        cart: Object.fromEntries(
          Object.entries(validCart).filter(([, count]) => count > 0),
        ),
        address: String(new FormData(event.currentTarget).get("address") || ""),
      };
      setPending(body);
      const response = await fetch(apiPath, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status < 500) setPending(null);
        throw new Error(data.error);
      }
      setMessage(`Order #${data.id} sent. Open My orders to follow it.`);
      setPending(null);
      setCart({});
      browserStorage(key, "{}");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Order unconfirmed. Retry safely.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!shop)
    return (
      <main id="main-content" className="container section">
        <Brand />
        <h1>Your neighbourhood shop</h1>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  return (
    <main id="main-content">
      <StorefrontDesign
        design={design}
        shop={shop}
        cart={validCart}
        edit={edit}
        header={
          <nav aria-label="Shop navigation">
            {!!quantity && <a href="#order">Basket ({quantity})</a>}
            <Link href={`/portal/${slug}`}>My orders</Link>
            <Link href={login}>Sign in</Link>
          </nav>
        }
      >
        {shop.products.length > 0 && (
          <form id="order" onSubmit={order} className="storefront-order">
            <h2>Your order</h2>
            <p>
              {design.fulfillment === "pickup"
                ? `Pickup at ${design.pickup}`
                : `Delivery fee ${cash(shop.fee)}`}
            </p>
            <p>
              <strong>
                {cash(
                  shop.products.reduce(
                    (total, product) =>
                      total +
                      Math.round(product.price * 100) *
                        (validCart[product.id] || 0),
                    quantity ? shop.fee : 0,
                  ),
                )}
              </strong>
            </p>
            <Field
              name="address"
              label={
                design.fulfillment === "pickup"
                  ? "Pickup instructions or contact number"
                  : "Delivery address"
              }
              required
              minLength={3}
              maxLength={500}
            />
            <Button type="submit" disabled={busy || !quantity}>
              {pending ? "Retry order" : "Send order"}
            </Button>
            <p>
              <Link href={login}>Sign in</Link> or{" "}
              <Link href={signup}>create a customer account</Link> to send your
              order and pay when the merchant enables payment.
            </p>
            {error && (
              <p role="alert" className="operation-error">
                {error}
              </p>
            )}
            {message && <p role="status">{message}</p>}
          </form>
        )}
      </StorefrontDesign>
      <footer className="storefront-footer">
        <Link href="/">Powered by BiasharaOS</Link>
      </footer>
    </main>
  );
}

function browserStorage(key: string, value?: string) {
  try {
    if (value === undefined) return sessionStorage.getItem(key);
    sessionStorage.setItem(key, value);
  } catch {
    /* An order can still be placed in this tab. */
  }
  return null;
}
type PortalOrder = {
  id: number;
  status: string;
  total: number;
  paid: boolean;
  onlinePayment: "pending" | "available" | "suspended" | null;
};
type PortalData = {
  business: string;
  customer: string;
  balance: number;
  points: number;
  orders: PortalOrder[];
  checkoutMethods?: string[];
  emailOptIn?: boolean | null;
  documents: {
    id: number;
    kind: string;
    total: number;
    status: string;
    due: string;
    outstanding: number | null;
  }[];
};

async function customerRequest(path: string, input?: Record<string, unknown>) {
  const {
    data: { session },
  } = await supabase().auth.getSession();
  if (!session)
    throw new Error(
      "Sign in with your verified customer email to view private records.",
    );
  const response = await fetch(path, {
    method: input ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(input ? { "Content-Type": "application/json" } : {}),
    },
    body: input ? JSON.stringify(input) : undefined,
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not load your order.");
  return result;
}

export function PublicPortal({ slug }: { slug: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyOrder, setBusyOrder] = useState<number | null>(null);
  const [savingPreference, setSavingPreference] = useState(false);
  const preferenceRequest = useRef<{ id: string; emailOptIn: boolean } | null>(
    null,
  );
  const portalPath = `/api/portal/${encodeURIComponent(slug)}`;
  useEffect(() => {
    let current = true;
    async function load() {
      const initial: PortalData = await customerRequest(portalPath);
      if (!current) return;
      setData(initial);
      const callback = new URL(window.location.href);
      const order = initial.orders.find(
        ({ id }) => String(id) === callback.searchParams.get("paymentOrder"),
      );
      if (
        !order ||
        (order.onlinePayment !== "pending" &&
          order.onlinePayment !== "suspended")
      )
        return;
      setBusyOrder(order.id);
      try {
        const verified = await customerRequest(
          `/api/payments/order/${encodeURIComponent(slug)}`,
          { orderId: order.id, action: "refresh" },
        );
        if (!current) return;
        if (verified.status === "paid") {
          const updated = await customerRequest(portalPath);
          if (!current) return;
          setData(updated);
          setMessage(`Payment confirmed for order #${order.id}.`);
        }
      } finally {
        if (current) setBusyOrder(null);
      }
    }
    load().catch((error) => {
      if (current) setError(error.message);
    });
    return () => {
      current = false;
    };
  }, [portalPath, slug]);

  async function payment(orderId: number, action: "start" | "refresh") {
    setBusyOrder(orderId);
    setError("");
    setMessage("");
    try {
      const result = await customerRequest(
        `/api/payments/order/${encodeURIComponent(slug)}`,
        { orderId, action },
      );
      if (action === "start" && result.checkoutUrl) {
        const url = new URL(result.checkoutUrl);
        if (
          url.origin !== "https://checkout.paystack.com" ||
          url.username ||
          url.password
        )
          throw new Error("Could not open secure checkout.");
        window.location.assign(url.href);
        return;
      }
      setData(await customerRequest(portalPath));
      if (result.status === "paid")
        setMessage(`Payment confirmed for order #${orderId}.`);
      else if (result.status === "preparing")
        setMessage(
          "Checkout is being prepared. Check the payment status before paying another way.",
        );
      else if (result.status === "suspended")
        setMessage(
          "Online checkout is unavailable for this order. Check the status before paying another way.",
        );
      else setMessage("Payment has not been confirmed yet.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not check the payment.",
      );
    } finally {
      setBusyOrder(null);
    }
  }

  async function updatePreference(emailOptIn: boolean) {
    setSavingPreference(true);
    setError("");
    setMessage("");
    try {
      if (preferenceRequest.current?.emailOptIn !== emailOptIn)
        preferenceRequest.current = { id: crypto.randomUUID(), emailOptIn };
      const result = await customerRequest(
        `${portalPath}/preferences`,
        preferenceRequest.current,
      );
      preferenceRequest.current = null;
      setData((value) => value && { ...value, emailOptIn: result.emailOptIn });
      setMessage("Marketing preference saved.");
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save your preference.",
      );
    } finally {
      setSavingPreference(false);
    }
  }

  return (
    <main id="main-content" className="container section">
      <Brand />
      <h1>{data ? `Hello, ${data.customer}` : "Your customer account"}</h1>
      {error && <p role="alert">{error}</p>}
      {error && !data && <Button href="/login">Sign in</Button>}
      {message && <p role="status">{message}</p>}
      {data && (
        <>
          <p>{data.business}</p>
          <div className="stats-grid">
            <article className="panel">
              <h2>Outstanding balance</h2>
              {cash(Math.round(data.balance * 100))}
            </article>
            <article className="panel">
              <h2>Reward points</h2>
              {data.points}
            </article>
          </div>
          <h2>Your orders</h2>
          {data.orders.length ? (
            data.orders.map((order) => (
              <article className="panel" key={order.id}>
                <h3>Order #{order.id}</h3>
                <p>
                  {order.status} · {cash(order.total)} ·{" "}
                  {order.paid ? "Payment recorded" : "Payment pending"}
                </p>
                {order.onlinePayment === "available" &&
                  !!data.checkoutMethods?.length && (
                    <p>{data.checkoutMethods.join(" · ")}</p>
                  )}
                {order.onlinePayment && (
                  <div className="button-row">
                    {order.onlinePayment !== "suspended" && (
                      <Button
                        disabled={busyOrder !== null}
                        onClick={() => void payment(order.id, "start")}
                      >
                        {order.onlinePayment === "pending"
                          ? "Open checkout"
                          : "Pay online"}
                      </Button>
                    )}
                    {order.onlinePayment !== "available" && (
                      <Button
                        variant="secondary"
                        disabled={busyOrder !== null}
                        onClick={() => void payment(order.id, "refresh")}
                      >
                        Check payment status
                      </Button>
                    )}
                  </div>
                )}
              </article>
            ))
          ) : (
            <p>No orders yet.</p>
          )}
          <h2>Your documents</h2>
          {data.documents.map((document) => (
            <article className="panel" key={document.id}>
              {document.kind} #{Math.abs(document.id)} · {cash(document.total)}{" "}
              · {document.status}
              {!!document.outstanding && (
                <p>
                  Outstanding {cash(document.outstanding)} · Due {document.due}
                </p>
              )}
            </article>
          ))}
          {typeof data.emailOptIn === "boolean" && (
            <section className="panel">
              <h2>Email preferences</h2>
              <p>
                {data.emailOptIn
                  ? "Promotional email is on."
                  : "Promotional email is off."}
              </p>
              <Button
                disabled={savingPreference}
                variant="secondary"
                onClick={() => void updatePreference(!data.emailOptIn)}
              >
                {data.emailOptIn
                  ? "Opt out of promotional email"
                  : "Allow promotional email"}
              </Button>
            </section>
          )}
        </>
      )}
      <Link href={`/shop/${slug}`}>Visit shop</Link>
    </main>
  );
}
