"use client";
import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { useDemo } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { productImageBelongsTo } from "@/lib/product-images";
import type { Product } from "@/lib/data";

export function PhotoFrame({
  src,
  name,
  small = false,
  loading = false,
  failed = false,
}: {
  src?: string;
  name: string;
  small?: boolean;
  loading?: boolean;
  failed?: boolean;
}) {
  const [broken, setBroken] = useState<string>();
  return (
    <span
      className={`product-art product-photo ${small ? "product-art-small" : ""}`}
    >
      {src && broken !== src ? (
        // Blob URLs and the shop's checked image route must bypass Next's public image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`${name} photo`} onError={() => setBroken(src)} />
      ) : (
        <span
          role="img"
          aria-label={`${name}: ${loading ? "photo loading" : failed || (broken === src && !!src) ? "photo unavailable" : "no photo"}`}
        >
          <Package size={small ? 20 : 28} />
        </span>
      )}
    </span>
  );
}

/** A private download with the current member JWT; URLs live only for this mounted image. */
export function ProductPhoto({
  product,
  name,
  small = false,
}: {
  product?: Pick<Product, "imagePath" | "name">;
  name?: string;
  small?: boolean;
}) {
  const { store } = useDemo();
  const businessId = store.workspace?.businessId || "";
  const path = product?.imagePath;
  const validPath = !!path && productImageBelongsTo(path, businessId);
  const key = `${businessId}/${path || ""}`;
  const [image, setImage] = useState<{
    key: string;
    url?: string;
    failed?: boolean;
  }>();
  useEffect(() => {
    if (!path || !productImageBelongsTo(path, businessId)) return;
    let active = true;
    let url: string | undefined;
    void (async () => {
      try {
        const { data, error } = await supabase()
          .storage.from("product-images")
          .download(path);
        if (error || !data) throw error;
        if (active) {
          url = URL.createObjectURL(data);
          setImage({ key, url });
        }
      } catch {
        if (active) setImage({ key, failed: true });
      }
    })();
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [businessId, path, key]);
  const current = image?.key === key ? image : undefined;
  return (
    <PhotoFrame
      src={current?.url}
      name={product?.name || name || "Product"}
      small={small}
      loading={validPath && !current}
      failed={(!!path && !validPath) || current?.failed}
    />
  );
}
