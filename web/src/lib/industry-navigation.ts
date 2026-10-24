import {
  LayoutDashboard, BriefcaseBusiness, Package, Users, ShoppingBag, FileText,
  Truck, ShoppingCart, Wallet, BarChart3, Sprout, UsersRound, Grid2X2,
  CalendarDays, Warehouse, ScanLine, Gift, Settings2, type LucideIcon,
} from "lucide-react";
import { resolveIndustry } from "./industries";

export type IndustryLink = { label: string; href: string; icon: LucideIcon };
const links: Record<string, IndustryLink> = {
  sales: { label: "Sales", href: "/dashboard/sales", icon: ShoppingBag },
  inventory: { label: "Inventory", href: "/dashboard/inventory", icon: Package },
  customers: { label: "Customers", href: "/dashboard/customers", icon: Users },
  suppliers: { label: "Suppliers", href: "/dashboard/suppliers", icon: Truck },
  orders: { label: "Purchase orders", href: "/dashboard/orders", icon: ShoppingCart },
  documents: { label: "Quotes & invoices", href: "/dashboard/documents", icon: FileText },
  expenses: { label: "Expenses", href: "/dashboard/expenses", icon: Wallet },
  reports: { label: "Reports", href: "/dashboard/reports", icon: BarChart3 },
  stocktakes: { label: "Stocktakes", href: "/dashboard/stocktakes", icon: Warehouse },
  expiry: { label: "Expiry & batches", href: "/dashboard/expiry", icon: CalendarDays },
  scanner: { label: "Barcode scanner", href: "/dashboard/scanner", icon: ScanLine },
  variants: { label: "Variants & bundles", href: "/dashboard/variants", icon: Package },
  transfers: { label: "Stock transfers", href: "/dashboard/transfers", icon: Truck },
  compare: { label: "Supplier comparison", href: "/dashboard/compare", icon: ShoppingCart },
  deliveries: { label: "Shop order fulfilment", href: "/dashboard/deliveries", icon: Truck },
  register: { label: "Cash register", href: "/dashboard/register", icon: Wallet },
  loyalty: { label: "Customer rewards", href: "/dashboard/loyalty", icon: Gift },
  preferences: { label: "Preferences", href: "/dashboard/preferences", icon: Settings2 },
};

/** One sector workspace, a few relevant shared tools, and an explicit way to see all tools. */
export function getIndustryNavigation(type: string) {
  const industry = resolveIndustry(type);
  const mainLinks: IndustryLink[] = [
    { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { label: industry.labels.operations, href: "/dashboard/operations", icon: BriefcaseBusiness },
  ];
  const trade = industry.recommendedTools.includes("inventory");
  if (trade) mainLinks.push({ ...links.inventory, label: industry.labels.catalog });
  mainLinks.push({ ...links.customers, label: industry.labels.customers });
  mainLinks.push(industry.recommendedTools.includes("sales") ? links.sales : links.documents);
  const mainPaths = new Set(mainLinks.map(link => link.href));
  const tools: IndustryLink[] = [];
  for (const slug of [...industry.recommendedTools, "expenses", "reports"]) {
    const link = links[slug];
    if (link && !mainPaths.has(link.href) && !tools.some(item => item.href === link.href)) tools.push(link);
  }
  return { industry, mainLinks, tools: [
    ...tools.slice(0, 5),
    { label: "Funding readiness", href: "/dashboard/financing", icon: Sprout },
    { label: "Your team", href: "/dashboard/team", icon: UsersRound },
    { label: "All business tools", href: "/dashboard/tools", icon: Grid2X2 },
  ] };
}
