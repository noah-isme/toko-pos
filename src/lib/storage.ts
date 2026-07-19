import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/env";

const PRODUCT_IMAGES_BUCKET = "product-images";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

let cachedClient: SupabaseClient | null | undefined;

/**
 * Server-side Supabase client keyed to the service-role secret. Only import
 * this module from server contexts (route handlers, tRPC resolvers) — the
 * secret key bypasses RLS and must never reach the browser.
 *
 * Returns null when Supabase is not configured, signaling callers to fall
 * back to base64 data URLs (dev/mock mode).
 */
const getServerSupabase = (): SupabaseClient | null => {
  if (cachedClient === undefined) {
    const hasSecret =
      Boolean(env.SUPABASE_URL) && Boolean(env.SUPABASE_SECRET_KEY);
    cachedClient = hasSecret
      ? createClient(env.SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  }
  return cachedClient;
};

export type ImageUploadResult = {
  url: string;
  stored: "supabase" | "base64";
};

export type ImageUploadError = {
  reason: "invalid_type" | "too_large" | "upload_failed";
  message: string;
};

export const validateImageFile = (mimeType: string, bytes: number) => {
  if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      ok: false as const,
      error: {
        reason: "invalid_type" as const,
        message: `Tipe file tidak didukung: ${mimeType}. Gunakan PNG, JPG, WebP, atau GIF.`,
      },
    };
  }
  if (bytes > MAX_IMAGE_BYTES) {
    return {
      ok: false as const,
      error: {
        reason: "too_large" as const,
        message: `Ukuran gambar ${(bytes / 1024 / 1024).toFixed(1)} MB melebihi batas 5 MB.`,
      },
    };
  }
  return { ok: true as const };
};

/**
 * Uploads a product image. When Supabase is configured (production), uploads
 * to the `product-images` bucket and returns the public URL. Otherwise, encodes
 * the bytes as a base64 data URL so the caller can persist it directly in the
 * `Product.imageUrl` column — keeping the flow usable in dev/mock mode.
 */
export const uploadProductImage = async (
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ImageUploadResult> => {
  const validation = validateImageFile(mimeType, buffer.byteLength);
  if (!validation.ok) {
    throw new Error(validation.error.message);
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    const base64 = buffer.toString("base64");
    return {
      url: `data:${mimeType};base64,${base64}`,
      stored: "base64",
    };
  }

  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const objectName = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(objectName, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    throw new Error(`Gagal mengunggah gambar: ${error.message}`);
  }

  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(objectName);

  return {
    url: data.publicUrl,
    stored: "supabase",
  };
};

export const isDataUrl = (value: string | null | undefined): boolean =>
  typeof value === "string" && value.startsWith("data:");
