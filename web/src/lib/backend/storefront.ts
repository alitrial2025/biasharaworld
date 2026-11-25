import type { DemoState } from "../data";
import { available } from "../operations";
import type {
  PublicStorefront,
  ShopCatalog,
  StorefrontDraft,
  StorefrontRecord,
} from "../storefront";
import { admin, ApiError } from "./server";
import { shopRecord } from "./shop";

export function initialStorefront(state: DemoState): StorefrontDraft {
  const shop = state.operations.shop;
  return {
    template: "",
    palette: "forest",
    name: (shop.name || state.profile.business).slice(0, 100),
    headline: "",
    description: shop.description.slice(0, 600),
    cover: "",
    logo: "",
    catalog: shop.hidden.length ? "selected" : "all",
    products: state.products
      .filter((product) => !shop.hidden.includes(product.id))
      .map((product) => product.id),
    showServices: false,
    branch: shop.branch || state.operations.activeBranch,
    fulfillment: "delivery",
    pickup: "",
    fee: shop.fee,
    email: "",
    phone: "",
    whatsapp: "",
    hours: "",
  };
}

export async function businessStorefront(businessId: string) {
  const result = await admin()
    .from("business_storefronts")
    .select("username,revision,draft,live")
    .eq("business_id", businessId)
    .maybeSingle<StorefrontRecord>();
  if (result.error) throw new ApiError("Could not load the shop setup.", 503);
  return result.data;
}

export function storefrontCatalog(
  state: DemoState,
  draft: StorefrontDraft,
): ShopCatalog {
  return {
    name: draft.name,
    description: draft.description,
    fee: draft.fulfillment === "delivery" ? draft.fee : 0,
    products: state.products
      .filter(
        (product) =>
          draft.catalog === "all" ||
          (draft.catalog === "selected" && draft.products.includes(product.id)),
      )
      .map((product) => ({
        id: product.id,
        name: product.name,
        size: product.size,
        category: product.category,
        price: product.price,
        art: product.art,
        stock: available(state, product.id, draft.branch),
      })),
    services: draft.showServices
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
}

export async function storefrontByUsername(username: string) {
  const result = await admin()
    .from("business_storefronts")
    .select("business_id,username,live")
    .eq("username", username)
    .not("live", "is", null)
    .maybeSingle<{
      business_id: string;
      username: string;
      live: StorefrontDraft;
    }>();
  if (result.error)
    throw new ApiError("This storefront is temporarily unavailable.", 503);
  if (!result.data) throw new ApiError("Shop not found.", 404);
  const business = await admin()
    .from("businesses")
    .select("slug")
    .eq("id", result.data.business_id)
    .single();
  if (business.error)
    throw new ApiError("This storefront is temporarily unavailable.", 503);
  const shop = await shopRecord(business.data.slug);
  const config = result.data.live;
  const design: PublicStorefront = {
    template: config.template,
    palette: config.palette,
    name: config.name,
    headline: config.headline,
    description: config.description,
    logo: config.logo,
    cover: config.cover,
    fulfillment: config.fulfillment,
    pickup: config.pickup,
    email: config.email,
    phone: config.phone,
    whatsapp: config.whatsapp,
    hours: config.hours,
  };
  return {
    slug: business.data.slug as string,
    username,
    design,
    catalog: storefrontCatalog(shop.state, config),
  };
}
