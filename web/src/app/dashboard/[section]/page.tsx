import { OperationsPage } from "@/components/workspace/operations";
import { ToolPage } from "@/components/tools/tool-page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SalesPage, InventoryPage } from "@/components/workspace/commerce";
import { CustomersPage, TeamPage } from "@/components/workspace/people";
import { OrdersPage, SuppliersPage } from "@/components/workspace/procurement";
import {
  ExpensesPage,
  ReportsPage,
  AssistantPage,
  FinancingPage,
  SettingsPage,
} from "@/components/workspace/management";
const titles: Record<string, string> = {
  operations: "Business operations",
  sales: "Sales",
  inventory: "Inventory",
  customers: "Customers",
  suppliers: "Suppliers",
  orders: "Purchase orders",
  expenses: "Expenses",
  reports: "Reports",
  assistant: "BiasharaAI",
  financing: "Business financing",
  team: "Your team",
  settings: "Settings",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  return { title: titles[(await params).section] ?? "Workspace" };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { section } = await params;
  const { q } = await searchParams;
  switch (section) {
    case "operations":
      return <OperationsPage />;
    case "sales":
      return <SalesPage />;
    case "inventory":
      return <InventoryPage key={q ?? ""} initialQuery={q} />;
    case "customers":
      return <CustomersPage key={q ?? ""} initialQuery={q} />;
    case "suppliers":
      return <SuppliersPage />;
    case "orders":
      return <OrdersPage />;
    case "expenses":
      return <ExpensesPage />;
    case "reports":
      return <ReportsPage />;
    case "assistant":
      return <AssistantPage />;
    case "financing":
      return <FinancingPage />;
    case "team":
      return <TeamPage />;
    case "settings":
      return <SettingsPage />;
    default:
      if (
        [
          "tools",
          "scanner",
          "baskets",
          "promotions",
          "split-payments",
          "returns",
          "documents",
          "register",
          "stocktakes",
          "expiry",
          "variants",
          "movements",
          "transfers",
          "compare",
          "deliveries",
          "loyalty",
          "branches",
          "online-shop",
          "customer-portal",
          "sync",
          "preferences",
        ].includes(section)
      )
        return <ToolPage slug={section} />;
      notFound();
  }
}
