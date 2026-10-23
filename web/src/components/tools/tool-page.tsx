"use client";
import { LiveSync } from "@/components/live-sync";
import { T } from "@/components/locale";
import Link from "next/link";
import { PageHeading, Badge, Button } from "@/components/ui";
import { features, ToolsHub } from "./common";
import {
  AdvancedCheckout,
  ScannerTool,
  BasketsTool,
  PromotionsTool,
  ReturnsTool,
  DocumentsTool,
  RegisterTool,
} from "./selling";
import {
  StocktakesTool,
  ExpiryTool,
  VariantsTool,
  MovementsTool,
  TransfersTool,
} from "./stock";
import {
  CompareTool,
  DeliveriesTool,
  LoyaltyTool,
  BranchesTool,
  OnlineShopTool,
  PortalTool,
  PreferencesTool,
} from "./growth";
const screens: Record<string, React.ComponentType> = {
  scanner: ScannerTool,
  baskets: BasketsTool,
  promotions: PromotionsTool,
  "split-payments": () => <AdvancedCheckout splitByDefault />,
  returns: ReturnsTool,
  documents: DocumentsTool,
  register: RegisterTool,
  stocktakes: StocktakesTool,
  expiry: ExpiryTool,
  variants: VariantsTool,
  movements: MovementsTool,
  transfers: TransfersTool,
  compare: CompareTool,
  deliveries: DeliveriesTool,
  loyalty: LoyaltyTool,
  branches: BranchesTool,
  "online-shop": OnlineShopTool,
  "customer-portal": PortalTool,
  sync: LiveSync,
  preferences: PreferencesTool,
};
export const toolSlugs = ["tools", ...Object.keys(screens)];
export function ToolPage({ slug }: { slug: string }) {
  if (slug === "tools") return <ToolsHub />;
  const feature = features.find((f) => f.slug === slug)!;
  const View = screens[slug];
  return (
    <>
      <Link className="back-link" href="/dashboard/tools">
        <T>← All business tools</T>
      </Link>
      <PageHeading
        eyebrow={`${feature.group.toUpperCase()} · A LITTLE MORE POSSIBLE`}
        title={feature.title}
        description={feature.description}
      >
        <Badge tone={feature.tone}>
          <T>Feature</T> <T>{String(feature.id).padStart(2, "0")}</T>
        </Badge>
        <Button href="/dashboard/tools" variant="secondary">
          <T>Explore all tools</T>
        </Button>
      </PageHeading>
      <View />
    </>
  );
}
