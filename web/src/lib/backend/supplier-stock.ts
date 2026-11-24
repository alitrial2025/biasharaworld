import { createHash } from "node:crypto";
import { z } from "zod";
import type { OfferedLine } from "../supplier-exchange";
import { applyCommand } from "./commands";
import { splitState } from "./empty";
import { admin, ApiError, type loadBusiness } from "./server";

export const stockIntake = z.object({
  action: z.literal("receive_stock"), id: z.uuid(), requestId: z.uuid(),
  version: z.number().int().positive(),
  branch: z.string().min(1).max(200),
  lines: z.array(z.object({ index: z.number().int().min(0).max(19), productId: z.number().int().positive().max(1e9), expires: z.iso.date() }).strict()).min(1).max(20),
}).strict();

export async function receiveSupplierStock(
  input: z.infer<typeof stockIntake>, workspace: NonNullable<Awaited<ReturnType<typeof loadBusiness>>>, actor: string,
) {
  const db = admin();
  const hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const previous = await db.from("business_commands").select("user_id,command_hash").eq("business_id", workspace.businessId)
    .eq("request_id", input.requestId).maybeSingle();
  if (previous.error) throw new ApiError("Could not check this receipt.", 503);
  if (previous.data) {
    if (previous.data.user_id === actor && previous.data.command_hash === hash) return;
    throw new ApiError("This request ID was used for another change.", 409);
  }
  if (workspace.state.operations.activeBranch !== input.branch) throw new ApiError("The active branch changed. Check where you want to receive the stock.", 409);
  const order = await db.from("supplier_exchanges").select("offered_lines,status,version")
    .eq("id", input.id).eq("buyer_id", workspace.businessId).maybeSingle<{ offered_lines: OfferedLine[] | null; status: string; version: number }>();
  if (order.error) throw new ApiError("Could not load the supplier order.", 503);
  if (!order.data) throw new ApiError("Supplier order not found.", 404);
  if (order.data.version !== input.version || !["received", "invoiced", "paid"].includes(order.data.status)) {
    throw new ApiError("Confirm delivery and reload the order before receiving stock.", 409);
  }
  const offered = order.data.offered_lines ?? [];
  if (new Set(input.lines.map(line => line.index)).size !== input.lines.length || input.lines.some(line => !offered[line.index])) {
    throw new ApiError("Map each stock line from the accepted quote once.");
  }
  let state = workspace.state;
  for (const line of input.lines) {
    state = applyCommand(state, {
      type: "batch", productId: line.productId, quantity: offered[line.index].quantity,
      code: `SUP-${input.id.slice(0, 8)}-${line.index + 1}`, expires: line.expires,
    }, workspace.role).state;
  }
  const next = splitState(state);
  const saved = await db.rpc("commit_business_command", {
    p_business: workspace.businessId, p_user: actor, p_revision: workspace.revision, p_request: input.requestId,
    p_hash: hash, p_type: "receiveSupplierStock", p_state: next.business, p_workspace: next.workspace,
    p_result: { message: "Supplier stock recorded." }, p_input: { command: input },
  });
  if (saved.error?.code === "23505") throw new ApiError("Stock from this supplier order was already recorded.", 409);
  if (saved.data?.conflict || saved.error?.code === "40001") throw new ApiError("The order or stock records changed. Reload before trying again.", 409);
  if (saved.error) throw new ApiError("Could not record supplier stock. Retry the same request.", 503);
}
