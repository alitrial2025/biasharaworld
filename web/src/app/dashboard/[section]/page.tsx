import { StorefrontBuilder } from "@/components/workspace/storefront-builder";
import { IndustryPage } from "@/components/workspace/industry-page";
import { ToolPage } from "@/components/tools/tool-page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SalesPage, InventoryPage } from "@/components/workspace/commerce";
import { CustomersPage, TeamPage } from "@/components/workspace/people";
import { OrdersPage, SuppliersPage } from "@/components/workspace/procurement";
import { IdentityVerificationPage } from "@/components/workspace/identity-verification";
import { PaymentSettingsPage } from "@/components/workspace/payment-settings";
import { PaymentActivityPage } from "@/components/workspace/payment-activity";
import { SettlementReconciliationPage } from "@/components/workspace/settlement-reconciliation";
import { SupplierExchangePage } from "@/components/workspace/supplier-exchange";
import { BusinessImportPage } from "@/components/workspace/business-import";
import { FinancialOverviewPage } from "@/components/workspace/financial-overview";
import { ServiceBookingsPage } from "@/components/workspace/service-bookings";
import { CustomerServicePage } from "@/components/workspace/customer-service";
import {
  ExpensesPage,
  ReportsPage,
  AssistantPage,
  FinancingPage,
  SettingsPage,
} from "@/components/workspace/management";
const titles: Record<string, string> = {
  industry: "Industry operations",
  "online-shop": "Shop builder",
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
  verification: "Owner identity verification",
  "company-verification": "Kenyan company verification",
  payments: "Online payments",
  "payment-activity": "Payment activity",
  settlements: "Settlement reconciliation",
  "supplier-network": "Supplier network",
  imports: "Import business records",
  "financial-overview": "Financial overview",
  bookings: "Services and bookings",
  "customer-service": "Customer service notes",
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
  searchParams: Promise<{ q?: string; module?: string }>;
}) {
  const { section } = await params;
  const { q, module } = await searchParams;
  switch (section) {
    case "online-shop":
      return <StorefrontBuilder />;
    case "industry":
      return <IndustryPage moduleId={module} />;
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
    case "verification":
      return <IdentityVerificationPage />;
    case "company-verification":
      return <IdentityVerificationPage company />;
    case "payments":
      return <PaymentSettingsPage />;
    case "payment-activity":
      return <PaymentActivityPage />;
    case "settlements":
      return <SettlementReconciliationPage />;
    case "supplier-network":
      return <SupplierExchangePage />;
    case "imports":
      return <BusinessImportPage />;
    case "financial-overview":
      return <FinancialOverviewPage />;
    case "bookings":
      return <ServiceBookingsPage />;
    case "customer-service":
      return <CustomerServicePage />;
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
          "customer-portal",
          "sync",
          "preferences",
        ].includes(section)
      )
        return <ToolPage slug={section} />;
      notFound();
  }
}
