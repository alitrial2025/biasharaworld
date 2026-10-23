
import { PublicPortal } from "@/components/public-shop";
export const metadata = {
  title: "Customer preview | BiasharaOS",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  return <PublicPortal slug={(await params).customerId}/>;
}
