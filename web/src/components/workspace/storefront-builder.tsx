"use client";

import Link from "next/link";
import { Copy, ArrowRight, ExternalLink, Globe, Check } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, Button, Field, SelectField } from "@/components/ui";
import { StorefrontDesign } from "@/components/public-shop";
import { available, cash } from "@/lib/operations";
import { supabase } from "@/lib/supabase";
import { useDemo } from "@/lib/store";
import {
  storefrontDraft,
  storefrontIssues,
  storefrontPublication,
  storefrontMediaPath,
  storefrontPalettes,
  storefrontTemplates,
  storefrontUsername,
  type ShopCatalog,
  type StorefrontDraft,
  type StorefrontRecord,
} from "@/lib/storefront";
import { workspaceRequest } from "@/lib/workspace-request";

type Setup = StorefrontRecord & {
  published: boolean;
  verification: string;
  legacySlug: string;
};
const steps = [
  "Username",
  "Design",
  "Brand and story",
  "Catalogue",
  "Orders and contact",
  "Preview and publish",
];

export function StorefrontBuilder() {
  const { state, store } = useDemo();
  const owner = store.workspace?.role === "Owner";
  const [setup, setSetup] = useState<Setup>();
  const [draft, setDraft] = useState<StorefrontDraft>();
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [availability, setAvailability] = useState("");
  const [catalogueQuery, setCatalogueQuery] = useState("");
  const [detailsId, setDetailsId] = useState("");
  const processing = useRef(false);
  const publication = useRef<{ signature: string; requestId: string } | null>(
    null,
  );

  function accept(result: Setup) {
    const normalized = storefrontDraft.parse(result.draft);
    setSetup({ ...result, draft: normalized });
    setDraft(normalized);
    setName(result.username);
  }

  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    void workspaceRequest<Setup>(
      "/api/storefront",
      undefined,
      controller.signal,
    )
      .then((result) => {
        accept(result);
        if (result.username)
          setStep(
            result.draft.template
              ? result.live
                ? 5
                : !result.draft.description
                  ? 2
                  : 4
              : 1,
          );
      })
      .catch((issue) => {
        if (!controller.signal.aborted) setError(issue.message);
      });
    return () => controller.abort();
  }, [owner]);

  function update<K extends keyof StorefrontDraft>(
    key: K,
    value: StorefrontDraft[K],
  ) {
    setDraft((current) => current && { ...current, [key]: value });
  }

  async function execute(action: () => Promise<void>) {
    if (processing.current) return;
    processing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (issue) {
      setError(
        issue instanceof Error ? issue.message : "Could not save your shop.",
      );
    } finally {
      processing.current = false;
      setBusy(false);
    }
  }

  function updateProduct(key: "image" | "description", value: string) {
    setDraft(
      (current) =>
        current && {
          ...current,
          productDetails: {
            ...current.productDetails,
            [detailsId]: {
              ...(current.productDetails[detailsId] ?? {
                image: "",
                description: "",
              }),
              [key]: value,
            },
          },
        },
    );
  }

  function uploadImage(file: File, apply: (path: string) => void) {
    void execute(async () => {
      if (file.size > 2_500_000)
        throw new Error("Choose an image under 2.5 MB.");
      const {
        data: { session },
      } = await supabase().auth.getSession();
      if (!session) throw new Error("Sign in again to upload an image.");
      const form = new FormData();
      form.set("image", file);
      const response = await fetch("/api/storefront-media", {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not upload the image.");
      apply(result.path);
      setNotice("Image added to your draft. Save or publish to apply it.");
    });
  }

  async function save() {
    if (!setup || !draft) throw new Error("Load your shop first.");
    const username = storefrontUsername.safeParse(name);
    if (!username.success)
      throw new Error(
        "Choose a username with 3–40 letters or digits and single hyphens.",
      );
    const normalized = storefrontDraft.safeParse(draft);
    if (!normalized.success)
      throw new Error(
        `Check the ${String(normalized.error.issues[0].path[0] || "shop")} field.`,
      );
    if (
      setup.revision &&
      setup.username === username.data &&
      JSON.stringify(normalized.data) ===
        JSON.stringify(storefrontDraft.parse(setup.draft))
    )
      return setup;
    const result = await workspaceRequest<
      Omit<Setup, "verification" | "legacySlug">
    >("/api/storefront", {
      action: "save",
      revision: setup.revision,
      username: username.data,
      draft: normalized.data,
    });
    const saved = { ...setup, ...result };
    accept(saved);
    return saved;
  }

  function go(event: FormEvent<HTMLFormElement>, next: number) {
    event.preventDefault();
    void execute(async () => {
      if (step === 1 && !draft?.template)
        throw new Error("Choose one of the three designs.");
      await save();
      setStep(next);
      setNotice("Draft saved.");
    });
  }

  function publish(action: "publish" | "unpublish") {
    void execute(async () => {
      const saved = action === "publish" ? await save() : setup;
      if (!saved) return;
      const signature = `${action}:${saved.revision}`;
      if (publication.current?.signature !== signature)
        publication.current = { signature, requestId: crypto.randomUUID() };
      const result = await workspaceRequest<
        Omit<Setup, "verification" | "legacySlug">
      >("/api/storefront", {
        action,
        revision: saved.revision,
        requestId: publication.current.requestId,
      });
      publication.current = null;
      accept({ ...saved, ...result });
      setNotice(
        action === "publish"
          ? "Your shop is live."
          : "Your shop is hidden. Your draft and orders are saved.",
      );
      await store.hydrate();
    });
  }

  const publicationState = setup ? storefrontPublication(setup) : null;
  const publicPath = publicationState?.publicPath;
  const live = Boolean(setup?.live && publicPath);
  const draftPath = setup?.username ? `/${setup.username}` : "";
  const draftIssues = draft ? storefrontIssues(draft) : [];
  const previewReady = !!draft?.template && !!draft?.name?.trim();
  const pendingChanges = Boolean(
    setup?.live &&
      draft &&
      JSON.stringify(storefrontDraft.parse(setup.live)) !==
        JSON.stringify(draft),
  );
  const selectedProducts = draft
    ? state.products.filter(
        (product) =>
          draft.catalog === "all" ||
          (draft.catalog === "selected" && draft.products.includes(product.id)),
      )
    : [];
  const details = draft?.productDetails[detailsId] ?? {
    image: "",
    description: "",
  };
  const preview: ShopCatalog = {
    name: draft?.name || "",
    description: draft?.description || "",
    fee: draft?.fulfillment === "delivery" ? draft.fee : 0,
    products: selectedProducts.map((product) => ({
      id: product.id,
      name: product.name,
      size: product.size,
      category: product.category,
      price: product.price,
      art: product.art,
      stock: available(state, product.id, draft!.branch),
      ...draft?.productDetails?.[product.id],
    })),
    services: draft?.showServices
      ? (state.operations.services ?? [])
          .filter((service) => service.active)
          .map((service) => ({
            id: service.id,
            name: service.name,
            duration: service.duration,
            price: service.priceMinor,
          }))
      : [],
  };

  return (
    <div className="shop-builder">
      <div className="page-heading">
        <div>
          <h1>Shop builder</h1>
          <p>
            Build a website for your business and manage its orders from this
            workspace.
          </p>
        </div>
        {live && (
          <div className="button-row">
            <Button href={draftPath} variant="secondary" icon={ExternalLink}>
              View live shop
            </Button>
          </div>
        )}
      </div>
      {!owner && (
        <p>Only the business owner can set up and publish the shop.</p>
      )}
      {error && (
        <div role="alert" className="operation-error">
          {error}{" "}
          <button
            type="button"
            onClick={() =>
              void execute(async () => {
                accept(await workspaceRequest<Setup>("/api/storefront"));
              })
            }
          >
            Reload saved setup
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="connection-banner">
          {notice}
        </p>
      )}
      {owner && !draft && !error && <p role="status">Loading shop setup…</p>}
      {owner && setup && draft && (
        <>
          <div className="shop-builder-status">
            <Badge tone={publicPath ? "green" : "gray"}>
              {publicationState?.status ?? "Draft"}
            </Badge>
            {publicPath && <strong>{publicPath}</strong>}
            {draftPath && draftPath !== publicPath && (
              <span>
                Draft address <strong>{draftPath}</strong>
              </span>
            )}
            {pendingChanges && <Badge tone="amber">Unpublished edits</Badge>}
            {publicPath && (
              <Button
                variant="ghost"
                icon={Copy}
                onClick={() =>
                  void execute(async () => {
                    await navigator.clipboard.writeText(
                      location.origin + publicPath,
                    );
                    setNotice("Shop link copied.");
                  })
                }
              >
                Copy link
              </Button>
            )}
            {!setup.live && setup.published && (
              <>
                <Link href={`/shop/${setup.legacySlug}`}>
                  Open your existing shop
                </Link>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void execute(async () => {
                      await store.command({ type: "shop", published: false });
                      setSetup({ ...setup, published: false });
                      setNotice("Your existing shop is hidden.");
                    })
                  }
                >
                  Unpublish existing shop
                </Button>
              </>
            )}
          </div>
          <nav className="shop-builder-steps" aria-label="Shop setup">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                aria-current={step === index ? "step" : undefined}
                disabled={busy || (!setup.username && index > 0)}
                onClick={() =>
                  void execute(async () => {
                    if (index !== step && setup.username) await save();
                    setStep(index);
                  })
                }
              >
                {step > index ? <Check size={14} /> : null}
                {label}
              </button>
            ))}
          </nav>
          <form
            className="panel shop-builder-panel"
            onSubmit={(event) => go(event, Math.min(step + 1, 5))}
          >
            <h2>{steps[step]}</h2>
            {step === 0 && (
              <>
                <p>
                  This username becomes your public website address. It stays
                  with the shop once you publish.
                </p>
                <Field
                  label="Shop username"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value.toLowerCase());
                    setAvailability("");
                  }}
                  maxLength={40}
                  required
                  readOnly={Boolean(setup.live)}
                  placeholder="feeton-collections"
                />
                {name && (
                  <p className="shop-url-preview">
                    biasharaworld.vercel.app/{name.trim()}
                  </p>
                )}
                {!setup.live && (
                  <Button
                    variant="secondary"
                    disabled={busy || !name.trim()}
                    onClick={() =>
                      void execute(async () => {
                        const result = await workspaceRequest<{
                          username: string;
                          available: boolean;
                        }>(
                          `/api/storefront?username=${encodeURIComponent(name)}`,
                        );
                        setAvailability(
                          result.available
                            ? `${result.username} is available.`
                            : "That username is taken. Try a different one.",
                        );
                      })
                    }
                  >
                    Check availability
                  </Button>
                )}
                {availability && <p role="status">{availability}</p>}
              </>
            )}
            {step === 1 && (
              <>
                <fieldset className="shop-template-list">
                  <legend>Choose a layout</legend>
                  {storefrontTemplates.map((template) => (
                    <label key={template.id}>
                      <input
                        type="radio"
                        name="template"
                        value={template.id}
                        checked={draft.template === template.id}
                        onChange={() => update("template", template.id)}
                      />
                      <span
                        className={`shop-template-example shop-template-${template.id}`}
                        aria-hidden="true"
                      >
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                      <strong>{template.label}</strong>
                      <small>{template.description}</small>
                    </label>
                  ))}
                </fieldset>
                <SelectField
                  label="Colour palette"
                  value={draft.palette}
                  onChange={(value) =>
                    update("palette", value as StorefrontDraft["palette"])
                  }
                >
                  {storefrontPalettes.map((palette) => (
                    <option key={palette.id} value={palette.id}>
                      {palette.label}
                    </option>
                  ))}
                </SelectField>
              </>
            )}
            {step === 2 && (
              <div className="shop-builder-fields">
                <Field
                  label="Public shop name"
                  value={draft.name}
                  required
                  maxLength={100}
                  onChange={(event) => update("name", event.target.value)}
                />
                <Field
                  label="Homepage headline"
                  value={draft.headline}
                  maxLength={100}
                  onChange={(event) => update("headline", event.target.value)}
                />
                <label className="field shop-builder-full">
                  About the business
                  <textarea
                    className="input"
                    rows={4}
                    maxLength={600}
                    value={draft.description}
                    onChange={(event) =>
                      update("description", event.target.value)
                    }
                  />
                </label>
                <ShopImageField
                  label="Logo image URL"
                  uploadLabel="Upload logo"
                  value={draft.logo}
                  busy={busy}
                  edit={(value) => update("logo", value)}
                  upload={(file) =>
                    uploadImage(file, (path) => update("logo", path))
                  }
                />
                <ShopImageField
                  label="Cover image URL"
                  uploadLabel="Upload cover image"
                  value={draft.cover}
                  busy={busy}
                  edit={(value) => update("cover", value)}
                  upload={(file) =>
                    uploadImage(file, (path) => update("cover", path))
                  }
                />
              </div>
            )}
            {step === 3 && (
              <>
                <SelectField
                  label="Public product catalogue"
                  value={draft.catalog}
                  onChange={(value) =>
                    update("catalog", value as StorefrontDraft["catalog"])
                  }
                >
                  <option value="all">Show all inventory products</option>
                  <option value="selected">Choose products</option>
                  <option value="off">No product checkout</option>
                </SelectField>
                <label>
                  <input
                    type="checkbox"
                    checked={draft.showServices}
                    onChange={(event) =>
                      update("showServices", event.target.checked)
                    }
                  />{" "}
                  Show active services and prices
                </label>
                {draft.catalog === "selected" && (
                  <>
                    <Field
                      label="Find inventory products"
                      value={catalogueQuery}
                      onChange={(event) =>
                        setCatalogueQuery(event.target.value)
                      }
                    />
                    <div className="shop-builder-catalogue">
                      {state.products
                        .filter((product) =>
                          `${product.name} ${product.sku}`
                            .toLowerCase()
                            .includes(catalogueQuery.trim().toLowerCase()),
                        )
                        .map((product) => (
                          <label key={product.id}>
                            <input
                              type="checkbox"
                              checked={draft.products.includes(product.id)}
                              onChange={(event) =>
                                update(
                                  "products",
                                  event.target.checked
                                    ? [...draft.products, product.id]
                                    : draft.products.filter(
                                        (id) => id !== product.id,
                                      ),
                                )
                              }
                            />
                            <span>{product.name}</span>
                            <strong>
                              {cash(Math.round(product.price * 100))}
                            </strong>
                          </label>
                        ))}
                    </div>
                  </>
                )}
                {draft.catalog !== "off" && selectedProducts.length > 0 && (
                  <fieldset className="shop-product-editor">
                    <legend>Product photos and descriptions</legend>
                    <SelectField
                      label="Product to showcase"
                      value={detailsId}
                      onChange={setDetailsId}
                    >
                      <option value="">Choose a product</option>
                      {selectedProducts.map((product) => (
                        <option key={product.id} value={String(product.id)}>
                          {product.name}
                        </option>
                      ))}
                    </SelectField>
                    {selectedProducts.some(
                      (product) => String(product.id) === detailsId,
                    ) && (
                      <div className="shop-builder-fields">
                        <ShopImageField
                          label="Product photo URL"
                          uploadLabel="Upload product photo"
                          value={details.image}
                          busy={busy}
                          edit={(value) => updateProduct("image", value)}
                          upload={(file) =>
                            uploadImage(file, (path) =>
                              updateProduct("image", path),
                            )
                          }
                        />
                        <label className="field shop-builder-full">
                          Product description
                          <textarea
                            className="input"
                            rows={3}
                            maxLength={800}
                            value={details.description}
                            onChange={(event) =>
                              updateProduct("description", event.target.value)
                            }
                          />
                        </label>
                      </div>
                    )}
                  </fieldset>
                )}
                <p>
                  Products, prices and stock come from your dashboard.{" "}
                  <Link href="/dashboard/inventory">Manage inventory</Link> ·{" "}
                  <Link href="/dashboard/bookings">Manage services</Link>
                </p>
              </>
            )}
            {step === 4 && (
              <div className="shop-builder-fields">
                {draft.catalog !== "off" && (
                  <>
                    <SelectField
                      label="Fulfilment branch"
                      value={draft.branch}
                      onChange={(value) => update("branch", value)}
                    >
                      {state.operations.branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </SelectField>
                    <SelectField
                      label="Order fulfilment"
                      value={draft.fulfillment}
                      onChange={(value) =>
                        update(
                          "fulfillment",
                          value as StorefrontDraft["fulfillment"],
                        )
                      }
                    >
                      <option value="delivery">Delivery</option>
                      <option value="pickup">Pickup</option>
                    </SelectField>
                    {draft.fulfillment === "delivery" ? (
                      <Field
                        label="Delivery fee (KES)"
                        type="number"
                        min={0}
                        max={10000000}
                        step="0.01"
                        value={draft.fee / 100}
                        onChange={(event) =>
                          update(
                            "fee",
                            Math.round(Number(event.target.value || 0) * 100),
                          )
                        }
                      />
                    ) : (
                      <Field
                        label="Pickup location"
                        maxLength={240}
                        value={draft.pickup}
                        onChange={(event) =>
                          update("pickup", event.target.value)
                        }
                      />
                    )}
                  </>
                )}
                <Field
                  label="Public email address"
                  type="email"
                  value={draft.email}
                  onChange={(event) => update("email", event.target.value)}
                />
                <Field
                  label="Public phone number"
                  type="tel"
                  value={draft.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
                <Field
                  label="WhatsApp number with country code"
                  type="tel"
                  value={draft.whatsapp}
                  onChange={(event) => update("whatsapp", event.target.value)}
                />
                <Field
                  label="Opening hours"
                  maxLength={240}
                  value={draft.hours}
                  onChange={(event) => update("hours", event.target.value)}
                />
                <p className="shop-builder-full">
                  Use the contact details you want customers to see. Orders go
                  to <Link href="/dashboard/deliveries">Deliveries</Link>.
                </p>
              </div>
            )}
            {step === 5 && (
              <>
                <section
                  className="shop-publication-checklist"
                  aria-label="Publication checklist"
                >
                  <h3>Publication checklist</h3>
                  <ul>
                    <li>
                      <span>Shop details</span>
                      <strong>
                        {draftIssues.length ? "Needs attention" : "Ready"}
                      </strong>
                    </li>
                    <li>
                      <span>Store preview</span>
                      <strong>
                        {previewReady ? "Ready" : "Choose a design and name"}
                      </strong>
                    </li>
                    <li>
                      <span>Merchant verification</span>
                      <strong>
                        {publicationState?.verified ? "Verified" : "Required"}
                      </strong>
                    </li>
                    <li>
                      <span>Public link</span>
                      <strong>
                        {publicationState?.publicPath
                          ? "Open to customers"
                          : "Private"}
                      </strong>
                    </li>
                  </ul>
                </section>
                {!!draftIssues.length && (
                  <ul>
                    {draftIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
                {setup.verification !== "verified" && (
                  <p>
                    Complete{" "}
                    <Link
                      href={
                        setup.verification === "company_verification_required"
                          ? "/dashboard/company-verification"
                          : "/dashboard/verification"
                      }
                    >
                      merchant verification
                    </Link>{" "}
                    to publish.{" "}
                    <button
                      type="button"
                      onClick={() =>
                        void execute(async () => {
                          const refreshed =
                            await workspaceRequest<Setup>("/api/storefront");
                          setSetup(
                            (current) =>
                              current && {
                                ...current,
                                verification: refreshed.verification,
                              },
                          );
                        })
                      }
                    >
                      Refresh verification
                    </button>
                  </p>
                )}
                <StorefrontDesign
                  design={draft}
                  key={draft.template}
                  shop={preview}
                  preview
                />
              </>
            )}
            <div className="button-row">
              {step > 0 && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              )}
              {step < 5 && (
                <Button
                  type="submit"
                  disabled={busy}
                  icon={step === 0 ? Globe : ArrowRight}
                >
                  {step === 0
                    ? "Save username and continue"
                    : "Save and continue"}
                </Button>
              )}
              {step === 5 && (
                <>
                  <Button type="submit" variant="secondary" disabled={busy}>
                    Save draft
                  </Button>
                  <Button
                    disabled={
                      busy ||
                      setup.verification !== "verified" ||
                      !!draftIssues.length
                    }
                    onClick={() => publish("publish")}
                  >
                    {live ? "Publish updates" : "Publish shop"}
                  </Button>
                  {setup.published && (
                    <Button
                      variant="ghost"
                      disabled={busy}
                      onClick={() => publish("unpublish")}
                    >
                      Unpublish shop
                    </Button>
                  )}
                </>
              )}
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function ShopImageField({
  label,
  uploadLabel,
  value,
  edit,
  upload,
  busy,
}: {
  label: string;
  uploadLabel: string;
  value: string;
  edit: (value: string) => void;
  upload: (file: File) => void;
  busy: boolean;
}) {
  const present = storefrontMediaPath.test(value) || /^https:\/\//i.test(value);
  return (
    <div className="shop-image-field">
      {present && (
        <div
          className="shop-image-field-preview"
          role="img"
          aria-label={label + " preview"}
          style={{ backgroundImage: `url(${JSON.stringify(value)})` }}
        />
      )}
      <label className="field">
        {uploadLabel}
        <input
          className="input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) upload(file);
          }}
        />
        <small>JPEG, PNG or WebP up to 2.5 MB</small>
      </label>
      <Field
        label={label}
        inputMode="url"
        value={value}
        onChange={(event) => edit(event.target.value)}
        hint="You can also paste an HTTPS image link."
      />
    </div>
  );
}
