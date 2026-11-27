import { notFound } from "next/navigation";
import { PublicCustomerActivity } from "@/components/public-customer-activity";

export const metadata = {
  title: "Book with a local business",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
}: {
  params: Promise<{ customerId: string; flow: string }>;
}) {
  const { customerId, flow } = await params;
  if (flow !== "services" && flow !== "events") notFound();
  return <PublicCustomerActivity slug={customerId} flow={flow} />;
}
