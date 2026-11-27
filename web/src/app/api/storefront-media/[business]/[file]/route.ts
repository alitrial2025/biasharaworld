import { admin } from "@/lib/backend/server";
import { storefrontMediaPath } from "@/lib/storefront";

type Context = { params: Promise<{ business: string; file: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { business, file } = await params;
  if (!storefrontMediaPath.test(`/api/storefront-media/${business}/${file}`))
    return new Response(null, { status: 404 });
  const { data, error } = await admin()
    .storage.from("storefront-media")
    .download(business + "/" + file);
  if (error || !data) {
    const status = error && "status" in error ? Number(error.status) : 0;
    return new Response(null, {
      status: status === 400 || status === 404 ? 404 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return new Response(data, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
