import { PrismaClient } from "@prisma/client";
import { appRouter } from "@/server/api/root";
import type { Session } from "next-auth";

const db = new PrismaClient();

async function testGetDailySummary() {
  try {
    console.log("🧪 Testing getDailySummary endpoint");
    console.log("=".repeat(60));

    // Get a user to test with
    const testUser = await db.user.findFirst({
      where: {
        role: "OWNER",
      },
      include: {
        userOutlets: {
          where: { isActive: true },
          include: { outlet: true },
        },
      },
    });

    if (!testUser) {
      console.error("❌ No OWNER user found in database!");
      return;
    }

    console.log("\n👤 Test User:");
    console.log("  Name:", testUser.name);
    console.log("  Role:", testUser.role);
    console.log("  Email:", testUser.email);
    console.log("  ID:", testUser.id);
    console.log("  Outlets:", testUser.userOutlets.length);

    // Create mock context
    const mockSession: Session = {
      user: {
        id: testUser.id,
        name: testUser.name,
        email: testUser.email || "",
        role: testUser.role,
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    const mockContext = {
      session: mockSession,
      db: db,
    };

    // Create caller
    const caller = appRouter.createCaller(mockContext as any);

    // Test date
    const testDate = process.argv[2] || "2025-12-03";
    console.log("\n📅 Testing Date:", testDate);
    console.log("=".repeat(60));

    // Call getDailySummary
    console.log("\n📡 Calling getDailySummary...\n");
    const result = await caller.sales.getDailySummary({
      date: testDate,
    });

    console.log("\n✅ Result:");
    console.log("=".repeat(60));
    console.log("Date:", result.date);
    console.log("\nTotals:");
    console.log("  Total Gross:", result.totals.totalGross);
    console.log("  Total Discount:", result.totals.totalDiscount);
    console.log("  Total Net:", result.totals.totalNet);
    console.log("  Total Items:", result.totals.totalItems);
    console.log("  Total Cash:", result.totals.totalCash);
    console.log("  Total Tax:", result.totals.totalTax);

    console.log("\nSales Count:", result.sales.length);

    if (result.sales.length > 0) {
      console.log("\nSales Details:");
      result.sales.forEach((sale, idx) => {
        console.log(`\n  Sale #${idx + 1}:`);
        console.log(`    Receipt: ${sale.receiptNumber}`);
        console.log(`    Total: Rp ${sale.totalNet.toLocaleString("id-ID")}`);
        console.log(`    Sold At: ${sale.soldAt}`);
        console.log(`    Outlet: ${sale.outletId}`);
        console.log(`    Payment Methods: ${sale.paymentMethods.join(", ")}`);
      });
    } else {
      console.log("\n⚠️  NO SALES FOUND!");
      console.log("\nCheck the console logs above for debugging info.");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Test completed!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    throw error;
  } finally {
    await db.$disconnect();
  }
}

testGetDailySummary().catch(console.error);
