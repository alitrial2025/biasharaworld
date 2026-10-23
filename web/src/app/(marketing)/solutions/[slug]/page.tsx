import { notFound } from "next/navigation";
import { SolutionPage } from "@/components/marketing/pages";
const titles: Record<string, string> = {
  retail: "For retail shops & dukas",
  minimarkets: "For mini markets",
  wholesale: "For wholesalers",
  services: "For service businesses",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: titles[slug] ?? "Solutions" };
}
export function generateStaticParams() {
  return Object.keys(titles).map((slug) => ({ slug }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!titles[slug]) notFound();
  return <SolutionPage slug={slug} />;
}
