import type { CustomerOrder } from "./operations";

export type OrderUpdate = { date: string; label: string };

export function orderFulfillment(
  order: Pick<CustomerOrder, "fulfillment" | "address">,
) {
  return (
    order.fulfillment ??
    (order.address?.startsWith("Pickup at ") ? "pickup" : "delivery")
  );
}

export function orderStatusLabel(
  status: CustomerOrder["status"],
  pickup: boolean,
) {
  switch (status) {
    case "New":
      return "Order received";
    case "Confirmed":
      return "Order confirmed";
    case "Packing":
      return "Packing your order";
    case "Dispatched":
      return pickup ? "Ready for pickup" : "Out for delivery";
    case "Delivered":
      return pickup ? "Picked up" : "Delivered";
    case "Cancelled":
      return "Order cancelled";
  }
}

const statuses = new Set([
  "New",
  "Confirmed",
  "Packing",
  "Dispatched",
  "Delivered",
  "Cancelled",
]);
export function orderProgress(order: CustomerOrder) {
  const fulfillment = orderFulfillment(order);
  const statusLabel = orderStatusLabel(order.status, fulfillment === "pickup");
  const updates: OrderUpdate[] = [];
  for (const event of order.events) {
    const entry = /^(\d{4}-\d{2}-\d{2}) · ([^·]+?)(?: ·.*)?$/.exec(event);
    if (!entry) continue;
    const [, date, action] = entry;
    const label = statuses.has(action)
      ? orderStatusLabel(
          action as CustomerOrder["status"],
          fulfillment === "pickup",
        )
      : action === "Demo order created" || action === "Order received"
        ? "Order received"
        : action === "Cash received" || action === "Online payment confirmed"
          ? "Payment recorded"
          : null;
    if (label) updates.push({ date, label });
  }
  return {
    fulfillment,
    statusLabel,
    updates,
    pickupLocation:
      fulfillment === "pickup"
        ? order.address?.split(" · ")[0]?.replace(/^Pickup at /, "")
        : undefined,
  };
}
