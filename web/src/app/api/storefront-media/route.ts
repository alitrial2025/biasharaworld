import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  admin,
  ApiError,
  fail,
  identity,
  json,
  loadBusiness,
} from "@/lib/backend/server";

const maxBytes = 2_500_000;
const browserTypes = ["image/jpeg", "image/png", "image/webp"];
const decodedTypes = ["jpeg", "png", "webp"];

export async function POST(request: Request) {
  try {
    const workspace = await loadBusiness(await identity(request));
    if (!workspace || workspace.role !== "Owner")
      throw new ApiError(
        "Only the business owner can upload shop images.",
        403,
      );
    if (Number(request.headers.get("content-length") ?? 0) > maxBytes + 8192)
      throw new ApiError("Choose an image under 2.5 MB.", 413);
    const form = await request.formData();
    const file = form.get("image");
    if (
      !(file instanceof File) ||
      !browserTypes.includes(file.type) ||
      file.size === 0
    )
      throw new ApiError("Choose a JPEG, PNG or WebP image.");
    if (file.size > maxBytes)
      throw new ApiError("Choose an image under 2.5 MB.", 413);
    let output: Buffer;
    try {
      const input = sharp(new Uint8Array(await file.arrayBuffer()), {
        limitInputPixels: 20_000_000,
        failOn: "error",
      });
      const metadata = await input.metadata();
      if (
        !decodedTypes.includes(metadata.format ?? "") ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error("Unsupported image");
      output = await input
        .rotate()
        .resize(1800, 1800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer();
    } catch {
      throw new ApiError(
        "This image could not be read. Choose a still JPEG, PNG or WebP under 20 megapixels.",
      );
    }
    if (output.length > maxBytes)
      throw new ApiError("Choose a smaller image.", 413);
    const name = randomUUID() + ".webp";
    const object = workspace.businessId + "/" + name;
    const saved = await admin()
      .storage.from("storefront-media")
      .upload(object, output, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: false,
      });
    if (saved.error)
      throw new ApiError("Image upload unavailable. Please try again.", 503);
    return json({ path: "/api/storefront-media/" + object });
  } catch (error) {
    return fail(error);
  }
}
