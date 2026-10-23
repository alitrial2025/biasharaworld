import type { Metadata } from "next";
import { HelpPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Help centre" };
export default function Page() {
  return <HelpPage />;
}
