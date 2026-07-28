import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { requireAdminOrOwnerSession } from "@/server/api/utils/http-access";

// POST /api/products/[id]/archive - Archive product (soft delete)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminOrOwnerSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    // Update product to inactive (archived)
    const product = await db.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        isActive: product.isActive,
      },
    });
  } catch (error) {
    console.error("Error archiving product:", error);
    return NextResponse.json(
      { error: "Failed to archive product" },
      { status: 500 },
    );
  }
}
