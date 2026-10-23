import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Terms" };
export default function Page() {
  return <LegalPage type="terms" />;
}
