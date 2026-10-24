import type { Metadata } from "next";
import { CookieNotice } from "@/components/marketing/policy-pages";
export const metadata: Metadata = {
  title: "Cookies & storage",
  description:
    "Essential account, retry and basket storage and appearance preferences used by BiasharaOS.",
};
export default function Page() {
  return <CookieNotice />;
}
