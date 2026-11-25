import { cache } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicShop } from "@/components/public-shop";
import { ApiError } from "@/lib/backend/server";
import { storefrontByUsername } from "@/lib/backend/storefront";
import { storefrontUsername } from "@/lib/storefront";

const load = cache(async (value: string) => {
  const username = storefrontUsername.safeParse(value);
  if (!username.success) notFound();
  if (username.data !== value) redirect(`/${username.data}`);
  try {
    return await storefrontByUsername(username.data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});

type Context = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Context): Promise<Metadata> {
  const shop = await load((await params).username);
  return {
    title: shop.design.name,
    description: shop.design.description,
    alternates: { canonical: `/${shop.username}` },
    openGraph: {
      title: shop.design.name,
      description: shop.design.description,
      ...(shop.design.cover ? { images: [shop.design.cover] } : {}),
    },
  };
}

export default async function StorefrontPage({ params }: Context) {
  const shop = await load((await params).username);
  return (
    <PublicShop
      slug={shop.slug}
      username={shop.username}
      design={shop.design}
      initial={shop.catalog}
    />
  );
}
