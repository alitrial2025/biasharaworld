import { AuthPage } from "@/components/auth";
export const metadata = { title: "Welcome back" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const query = await searchParams;
  return <AuthPage mode="login" plan={query.plan} />;
}
