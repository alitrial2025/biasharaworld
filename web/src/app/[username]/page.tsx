import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicShop } from "@/components/public-shop";
import { ApiError } from "@/lib/backend/server";
import { storefrontByUsername } from "@/lib/backend/storefront";
import { shopProductQuery, storefrontUsername } from "@/lib/storefront";

const load = cache(async (username: string) => {
  try {
    return await storefrontByUsername(username);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
});

type Context = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ product?: string | string[] }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Context): Promise<Metadata> {
  const username = storefrontUsername.safeParse((await params).username);
  const shop = username.success ? await load(username.data) : null;
  if (!shop) return { title: "Shop unavailable", robots: { index: false } };
  const productId = shopProductQuery((await searchParams).product);
  const product = shop.catalog.products.find((item) => item.id === productId);
  return {
    title: product ? `${product.name} | ${shop.design.name}` : shop.design.name,
    description: product?.description || shop.design.description,
    alternates: {
      canonical: product
        ? `/${shop.username}?product=${product.id}`
        : `/${shop.username}`,
    },
    openGraph: {
      title: shop.design.name,
      description: shop.design.description,
      ...(shop.design.cover ? { images: [shop.design.cover] } : {}),
    },
  };
}

export default async function StorefrontPage({
  params,
  searchParams,
}: Context) {
  const { username } = await params;
  const normalized = storefrontUsername.safeParse(username);
  if (!normalized.success) notFound();
  const shop = await load(normalized.data);
  if (!shop) notFound();
  const productId = shopProductQuery((await searchParams).product);
  if (shop.username !== username)
    redirect(`/${shop.username}${productId ? `?product=${productId}` : ""}`);
  return (
    <PublicShop
      slug={shop.slug}
      username={shop.username}
      design={shop.design}
      initial={shop.catalog}
      productId={productId}
    />
  );
}
