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
import {
  ShoppingBag,
  Search,
  Mail,
  MapPin,
  Phone,
  ArrowLeft,
  ArrowUpRight,
  PackageOpen,
  Plus,
  Minus,
} from "lucide-react";
import { Brand, Button, Field } from "./ui";
import { supabase } from "@/lib/supabase";
import { cash } from "@/lib/operations";
import type { OrderUpdate } from "@/lib/order-progress";
import {
  storefrontPalettes,
  type PublicStorefront,
  type ShopCatalog,
  type ShopProduct,
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

function photoStyle(url: string): CSSProperties | undefined {
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined;
}

function ProductPhoto({ product }: { product: ShopProduct }) {
  return (
    <div
      className={`storefront-product-photo ${product.image ? "has-image" : ""}`}
      style={photoStyle(product.image ?? "")}
      role={product.image ? "img" : undefined}
      aria-label={product.image ? product.name : undefined}
      aria-hidden={product.image ? undefined : true}
    >
      {!product.image && <PackageOpen size={34} strokeWidth={1.25} />}
    </div>
  );
}

function Quantity({
  product,
  count,
  edit,
}: {
  product: ShopProduct;
  count: number;
  edit: (id: number, count: number) => void;
}) {
  return product.stock ? (
    <div className="storefront-quantity">
      <button
        type="button"
        aria-label={`Remove one ${product.name}`}
        disabled={count < 1}
        onClick={() => edit(product.id, count - 1)}
      >
        <Minus size={16} />
      </button>
      <input
        aria-label={`Quantity for ${product.name}`}
        inputMode="numeric"
        type="number"
        min={0}
        max={product.stock}
        value={count}
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
      <button
        type="button"
        aria-label={`Add one ${product.name}`}
        disabled={count >= product.stock}
        onClick={() => edit(product.id, count + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  ) : (
    <p className="storefront-stock">Out of stock</p>
  );
}

export function StorefrontDesign({
  design,
  shop,
  children,
  cart,
  edit,
  preview = false,
  header,
  path,
  product,
  missingProduct,
}: {
  design: PublicStorefront;
  shop: ShopCatalog;
  children?: ReactNode;
  cart?: Record<number, number>;
  edit?: (id: number, count: number) => void;
  preview?: boolean;
  header?: ReactNode;
  path?: string;
  product?: ShopProduct;
  missingProduct?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("");
  const [inStock, setInStock] = useState(false);
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
    ...new Set(shop.products.map((item) => item.category).filter(Boolean)),
  ].sort();
  const products = shop.products.filter(
    (item) =>
      (!category || item.category === category) &&
      (!inStock || item.stock > 0) &&
      `${item.name} ${item.size} ${item.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  if (sort === "low") products.sort((a, b) => a.price - b.price);
  if (sort === "high") products.sort((a, b) => b.price - a.price);
  if (sort === "name") products.sort((a, b) => a.name.localeCompare(b.name));

  const heroPhoto =
    design.cover || shop.products.find((item) => item.image)?.image || "";
  const logo = (
    <>
      {design.logo && (
        <span
          className="storefront-logo"
          style={photoStyle(design.logo)}
          aria-hidden="true"
        />
      )}
      {name}
    </>
  );
  const hasContact = Boolean(
    design.email ||
      design.phone ||
      design.whatsapp ||
      design.hours ||
      (design.pickup && design.fulfillment === "pickup"),
  );
  const catalogueLink = shop.products.length
    ? "#catalogue"
    : shop.services?.length
      ? "#services"
      : hasContact
        ? "#contact"
        : null;

  return (
    <div
      className={`storefront storefront-${template} ${preview ? "storefront-preview" : ""}`}
      style={style}
    >
      <header className="storefront-bar">
        {path ? (
          <Link href={path} className="storefront-wordmark">
            {logo}
          </Link>
        ) : (
          <span className="storefront-wordmark">{logo}</span>
        )}
        {header}
      </header>
      {!product && (
        <section
          className={`storefront-hero ${heroPhoto ? "storefront-hero-photo" : ""}`}
        >
          <div className="storefront-intro">
            <h1>{design.headline || name}</h1>
            {(design.description || shop.description) && (
              <p>{design.description || shop.description}</p>
            )}
            {!preview && catalogueLink && (
              <a className="storefront-cta" href={catalogueLink}>
                {shop.products.length
                  ? "Browse products"
                  : shop.services?.length
                    ? "Explore services"
                    : "Contact us"}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            )}
          </div>
          {heroPhoto && (
            <div
              className="storefront-cover"
              style={photoStyle(heroPhoto)}
              aria-hidden="true"
            />
          )}
        </section>
      )}
      <div className="storefront-content">
        {missingProduct && (
          <p role="status">
            This product is no longer listed. Browse the current catalogue
            below.
          </p>
        )}
        {product && (
          <section className="storefront-product-detail">
            <div className="storefront-detail-media">
              <ProductPhoto product={product} />
            </div>
            <div className="storefront-detail-info">
              <Link className="storefront-back" href={`${path}#catalogue`}>
                <ArrowLeft size={16} /> All products
              </Link>
              {product.category && (
                <p className="storefront-product-category">
                  {product.category}
                </p>
              )}
              <h1>{product.name}</h1>
              {product.size && <p>{product.size}</p>}
              {product.description && (
                <p className="storefront-detail-description">
                  {product.description}
                </p>
              )}
              <strong className="storefront-detail-price">
                {cash(Math.round(product.price * 100))}
              </strong>
              {edit && (
                <Quantity
                  product={product}
                  count={cart?.[product.id] ?? 0}
                  edit={edit}
                />
              )}
              {!!cart?.[product.id] && (
                <a className="storefront-cta" href="#order">
                  View basket <ArrowUpRight size={17} />
                </a>
              )}
            </div>
          </section>
        )}
        {!product && shop.products.length > 0 && (
          <section
            id={preview ? undefined : "catalogue"}
            className="storefront-catalogue"
          >
            <div className="storefront-section-heading">
              <h2>{template === "studio" ? "The collection" : "Products"}</h2>
              {!preview && (
                <span>
                  {products.length}{" "}
                  {products.length === 1 ? "product" : "products"}
                </span>
              )}
            </div>
            <div className="storefront-filters">
              <label className="storefront-search">
                <Search size={18} aria-hidden="true" />
                <input
                  aria-label="Search this shop"
                  placeholder="Find a product"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="">Featured</option>
                <option value="name">Name A–Z</option>
                <option value="low">Price, low to high</option>
                <option value="high">Price, high to low</option>
              </select>
              <label className="storefront-in-stock">
                <input
                  type="checkbox"
                  checked={inStock}
                  onChange={(event) => setInStock(event.target.checked)}
                />{" "}
                In stock
              </label>
            </div>
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
            {products.length === 0 && <p>No products match your search.</p>}
            <div className="storefront-products">
              {products.map((item) => (
                <article key={item.id}>
                  {path ? (
                    <Link
                      href={`${path}?product=${item.id}`}
                      className="storefront-item-link"
                    >
                      <ProductPhoto product={item} />
                      <span className="storefront-detail-arrow">
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </span>
                      <span className="storefront-visit-label">
                        View {item.name}
                      </span>
                    </Link>
                  ) : (
                    <ProductPhoto product={item} />
                  )}
                  <div className="storefront-product-title">
                    {item.category && (
                      <p className="storefront-product-category">
                        {item.category}
                      </p>
                    )}
                    <h3>
                      {path ? (
                        <Link href={`${path}?product=${item.id}`}>
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                    </h3>
                    {item.size && <span>{item.size}</span>}
                  </div>
                  <strong className="storefront-product-price">
                    {cash(Math.round(item.price * 100))}
                  </strong>
                  {edit && (
                    <Quantity
                      product={item}
                      count={cart?.[item.id] ?? 0}
                      edit={edit}
                    />
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
        {!product && !!shop.services?.length && (
          <section
            id={preview ? undefined : "services"}
            className="storefront-services"
          >
            <div className="storefront-section-heading">
              <h2>Services</h2>
            </div>
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
        {hasContact && (
          <section
            id={preview ? undefined : "contact"}
            className="storefront-contact"
          >
            <h2>Contact</h2>
            <div>
              {design.email && (
                <a href={`mailto:${design.email}`}>
                  <Mail size={17} />
                  <span>{design.email}</span>
                </a>
              )}
              {design.phone && (
                <a href={`tel:${design.phone.replace(/[ ()-]/g, "")}`}>
                  <Phone size={17} />
                  <span>{design.phone}</span>
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
                  <span>{design.pickup}</span>
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
  initial: shop,
  productId,
}: {
  slug: string;
  username?: string;
  design?: PublicStorefront;
  initial: ShopCatalog;
  productId?: number;
}) {
  const path = username ? `/${username}` : `/shop/${slug}`;
  const key = `biashara-shop-basket:${slug}`;
  const apiPath = `/api/shop/${encodeURIComponent(slug)}`;
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
    Promise.resolve().then(() => {
      try {
        setCart(JSON.parse(browserStorage(key) || "{}"));
      } catch {
        /* The visitor starts with an empty basket. */
      }
    });
  }, [key]);

  const product = shop.products.find((item) => item.id === productId);
  const returnPath = product ? `${path}?product=${product.id}` : path;
  const login = `/login?next=${encodeURIComponent(returnPath)}`;
  const signup = `/signup?next=${encodeURIComponent(returnPath)}`;
  const validCart = Object.fromEntries(
    shop.products.map((product) => [
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

  return (
    <main id="main-content">
      <StorefrontDesign
        design={design}
        shop={shop}
        cart={validCart}
        edit={edit}
        path={path}
        product={product}
        missingProduct={productId !== undefined && !product}
        header={
          <nav aria-label="Shop navigation">
            {!!quantity && (
              <a className="storefront-basket" href="#order">
                <ShoppingBag size={17} /> Basket ({quantity})
              </a>
            )}
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
            {message && (
              <div className="storefront-order-confirmation">
                <p role="status">{message}</p>
                <Link href={`/portal/${slug}`}>View your order</Link>
              </div>
            )}
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
  fulfillment?: "delivery" | "pickup";
  pickupLocation?: string;
  statusLabel?: string;
  updates?: OrderUpdate[];
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
  const [reload, setReload] = useState(0);
  const owner = useRef<string | null | undefined>(undefined);
  const accountVersion = useRef(0);
  const checkedReturn = useRef<string | null>(null);
  const preferenceRequest = useRef<{ id: string; emailOptIn: boolean } | null>(
    null,
  );
  const portalPath = `/api/portal/${encodeURIComponent(slug)}`;
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase().auth.onAuthStateChange((_event, session) => {
      const account = session?.user.id ?? null;
      const previous = owner.current;
      owner.current = account;
      if (previous !== undefined && previous !== account) {
        accountVersion.current++;
        checkedReturn.current = null;
        setData(null);
        setError("");
        setMessage("");
        setBusyOrder(null);
        setSavingPreference(false);
        setReload((version) => version + 1);
      }
    });
    const timer = window.setInterval(() => {
      if (owner.current && document.visibilityState === "visible")
        setReload((version) => version + 1);
    }, 30_000);
    return () => {
      subscription.unsubscribe();
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    let current = true;
    const version = accountVersion.current;
    const active = () => current && accountVersion.current === version;
    async function load() {
      const initial: PortalData = await customerRequest(portalPath);
      if (!active()) return;
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
      const check = slug + ":" + order.id;
      if (checkedReturn.current === check) return;
      checkedReturn.current = check;
      setBusyOrder(order.id);
      try {
        const verified = await customerRequest(
          `/api/payments/order/${encodeURIComponent(slug)}`,
          { orderId: order.id, action: "refresh" },
        );
        if (!active()) return;
        if (verified.status === "paid") {
          const updated = await customerRequest(portalPath);
          if (!active()) return;
          setData(updated);
          setMessage(`Payment confirmed for order #${order.id}.`);
        }
      } finally {
        if (active()) setBusyOrder(null);
      }
    }
    load().catch((error) => {
      if (active()) setError(error.message);
    });
    return () => {
      current = false;
    };
  }, [portalPath, slug, reload]);

  async function payment(orderId: number, action: "start" | "refresh") {
    const version = accountVersion.current;
    setBusyOrder(orderId);
    setError("");
    setMessage("");
    try {
      const result = await customerRequest(
        `/api/payments/order/${encodeURIComponent(slug)}`,
        { orderId, action },
      );
      if (accountVersion.current !== version) return;
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
      const latest = await customerRequest(portalPath);
      if (accountVersion.current !== version) return;
      setData(latest);
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
      if (accountVersion.current === version)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not check the payment.",
        );
    } finally {
      if (accountVersion.current === version) setBusyOrder(null);
    }
  }

  async function updatePreference(emailOptIn: boolean) {
    const version = accountVersion.current;
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
      if (accountVersion.current !== version) return;
      preferenceRequest.current = null;
      setData((value) => value && { ...value, emailOptIn: result.emailOptIn });
      setMessage("Marketing preference saved.");
    } catch (failure) {
      if (accountVersion.current === version)
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not save your preference.",
        );
    } finally {
      if (accountVersion.current === version) setSavingPreference(false);
    }
  }

  const recent = (data?.orders ?? [])
    .flatMap((order) =>
      (order.updates ?? []).map((update, index) => ({
        ...update,
        order: order.id,
        index,
      })),
    )
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        right.index - left.index ||
        right.order - left.order,
    )
    .slice(0, 5);

  return (
    <main id="main-content" className="container section">
      <Brand />
      <h1>{data ? `Hello, ${data.customer}` : "Your customer account"}</h1>
      {error && <p role="alert">{error}</p>}
      {error && !data && (
        <Button href={`/login?next=${encodeURIComponent(`/portal/${slug}`)}`}>
          Sign in
        </Button>
      )}
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
          <section
            className="panel order-updates"
            aria-labelledby="order-updates"
          >
            <div className="order-updates-heading">
              <h2 id="order-updates">Order updates</h2>
              <Button
                variant="secondary"
                onClick={() => {
                  setError("");
                  setReload((version) => version + 1);
                }}
              >
                Refresh orders
              </Button>
            </div>
            <div aria-live="polite">
              {recent.length ? (
                <ol>
                  {recent.map((entry) => (
                    <li key={entry.order + ":" + entry.index}>
                      <a href={`#customer-order-${entry.order}`}>
                        <strong>{entry.label}</strong> · Order #{entry.order}
                      </a>
                      <time dateTime={entry.date}>{entry.date}</time>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No order updates yet.</p>
              )}
            </div>
          </section>
          <h2>Your orders</h2>
          {data.orders.length ? (
            data.orders.map((order) => (
              <article
                className="panel customer-order-card"
                key={order.id}
                id={`customer-order-${order.id}`}
              >
                <h3>Order #{order.id}</h3>
                <p>
                  {order.statusLabel ?? order.status} · {cash(order.total)} ·{" "}
                  {order.paid ? "Payment recorded" : "Payment pending"}
                </p>
                {order.fulfillment === "pickup" && (
                  <p>
                    Pickup
                    {order.pickupLocation ? " · " + order.pickupLocation : ""}
                  </p>
                )}
                {!!order.updates?.length && (
                  <details className="customer-order-timeline">
                    <summary>Order history</summary>
                    <ol>
                      {order.updates.map((update, index) => (
                        <li key={index}>
                          <time dateTime={update.date}>{update.date}</time> ·{" "}
                          {update.label}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
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
