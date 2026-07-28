import {
  OutletRole,
  PaymentMethod,
  PrismaClient,
  Role,
  SaleStatus,
  StockMovementType,
} from "@prisma/client";
import { encode } from "next-auth/jwt";

import { e2eAuthSecret } from "./test-secret";

const E2E_USER_ID = "e2e-user";
const E2E_PREFIX = "E2E-";
const E2E_EMAIL_PREFIX = "e2e-";
const E2E_SESSION_EMAIL = "kasir@example.com";
const E2E_SESSION_NAME = "Kasir Uji";

const prisma = new PrismaClient();

export { prisma, Role, OutletRole, PaymentMethod, SaleStatus, StockMovementType };

/**
 * Set a real next-auth JWT session cookie on the browser context so the
 * middleware accepts the request and client-side useSession() returns the
 * E2E user. Uses the same JWT encoding as next-auth/jwt.
 */
export async function setE2ESessionCookie(page: import("@playwright/test").Page) {
  const token = await encode({
    secret: e2eAuthSecret(),
    token: {
      sub: E2E_USER_ID,
      name: E2E_SESSION_NAME,
      email: E2E_SESSION_EMAIL,
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
    },
  ]);
}

export function e2eId(label: string): string {
  return `${E2E_PREFIX}${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function e2eEmail(label: string): string {
  return `${E2E_EMAIL_PREFIX}${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@e2e.test`;
}

// Seed only once per worker process — the flag persists across test files
// because Playwright runs all files in the same worker process.
let e2eUserSeeded = false;

/**
 * Prisma's `upsert` is not atomic across connections: it reads, then writes. Two
 * Playwright workers seeding the same fixed-id row at the same time both miss on
 * the read and both attempt the insert, so the loser gets P2002 and its whole
 * file fails in `beforeAll`. Retrying once is enough, because by then the winner
 * has committed and the read hits.
 */
const UNIQUE_CONSTRAINT = "P2002";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === UNIQUE_CONSTRAINT
  );
}

async function upsertTolerantOfRace<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return operation();
  }
}

export async function ensureE2EUser() {
  if (e2eUserSeeded) return;

  const user = await upsertTolerantOfRace(() =>
    prisma.user.upsert({
      where: { id: E2E_USER_ID },
      create: {
        id: E2E_USER_ID,
        name: "E2E Tester",
        email: "e2e-user@toko-pos.test",
        role: Role.ADMIN,
      },
      update: {},
    }),
  );

  const outlets = await prisma.outlet.findMany({ orderBy: { name: "asc" } });
  for (const outlet of outlets) {
    await upsertTolerantOfRace(() =>
      prisma.userOutlet.upsert({
        where: {
          userId_outletId: { userId: E2E_USER_ID, outletId: outlet.id },
        },
        create: {
          userId: E2E_USER_ID,
          outletId: outlet.id,
          role: OutletRole.MANAGER,
        },
        update: {},
      }),
    );
  }

  e2eUserSeeded = true;
  return { user, outlets };
}

export async function getFirstOutlet() {
  const outlet = await prisma.outlet.findFirst({ orderBy: { name: "asc" } });
  if (!outlet) throw new Error("No outlets in DB — run pnpm seed:full first.");
  return outlet;
}

export async function getFirstCategory() {
  const category = await prisma.category.findFirst({ orderBy: { name: "asc" } });
  if (!category) throw new Error("No categories in DB — run pnpm seed:full first.");
  return category;
}

export async function getFirstSupplier() {
  const supplier = await prisma.supplier.findFirst({ orderBy: { name: "asc" } });
  if (!supplier) throw new Error("No suppliers in DB — run pnpm seed:full first.");
  return supplier;
}

type ProductOverrides = {
  name?: string;
  price?: number;
  sku?: string;
  categoryId?: string;
  supplierId?: string;
  minStock?: number;
};

export async function createE2EProduct(overrides?: ProductOverrides) {
  const sku = overrides?.sku ?? e2eId("PROD");
  return prisma.product.create({
    data: {
      sku,
      name: overrides?.name ?? `E2E Product ${sku}`,
      barcode: `E2E${Date.now()}${Math.floor(Math.random() * 10000)}`,
      price: overrides?.price ?? 10000,
      costPrice: 5000,
      isActive: true,
      categoryId: overrides?.categoryId,
      supplierId: overrides?.supplierId,
      minStock: overrides?.minStock ?? 5,
    },
  });
}

export async function createE2EInventory(
  productId: string,
  outletId: string,
  quantity: number,
) {
  return prisma.inventory.create({
    data: { productId, outletId, quantity, costPrice: 5000 },
  });
}

export async function createE2EStockMovement(
  inventoryId: string,
  type: StockMovementType,
  quantity: number,
  reference?: string,
) {
  return prisma.stockMovement.create({
    data: {
      inventoryId,
      type,
      quantity,
      reference: reference ?? e2eId("MOVE"),
    },
  });
}

export async function createE2EPromotion(overrides?: {
  name?: string;
  type?: "BUY_X_GET_Y" | "BUNDLE_DISCOUNT" | "TIERED_DISCOUNT";
  outletId?: string;
}) {
  const name = overrides?.name ?? e2eId("PROMO");
  const promotion = await prisma.promotion.create({
    data: {
      name,
      type: overrides?.type ?? "BUY_X_GET_Y",
      rules: { buy: 1, get: 1, discount: 50 },
      isActive: true,
      isGlobal: !overrides?.outletId,
    },
  });

  if (overrides?.outletId) {
    await prisma.promotionOutlet.create({
      data: { promotionId: promotion.id, outletId: overrides.outletId },
    });
  }

  return promotion;
}

export async function cleanupE2EData() {
  await prisma.stockMovement.deleteMany({
    where: {
      OR: [
        { reference: { startsWith: E2E_PREFIX } },
        { inventory: { product: { sku: { startsWith: E2E_PREFIX } } } },
      ],
    },
  });

  await prisma.inventory.deleteMany({
    where: { product: { sku: { startsWith: E2E_PREFIX } } },
  });

  await prisma.product.deleteMany({
    where: { sku: { startsWith: E2E_PREFIX } },
  });

  await prisma.sale.deleteMany({
    where: { receiptNumber: { startsWith: E2E_PREFIX } },
  });

  await prisma.cashSession.deleteMany({
    where: { userId: E2E_USER_ID },
  });

  await prisma.stockTransfer.deleteMany({
    where: { transferNumber: { startsWith: E2E_PREFIX } },
  });

  await prisma.promotionUsage.deleteMany({
    where: { promotion: { name: { startsWith: E2E_PREFIX } } },
  });
  await prisma.promotionOutlet.deleteMany({
    where: { promotion: { name: { startsWith: E2E_PREFIX } } },
  });
  await prisma.promotion.deleteMany({
    where: { name: { startsWith: E2E_PREFIX } },
  });

  await prisma.userOutlet.deleteMany({
    where: { user: { email: { startsWith: E2E_EMAIL_PREFIX } } },
  });
  await prisma.cashSession.deleteMany({
    where: { user: { email: { startsWith: E2E_EMAIL_PREFIX } } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: E2E_EMAIL_PREFIX } },
  });

  await prisma.activityLog.deleteMany({
    where: {
      OR: [
        { entity: { startsWith: E2E_PREFIX } },
        { entityId: { startsWith: E2E_PREFIX } },
      ],
    },
  });

  await prisma.cashierTaskStatus.deleteMany({
    where: { user: { id: E2E_USER_ID } },
  });
}

let exitHookRegistered = false;

/**
 * Deliberately does NOT disconnect immediately.
 *
 * `prisma` here is a module-level client shared by every spec, and Playwright
 * runs spec files sequentially inside one worker process. Calling $disconnect()
 * in a per-file afterAll tore down the connection that the *remaining* files
 * still depend on, which showed up as tests passing alone but failing when run
 * together. Defer the teardown to process exit, where it is actually safe.
 */
export async function disconnectDb() {
  if (exitHookRegistered) return;
  exitHookRegistered = true;
  process.once("beforeExit", () => {
    void prisma.$disconnect();
  });
}
