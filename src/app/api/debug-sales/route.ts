import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date") || "2025-12-03";

    // Parse date as LOCAL (same as fixed getDailySummary)
    const [year, month, day] = dateStr.split("-").map(Number);
    const baseDate = new Date(year, month - 1, day);
    const rangeStart = startOfDay(baseDate);
    const rangeEnd = endOfDay(baseDate);

    // Get all sales for the date (no filters)
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

    // Get all users with their outlets
    const allUsers = await db.user.findMany({
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

    // Get all outlets
    const allOutlets = await db.outlet.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({
      debug: {
        dateInput: dateStr,
        parsedDate: baseDate.toISOString(),
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
      },
      sales: {
        count: allSales.length,
        data: allSales.map((sale) => ({
          id: sale.id,
          receiptNumber: sale.receiptNumber,
          soldAt: sale.soldAt.toISOString(),
          soldAtLocal: sale.soldAt.toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
          }),
          status: sale.status,
          totalNet: Number(sale.totalNet),
          outletId: sale.outletId,
          outletName: sale.outlet.name,
          cashierId: sale.cashierId,
          cashierName: sale.cashier?.name || "N/A",
          cashierRole: sale.cashier?.role || "N/A",
          itemCount: sale.items.length,
          items: sale.items.map((item) => ({
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
          })),
          payments: sale.payments.map((p) => ({
            method: p.method,
            amount: Number(p.amount),
          })),
        })),
      },
      users: allUsers.map((user) => ({
        id: user.id,
        name: user.name,
        role: user.role,
        outlets: user.userOutlets.map((uo) => ({
          outletId: uo.outletId,
          outletName: uo.outlet.name,
          isActive: uo.isActive,
        })),
      })),
      outlets: allOutlets,
      summary: {
        totalSales: allSales.length,
        totalAmount: allSales.reduce(
          (sum, sale) => sum + Number(sale.totalNet),
          0
        ),
        byOutlet: allSales.reduce(
          (acc, sale) => {
            const outletName = sale.outlet.name;
            acc[outletName] = (acc[outletName] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        byStatus: allSales.reduce(
          (acc, sale) => {
            acc[sale.status] = (acc[sale.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        byCashier: allSales.reduce(
          (acc, sale) => {
            const cashierName = sale.cashier?.name || "Unknown";
            acc[cashierName] = (acc[cashierName] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error("Debug sales error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sales data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
