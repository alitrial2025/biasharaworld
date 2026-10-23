import { notFound } from "next/navigation";
import { articles } from "@/lib/data";
import { ArticlePage } from "@/components/marketing/pages";
export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = articles.find((a) => a.slug === slug);
  return { title: a?.title ?? "Notebook", description: a?.excerpt };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!articles.some((a) => a.slug === slug)) notFound();
  return <ArticlePage slug={slug} />;
}
