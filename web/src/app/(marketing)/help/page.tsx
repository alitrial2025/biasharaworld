import type { Metadata } from "next";
import { HelpCenter } from "@/components/marketing/help-center";
export const metadata: Metadata = {
  title: "Help centre",
  description:
    "Help with BiasharaOS accounts, sales, stock, private product photos, funding readiness and privacy on web and Android.",
};
export default function Page() {
  return <HelpCenter />;
}
