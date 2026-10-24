import type { Metadata } from "next";
import { TermsNotice } from "@/components/marketing/policy-pages";
export const metadata: Metadata = { title: "Terms" };
export default function Page() {
  return <TermsNotice />;
}
