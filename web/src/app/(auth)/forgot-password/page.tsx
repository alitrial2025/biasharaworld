import { AuthPage } from "@/components/auth";
export const metadata = { title: "Reset your password" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; next?: string }>;
}) {
  const query = await searchParams;
  return <AuthPage mode="forgot" plan={query.plan} returnTo={query.next} />;
}
