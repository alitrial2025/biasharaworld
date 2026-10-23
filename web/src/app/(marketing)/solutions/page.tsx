import type { Metadata } from "next";
import { SolutionsPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Solutions for your business" };
export default function Page() {
  return <SolutionsPage />;
}
