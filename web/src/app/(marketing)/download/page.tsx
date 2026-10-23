import type { Metadata } from "next";
import { DownloadPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Web + Android" };
export default function Page() {
  return <DownloadPage />;
}
