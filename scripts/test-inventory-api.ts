import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testInventoryAPI() {
  try {
    console.log("=== Testing Inventory API ===\n");

    // 1. Check outlets
    console.log("1. Checking available outlets...");
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

    console.log(`Found ${outlets.length} outlets:\n`);
    outlets.forEach((outlet) => {
      console.log(
        `   - ${outlet.name} (ID: ${outlet.id}) - ${outlet._count.inventories} inventory records`,
      );
    });

    if (outlets.length === 0) {
      console.log("\n❌ No outlets found!");
      return;
    }

    const testOutletId = outlets[0].id;
    console.log(`\n2. Testing with outlet: ${outlets[0].name} (${testOutletId})\n`);

    // 2. Get all inventory for this outlet
    const inventories = await prisma.inventory.findMany({
      where: {
        outletId: testOutletId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`Found ${inventories.length} inventory records for this outlet:\n`);

    if (inventories.length === 0) {
      console.log("❌ No inventory records found for this outlet!");
      console.log("\nThis is the problem! The outlet has no inventory data.");
      console.log("Check if products are assigned to the correct outlet.\n");
      return;
    }

    inventories.forEach((inv) => {
      console.log(`   ${inv.product.name} (${inv.product.sku})`);
      console.log(`   Product ID: ${inv.product.id}`);
      console.log(`   Quantity: ${inv.quantity}`);
      console.log(`   Cost Price: ${inv.costPrice ? `Rp ${inv.costPrice.toNumber().toLocaleString()}` : "N/A"}`);
      console.log("");
    });

    // 3. Test the query format that will be used by tRPC
    console.log("3. Testing query format for tRPC endpoint:\n");
    const inventoryData = inventories.map((inv) => ({
      productId: inv.productId,
      quantity: inv.quantity,
    }));

    console.log("Query result that tRPC endpoint will return:");
    console.log(JSON.stringify(inventoryData, null, 2));

    // 4. Check if there are products without inventory
    console.log("\n4. Checking for products without inventory...\n");
    const allProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      include: {
        inventoryLines: {
          where: {
            outletId: testOutletId,
          },
        },
      },
    });

    const productsWithoutInventory = allProducts.filter(
      (p) => p.inventoryLines.length === 0,
    );

    if (productsWithoutInventory.length > 0) {
      console.log(
        `⚠️  Found ${productsWithoutInventory.length} products WITHOUT inventory in this outlet:\n`,
      );
      productsWithoutInventory.forEach((p) => {
        console.log(`   - ${p.name} (${p.sku})`);
      });
    } else {
      console.log(
        "✅ All active products have inventory records in this outlet",
      );
    }

    // 5. Summary
    console.log("\n=== Summary ===");
    console.log(`Total Outlets: ${outlets.length}`);
    console.log(`Test Outlet: ${outlets[0].name}`);
    console.log(`Inventory Records: ${inventories.length}`);
    console.log(`Total Active Products: ${allProducts.length}`);
    console.log(`Products Without Inventory: ${productsWithoutInventory.length}`);

    console.log("\n=== Recommendation ===");
    if (inventories.length === 0) {
      console.log(
        "❌ The selected outlet has NO inventory. The frontend will show 0 stock for all products.",
      );
      console.log(
        "   Solution: Make sure products are assigned to this outlet with initial stock.",
      );
    } else if (productsWithoutInventory.length > 0) {
      console.log(
        "⚠️  Some products don't have inventory in this outlet.",
      );
      console.log(
        "   These products will show 0 stock in the product list.",
      );
    } else {
      console.log(
        "✅ Everything looks good! All products have inventory data.",
      );
      console.log(
        "   If stock still shows 0, check:",
      );
      console.log("   1. Is the correct outlet selected in the frontend?");
      console.log("   2. Check browser console for API errors");
      console.log("   3. Verify authentication is working");
    }

    // 6. Show what the frontend query should receive
    console.log("\n=== Expected Frontend Data ===");
    console.log("The frontend should receive this data structure:");
    console.log(
      JSON.stringify(
        {
          outletId: testOutletId,
          inventories: inventoryData.slice(0, 3),
          totalCount: inventoryData.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("❌ Error during test:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testInventoryAPI();
