import type { Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { defineTrpcMocks, setupTrpcMock } from "../mocks";

const ADMIN_EMAIL = "admin@example.com";
const SECRET = process.env.NEXTAUTH_SECRET ?? "test-secret";
/** Mirrors `use.baseURL` in playwright.config.ts. */
const BASE_URL = `http://127.0.0.1:${process.env.PORT ?? "3000"}`;

/**
 * `animations: "allow"` is deliberate, not an oversight.
 *
 * Recharts animates through react-smooth, which drives its geometry with CSS
 * transitions. Playwright's `animations: "disabled"` kills transitions, which
 * freezes every chart at its *initial* state — zero-height bars and pies that
 * never sweep — so the baselines record empty charts. Determinism comes instead
 * from the explicit stability wait in `settle()` plus toHaveScreenshot's own
 * two-consecutive-frames check.
 *
 * `maxDiffPixelRatio` is intentionally not overridden here; it is set once in
 * playwright.config.ts.
 */
export const screenshotOptions = {
  animations: "allow" as const,
  // Capture the whole page, not just the 720px fold. Most of these are long
  // report and list pages whose content sat entirely below the old cutoff.
  fullPage: true,
  // toHaveScreenshot re-shoots until two consecutive frames match. The default
  // 5s is not enough headroom on the chart-heavy dashboards.
  timeout: 20_000,
};

export async function settle(page: Page) {
  // Inject first so the layout reflows without scrollbars *before* we wait for
  // it to stabilise.
  await page.addStyleTag({
    content: `*, *::before, *::after { caret-color: transparent !important; }
    html { scrollbar-width: none !important; }
    ::-webkit-scrollbar { display: none !important; width: 0 !important; }
    nextjs-portal { display: none !important; }
    /* Wall-clock-derived text: the ticking header clock and the date controls
       that default to "today". Left visible these re-record on every run and
       drift daily. Hidden rather than removed so layout is unchanged.
       Note: freezing the clock instead is not viable — these values are seeded
       from useState(() => new Date()) during SSR, so a frozen client clock
       hydration-mismatches (React #418) against the server-rendered date. */
    [data-testid="header-clock"],
    [data-testid="date-range-label"],
    [data-testid="report-date-label"],
    [data-testid="relative-time"] { visibility: hidden !important; }`,
  });

  // Recharts animates through react-smooth's requestAnimationFrame loop, which
  // `animations: "disabled"` does not touch (that covers CSS and Web Animations
  // only). Without this the pie and bar geometry is captured mid-tween and
  // differs by ~5% between runs. Wait for the drawn geometry to hold still.
  await page
    .waitForFunction(
      () => {
        // A chart that has not drawn yet has a constant (empty) signature and
        // would otherwise read as "stable", capturing bars at zero height and
        // pies with no sweep. Require the marks to exist and have real extent
        // before considering stability at all.
        if (document.querySelector(".recharts-surface")) {
          const marks = Array.from(
            document.querySelectorAll(
              ".recharts-bar-rectangle, .recharts-pie-sector, .recharts-line-curve, .recharts-area-area",
            ),
          );
          if (marks.length === 0) return false;
          const drawn = marks.every((mark) => {
            const box = mark.getBoundingClientRect();
            return box.width > 0.5 || box.height > 0.5;
          });
          if (!drawn) return false;
        }

        // Include layout geometry, not just path data: ResponsiveContainer
        // measures its parent asynchronously, so the chart (and therefore
        // everything below it on a fullPage capture) can still be resizing
        // after the paths themselves have settled.
        const paths = Array.from(document.querySelectorAll("svg path"))
          .map((path) => path.getAttribute("d") ?? "")
          .join("|");
        const boxes = Array.from(document.querySelectorAll("svg"))
          .map((svg) => {
            const { width, height } = svg.getBoundingClientRect();
            return `${Math.round(width)}x${Math.round(height)}`;
          })
          .join("|");
        const signature = `${document.body.scrollHeight}#${boxes}#${paths}`;
        const store = window as unknown as {
          __visualChartSignature?: string;
          __visualChartStableTicks?: number;
        };
        if (store.__visualChartSignature === signature) {
          store.__visualChartStableTicks =
            (store.__visualChartStableTicks ?? 0) + 1;
        } else {
          store.__visualChartSignature = signature;
          store.__visualChartStableTicks = 0;
        }
        // ~1s of stillness. These dashboards refetch on an interval and
        // recharts restarts its tween on every re-render, so a short window can
        // land inside a slow phase of the easing curve and read as settled.
        return (store.__visualChartStableTicks ?? 0) >= 10;
      },
      undefined,
      { polling: 100, timeout: 20_000 },
    )
    // A page with no charts settles instantly; never fail the test on this.
    .catch(() => {});

  // Wait on real readiness signals rather than a fixed sleep. Residual motion
  // (recharts tweens, CountUp) is absorbed by toHaveScreenshot, which retries
  // until two consecutive frames are identical.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            }),
        ),
    );
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
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
      // Derive host/path from the same URL the config serves on instead of
      // hardcoding 127.0.0.1, so changing PORT (or using localhost) does not
      // silently drop the cookie and redirect every page to /auth/login.
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1_000) + 60 * 60,
    },
  ]);
}

// Every fixture below is checked against the real router output type by
// `defineTrpcMocks`. If a procedure's output schema changes, `pnpm typecheck`
// fails here instead of the page crashing at runtime with `undefined is not
// an object` and a screenshot silently baking in the error boundary.

/** Fixed instants so screenshots never drift with the wall clock. */
const OPENED_AT = "2026-07-15T01:55:00.000Z";
const SOLD_AT = "2026-07-15T03:15:00.000Z";
const CLOSED_AT = "2026-07-15T14:05:00.000Z";
const CREATED_AT = "2026-01-01T00:00:00.000Z";
const PERIOD_FROM = "2026-07-09T00:00:00.000Z";
const PERIOD_TO = "2026-07-15T23:59:59.000Z";

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
  minStock: 24,
};

const category = {
  id: "visual-cat-1",
  name: "Minuman",
  slug: "beverages",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const supplier = {
  id: "visual-sup-1",
  name: "PT Nusantara Beans",
  email: "sales@nusantarabeans.id",
  phone: "+62-21-8890-1111",
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
};

const productSummary = {
  id: product.id,
  name: product.name,
  sku: product.sku,
  barcode: product.barcode,
  imageUrl: null,
  price: product.price,
  categoryId: category.id,
  category: category.name,
  supplierId: supplier.id,
  supplier: supplier.name,
  costPrice: product.costPrice,
  isActive: true,
  defaultDiscountPercent: null,
  promoName: null,
  promoPrice: null,
  promoStart: null,
  promoEnd: null,
  isTaxable: true,
  taxRate: 11,
  minStock: product.minStock,
};

export async function mockStableData(page: Page) {
  await setupTrpcMock(
    page,
    defineTrpcMocks({
      "outlets.getUserOutlets": () => [
        { id: "visual-uo-1", outletId: outlet.id, role: "MANAGER", outlet },
        {
          id: "visual-uo-2",
          outletId: secondOutlet.id,
          role: "MANAGER",
          outlet: secondOutlet,
        },
      ],
      "outlets.list": () => [
        { ...outlet, createdAt: CREATED_AT, updatedAt: CREATED_AT },
        { ...secondOutlet, createdAt: CREATED_AT, updatedAt: CREATED_AT },
      ],
      "outlets.getStockSnapshot": () => [
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 54,
          costPrice: product.costPrice,
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
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 10,
          costPrice: product.costPrice,
          status: "PENDING",
          requestedById: "visual-admin",
          requestedByName: "Admin Visual",
          approvedById: null,
          approvedByName: null,
          notes: "Restock untuk weekend",
          requestedAt: OPENED_AT,
          approvedAt: null,
          completedAt: null,
        },
      ],
      "cashSessions.getActive": () => null,
      "cashSessions.list": () => [
        {
          id: "visual-session-1",
          outletId: outlet.id,
          userId: "visual-cashier",
          openingCash: 200000,
          closingCash: 215000,
          expectedCash: 220000,
          difference: -5000,
          openTime: OPENED_AT,
          closeTime: CLOSED_AT,
          user: { id: "visual-cashier", name: "Kasir Demo" },
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
            outletId: outlet.id,
            receiptNumber: "POS-0001",
            totalNet: 85000,
            soldAt: SOLD_AT,
            paymentMethods: ["CASH"],
            items: [
              {
                productName: product.name,
                quantity: 2,
                unitPrice: product.price,
              },
            ],
          },
        ],
      }),
      "sales.listRecent": () => [
        {
          id: "visual-sale-1",
          outletId: outlet.id,
          receiptNumber: "POS-0001",
          soldAt: SOLD_AT,
          totalNet: 85000,
          totalItems: 2,
          status: "COMPLETED",
          items: [{ productName: product.name, quantity: 2 }],
        },
      ],
      "sales.getWeeklyTrend": () => ({
        series: [
          { date: "2026-07-09", totalNet: 1200000, transactionCount: 8 },
          { date: "2026-07-10", totalNet: 1500000, transactionCount: 10 },
          { date: "2026-07-11", totalNet: 900000, transactionCount: 6 },
          { date: "2026-07-12", totalNet: 1800000, transactionCount: 12 },
          { date: "2026-07-13", totalNet: 2100000, transactionCount: 14 },
          { date: "2026-07-14", totalNet: 1600000, transactionCount: 11 },
          { date: "2026-07-15", totalNet: 1450000, transactionCount: 9 },
        ],
        summary: {
          currentTotalNet: 10550000,
          previousTotalNet: 9420000,
          changePercent: 12,
          currentTransactionCount: 70,
          previousTransactionCount: 63,
        },
      }),
      "sales.forecastNextDay": () => ({ suggestedFloat: 75000 }),
      "sales.getReceiptsByOutlet": () => [
        {
          id: "visual-sale-1",
          receiptNumber: "POS-0001",
          soldAt: SOLD_AT,
          cashierName: "Kasir Demo",
          totalNet: 85000,
          paymentMethods: ["CASH"],
          status: "COMPLETED",
          shiftOpenedAt: OPENED_AT,
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
          triggeredAt: OPENED_AT,
          clearedAt: null,
          note: null,
        },
      ],
      "inventory.getAllInventory": () => [
        { productId: product.id, quantity: 54 },
      ],
      "analytics.getKpiSummary": () => ({
        totalSales: {
          current: 10550000,
          previous: 9420000,
          trend: { value: 12, direction: "up" },
        },
        totalTransactions: {
          current: 70,
          previous: 63,
          trend: { value: 11.1, direction: "up" },
        },
        itemsSold: {
          current: 250,
          previous: 232,
          trend: { value: 7.8, direction: "up" },
        },
        profit: {
          current: 3200000,
          previous: 2950000,
          trend: { value: 8.5, direction: "up" },
        },
        averageTransactionValue: {
          current: 150714,
          previous: 149524,
          trend: { value: 0.8, direction: "up" },
        },
        topSellingCategory: category.name,
      }),
      "analytics.getSalesTrend": () => [
        {
          timestamp: "2026-07-09",
          sales: 1200000,
          transactions: 8,
          items: 30,
        },
        {
          timestamp: "2026-07-10",
          sales: 1500000,
          transactions: 10,
          items: 38,
        },
        { timestamp: "2026-07-11", sales: 900000, transactions: 6, items: 22 },
        {
          timestamp: "2026-07-12",
          sales: 1800000,
          transactions: 12,
          items: 45,
        },
        {
          timestamp: "2026-07-13",
          sales: 2100000,
          transactions: 14,
          items: 52,
        },
        {
          timestamp: "2026-07-14",
          sales: 1600000,
          transactions: 11,
          items: 40,
        },
        {
          timestamp: "2026-07-15",
          sales: 1450000,
          transactions: 9,
          items: 23,
        },
      ],
      "analytics.getCategoryBreakdown": () => [
        {
          category: "Minuman",
          sales: 4200000,
          transactions: 28,
          items: 100,
          percentage: 40,
        },
        {
          category: "Roti & Patiseri",
          sales: 2100000,
          transactions: 14,
          items: 50,
          percentage: 20,
        },
        {
          category: "Camilan",
          sales: 1800000,
          transactions: 12,
          items: 43,
          percentage: 17,
        },
        {
          category: "Produk Segar",
          sales: 1500000,
          transactions: 10,
          items: 36,
          percentage: 14,
        },
        {
          category: "Kebutuhan Rumah Tangga",
          sales: 950000,
          transactions: 6,
          items: 21,
          percentage: 9,
        },
      ],
      "analytics.getPaymentMethodBreakdown": () => [
        { method: "CASH", sales: 5200000, transactions: 34, percentage: 49 },
        { method: "QRIS", sales: 3200000, transactions: 21, percentage: 30 },
        { method: "CARD", sales: 1500000, transactions: 10, percentage: 14 },
        { method: "EWALLET", sales: 650000, transactions: 5, percentage: 7 },
      ],
      "analytics.getOutletPerformance": () => [
        {
          outletId: outlet.id,
          outletName: outlet.name,
          sales: 6300000,
          transactions: 42,
          items: 150,
          profit: 1900000,
          averageTransactionValue: 150000,
          trend: { value: 9.4, direction: "up" },
        },
        {
          outletId: secondOutlet.id,
          outletName: secondOutlet.name,
          sales: 4250000,
          transactions: 28,
          items: 100,
          profit: 1300000,
          averageTransactionValue: 151786,
          trend: { value: 3.1, direction: "down" },
        },
      ],
      "analytics.getLowStockAlerts": () => [
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: category.name,
          outletId: outlet.id,
          outletName: outlet.name,
          currentStock: 2,
          reorderPoint: 5,
          daysUntilStockout: 1,
          status: "critical",
        },
      ],
      "analytics.getShiftActivity": () => [
        {
          sessionId: "visual-session-1",
          outletId: outlet.id,
          outletName: outlet.name,
          cashierName: "Kasir Demo",
          openTime: OPENED_AT,
          closeTime: CLOSED_AT,
          openingCash: 200000,
          closingCash: 215000,
          expectedCash: 220000,
          difference: -5000,
          totalSales: 1450000,
          totalTransactions: 9,
          status: "closed",
        },
      ],
      "analytics.getActivityLog": () => ({
        activities: [
          {
            id: "visual-log-1",
            timestamp: SOLD_AT,
            type: "SALE_RECORD",
            userId: "visual-cashier",
            user: "Kasir Demo",
            outletId: outlet.id,
            outlet: outlet.name,
            entity: "Sale",
            entityId: "POS-0001",
            description: "Mencatat penjualan POS-0001 senilai Rp 85.000",
            metadata: { amount: 85000 },
          },
          {
            id: "visual-log-2",
            timestamp: OPENED_AT,
            type: "SHIFT_OPEN",
            userId: "visual-cashier",
            user: "Kasir Demo",
            outletId: outlet.id,
            outlet: outlet.name,
            entity: "CashSession",
            entityId: "visual-session-1",
            description: "Membuka shift dengan kas awal Rp 200.000",
            metadata: { openingCash: 200000 },
          },
        ],
        total: 2,
        hasMore: false,
      }),
      "analytics.getTopProducts": () => [
        {
          productId: product.id,
          productName: product.name,
          quantity: 25,
          revenue: 2125000,
        },
        {
          productId: "visual-product-2",
          productName: "Teh Premium Melati 50g",
          quantity: 18,
          revenue: 810000,
        },
        {
          productId: "visual-product-3",
          productName: "Roti Tawar Wholegrain",
          quantity: 15,
          revenue: 420000,
        },
      ],
      "analytics.getPromotionUsageSummary": () => ({
        from: PERIOD_FROM,
        to: PERIOD_TO,
        totalRedemptions: 45,
        totalDiscount: 350000,
        redemptionRate: 64,
        topPromotions: [
          {
            promotionId: "visual-promo-1",
            name: "Morning Brew Week",
            redemptions: 20,
            discount: 60000,
          },
          {
            promotionId: "visual-promo-2",
            name: "Panen Oktober",
            redemptions: 15,
            discount: 45000,
          },
        ],
      }),
      "analytics.getTaskFeedbackSummary": () => ({
        outletId: outlet.id,
        period: { from: PERIOD_FROM, to: PERIOD_TO },
        pendingTasks: 3,
        completedTasks: 8,
        criticalAlerts: 1,
        recentNotes: [
          {
            taskId: "visual-task-1",
            notes: "Restock susu sudah dilakukan pagi ini",
            updatedAt: SOLD_AT,
          },
        ],
      }),
      "products.list": () => [productSummary],
      // Deliberately not `productSummary`: searchProducts returns a trimmed
      // projection that flattens the category to `categoryName`.
      "products.searchProducts": () => [
        {
          id: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          price: product.price,
          categoryName: category.name,
        },
      ],
      "products.categories": () => [category],
      "products.suppliers": () => [supplier],
      "products.getInventoryByProduct": () => [
        {
          outletId: outlet.id,
          outletName: outlet.name,
          quantity: 54,
          updatedAt: SOLD_AT,
        },
      ],
      "products.getStockMovements": () => [
        {
          id: "visual-move-1",
          productId: product.id,
          productName: product.name,
          type: "INITIAL",
          quantity: 60,
          note: "Initial delivery",
          reference: "GRN-001",
          occurredAt: "2026-07-10T02:00:00.000Z",
          outletName: outlet.name,
          createdBy: "Admin Visual",
        },
        {
          id: "visual-move-2",
          productId: product.id,
          productName: product.name,
          type: "SALE",
          quantity: -6,
          note: "Sold via POS",
          reference: "POS-0001",
          occurredAt: "2026-07-15T03:20:00.000Z",
          outletName: outlet.name,
          createdBy: "Kasir Demo",
        },
      ],
      "promotions.list": () => [
        {
          id: "visual-promo-1",
          name: "Morning Brew Week",
          description: "Beli 1 gratis 1 untuk kopi pilihan setiap pagi",
          type: "BUY_X_GET_Y",
          rules: { buy: 1, get: 1, discount: 50 },
          isActive: true,
          isGlobal: true,
          priority: 1,
          startDate: "2026-07-10T00:00:00.000Z",
          endDate: "2026-07-20T23:59:59.000Z",
          outletIds: [outlet.id, secondOutlet.id],
        },
      ],
      "promotions.simulate": () => ({
        promotions: [
          {
            id: "visual-promo-1",
            name: "Morning Brew Week",
            discount: 5000,
            description: "Beli 1 gratis 1 untuk kopi pilihan setiap pagi",
          },
        ],
        discount: 5000,
        totalGross: 85000,
      }),
      "settings.listTaxSettings": () => [
        {
          id: "visual-tax-1",
          name: "PPN 11%",
          rate: 11,
          isActive: true,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
        {
          id: "visual-tax-2",
          name: "Non PPN",
          rate: 0,
          isActive: false,
          createdAt: CREATED_AT,
          updatedAt: CREATED_AT,
        },
      ],
      "settings.getActiveTaxSetting": () => ({
        id: "visual-tax-1",
        name: "PPN 11%",
        rate: 11,
      }),
      "users.list": () => [
        {
          id: "visual-user-1",
          name: "Owner Demo",
          email: "owner@example.com",
          role: "OWNER",
          isActive: true,
          outletCount: 2,
          createdAt: CREATED_AT,
        },
        {
          id: "visual-user-2",
          name: "Admin Demo",
          email: "admin@example.com",
          role: "ADMIN",
          isActive: true,
          outletCount: 2,
          createdAt: CREATED_AT,
        },
      ],
      "users.getOutletAssignments": () => [
        {
          id: "visual-uo-1",
          outletId: outlet.id,
          outletName: outlet.name,
          outletCode: outlet.code,
          role: "MANAGER",
          isActive: true,
        },
      ],
      "tasks.getCashierTasks": () => ({
        tasks: [],
        alerts: [],
        shiftActive: false,
      }),
    }),
  );
}
