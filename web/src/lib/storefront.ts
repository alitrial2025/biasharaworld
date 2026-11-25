import { z } from "zod";

export const reservedStorefronts = new Set([
  "about",
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "checkout",
  "contact",
  "dashboard",
  "download",
  "downloads",
  "features",
  "forgot-password",
  "help",
  "images",
  "login",
  "logout",
  "onboarding",
  "portal",
  "pricing",
  "privacy",
  "reset-password",
  "resources",
  "settings",
  "shop",
  "shops",
  "signup",
  "solutions",
  "status",
  "support",
  "terms",
  "www",
]);

export const storefrontUsername = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(
    (name) => !reservedStorefronts.has(name) && !/^[a-f0-9]{24}$/.test(name),
  );

export const storefrontTemplates = [
  {
    id: "market",
    label: "Market",
    description:
      "A bold shopfront with generous photography and an easy-to-browse product grid.",
  },
  {
    id: "studio",
    label: "Studio",
    description:
      "An editorial shopfront with a type-led story and large collection images.",
  },
  {
    id: "directory",
    label: "Directory",
    description:
      "A streamlined catalogue with quick search for products and services.",
  },
] as const;
export const storefrontPalettes = [
  { id: "forest", label: "Forest", ink: "#143a32", wash: "#e5efe7" },
  { id: "clay", label: "Clay", ink: "#7a3826", wash: "#f7e6d9" },
  { id: "plum", label: "Plum", ink: "#513565", wash: "#eee6f3" },
  { id: "ocean", label: "Ocean", ink: "#174371", wash: "#e4eff8" },
] as const;

const line = (max: number) => z.string().trim().max(max);
const imageURL = z.union([
  z.literal(""),
  z
    .url({ protocol: /^https$/ })
    .max(2048)
    .refine((value) => {
      const url = new URL(value);
      return !url.username && !url.password;
    }),
]);

export const storefrontDraft = z
  .object({
    template: z.enum(["", "market", "studio", "directory"]),
    palette: z.enum(["forest", "clay", "plum", "ocean"]),
    name: line(100),
    headline: line(100),
    description: line(600),
    cover: imageURL,
    logo: imageURL,
    catalog: z.enum(["all", "selected", "off"]),
    products: z.array(z.number().int().positive()).max(10_000),
    productDetails: z
      .record(
        z.string().regex(/^[1-9][0-9]{0,9}$/),
        z.object({ image: imageURL, description: line(800) }).strict(),
      )
      .refine((items) => Object.keys(items).length <= 300)
      .default({}),
    showServices: z.boolean(),
    branch: line(100),
    fulfillment: z.enum(["pickup", "delivery"]),
    pickup: line(240),
    fee: z.number().int().min(0).max(1e9),
    email: z.union([z.literal(""), z.email().max(200)]),
    phone: line(30).refine(
      (value) => !value || /^\+?[0-9 ()-]{7,30}$/.test(value),
    ),
    whatsapp: line(18).refine(
      (value) => !value || /^\+?[0-9]{7,15}$/.test(value),
    ),
    hours: line(240),
  })
  .strict();

export type StorefrontDraft = z.infer<typeof storefrontDraft>;
export type StorefrontRecord = {
  username: string;
  revision: number;
  draft: StorefrontDraft;
  live: StorefrontDraft | null;
};
export type PublicStorefront = Pick<
  StorefrontDraft,
  | "template"
  | "palette"
  | "name"
  | "headline"
  | "description"
  | "logo"
  | "cover"
  | "fulfillment"
  | "pickup"
  | "email"
  | "phone"
  | "whatsapp"
  | "hours"
>;
export type ShopProduct = {
  id: number;
  name: string;
  size: string;
  category: string;
  price: number;
  art: number;
  stock: number;
  image?: string;
  description?: string;
};
export function shopProductQuery(value: unknown) {
  return typeof value === "string" && /^[1-9][0-9]{0,9}$/.test(value)
    ? Number(value)
    : undefined;
}

export type ShopCatalog = {
  name: string;
  description: string;
  fee: number;
  products: ShopProduct[];
  services?: { id: number; name: string; duration: number; price: number }[];
};

export function storefrontIssues(draft: StorefrontDraft) {
  return [
    !draft.template && "Choose a storefront design.",
    !draft.name && "Enter the public shop name.",
    !draft.description && "Write a short description of your business.",
    !draft.email &&
      !draft.phone &&
      !draft.whatsapp &&
      "Add a public contact method.",
    draft.catalog !== "off" &&
      draft.fulfillment === "pickup" &&
      !draft.pickup &&
      "Enter the pickup location.",
    draft.catalog === "selected" &&
      !draft.products.length &&
      "Select products or use the contact-only setting.",
  ].filter((issue): issue is string => Boolean(issue));
}

export function customerReturn(value: unknown) {
  if (typeof value !== "string") return "";
  if (value === "/dashboard/online-shop") return value;
  const [path, query, extra] = value.split("?");
  if (
    extra !== undefined ||
    (query !== undefined && !/^product=[1-9][0-9]{0,9}$/.test(query))
  )
    return "";
  if (/^\/(shop|portal)\/[a-z0-9-]{3,40}$/.test(path)) return value;
  if (
    path.startsWith("/") &&
    storefrontUsername.safeParse(path.slice(1)).success &&
    path.slice(1) === path.slice(1).toLowerCase().trim()
  )
    return value;
  return "";
}
