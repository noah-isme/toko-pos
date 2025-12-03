import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const OUTLET_CABANG_BSD_ID = "cmgxy8e9y0001jyyqoitoo3ne";
const OUTLET_UTAMA_ID = "cmgxy8e5j0000jyyqn6jux0yh";

async function initInventoryCabangBSD() {
  try {
    console.log("=== Initialize Inventory for Outlet Cabang BSD ===\n");

    // 1. Verify outlets exist
    const cabangBSD = await prisma.outlet.findUnique({
      where: { id: OUTLET_CABANG_BSD_ID },
    });

    const outletUtama = await prisma.outlet.findUnique({
      where: { id: OUTLET_UTAMA_ID },
    });

    if (!cabangBSD) {
      console.error("❌ Outlet Cabang BSD not found!");
      return;
    }

    if (!outletUtama) {
      console.error("❌ Outlet Utama not found!");
      return;
    }

    console.log(`✅ Found Outlet: ${cabangBSD.name}`);
    console.log(`✅ Found Outlet: ${outletUtama.name}\n`);

    // 2. Get all active products
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        costPrice: true,
      },
    });

    console.log(`Found ${products.length} active products\n`);

    // 3. Get existing inventory from Outlet Utama
    const utamaInventory = await prisma.inventory.findMany({
      where: {
        outletId: OUTLET_UTAMA_ID,
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });

    console.log(
      `Found ${utamaInventory.length} inventory records in Outlet Utama\n`,
    );

    // 4. Check existing inventory in Cabang BSD
    const existingInventory = await prisma.inventory.findMany({
      where: {
        outletId: OUTLET_CABANG_BSD_ID,
      },
    });

    console.log(
      `Existing inventory in Cabang BSD: ${existingInventory.length} records\n`,
    );

    if (existingInventory.length > 0) {
      console.log("⚠️  Cabang BSD already has some inventory records:");
      existingInventory.forEach((inv) => {
        console.log(`   - Product ID: ${inv.productId}, Quantity: ${inv.quantity}`);
      });
      console.log(
        "\nDo you want to continue? This will ADD missing products.\n",
      );
    }

    // 5. Create inventory records for Cabang BSD
    console.log("Creating inventory records for Cabang BSD...\n");

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Check if inventory already exists
        const existing = await prisma.inventory.findUnique({
          where: {
            productId_outletId: {
              productId: product.id,
              outletId: OUTLET_CABANG_BSD_ID,
            },
          },
        });

        if (existing) {
          console.log(
            `⏭️  Skipped: ${product.name} (already has inventory)`,
          );
          skipped++;
          continue;
        }

        // Get quantity from Outlet Utama if available
        const utamaStock = utamaInventory.find(
          (inv) => inv.productId === product.id,
        );

        // Create inventory with initial stock of 0
        // You can change this to copy from Utama or set a default value
        const initialQuantity = 0; // Change to utamaStock?.quantity ?? 0 to copy stock

        await prisma.inventory.create({
          data: {
            productId: product.id,
            outletId: OUTLET_CABANG_BSD_ID,
            quantity: initialQuantity,
            costPrice: product.costPrice,
          },
        });

        console.log(
          `✅ Created: ${product.name} (${product.sku}) - Initial stock: ${initialQuantity}`,
        );
        if (utamaStock) {
          console.log(
            `   💡 Outlet Utama has: ${utamaStock.quantity} units (you can transfer if needed)`,
          );
        }
        created++;
      } catch (error) {
        console.error(`❌ Error creating inventory for ${product.name}:`, error);
        errors++;
      }
    }

    console.log("\n=== Summary ===");
    console.log(`✅ Created: ${created} inventory records`);
    console.log(`⏭️  Skipped: ${skipped} (already exists)`);
    console.log(`❌ Errors: ${errors}`);

    if (created > 0) {
      console.log(
        "\n🎉 Success! Outlet Cabang BSD now has inventory records.",
      );
      console.log(
        "   Note: All products start with 0 stock. You can now:",
      );
      console.log("   1. Edit products to set initial stock");
      console.log("   2. Use stock transfer from Outlet Utama");
      console.log("   3. Use stock adjustment to add stock");
    }

    // 6. Verify final state
    const finalCount = await prisma.inventory.count({
      where: {
        outletId: OUTLET_CABANG_BSD_ID,
      },
    });

    console.log(`\n📊 Final inventory count for Cabang BSD: ${finalCount}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Add option to copy stock from Outlet Utama
async function copyStockFromUtama() {
  try {
    console.log(
      "=== Copy Stock from Outlet Utama to Cabang BSD ===\n",
    );

    const utamaInventory = await prisma.inventory.findMany({
      where: {
        outletId: OUTLET_UTAMA_ID,
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    });

    console.log(
      `Found ${utamaInventory.length} inventory records in Outlet Utama\n`,
    );

    let updated = 0;
    let errors = 0;

    for (const inv of utamaInventory) {
      try {
        await prisma.inventory.upsert({
          where: {
            productId_outletId: {
              productId: inv.productId,
              outletId: OUTLET_CABANG_BSD_ID,
            },
          },
          update: {
            quantity: inv.quantity,
          },
          create: {
            productId: inv.productId,
            outletId: OUTLET_CABANG_BSD_ID,
            quantity: inv.quantity,
            costPrice: inv.costPrice,
          },
        });

        console.log(
          `✅ ${inv.product.name} (${inv.product.sku}): ${inv.quantity} units`,
        );
        updated++;
      } catch (error) {
        console.error(
          `❌ Error copying inventory for ${inv.product.name}:`,
          error,
        );
        errors++;
      }
    }

    console.log("\n=== Summary ===");
    console.log(`✅ Copied/Updated: ${updated} inventory records`);
    console.log(`❌ Errors: ${errors}`);

    if (updated > 0) {
      console.log(
        "\n🎉 Success! Stock copied from Outlet Utama to Cabang BSD",
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const args = process.argv.slice(2);
const mode = args[0];

if (mode === "copy") {
  console.log("Mode: COPY stock from Outlet Utama\n");
  copyStockFromUtama();
} else {
  console.log("Mode: INITIALIZE with 0 stock (use 'copy' to copy stock)\n");
  initInventoryCabangBSD();
}
