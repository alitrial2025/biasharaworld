
import { PublicShop } from "@/components/public-shop";
export const metadata = {
  title: "Your neighbourhood shop | BiasharaOS",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}) {
  return <PublicShop slug={(await params).shopSlug}/>;
}
