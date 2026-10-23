import type { Metadata } from "next";
import { ResourcesPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "The business notebook" };
export default function Page() {
  return <ResourcesPage />;
}
