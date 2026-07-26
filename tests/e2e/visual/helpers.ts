import type { Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { setupTrpcMock } from "../mocks";

const ADMIN_EMAIL = "admin@example.com";
const SECRET = process.env.NEXTAUTH_SECRET ?? "test-secret";

export const screenshotOptions = {
  fullPage: false,
  animations: "allow" as const,
  maxDiffPixelRatio: 0.01,
};

export async function settle(page: Page) {
  await page.waitForTimeout(500);
  await page.addStyleTag({
    content: `*, *::before, *::after { caret-color: transparent !important; }
    html { scrollbar-width: none !important; }
    ::-webkit-scrollbar { display: none !important; width: 0 !important; }
    nextjs-portal { display: none !important; }`,
  });
}

export async function authenticateAsAdmin(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const token = await encode({
    secret: SECRET,
    token: {
      sub: "visual-admin",
      name: "Admin Visual",
      email: ADMIN_EMAIL,
      role: "ADMIN",
    },
  });

  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1_000) + 60 * 60,
    },
  ]);
}

const outlet = {
  id: "visual-outlet-main",
  name: "Outlet Utama",
  code: "MAIN",
  address: "Jl. Merdeka No. 123, Jakarta Pusat",
};

const secondOutlet = {
  id: "visual-outlet-br2",
  name: "Outlet Cabang BSD",
  code: "BR2",
  address: "Ruko Ruby Blok B2 No. 5, BSD City",
};

const product = {
  id: "visual-product-1",
  name: "Kopi Arabica Aceh Gayo 250g",
  sku: "SKU-COFFEE-ARABICA-250",
  barcode: "8991234700012",
  price: 85000,
  costPrice: 53000,
  isActive: true,
  categoryName: "Minuman",
  supplierName: "PT Nusantara Beans",
  minStock: 24,
  imageUrl: null,
};

const category = { id: "visual-cat-1", name: "Minuman", slug: "beverages" };
const supplier = {
  id: "visual-sup-1",
  name: "PT Nusantara Beans",
  email: "sales@nusantarabeans.id",
  phone: "+62-21-8890-1111",
};

export async function mockStableData(page: Page) {
  await setupTrpcMock(page, {
    "outlets.getUserOutlets": () => [
      {
        id: "visual-uo-1",
        outletId: outlet.id,
        role: "MANAGER",
        outlet,
      },
      {
        id: "visual-uo-2",
        outletId: secondOutlet.id,
        role: "MANAGER",
        outlet: secondOutlet,
      },
    ],
    "outlets.list": () => [outlet, secondOutlet],
    "outlets.getStockSnapshot": () => [
      {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: 54,
        minStock: 24,
        outletName: outlet.name,
      },
    ],
    "outlets.listStockTransfers": () => [
      {
        id: "visual-trf-1",
        transferNumber: "TRF-001",
        fromOutletId: outlet.id,
        toOutletId: secondOutlet.id,
        fromOutletName: outlet.name,
        toOutletName: secondOutlet.name,
        productName: product.name,
        quantity: 10,
        status: "PENDING",
        requestedBy: "Admin Visual",
        requestedAt: "2026-07-15T01:00:00.000Z",
        notes: "Restock untuk weekend",
      },
    ],
    "cashSessions.getActive": () => null,
    "cashSessions.list": () => [
      {
        id: "visual-session-1",
        outletId: outlet.id,
        outletName: outlet.name,
        userName: "Kasir Demo",
        openingCash: 200000,
        closingCash: 215000,
        expectedCash: 220000,
        difference: -5000,
        openTime: "2026-07-15T01:55:00.000Z",
        closeTime: "2026-07-15T14:05:00.000Z",
        status: "CLOSED",
      },
    ],
    "sales.getDailySummary": () => ({
      date: "2026-07-15T00:00:00.000Z",
      totals: {
        totalGross: 1500000,
        totalDiscount: 50000,
        totalNet: 1450000,
        totalItems: 25,
        totalCash: 800000,
        totalTax: 160000,
      },
      sales: [
        {
          id: "visual-sale-1",
          receiptNumber: "POS-0001",
          soldAt: "2026-07-15T03:15:00.000Z",
          totalNet: 85000,
          status: "COMPLETED",
          cashierName: "Kasir Demo",
          items: [{ name: product.name, quantity: 2, total: 85000 }],
          payments: [{ method: "CASH", amount: 85000 }],
        },
      ],
    }),
    "sales.listRecent": () => [
      {
        id: "visual-sale-1",
        receiptNumber: "POS-0001",
        soldAt: "2026-07-15T03:15:00.000Z",
        totalNet: 85000,
        status: "COMPLETED",
        cashierName: "Kasir Demo",
      },
    ],
    "sales.getWeeklyTrend": () => ({
      weeklyData: [
        { date: "2026-07-09", totalSales: 1200000, transactions: 8 },
        { date: "2026-07-10", totalSales: 1500000, transactions: 10 },
        { date: "2026-07-11", totalSales: 900000, transactions: 6 },
        { date: "2026-07-12", totalSales: 1800000, transactions: 12 },
        { date: "2026-07-13", totalSales: 2100000, transactions: 14 },
        { date: "2026-07-14", totalSales: 1600000, transactions: 11 },
        { date: "2026-07-15", totalSales: 1450000, transactions: 9 },
      ],
      summary: {
        totalSales: 10550000,
        totalTransactions: 70,
        avgPerTransaction: 150714,
        wowGrowth: 0.12,
      },
    }),
    "sales.forecastNextDay": () => ({
      expectedFloat: 75000,
      confidence: 0.85,
    }),
    "sales.getReceiptsByOutlet": () => [
      {
        id: "visual-sale-1",
        receiptNumber: "POS-0001",
        soldAt: "2026-07-15T03:15:00.000Z",
        totalNet: 85000,
        status: "COMPLETED",
        cashierName: "Kasir Demo",
        shiftId: "visual-session-1",
        payments: [{ method: "CASH", amount: 85000 }],
        items: [{ name: product.name, quantity: 2, total: 85000 }],
      },
    ],
    "inventory.listLowStock": () => [
      {
        id: "visual-low-stock",
        productId: product.id,
        outletId: outlet.id,
        productName: product.name,
        productSku: product.sku,
        outletName: outlet.name,
        quantity: 2,
        minStock: 5,
        triggeredAt: "2026-07-15T01:00:00.000Z",
        clearedAt: null,
        note: null,
      },
    ],
    "inventory.getAllInventory": () => [
      {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        outletName: outlet.name,
        quantity: 54,
        minStock: 24,
      },
    ],
    "analytics.getKpiSummary": () => ({
      totalSales: 10550000,
      totalTransactions: 70,
      totalItems: 250,
      totalProfit: 3200000,
      avgPerTransaction: 150714,
      growth: 0.12,
    }),
    "analytics.getSalesTrend": () => [
      { date: "2026-07-09", total: 1200000, transactions: 8 },
      { date: "2026-07-10", total: 1500000, transactions: 10 },
      { date: "2026-07-11", total: 900000, transactions: 6 },
      { date: "2026-07-12", total: 1800000, transactions: 12 },
      { date: "2026-07-13", total: 2100000, transactions: 14 },
      { date: "2026-07-14", total: 1600000, transactions: 11 },
      { date: "2026-07-15", total: 1450000, transactions: 9 },
    ],
    "analytics.getCategoryBreakdown": () => [
      { category: "Minuman", total: 4200000, percentage: 0.4 },
      { category: "Roti & Patiseri", total: 2100000, percentage: 0.2 },
      { category: "Camilan", total: 1800000, percentage: 0.17 },
      { category: "Produk Segar", total: 1500000, percentage: 0.14 },
      { category: "Kebutuhan Rumah Tangga", total: 950000, percentage: 0.09 },
    ],
    "analytics.getPaymentMethodBreakdown": () => [
      { method: "CASH", total: 5200000, percentage: 0.49 },
      { method: "QRIS", total: 3200000, percentage: 0.3 },
      { method: "CARD", total: 1500000, percentage: 0.14 },
      { method: "EWALLET", total: 650000, percentage: 0.07 },
    ],
    "analytics.getOutletPerformance": () => [
      { outletName: outlet.name, totalSales: 6300000, transactions: 42, avg: 150000 },
      { outletName: secondOutlet.name, totalSales: 4250000, transactions: 28, avg: 151786 },
    ],
    "analytics.getLowStockAlerts": () => [
      {
        productName: product.name,
        outletName: outlet.name,
        quantity: 2,
        minStock: 5,
      },
    ],
    "analytics.getShiftActivity": () => [
      {
        userName: "Kasir Demo",
        outletName: outlet.name,
        openTime: "2026-07-15T01:55:00.000Z",
        closeTime: "2026-07-15T14:05:00.000Z",
        openingCash: 200000,
        closingCash: 215000,
        difference: -5000,
        status: "CLOSED",
      },
    ],
    "analytics.getActivityLog": () => [
      {
        id: "visual-log-1",
        action: "SALE_RECORD",
        entity: "Sale",
        entityId: "POS-0001",
        userName: "Kasir Demo",
        outletName: outlet.name,
        createdAt: "2026-07-15T03:15:00.000Z",
        details: { amount: 85000 },
      },
      {
        id: "visual-log-2",
        action: "SHIFT_OPEN",
        entity: "CashSession",
        entityId: "visual-session-1",
        userName: "Kasir Demo",
        outletName: outlet.name,
        createdAt: "2026-07-15T01:55:00.000Z",
        details: { openingCash: 200000 },
      },
    ],
    "analytics.getTopProducts": () => [
      { name: product.name, quantity: 25, total: 2125000 },
      { name: "Teh Premium Melati 50g", quantity: 18, total: 810000 },
      { name: "Roti Tawar Wholegrain", quantity: 15, total: 420000 },
    ],
    "analytics.getPromotionUsageSummary": () => ({
      totalRedemptions: 45,
      totalDiscount: 350000,
      redemptionRate: 0.64,
      topPromotions: [
        { name: "Morning Brew Week", redemptions: 20, discount: 60000 },
        { name: "Panen Oktober", redemptions: 15, discount: 45000 },
      ],
    }),
    "analytics.getTaskFeedbackSummary": () => ({
      completed: 8,
      pending: 3,
      completionRate: 0.73,
      tasks: [
        { task: "Restock susu", status: "COMPLETE" },
        { task: "Cek expired", status: "PENDING" },
      ],
    }),
    "products.list": () => [product],
    "products.searchProducts": () => [product],
    "products.categories": () => [category],
    "products.suppliers": () => [supplier],
    "products.getInventoryByProduct": () => [
      { outletId: outlet.id, outletName: outlet.name, quantity: 54, minStock: 24 },
    ],
    "products.getStockMovements": () => [
      {
        id: "visual-move-1",
        type: "INITIAL",
        quantity: 60,
        reference: "GRN-001",
        note: "Initial delivery",
        occurredAt: "2026-07-10T02:00:00.000Z",
        outletName: outlet.name,
      },
      {
        id: "visual-move-2",
        type: "SALE",
        quantity: -6,
        reference: "POS-0001",
        note: "Sold via POS",
        occurredAt: "2026-07-15T03:20:00.000Z",
        outletName: outlet.name,
      },
    ],
    "promotions.list": () => [
      {
        id: "visual-promo-1",
        name: "Morning Brew Week",
        type: "BUY_X_GET_Y",
        isActive: true,
        isGlobal: true,
        rules: { buy: 1, get: 1, discount: 50 },
        startDate: "2026-07-10T00:00:00.000Z",
        endDate: "2026-07-20T23:59:59.000Z",
      },
    ],
    "promotions.simulate": () => ({
      applicable: true,
      discount: 5000,
      finalPrice: 80000,
    }),
    "settings.listTaxSettings": () => [
      { id: "visual-tax-1", name: "PPN 11%", rate: 11, isActive: true },
      { id: "visual-tax-2", name: "Non PPN", rate: 0, isActive: false },
    ],
    "settings.getActiveTaxSetting": () => ({
      id: "visual-tax-1",
      name: "PPN 11%",
      rate: 11,
      isActive: true,
    }),
    "users.list": () => [
      {
        id: "visual-user-1",
        name: "Owner Demo",
        email: "owner@example.com",
        role: "OWNER",
        isActive: true,
        outletCount: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "visual-user-2",
        name: "Admin Demo",
        email: "admin@example.com",
        role: "ADMIN",
        isActive: true,
        outletCount: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    "users.getOutletAssignments": () => [
      { outletId: outlet.id, outletName: outlet.name, role: "MANAGER", isActive: true },
    ],
    "tasks.getCashierTasks": () => ({ tasks: [], alerts: [], shiftActive: false }),
  });
}
