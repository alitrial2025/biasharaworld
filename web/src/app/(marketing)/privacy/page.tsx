import type { Metadata } from "next";
import { PrivacyNotice } from "@/components/marketing/policy-pages";
export const metadata: Metadata = {
  title: "Privacy notice",
  description:
    "How BiasharaOS handles account, business, product-photo, verification-readiness and funding information.",
};
export default function Page() {
  return <PrivacyNotice />;
}
