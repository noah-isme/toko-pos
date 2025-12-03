import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkOutlets() {
  try {
    console.log("=== Checking Outlets & Inventory ===\n");

    // Get all outlets with inventory count
    const outlets = await prisma.outlet.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        _count: {
          select: {
            inventories: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    console.log(`Found ${outlets.length} outlets:\n`);

    outlets.forEach((outlet, index) => {
      console.log(`${index + 1}. ${outlet.name}`);
      console.log(`   ID: ${outlet.id}`);
      console.log(`   Code: ${outlet.code || "N/A"}`);
      console.log(`   Address: ${outlet.address || "N/A"}`);
      console.log(
        `   Inventory Records: ${outlet._count.inventories} ${outlet._count.inventories > 0 ? "✅" : "❌"}`,
      );
      console.log("");
    });

    // Check inventory details for each outlet
    console.log("\n=== Inventory Details ===\n");

    for (const outlet of outlets) {
      if (outlet._count.inventories > 0) {
        const inventories = await prisma.inventory.findMany({
          where: {
            outletId: outlet.id,
          },
          include: {
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
          orderBy: {
            quantity: "desc",
          },
          take: 5,
        });

        console.log(`${outlet.name} (${outlet.id}):`);
        const totalStock = await prisma.inventory.aggregate({
          where: { outletId: outlet.id },
          _sum: { quantity: true },
        });
        console.log(`   Total Stock: ${totalStock._sum.quantity || 0} units`);
        console.log(`   Top 5 Products:`);

        inventories.forEach((inv) => {
          console.log(
            `      - ${inv.product.name} (${inv.product.sku}): ${inv.quantity} units`,
          );
        });
        console.log("");
      }
    }

    // Summary
    console.log("\n=== Summary ===");
    const outletsWithInventory = outlets.filter(
      (o) => o._count.inventories > 0,
    );
    const outletsWithoutInventory = outlets.filter(
      (o) => o._count.inventories === 0,
    );

    console.log(`Total Outlets: ${outlets.length}`);
    console.log(`Outlets WITH Inventory: ${outletsWithInventory.length} ✅`);
    if (outletsWithInventory.length > 0) {
      outletsWithInventory.forEach((o) => {
        console.log(`   - ${o.name} (${o._count.inventories} records)`);
      });
    }

    console.log(
      `\nOutlets WITHOUT Inventory: ${outletsWithoutInventory.length} ${outletsWithoutInventory.length > 0 ? "⚠️" : ""}`,
    );
    if (outletsWithoutInventory.length > 0) {
      outletsWithoutInventory.forEach((o) => {
        console.log(`   - ${o.name} (ID: ${o.id})`);
      });
    }

    // Recommendations
    console.log("\n=== Recommendations ===");
    if (outletsWithoutInventory.length > 0) {
      console.log("⚠️  Some outlets don't have inventory data. To fix this:");
      console.log(
        "   1. Run the init-inventory script to create inventory records",
      );
      console.log("   2. Or manually add products to these outlets via the UI");
      console.log(
        "   3. Or use stock transfer to move inventory from other outlets",
      );
      console.log("\nTo switch to an outlet with inventory:");
      if (outletsWithInventory.length > 0) {
        console.log(`   - Use outlet: ${outletsWithInventory[0].name}`);
        console.log(`   - Outlet ID: ${outletsWithInventory[0].id}`);
      }
    } else {
      console.log("✅ All outlets have inventory data");
    }
  } catch (error) {
    console.error("❌ Error checking outlets:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOutlets();
