import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";
import { writeAuditLog } from "@/server/services/audit";
import { requireAdminOrOwnerSession } from "@/server/api/utils/http-access";
import { hasValidOutletStocks } from "@/server/api/utils/product-rest";

// POST /api/products - Create a new product
export async function POST(request: Request) {
  try {
    const auth = await requireAdminOrOwnerSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { session } = auth;

    const body = await request.json();

    if (!hasValidOutletStocks(body.outlets)) {
      return NextResponse.json(
        { error: "Outlet stock must be a non-negative integer" },
        { status: 400 },
      );
    }

    if (!body.name || !body.sku) {
      return NextResponse.json(
        { error: "Name and SKU are required" },
        { status: 400 },
      );
    }

    if (!body.sellingPrice || parseFloat(body.sellingPrice) <= 0) {
      return NextResponse.json(
        { error: "Selling price must be greater than 0" },
        { status: 400 },
      );
    }

    const existingSku = await db.product.findUnique({
      where: { sku: body.sku },
      select: { id: true },
    });
    if (existingSku) {
      return NextResponse.json(
        { error: "SKU sudah dipakai produk lain" },
        { status: 409 },
      );
    }

    if (body.barcode) {
      const existingBarcode = await db.product.findUnique({
        where: { barcode: body.barcode },
        select: { id: true },
      });
      if (existingBarcode) {
        return NextResponse.json(
          { error: "Barcode sudah dipakai produk lain" },
          { status: 409 },
        );
      }
    }

    const product = await db.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        barcode: body.barcode || null,
        imageUrl: body.imageUrl ?? body.image ?? null,
        description: body.description || null,
        price: new Prisma.Decimal(body.sellingPrice),
        costPrice: body.costPrice ? new Prisma.Decimal(body.costPrice) : null,
        categoryId: body.categoryId || null,
        supplierId: body.supplierId || null,
        minStock: body.minStock || 0,
        isActive: body.status !== "inactive",
        defaultDiscountPercent: body.defaultDiscountPercent
          ? new Prisma.Decimal(body.defaultDiscountPercent)
          : null,
        promoName: body.promoName || null,
        promoPrice: body.promoPrice ? new Prisma.Decimal(body.promoPrice) : null,
        promoStart: body.promoStart ? new Date(body.promoStart) : null,
        promoEnd: body.promoEnd ? new Date(body.promoEnd) : null,
        isTaxable: body.isTaxable || false,
        taxRate: body.taxRate ? new Prisma.Decimal(body.taxRate) : null,
      },
    });

    if (body.outlets && Array.isArray(body.outlets)) {
      for (const outlet of body.outlets) {
        await db.inventory.create({
          data: {
            productId: product.id,
            outletId: outlet.outletId,
            quantity: outlet.stock ?? 0,
          },
        });
      }
    }

    await writeAuditLog({
      userId: session.user.id,
      action: "PRODUCT_CREATE",
      entity: "Product",
      entityId: product.id,
      details: { name: product.name, sku: product.sku },
    });

    return NextResponse.json({
      success: true,
      product: { id: product.id, name: product.name, sku: product.sku },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 },
    );
  }
}
