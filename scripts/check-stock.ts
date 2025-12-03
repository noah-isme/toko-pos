import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkStock() {
  try {
    console.log("=== Checking Product Stock ===\n");

    // Get all products
    const products = await prisma.product.findMany({
      include: {
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
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`Total Products: ${products.length}\n`);

    if (products.length === 0) {
      console.log("No products found in database.");
      return;
    }

    // Display each product with stock info
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (SKU: ${product.sku})`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Category: ${product.category?.name || "N/A"}`);
      console.log(`   Price: Rp ${product.price.toNumber().toLocaleString()}`);
      console.log(
        `   Cost Price: ${product.costPrice ? `Rp ${product.costPrice.toNumber().toLocaleString()}` : "N/A"}`,
      );
      console.log(`   Min Stock: ${product.minStock}`);
      console.log(`   Active: ${product.isActive ? "Yes" : "No"}`);

      if (product.inventoryLines.length === 0) {
        console.log(`   ⚠️  NO INVENTORY RECORDS`);
      } else {
        console.log(`   Inventory:`);
        product.inventoryLines.forEach((inv) => {
          console.log(
            `      - ${inv.outlet.name}: ${inv.quantity} units ${inv.quantity < product.minStock ? "⚠️ LOW STOCK" : "✓"}`,
          );
        });
      }

      console.log("");
    });

    // Summary statistics
    const totalProducts = products.length;
    const productsWithStock = products.filter((p) =>
      p.inventoryLines.some((inv) => inv.quantity > 0),
    ).length;
    const productsWithZeroStock = products.filter(
      (p) =>
        p.inventoryLines.length === 0 ||
        p.inventoryLines.every((inv) => inv.quantity === 0),
    ).length;
    const productsWithNoInventory = products.filter(
      (p) => p.inventoryLines.length === 0,
    ).length;

    console.log("=== Summary ===");
    console.log(`Total Products: ${totalProducts}`);
    console.log(`Products with Stock: ${productsWithStock}`);
    console.log(`Products with Zero Stock: ${productsWithZeroStock}`);
    console.log(
      `Products with NO Inventory Records: ${productsWithNoInventory}`,
    );

    // Check outlets
    console.log("\n=== Outlets ===");
    const outlets = await prisma.outlet.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            inventories: true,
          },
        },
      },
    });

    outlets.forEach((outlet) => {
      console.log(
        `${outlet.name}: ${outlet._count.inventories} inventory records`,
      );
    });
  } catch (error) {
    console.error("Error checking stock:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStock();
