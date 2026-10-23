import type { Metadata } from "next";
import { ContactPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Let’s talk business" };
export default function Page() {
  return <ContactPage />;
}
