import type { Metadata } from "next";
import { DownloadPage } from "@/components/marketing/pages";
export const metadata: Metadata = { title: "Web + Android" };
export default function Page() {
  const configuredUrl = process.env.ANDROID_RELEASE_DOWNLOAD_URL?.trim();
  const url = configuredUrl && URL.canParse(configuredUrl) ? new URL(configuredUrl) : null;
  const androidDownloadUrl = url?.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  return <DownloadPage androidDownloadUrl={androidDownloadUrl} />;
}
