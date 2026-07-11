import { z } from "zod";
import { Prisma } from "@prisma/client";

import { PromotionType } from "@/server/db/enums";
import { db } from "@/server/db";
import { applyPromotionsToSale } from "@/server/services/promotions";
import {
  getOutletAccessFromContext,
  protectedOutletProcedure,
  requireOutletAccess,
  router,
} from "@/server/api/trpc";
import { assertAdminOrOwner } from "@/server/api/utils/access";

const promotionListInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
});

const promotionCreateInputSchema = z
  .object({
    name: z.string().min(1, { message: "Nama promo wajib diisi" }),
    description: z.string().max(255).optional(),
    type: z.nativeEnum(PromotionType),
    rules: z.unknown(),
    isActive: z.boolean().default(true),
    isGlobal: z.boolean().default(false),
    priority: z.number().int().default(0),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    outletIds: z.array(z.string()).optional(),
  })
  .refine(
    (value) => value.isGlobal || (value.outletIds?.length ?? 0) > 0,
    {
      message: "Pilih outlet jika promo tidak global",
      path: ["outletIds"],
    },
  );

const mapPromotionRecord = (promotion: {
  id: string;
  name: string;
  description: string | null;
  type: PromotionType;
  rules: unknown;
  isActive: boolean;
  isGlobal: boolean;
  priority: number;
  startDate: Date | null;
  endDate: Date | null;
  outlets: { outletId: string }[];
}) => ({
  id: promotion.id,
  name: promotion.name,
  description: promotion.description,
  type: promotion.type,
  rules: promotion.rules,
  isActive: promotion.isActive,
  isGlobal: promotion.isGlobal,
  priority: promotion.priority,
  startDate: promotion.startDate?.toISOString() ?? null,
  endDate: promotion.endDate?.toISOString() ?? null,
  outletIds: promotion.outlets.map((outlet) => outlet.outletId),
});

const promotionPreviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  discount: z.number(),
  description: z.string().nullable(),
});

const simulatePromotionInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, { message: "Produk wajib dipilih" }),
        quantity: z.number().int().min(1),
        unitPrice: z.number().min(0),
      }),
    )
    .min(1, { message: "Minimal satu item di cart" }),
});

const simulatePromotionOutputSchema = z.object({
  promotions: z.array(promotionPreviewSchema),
  discount: z.number(),
  totalGross: z.number(),
});

export const promotionsRouter = router({
  list: requireOutletAccess(({ input }) => input.outletId)
    .input(promotionListInputSchema)
    .query(async ({ input }) => {
      const now = new Date();
      const promotions = await db.promotion.findMany({
        where: {
          AND: [
            {
              OR: [
                { isGlobal: true },
                { outlets: { some: { outletId: input.outletId } } },
              ],
            },
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          ],
        },
        include: {
          outlets: true,
        },
        orderBy: {
          priority: "asc",
        },
      });

      return promotions.map(mapPromotionRecord);
    }),
  simulate: requireOutletAccess(({ input }) => input.outletId)
    .input(simulatePromotionInputSchema)
    .output(simulatePromotionOutputSchema)
    .mutation(async ({ input }) => {
      const totalGross = input.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );
      const result = await applyPromotionsToSale({
        outletId: input.outletId,
        items: input.items,
        totalGross,
      });
      return {
        promotions: result.promotions.map((promo) => ({
          id: promo.id,
          name: promo.name,
          discount: promo.discount,
          description: promo.description,
        })),
        discount: result.discount,
        totalGross,
      };
    }),
  create: protectedOutletProcedure
    .input(promotionCreateInputSchema)
    .mutation(async ({ input, ctx }) => {
      const { role } = getOutletAccessFromContext(ctx);
      assertAdminOrOwner(role);

      const promotion = await db.promotion.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          type: input.type,
          rules: (input.rules ?? {}) as Prisma.InputJsonValue,
          isActive: input.isActive,
          isGlobal: input.isGlobal,
          priority: input.priority,
          startDate: input.startDate ? new Date(input.startDate) : null,
          endDate: input.endDate ? new Date(input.endDate) : null,
          outlets: input.isGlobal
            ? undefined
            : {
                create: (input.outletIds ?? []).map((outletId) => ({
                  outletId,
                })),
              },
        },
        include: {
          outlets: true,
        },
      });

      return mapPromotionRecord(promotion);
    }),
});
