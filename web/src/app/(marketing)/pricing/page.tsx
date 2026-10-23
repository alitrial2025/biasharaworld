import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Plans & pricing" };
export default function Page() {
  return <PricingPage />;
}
