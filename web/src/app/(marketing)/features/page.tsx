import type { Metadata } from "next";
import { FeaturesPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Features" };
export default function Page() {
  return <FeaturesPage />;
}
