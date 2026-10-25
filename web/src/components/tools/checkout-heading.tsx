"use client";
import { T } from "@/components/locale";
import Link from "next/link";
import { PageHeading, Badge } from "@/components/ui";
export function CheckoutHeading() {
  return (
    <>
      <Link href="/dashboard/sales" className="back-link">
        <T>← Back to sales</T>
      </Link>
      <PageHeading
        title="New sale"
        description="Quick checkout. Clear records. One less thing to juggle."
      >
        <Badge>
          <T>Record a sale</T>
        </Badge>
      </PageHeading>
    </>
  );
}
