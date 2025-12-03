import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log("=== Checking Database Tables ===\n");

    // Query to get all tables in the public schema
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log(`Found ${tables.length} tables in database:\n`);

    const expectedTables = [
      "User",
      "Account",
      "Session",
      "VerificationToken",
      "Outlet",
      "UserOutlet",
      "Category",
      "Supplier",
      "Product",
      "Inventory",
      "LowStockAlert",
      "StockMovement",
      "StockTransfer",
      "Sale",
      "SaleItem",
      "Payment",
      "CashSession",
      "DailyCashSummary",
      "Refund",
      "RefundItem",
      "ActivityLog",
      "TaxSetting",
      "_prisma_migrations",
    ];

    const existingTableNames = tables.map((t) => t.tablename);

    console.log("Tables in database:");
    existingTableNames.forEach((table) => {
      const isExpected = expectedTables.includes(table);
      console.log(`  ${isExpected ? "✅" : "⚠️ "} ${table}`);
    });

    console.log("\nExpected tables NOT in database:");
    const missingTables = expectedTables.filter(
      (table) => !existingTableNames.includes(table),
    );

    if (missingTables.length === 0) {
      console.log("  ✅ All expected tables exist!");
    } else {
      missingTables.forEach((table) => {
        console.log(`  ❌ ${table}`);
      });
    }

    // Check specific critical tables
    console.log("\n=== Critical Tables Check ===");
    const criticalTables = [
      "User",
      "Outlet",
      "Product",
      "Inventory",
      "Sale",
      "ActivityLog",
    ];

    for (const table of criticalTables) {
      const exists = existingTableNames.includes(table);
      if (exists) {
        // Try to count rows
        try {
          const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
            `SELECT COUNT(*) as count FROM "${table}"`,
          );
          console.log(
            `  ✅ ${table}: exists (${count[0].count.toString()} rows)`,
          );
        } catch (error) {
          console.log(`  ⚠️  ${table}: exists but error reading count`);
        }
      } else {
        console.log(`  ❌ ${table}: MISSING`);
      }
    }

    // Check if ActivityLog specifically exists
    console.log("\n=== ActivityLog Table Check ===");
    const activityLogExists = existingTableNames.includes("ActivityLog");

    if (activityLogExists) {
      console.log("✅ ActivityLog table exists");

      // Check structure
      const columns = await prisma.$queryRaw<
        Array<{ column_name: string; data_type: string }>
      >`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'ActivityLog'
        ORDER BY ordinal_position;
      `;

      console.log("\nActivityLog columns:");
      columns.forEach((col) => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log("❌ ActivityLog table DOES NOT EXIST");
      console.log("\nThis is causing the error in the cashier page.");
      console.log("You need to run migration to create this table:");
      console.log("  npx prisma migrate dev");
      console.log("or");
      console.log("  npx prisma db push");
    }

    console.log("\n=== Summary ===");
    console.log(`Total tables: ${existingTableNames.length}`);
    console.log(`Expected tables: ${expectedTables.length}`);
    console.log(`Missing tables: ${missingTables.length}`);

    if (missingTables.length > 0) {
      console.log("\n⚠️  ACTION REQUIRED:");
      console.log("Run one of these commands to sync the database:");
      console.log("  1. npx prisma migrate dev --name add_missing_tables");
      console.log("  2. npx prisma db push (for development)");
    }
  } catch (error) {
    console.error("❌ Error checking tables:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
