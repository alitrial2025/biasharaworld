import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Privacy" };
export default function Page() {
  return <LegalPage type="privacy" />;
}
