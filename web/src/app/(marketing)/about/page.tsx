import type { Metadata } from "next";
import { AboutPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Why BiasharaOS" };
export default function Page() {
  return <AboutPage />;
}
