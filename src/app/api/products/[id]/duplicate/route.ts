import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";

// POST /api/products/[id]/duplicate - Duplicate product
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

    // Get original product
    const originalProduct = await db.product.findUnique({
      where: { id },
      include: {
        inventoryLines: true,
      },
    });

    if (!originalProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Generate new SKU
    const timestamp = Date.now().toString().slice(-6);
    const newSku = `${originalProduct.sku}-COPY-${timestamp}`;

    // Create duplicate product
    const newProduct = await db.product.create({
      data: {
        name: `${originalProduct.name} (Copy)`,
        sku: newSku,
        barcode: null, // Don't duplicate barcode
        description: originalProduct.description,
        price: originalProduct.price,
        costPrice: originalProduct.costPrice,
        isActive: false, // Set to inactive by default
        categoryId: originalProduct.categoryId,
        supplierId: originalProduct.supplierId,
        minStock: originalProduct.minStock,
        defaultDiscountPercent: originalProduct.defaultDiscountPercent,
        promoName: originalProduct.promoName,
        promoPrice: originalProduct.promoPrice,
        promoStart: originalProduct.promoStart,
        promoEnd: originalProduct.promoEnd,
        isTaxable: originalProduct.isTaxable,
        taxRate: originalProduct.taxRate,
      },
    });

    // Duplicate inventory for each outlet
    if (originalProduct.inventoryLines.length > 0) {
      await Promise.all(
        originalProduct.inventoryLines.map((inventory) =>
          db.inventory.create({
            data: {
              productId: newProduct.id,
              outletId: inventory.outletId,
              quantity: 0, // Start with 0 stock
              costPrice: inventory.costPrice,
            },
          }),
        ),
      );
    }

    return NextResponse.json({
      success: true,
      product: {
        id: newProduct.id,
        name: newProduct.name,
        sku: newProduct.sku,
      },
    });
  } catch (error) {
    console.error("Error duplicating product:", error);
    return NextResponse.json(
      { error: "Failed to duplicate product" },
      { status: 500 },
    );
  }
}
