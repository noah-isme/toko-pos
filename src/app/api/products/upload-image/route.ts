import { NextResponse } from "next/server";
import { uploadProductImage, validateImageFile } from "@/lib/storage";
import { requireAdminOrOwnerSession } from "@/server/api/utils/http-access";

// POST /api/products/upload-image - Upload a product image
// Accepts multipart/form-data with a single "file" field. When Supabase is
// configured, uploads to the product-images bucket and returns the public
// URL. Otherwise returns a base64 data URL so dev/mock mode stays functional.
export async function POST(request: Request) {
  try {
    const auth = await requireAdminOrOwnerSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File gambar wajib diunggah." },
        { status: 400 },
      );
    }

    const mimeType = file.type || "application/octet-stream";
    const validation = validateImageFile(mimeType, file.size);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error.message }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await uploadProductImage(buffer, mimeType, file.name);

    return NextResponse.json({
      url: result.url,
      stored: result.stored,
    });
  } catch (error) {
    console.error("Error uploading product image:", error);
    const message =
      error instanceof Error ? error.message : "Gagal mengunggah gambar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
