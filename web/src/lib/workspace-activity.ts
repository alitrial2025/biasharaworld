import directory from "./industry-catalog/daily-work.json";
import type { DemoState } from "./data";
import { invoiceBalance, localDate, type CustomerOrder } from "./operations";

export type Metric =
  | "reorder"
  | "expiry"
  | "stocktake"
  | "transfer"
  | "purchase"
  | "receivable"
  | "delivery"
  | "bookingsToday";
type ActivityQueue = {
  module: string;
  statuses: readonly string[];
  field?: string;
  throughDays?: number;
  futureField?: string;
};
export type DailyAction = {
  slug: string;
  label: string;
  roles?: readonly string[];
  metric?: Metric;
  question?: string;
  queue?: ActivityQueue;
  view?: string;
};

const dailyWork: Record<string, readonly DailyAction[] | undefined> =
  directory as Record<string, readonly DailyAction[]>;

export function dailyActions(industry: string, role: string) {
  return dailyWork[industry]
    ?.filter((action) => !action.roles || action.roles.includes(role))
    .slice(0, 3);
}

export function dailyActionPath(action: DailyAction) {
  return action.queue
    ? `industry?module=${action.queue.module}&view=attention`
    : action.view
      ? `${action.slug}?view=${action.view}`
      : action.slug;
}

export function industryQueueMatcher(
  queue: ActivityQueue,
  today = localDate(),
  now = Date.now(),
) {
  const through = queue.field && dateOffset(today, queue.throughDays ?? 0);
  return (record: {
    status: string;
    module: string;
    values: Record<string, string | number>;
  }) => {
    if (
      record.module !== queue.module ||
      !queue.statuses.includes(record.status)
    )
      return false;
    if (queue.futureField) {
      const deadline = record.values[queue.futureField];
      if (typeof deadline !== "string" || !(Date.parse(deadline) > now))
        return false;
    }
    if (!queue.field || !through) return true;
    const date = record.values[queue.field];
    return typeof date === "string" && date !== "" && date <= through;
  };
}

const kenyaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Nairobi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function bookingNeedsAttention(
  booking: { startsAt: string; status: string },
  day = localDate(),
) {
  return (
    ["Scheduled", "In progress"].includes(booking.status) &&
    kenyaDay.format(new Date(booking.startsAt)) === day
  );
}

export const deliveryInFulfilment = (status: CustomerOrder["status"]) =>
  status === "New" ||
  status === "Confirmed" ||
  status === "Packing" ||
  status === "Dispatched";

function dateOffset(day: string, days: number) {
  const limit = new Date(day + "T00:00:00Z");
  limit.setUTCDate(limit.getUTCDate() + days);
  return limit.toISOString().slice(0, 10);
}
export const expiryReviewLimit = (day = localDate()) => dateOffset(day, 14);

export function productsAtReorderLevel(state: DemoState) {
  return state.products.filter(
    (product) =>
      !product.components?.length && product.stock <= product.reorder,
  );
}

export function activityCount(state: DemoState, metric: Metric) {
  const op = state.operations;
  const branch = op.activeBranch;
  switch (metric) {
    case "bookingsToday": {
      const day = localDate();
      return (
        op.bookings?.filter((booking) => bookingNeedsAttention(booking, day))
          .length ?? 0
      );
    }
    case "reorder":
      return productsAtReorderLevel(state).length;
    case "expiry": {
      const limit = expiryReviewLimit();
      return op.batches.filter(
        (batch) =>
          batch.branch === branch &&
          batch.quantity > 0 &&
          batch.expires <= limit,
      ).length;
    }
    case "stocktake":
      return op.counts.filter(
        (count) => count.branch === branch && count.status === "Draft",
      ).length;
    case "transfer":
      return op.transfers.filter(
        (transfer) =>
          transfer.to === branch && transfer.status === "Dispatched",
      ).length;
    case "purchase":
      return state.orders.filter(
        (order) =>
          (order.branch ?? "main") === branch && order.status === "Draft",
      ).length;
    case "receivable":
      return op.documents.filter(
        (doc) =>
          doc.branch === branch &&
          doc.kind === "Invoice" &&
          doc.status === "Issued locally" &&
          invoiceBalance(doc) > 0,
      ).length;
    case "delivery":
      return op.deliveries.filter(
        (order) =>
          order.branch === branch && deliveryInFulfilment(order.status),
      ).length;
  }
}
