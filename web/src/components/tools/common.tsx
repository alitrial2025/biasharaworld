"use client";
import { T, LocalButton } from "@/components/locale";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Barcode,
  BookOpen,
  Boxes,
  ClipboardCheck,
  CreditCard,
  Gift,
  Globe,
  Layers,
  MapPin,
  PackageSearch,
  Pause,
  Percent,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShoppingBag,
  Truck,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge, Button, PageHeading, useToast } from "@/components/ui";
import { useDemo } from "@/lib/store";
import type { Action } from "@/lib/operations";

export const features: {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  group: string;
  tone: string;
}[] = [
  {
    id: 1,
    slug: "scanner",
    title: "A quicker way to find it.",
    description:
      "Enter a barcode, use a keyboard scanner or prepare labels for your shelves.",
    icon: Barcode,
    group: "Selling",
    tone: "green",
  },
  {
    id: 2,
    slug: "baskets",
    title: "A little pause. Nothing lost.",
    description:
      "Park a basket, serve the next customer and pick up where you left off.",
    icon: Pause,
    group: "Selling",
    tone: "amber",
  },
  {
    id: 3,
    slug: "promotions",
    title: "A good reason to come back.",
    description:
      "Simple offers for your neighbours, with clear dates and prices.",
    icon: Percent,
    group: "Selling",
    tone: "red",
  },
  {
    id: 4,
    slug: "split-payments",
    title: "One basket. Your way to pay.",
    description:
      "Record a payment across cash, M-Pesa and card, down to the last shilling.",
    icon: CreditCard,
    group: "Selling",
    tone: "blue",
  },
  {
    id: 5,
    slug: "returns",
    title: "A fair return. A clear record.",
    description:
      "Review the original receipt and record a local return without losing the details.",
    icon: RotateCcw,
    group: "Selling",
    tone: "red",
  },
  {
    id: 6,
    slug: "documents",
    title: "From a good quote to a clear invoice.",
    description:
      "Give every agreement a place, from your first draft to a recorded sale.",
    icon: BookOpen,
    group: "Selling",
    tone: "blue",
  },
  {
    id: 7,
    slug: "register",
    title: "Close the day with clarity.",
    description:
      "Opening float, cash movements and the final count, brought together.",
    icon: Wallet,
    group: "Selling",
    tone: "amber",
  },
  {
    id: 8,
    slug: "stocktakes",
    title: "Every shelf. Every little difference.",
    description:
      "Count at your pace, review what changed and bring your records up to date.",
    icon: ClipboardCheck,
    group: "Stock",
    tone: "green",
  },
  {
    id: 9,
    slug: "expiry",
    title: "Fresh stock. Fewer surprises.",
    description:
      "Keep batch dates in sight and make room for the products that should move first.",
    icon: PackageSearch,
    group: "Stock",
    tone: "amber",
  },
  {
    id: 10,
    slug: "variants",
    title: "Every size. Every useful combination.",
    description:
      "Organise your product variants and build bundles from your existing stock.",
    icon: Layers,
    group: "Stock",
    tone: "purple",
  },
  {
    id: 11,
    slug: "movements",
    title: "The story behind your stock.",
    description:
      "A clear timeline of what came in, went out and moved between shelves.",
    icon: RefreshCw,
    group: "Stock",
    tone: "blue",
  },
  {
    id: 12,
    slug: "transfers",
    title: "The right stock, in the right shop.",
    description:
      "Prepare, dispatch and receive branch transfers with one shared local record.",
    icon: Warehouse,
    group: "Stock",
    tone: "green",
  },
  {
    id: 13,
    slug: "compare",
    title: "A little comparison goes a long way.",
    description:
      "Compare the same goods, delivery fees and minimums before your next order.",
    icon: Boxes,
    group: "Growth",
    tone: "amber",
  },
  {
    id: 14,
    slug: "deliveries",
    title: "From your shelf to their doorstep.",
    description:
      "Pack carefully, keep the customer order in sight and follow every next step.",
    icon: Truck,
    group: "Growth",
    tone: "green",
  },
  {
    id: 15,
    slug: "loyalty",
    title: "Good customers. Little thank-yous.",
    description:
      "Reward familiar faces and keep points as clear as your sales records.",
    icon: Gift,
    group: "Growth",
    tone: "purple",
  },
  {
    id: 16,
    slug: "branches",
    title: "One business. More places to grow.",
    description:
      "Switch branches, compare your shops and keep each shelf in its own place.",
    icon: MapPin,
    group: "Growth",
    tone: "blue",
  },
  {
    id: 17,
    slug: "online-shop",
    title: "Your neighbourhood shop, online.",
    description:
      "Choose your products, shape your shopfront and preview a new way to order.",
    icon: ShoppingBag,
    group: "Growth",
    tone: "green",
  },
  {
    id: 18,
    slug: "customer-portal",
    title: "A clearer picture for your customers.",
    description:
      "Preview orders, invoices, balances and little rewards from the other side of the counter.",
    icon: Globe,
    group: "Growth",
    tone: "blue",
  },
  {
    id: 19,
    slug: "sync",
    title: "A little reassurance, wherever you work.",
    description:
      "See what is saved on this device and explore connection and retry states.",
    icon: RefreshCw,
    group: "Your space",
    tone: "amber",
  },
  {
    id: 20,
    slug: "preferences",
    title: "Make a little room for your preferences.",
    description:
      "Choose your language, theme and reading size. Feel at home on every screen.",
    icon: Settings2,
    group: "Your space",
    tone: "purple",
  },
];
export function useOperations() {
  const { state, store } = useDemo();
  const [error, setError] = useState("");
  const toast = useToast();
  async function act(action: Action, quiet = false) {
    try {
      const result = await store.command(action);
      setError("");
      if (!quiet) toast(result.message);
      return result;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Please review this action.";
      setError(message);
      toast(message, "info");
      return undefined;
    }
  }
  return {
    state,
    op: state.operations,
    store,
    act,
    error,
    clearError: () => setError(""),
  };
}
export function OperationError({ message }: { message: string }) {
  return message ? (
    <div className="operation-error" role="alert">
      <T>{message}</T>
    </div>
  ) : null;
}
export function ToolPanel({
  title,
  description,
  children,
  action,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="panel tool-panel">
      <T>
        {title && (
          <div className="panel-heading">
            <div>
              <h2>
                <T>{title}</T>
              </h2>

              <T>
                {description && (
                  <p>
                    <T>{description}</T>
                  </p>
                )}
              </T>
            </div>
            <T>{action}</T>
          </div>
        )}
      </T>

      <div className="tool-panel-content">
        <T>{children}</T>
      </div>
    </section>
  );
}
export function ToolsHub() {
  const [group, setGroup] = useState("All tools");
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE MORE POSSIBLE"
        title="Room for your next step."
        description="Twenty useful ways to make your business day a little clearer."
      >
        <Button href="/dashboard/sales/new" arrow>
          <T>Make a sale</T>
        </Button>
      </PageHeading>
      <div className="tools-category-tabs">
        <T>
          {["All tools", "Selling", "Stock", "Growth", "Your space"].map(
            (g) => (
              <LocalButton
                className={g === group ? "active" : ""}
                key={g}
                onClick={() => setGroup(g)}
              >
                <T>{g}</T>
              </LocalButton>
            ),
          )}
        </T>
      </div>
      <div className="tools-grid">
        <T>
          {features
            .filter((f) => group === "All tools" || f.group === group)
            .map((f) => (
              <Link
                href={`/dashboard/${f.slug}`}
                key={f.slug}
                className="panel tool-card"
              >
                <div>
                  <span className={`icon-box tone-${f.tone}`}>
                    <f.icon size={22} />
                  </span>
                  <Badge tone="gray">
                    <T>{String(f.id).padStart(2, "0")}</T> <T>·</T>{" "}
                    <T>{f.group}</T>
                  </Badge>
                </div>
                <h2>
                  <T>{f.title}</T>
                </h2>
                <p>
                  <T>{f.description}</T>
                </p>
                <span className="text-link">
                  <T>Take a look</T>
                  <ArrowRight size={15} />
                </span>
              </Link>
            ))}
        </T>
      </div>
    </>
  );
}
