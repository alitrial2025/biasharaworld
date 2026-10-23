import { available, initialOperations } from "../operations";
import type { DemoState, Profile } from "../data";
/** No sample transactions, inventory, points or branches are imported into a real account. */
export function emptyBusiness(profile: Partial<Profile> = {}): DemoState {
  const operations = initialOperations([]);
  Object.assign(operations, {
    branches: [
      { id: "main", name: "Main shop", location: profile.location || "" },
    ],
    stock: { main: {} },
    receipts: [],
    promotions: [],
    rewards: [],
    loyalty: {},
    movements: [],
    shop: {
      published: false,
      name: profile.business || "My business",
      description: "",
      branch: "main",
      hidden: [],
      fee: 0,
    },
  });
  return {
    version: 2,
    profile: {
      name: "",
      business: "My business",
      email: "",
      phone: "",
      location: "",
      type: "Retail shop",
      plan: "Starter",
      ...profile,
    },
    suppliers: [],
    products: [],
    sales: [],
    customers: [],
    expenses: [],
    orders: [],
    members: [],
    notifications: {},
    target: 0,
    operations,
  };
}
export const personalKeys = [
  "activeBranch",
  "cart",
  "customer",
  "discount",
  "discountKind",
  "promotion",
  "redeem",
  "held",
  "preferences",
] as const;
export function splitState(state: DemoState) {
  const business = structuredClone(state);
  const workspace = Object.fromEntries(
    personalKeys.map((k) => [k, state.operations[k]]),
  );
  const defaults = emptyBusiness().operations;
  for (const k of personalKeys)
    (business.operations as unknown as Record<string, unknown>)[k] =
      defaults[k];
  // Canonical product quantities are always for the main branch; each session projects its chosen branch.
  for (const p of business.products)
    p.stock = business.operations.stock.main?.[p.id] ?? 0;
  return { business, workspace };
}
export function mergeState(
  state: DemoState,
  workspace: Record<string, unknown> = {},
) {
  const result = structuredClone(state);
  for (const k of personalKeys)
    if (k in workspace)
      (result.operations as unknown as Record<string, unknown>)[k] =
        workspace[k];
  if (
    !result.operations.branches.some(
      (b) => b.id === result.operations.activeBranch,
    )
  )
    result.operations.activeBranch = "main";
  for (const p of result.products.filter((p) => !p.components))
    p.stock =
      result.operations.stock[result.operations.activeBranch]?.[p.id] ?? 0;
  for (const p of result.products.filter((p) => p.components))
    p.stock = available(result, p.id);
  return result;
}
