import { SupplierDetailPage } from "@/components/workspace/procurement";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupplierDetailPage id={id} />;
}
