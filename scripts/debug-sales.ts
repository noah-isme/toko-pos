import { PrismaClient } from "@prisma/client";
import { startOfDay, endOfDay } from "date-fns";

const db = new PrismaClient();

async function debugSales() {
  try {
    const dateStr = process.argv[2] || "2025-12-03";
    console.log("🔍 Debugging Sales Data for:", dateStr);
    console.log("=".repeat(60));

    // Parse date as LOCAL (same as fixed getDailySummary)
    const [year, month, day] = dateStr.split("-").map(Number);
    const baseDate = new Date(year, month - 1, day);
    const rangeStart = startOfDay(baseDate);
    const rangeEnd = endOfDay(baseDate);

    console.log("\n📅 Date Range:");
    console.log("  Input:", dateStr);
    console.log("  Parsed:", baseDate.toISOString());
    console.log("  Start:", rangeStart.toISOString());
    console.log("  End:", rangeEnd.toISOString());
    console.log("  Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("  Offset:", new Date().getTimezoneOffset(), "minutes");

    // Get all sales for the date (NO FILTERS)
    const allSales = await db.sale.findMany({
      where: {
        soldAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
        payments: true,
        cashier: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        soldAt: "desc",
      },
    });

    console.log("\n💰 SALES FOUND:", allSales.length);
    console.log("=".repeat(60));

    if (allSales.length === 0) {
      console.log("\n❌ NO SALES FOUND!");
      console.log("\nPossible reasons:");
      console.log("  1. No transactions on this date");
      console.log("  2. Timezone mismatch (check soldAt timestamps)");
      console.log("  3. Data in different date");

      // Check if there are ANY sales in database
      const anySales = await db.sale.findMany({
        take: 5,
        orderBy: { soldAt: "desc" },
        select: {
          id: true,
          receiptNumber: true,
          soldAt: true,
          status: true,
          totalNet: true,
        },
      });

      if (anySales.length > 0) {
        console.log("\n📊 Latest 5 sales in database:");
        anySales.forEach((sale) => {
          console.log(`  - ${sale.receiptNumber} @ ${sale.soldAt.toISOString()} (${sale.soldAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}) = Rp ${sale.totalNet}`);
        });
      } else {
        console.log("\n⚠️  Database has NO sales at all!");
      }
    } else {
      let totalAmount = 0;
      let totalItems = 0;

      allSales.forEach((sale, idx) => {
        console.log(`\n📦 Sale #${idx + 1}:`);
        console.log("  Receipt:", sale.receiptNumber);
        console.log("  Status:", sale.status);
        console.log("  Sold At (UTC):", sale.soldAt.toISOString());
        console.log(
          "  Sold At (WIB):",
          sale.soldAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
        );
        console.log("  Total:", `Rp ${Number(sale.totalNet).toLocaleString("id-ID")}`);
        console.log("  Outlet:", sale.outlet.name, `(${sale.outletId})`);
        console.log("  Cashier:", sale.cashier?.name || "N/A", `(${sale.cashierId})`);
        console.log("  Cashier Role:", sale.cashier?.role || "N/A");
        console.log("  Items:", sale.items.length);

        sale.items.forEach((item) => {
          console.log(`    - ${item.product.name} x${item.quantity} @ Rp ${Number(item.unitPrice).toLocaleString("id-ID")}`);
        });

        console.log("  Payments:");
        sale.payments.forEach((payment) => {
          console.log(`    - ${payment.method}: Rp ${Number(payment.amount).toLocaleString("id-ID")}`);
        });

        totalAmount += Number(sale.totalNet);
        totalItems += sale.items.reduce((sum, item) => sum + item.quantity, 0);
      });

      console.log("\n" + "=".repeat(60));
      console.log("📊 SUMMARY:");
      console.log("  Total Transactions:", allSales.length);
      console.log("  Total Amount:", `Rp ${totalAmount.toLocaleString("id-ID")}`);
      console.log("  Total Items:", totalItems);
    }

    // Get all users and their outlets
    console.log("\n" + "=".repeat(60));
    console.log("👥 USERS & OUTLET ACCESS:");
    console.log("=".repeat(60));

    const users = await db.user.findMany({
      include: {
        userOutlets: {
          where: { isActive: true },
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

    users.forEach((user) => {
      console.log(`\n  ${user.name || user.email} (${user.role}):`);
      console.log(`    ID: ${user.id}`);
      if (user.userOutlets.length > 0) {
        console.log("    Outlets:");
        user.userOutlets.forEach((uo) => {
          console.log(`      - ${uo.outlet.name} (${uo.outletId})`);
        });
      } else {
        console.log("    ⚠️  NO OUTLET ACCESS!");
      }
    });

    // Get all outlets
    console.log("\n" + "=".repeat(60));
    console.log("🏪 ALL OUTLETS:");
    console.log("=".repeat(60));

    const outlets = await db.outlet.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            sales: true,
          },
        },
      },
    });

    outlets.forEach((outlet) => {
      console.log(`\n  ${outlet.name}:`);
      console.log(`    ID: ${outlet.id}`);
      console.log(`    Total Sales: ${outlet._count.sales}`);
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ Debug completed!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

debugSales().catch(console.error);
