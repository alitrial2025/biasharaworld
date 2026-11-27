import { createHash } from "node:crypto";
import { z } from "zod";
import {
  storefrontDraft,
  storefrontIssues,
  storefrontMediaPath,
  storefrontPublication,
  storefrontUsername,
} from "@/lib/storefront";
import { applyCommand } from "@/lib/backend/commands";
import { splitState } from "@/lib/backend/empty";
import {
  merchantVerificationStatus,
  verificationRequired,
} from "@/lib/backend/merchant-verification";
import {
  admin,
  ApiError,
  fail,
  identity,
  json,
  loadBusiness,
} from "@/lib/backend/server";
import {
  businessStorefront,
  initialStorefront,
} from "@/lib/backend/storefront";

const input = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("save"),
      revision: z.number().int().min(0),
      username: storefrontUsername,
      draft: storefrontDraft,
    })
    .strict(),
  z
    .object({
      action: z.enum(["publish", "unpublish"]),
      revision: z.number().int().min(1),
      requestId: z.uuid(),
    })
    .strict(),
]);

async function owner(request: Request) {
  const user = await identity(request);
  const workspace = await loadBusiness(user);
  if (!workspace || workspace.role !== "Owner")
    throw new ApiError("Only the business owner can manage the shop.", 403);
  return { user, workspace };
}

export async function GET(request: Request) {
  try {
    const { workspace } = await owner(request);
    const name = new URL(request.url).searchParams.get("username");
    if (name !== null) {
      const parsed = storefrontUsername.safeParse(name);
      if (!parsed.success)
        throw new ApiError(
          "Use 3–40 letters or digits with single hyphens. Choose an available username.",
          400,
        );
      const result = await admin()
        .from("business_storefronts")
        .select("business_id")
        .eq("username", parsed.data)
        .maybeSingle();
      if (result.error)
        throw new ApiError("Could not check username availability.", 503);
      return json({
        username: parsed.data,
        available:
          !result.data || result.data.business_id === workspace.businessId,
      });
    }
    const [record, verification] = await Promise.all([
      businessStorefront(workspace.businessId),
      merchantVerificationStatus(workspace.businessId),
    ]);
    const setup = {
      username: record?.username ?? "",
      revision: record?.revision ?? 0,
      draft: record?.draft ?? initialStorefront(workspace.state),
      live: record?.live ?? null,
      published: workspace.state.operations.shop.published,
      verification,
      legacySlug: workspace.slug,
    };
    return json({ ...setup, publication: storefrontPublication(setup) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await owner(request);
    const raw = await request.text();
    if (raw.length > 150_000)
      throw new ApiError("The shop configuration is too large.", 413);
    const action = input.parse(JSON.parse(raw));
    if (action.action === "save") {
      const { logo, cover, productDetails } = action.draft;
      const imagePaths = [
        logo,
        cover,
        ...Object.values(productDetails).map((detail) => detail.image),
      ];
      if (
        imagePaths.some(
          (path) =>
            storefrontMediaPath.test(path) &&
            !path.startsWith(`/api/storefront-media/${workspace.businessId}/`),
        )
      )
        throw new ApiError("Choose images uploaded for this business.", 403);
    }
    const saved = await businessStorefront(workspace.businessId);
    const draft = action.action === "save" ? action.draft : saved?.draft;
    if (!draft) throw new ApiError("Save your shop setup first.", 409);
    const changes =
      action.action === "save"
        ? { ...draft, products: [...new Set(draft.products)] }
        : draft;
    let businessState = workspace.state;
    if (action.action === "publish") {
      const issues = storefrontIssues(changes);
      if (issues.length) throw new ApiError(issues[0], 400);
      if (
        !workspace.state.operations.branches.some(
          (branch) => branch.id === changes.branch,
        )
      )
        throw new ApiError("Choose a fulfilment branch.", 400);
      const verification = await merchantVerificationStatus(
        workspace.businessId,
      );
      if (verification !== "verified")
        throw new ApiError(verificationRequired[verification], 403);
      if (
        changes.catalog === "selected" &&
        !workspace.state.products.some((product) =>
          changes.products.includes(product.id),
        )
      ) {
        throw new ApiError(
          "The selected products are no longer in inventory. Update your catalogue.",
          409,
        );
      }
      const hidden = workspace.state.products
        .filter(
          (product) =>
            changes.catalog === "off" ||
            (changes.catalog === "selected" &&
              !changes.products.includes(product.id)),
        )
        .map((product) => product.id);
      businessState = applyCommand(
        businessState,
        {
          type: "shop",
          published: true,
          name: changes.name,
          description: changes.description,
          branch: changes.branch,
          hidden,
          fee: changes.fulfillment === "delivery" ? changes.fee : 0,
        },
        workspace.role,
      ).state;
    }
    if (action.action === "unpublish")
      businessState = applyCommand(
        businessState,
        { type: "shop", published: false },
        workspace.role,
      ).state;
    const { business, workspace: personal } = splitState(businessState);
    const response = await admin().rpc("save_business_storefront", {
      target_business: workspace.businessId,
      actor: user.id,
      expected_revision: action.revision,
      chosen_username:
        action.action === "save" ? action.username : saved?.username,
      changes,
      mode: action.action,
      workspace_revision: workspace.revision,
      request_id: action.action === "save" ? null : action.requestId,
      input_hash: createHash("sha256")
        .update(JSON.stringify(action))
        .digest("hex"),
      business_state: business,
      personal_state: personal,
    });
    if (response.error?.code === "23505")
      throw new ApiError("That username is taken. Try a different one.", 409);
    if (response.error?.code === "23514")
      throw new ApiError(
        "This username has already been published and is permanent.",
        409,
      );
    if (response.error?.code === "40001")
      throw new ApiError(
        "Shop details changed. Reload and review your draft.",
        409,
      );
    if (response.error?.code === "42501")
      throw new ApiError(
        "The owner must complete merchant verification before publishing.",
        403,
      );
    if (response.error || !response.data)
      throw new ApiError("Could not save your shop. Please try again.", 503);
    const { username, revision, draft: savedDraft, live } = response.data;
    return json({
      username,
      revision,
      draft: savedDraft,
      live,
      published: businessState.operations.shop.published,
    });
  } catch (error) {
    return fail(error);
  }
}
