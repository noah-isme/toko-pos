import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";

// POST /api/products/[id]/archive - Archive product (soft delete)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
