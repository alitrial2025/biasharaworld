import { supabase } from "./supabase";

export const PRODUCT_IMAGE_LIMIT = 3_145_728;
export function productImageBelongsTo(path: string, businessId: string) {
  return (
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path) &&
    path.split("/")[0] === businessId
  );
}

/** Decode and reencode locally: normalize orientation, bound dimensions, strip metadata. */
export async function prepareProductPhoto(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP photo.");
  if (!file.size || file.size > 25 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 25 MB.");
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be opened. Choose another photo.");
  }
  try {
    const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this photo.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Could not prepare this photo.")),
        "image/jpeg",
        0.85,
      ),
    );
    if (blob.size > PRODUCT_IMAGE_LIMIT)
      throw new Error(
        "This photo is too large after resizing. Choose a smaller image.",
      );
    return blob;
  } finally {
    image.close();
  }
}

export async function uploadProductPhoto(businessId: string, file: File) {
  if (!/^[0-9a-f-]{36}$/.test(businessId))
    throw new Error("Open your business before adding photos.");
  const blob = await prepareProductPhoto(file);
  const path = `${businessId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase()
    .storage.from("product-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error)
    throw new Error(
      "Could not upload the photo. Check your connection and business permissions, then try again.",
    );
  return path;
}
