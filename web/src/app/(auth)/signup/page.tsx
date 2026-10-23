import { AuthPage } from "@/components/auth";
export const metadata = { title: "Create your workspace" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const query = await searchParams;
  return <AuthPage mode="signup" plan={query.plan} />;
}
