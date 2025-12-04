const { PrismaClient } = require("@prisma/client");
const { PaymentMethod } = require("@prisma/client");

const db = new PrismaClient();

async function testGetDailySummary() {
  try {
    console.log("🧪 Testing getDailySummary logic...\n");

    // Test input (same as what frontend sends)
    const input = {
      date: new Date().toISOString(), // ISO datetime string
      outletId: "cmgxy8e5j0000jyyqn6jux0yh", // Outlet Utama
    };

    console.log("📥 Input:");
    console.log("  date:", input.date);
    console.log("  outletId:", input.outletId);

    // Parse date (same logic as endpoint)
    let baseDate;
    if (input.date) {
      const dateStr = input.date.includes("T")
        ? input.date.split("T")[0]
        : input.date;

      console.log("\n📅 Date parsing:");
      console.log("  Original:", input.date);
      console.log("  Extracted:", dateStr);

      const [year, month, day] = dateStr.split("-").map(Number);
      baseDate = new Date(year, month - 1, day);

      console.log("  Parsed:", baseDate.toISOString());
      console.log("  Local:", baseDate.toString());

      if (isNaN(baseDate.getTime())) {
        throw new Error(`Invalid date: ${input.date}`);
      }
    } else {
      baseDate = new Date();
    }

    // Calculate range
    const rangeStart = new Date(baseDate);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(baseDate);
    rangeEnd.setHours(23, 59, 59, 999);

    console.log("\n⏰ Query range:");
    console.log("  Start (UTC):", rangeStart.toISOString());
    console.log("  Start (Local):", rangeStart.toString());
    console.log("  End (UTC):", rangeEnd.toISOString());
    console.log("  End (Local):", rangeEnd.toString());

    // Query database
    console.log("\n🔍 Querying database...");
    const sales = await db.sale.findMany({
      where: {
        soldAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        outletId: input.outletId,
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
      },
      orderBy: {
        soldAt: "desc",
      },
    });

    console.log("  ✓ Found", sales.length, "sales");

    if (sales.length > 0) {
      console.log("\n📊 Sales details:");
      sales.forEach((sale, idx) => {
        console.log(`\n  Sale #${idx + 1}:`);
        console.log("    Receipt:", sale.receiptNumber);
        console.log("    Time:", sale.soldAt.toISOString());
        console.log("    Total:", sale.totalNet);
        console.log("    Items:", sale.items.length);
        sale.items.forEach((item) => {
          console.log(
            `      - ${item.product?.name || "Unknown"} x${item.quantity} @ ${item.unitPrice}`
          );
        });
      });
    }

    // Calculate totals
    const totals = sales.reduce(
      (acc, sale) => {
        const totalItems = sale.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        const cashPaid = sale.payments
          .filter((payment) => payment.method === PaymentMethod.CASH)
          .reduce((sum, payment) => sum + Number(payment.amount), 0);

        acc.totalGross += Number(sale.totalGross);
        acc.totalDiscount += Number(sale.discountTotal);
        acc.totalNet += Number(sale.totalNet);
        acc.totalItems += totalItems;
        acc.totalCash += cashPaid;
        acc.totalTax += sale.taxAmount ? Number(sale.taxAmount) : 0;

        return acc;
      },
      {
        totalGross: 0,
        totalDiscount: 0,
        totalNet: 0,
        totalItems: 0,
        totalCash: 0,
        totalTax: 0,
      }
    );

    console.log("\n💰 Totals:");
    console.log("  Gross:", totals.totalGross);
    console.log("  Discount:", totals.totalDiscount);
    console.log("  Net:", totals.totalNet);
    console.log("  Items:", totals.totalItems);
    console.log("  Cash:", totals.totalCash);
    console.log("  Tax:", totals.totalTax);

    // Build response
    const response = {
      date: rangeStart.toISOString(),
      totals,
      sales: sales.map((sale) => ({
        id: sale.id,
        outletId: sale.outletId,
        receiptNumber: sale.receiptNumber,
        totalNet: Number(sale.totalNet),
        soldAt: sale.soldAt.toISOString(),
        paymentMethods: sale.payments.map((payment) => payment.method),
        items: sale.items.map((item) => ({
          productName: item.product?.name || "Unknown",
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      })),
    };

    console.log("\n✅ Response structure:");
    console.log("  date:", response.date);
    console.log("  totals.totalNet:", response.totals.totalNet);
    console.log("  sales.length:", response.sales.length);

    if (response.sales.length > 0) {
      console.log("\n  First sale in response:");
      console.log("    id:", response.sales[0].id);
      console.log("    receiptNumber:", response.sales[0].receiptNumber);
      console.log("    totalNet:", response.sales[0].totalNet);
      console.log("    items:", response.sales[0].items.length);
      console.log(
        "    paymentMethods:",
        response.sales[0].paymentMethods.join(", ")
      );

      // Validate item structure
      const firstItem = response.sales[0].items[0];
      console.log("\n    First item:");
      console.log("      productName:", firstItem.productName);
      console.log("      quantity:", firstItem.quantity);
      console.log("      unitPrice:", firstItem.unitPrice);

      // Check for missing fields
      const itemKeys = Object.keys(firstItem);
      const expectedKeys = ["productName", "quantity", "unitPrice"];
      const missingKeys = expectedKeys.filter((key) => !itemKeys.includes(key));
      const extraKeys = itemKeys.filter((key) => !expectedKeys.includes(key));

      if (missingKeys.length > 0) {
        console.log("\n    ⚠️  Missing keys:", missingKeys);
      }
      if (extraKeys.length > 0) {
        console.log("\n    ⚠️  Extra keys:", extraKeys);
      }
      if (missingKeys.length === 0 && extraKeys.length === 0) {
        console.log("\n    ✅ Item structure is valid!");
      }
    }

    console.log("\n✅ TEST PASSED - Logic works correctly!");
    console.log(
      "\nIf dashboard still shows 0, the issue is in the API endpoint or frontend."
    );
  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error("  Error:", error.message);
    console.error("  Stack:", error.stack);
  } finally {
    await db.$disconnect();
  }
}

testGetDailySummary();
