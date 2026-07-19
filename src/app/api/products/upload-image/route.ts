import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { uploadProductImage, validateImageFile } from "@/lib/storage";

// POST /api/products/upload-image - Upload a product image
// Accepts multipart/form-data with a single "file" field. When Supabase is
// configured, uploads to the product-images bucket and returns the public
// URL. Otherwise returns a base64 data URL so dev/mock mode stays functional.
export async function POST(request: Request) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
