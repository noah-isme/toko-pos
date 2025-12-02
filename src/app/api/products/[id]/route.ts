import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { Prisma } from "@prisma/client";

// GET /api/products/[id] - Get product by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        inventoryLines: {
          include: {
            outlet: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Format response
    const response = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      description: product.description,
      price: Number(product.price),
      sellingPrice: Number(product.price), // Add sellingPrice for frontend compatibility
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      isActive: product.isActive,
      categoryId: product.categoryId,
      categoryName: product.category?.name,
      supplierId: product.supplierId,
      supplierName: product.supplier?.name,
      minStock: product.minStock,
      defaultDiscountPercent: product.defaultDiscountPercent
        ? Number(product.defaultDiscountPercent)
        : null,
      discount: product.defaultDiscountPercent
        ? Number(product.defaultDiscountPercent)
        : null,
      promoName: product.promoName,
      promoPrice: product.promoPrice ? Number(product.promoPrice) : null,
      promoValue: product.promoPrice ? Number(product.promoPrice) : null,
      promoStart: product.promoStart?.toISOString(),
      promoStartDate: product.promoStart?.toISOString(),
      promoEnd: product.promoEnd?.toISOString(),
      promoEndDate: product.promoEnd?.toISOString(),
      isTaxable: product.isTaxable,
      taxRate: product.taxRate ? Number(product.taxRate) : null,
      taxId: product.taxRate ? product.taxRate.toString() : null,
      image: null, // TODO: Add image support
      status: product.isActive ? "active" : "inactive",
      unit: "", // Add unit field
      tags: [], // Add tags field
      stocks: product.inventoryLines.map((inv) => ({
        outletId: inv.outletId,
        outlet: inv.outlet,
        quantity: inv.quantity,
        minStock: product.minStock,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

// PUT /api/products/[id] - Update product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    console.log("Updating product:", id);
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Validate required fields
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

    // Update product
    const product = await db.product.update({
      where: { id },
      data: {
        name: body.name,
        sku: body.sku,
        barcode: body.barcode || null,
        description: body.description || null,
        price: body.sellingPrice
          ? new Prisma.Decimal(body.sellingPrice)
          : undefined,
        costPrice: body.costPrice ? new Prisma.Decimal(body.costPrice) : null,
        categoryId: body.categoryId || null,
        supplierId: body.supplierId || null,
        minStock: body.minStock || 0,
        isActive: body.status === "active",
        defaultDiscountPercent: body.defaultDiscountPercent
          ? new Prisma.Decimal(body.defaultDiscountPercent)
          : null,
        promoName: body.promoName || null,
        promoPrice: body.promoPrice
          ? new Prisma.Decimal(body.promoPrice)
          : null,
        promoStart: body.promoStart ? new Date(body.promoStart) : null,
        promoEnd: body.promoEnd ? new Date(body.promoEnd) : null,
        isTaxable: body.isTaxable || false,
        taxRate: body.taxRate ? new Prisma.Decimal(body.taxRate) : null,
      },
    });

    // Update inventory for outlets if provided
    if (body.outlets && Array.isArray(body.outlets)) {
      for (const outlet of body.outlets) {
        // Check if inventory exists
        const existingInventory = await db.inventory.findUnique({
          where: {
            productId_outletId: {
              productId: id,
              outletId: outlet.outletId,
            },
          },
        });

        if (existingInventory) {
          // Update existing inventory
          await db.inventory.update({
            where: {
              id: existingInventory.id,
            },
            data: {
              quantity: outlet.stock,
            },
          });
        } else {
          // Create new inventory
          await db.inventory.create({
            data: {
              productId: id,
              outletId: outlet.outletId,
              quantity: outlet.stock,
              costPrice: body.costPrice
                ? new Prisma.Decimal(body.costPrice)
                : null,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
      },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to update product",
        details: errorMessage,
        stack:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : undefined
            : undefined,
      },
      { status: 500 },
    );
  }
}

// DELETE /api/products/[id] - Delete product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if product has sales
    const salesCount = await db.saleItem.count({
      where: { productId: id },
    });

    if (salesCount > 0) {
      // Soft delete - set isActive to false
      await db.product.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // Hard delete if no sales
      await db.product.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 },
    );
  }
}
