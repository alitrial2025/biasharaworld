import { notFound, redirect } from "next/navigation";
import { PublicShop } from "@/components/public-shop";
import { ApiError } from "@/lib/backend/server";
import { publicShop, shopRecord } from "@/lib/backend/shop";
import { storefrontByUsername } from "@/lib/backend/storefront";
import { shopProductQuery, storefrontUsername } from "@/lib/storefront";

export const metadata = {
  title: "Online shop",
  robots: { index: false, follow: false },
};

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ shopSlug: string }>;
  searchParams: Promise<{ product?: string | string[] }>;
}) {
  const { shopSlug } = await params;
  const productId = shopProductQuery((await searchParams).product);
  const query = productId ? `?product=${productId}` : "";

  const username = storefrontUsername.safeParse(shopSlug);
  if (username.success) {
    const storefront = await storefrontByUsername(username.data).catch(
      (error) => {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      },
    );
    if (storefront) redirect(`/${storefront.username}${query}`);
  }

  const shop = await shopRecord(shopSlug).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  if (shop.username) redirect(`/${shop.username}${query}`);
  return (
    <PublicShop
      slug={shopSlug}
      initial={publicShop(shop.state)}
      productId={productId}
    />
  );
}
