import { notFound } from "next/navigation";
import { PublicCustomerActivity } from "@/components/public-customer-activity";

export const metadata = {
  title: "Private rent receipt",
  referrer: "no-referrer" as const,
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ customerId: string; token: string }>;
}) {
  const { customerId, token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  return <PublicCustomerActivity slug={customerId} flow="rent" token={token} />;
}
