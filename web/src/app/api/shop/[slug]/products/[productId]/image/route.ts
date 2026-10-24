import { admin, ApiError, fail } from "@/lib/backend/server";
import { shopRecord } from "@/lib/backend/shop";
import { productImagePath } from "@/lib/backend/product-images";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ slug: string; productId: string }> };

/** Publish only the current photo of a visible product in this published shop. */
export async function GET(_request: Request, { params }: Context) {
  try {
    const { slug, productId } = await params;
    if (!/^\d+$/.test(productId)) throw new ApiError("Photo not found.", 404);
    const shop = await shopRecord(slug);
    const product = shop.state.products.find((p) => p.id === Number(productId));
    const path = product?.imagePath;
    if (
      !product ||
      shop.state.operations.shop.hidden.includes(product.id) ||
      !path ||
      !productImagePath.test(path) ||
      !path.startsWith(shop.id + "/")
    )
      throw new ApiError("Photo not found.", 404);
    const { data, error } = await admin()
      .storage.from("product-images")
      .download(path);
    if (error || !data) throw new ApiError("Photo unavailable.", 404);
    if (!["image/jpeg", "image/png", "image/webp"].includes(data.type))
      throw new ApiError("Photo unavailable.", 404);
    return new Response(data, {
      headers: {
        "Content-Type": data.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
