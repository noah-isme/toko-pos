import { z } from "zod";
import { TaskStatus } from "@prisma/client";

import { db } from "@/server/db";
import {
  protectedOutletProcedure,
  requireOutletAccess,
  router,
} from "@/server/api/trpc";

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(["pending", "complete"]),
  notes: z.string().optional(),
});

const lowStockAlertSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number(),
  minStock: z.number().optional(),
});

const cashierTasksSchema = z.object({
  tasks: z.array(taskSchema),
  alerts: z.array(lowStockAlertSchema),
  shiftActive: z.boolean(),
});

const taskStatusEnumSchema = z.enum(["pending", "complete"]);

const taskStatusUpdateSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
  taskId: z.string(),
  status: taskStatusEnumSchema,
  notes: z.string().max(255).optional(),
});

const taskStatusUpdateOutputSchema = z.object({
  status: taskStatusEnumSchema,
  notes: z.string().nullable(),
});

export const tasksRouter = router({
  getCashierTasks: requireOutletAccess(({ input }) => input.outletId)
    .input(
      z.object({
        outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
      }),
    )
    .output(cashierTasksSchema)
    .query(async ({ input, ctx }) => {
      const shift = await db.cashSession.findFirst({
        where: {
          outletId: input.outletId,
          userId: ctx.session.user.id,
          closeTime: null,
        },
        orderBy: {
          openTime: "desc",
        },
      });

      const alerts = await db.lowStockAlert.findMany({
        where: {
          outletId: input.outletId,
          clearedAt: null,
        },
        include: {
          product: {
            select: {
              name: true,
              minStock: true,
            },
          },
        },
        orderBy: {
          triggeredAt: "desc",
        },
        take: 5,
      });

      const inventoryByProduct = await db.inventory.findMany({
        where: {
          outletId: input.outletId,
          productId: { in: alerts.map((alert) => alert.productId) },
        },
        select: {
          productId: true,
          quantity: true,
        },
      });

      const inventoryMap = new Map(
        inventoryByProduct.map((row) => [row.productId, row.quantity]),
      );

      const hoursOpen = shift
        ? (Date.now() - shift.openTime.getTime()) / 1000 / 3600
        : 0;

      const baseTasks = shift
        ? [
            {
              id: "count-cash",
              title: "Hitung kas akhir",
              description:
                "Hitung kas awal + transaksi hari ini sebelum menutup shift",
              defaultStatus: TaskStatus.PENDING,
            },
            {
              id: "restock",
              title: "Pantau prioritas stok",
              description: alerts.length
                ? `${alerts.length} SKU butuh perhatian`
                : "Stok cukup untuk saat ini",
              defaultStatus: alerts.length
                ? TaskStatus.PENDING
                : TaskStatus.COMPLETE,
            },
            {
              id: "reconcile",
              title: "Rekonsiliasi shift",
              description:
                hoursOpen >= 8
                  ? "Shift sudah lama; lakukan rekap dan tutup shift"
                  : "Shift baru saja dibuka",
              defaultStatus:
                hoursOpen >= 8 ? TaskStatus.PENDING : TaskStatus.COMPLETE,
            },
          ]
        : [
            {
              id: "open-shift",
              title: "Buka shift kasir",
              description: "Belum ada shift aktif di outlet ini",
              defaultStatus: TaskStatus.PENDING,
            },
          ];

      const storedStatuses = await db.cashierTaskStatus.findMany({
        where: {
          outletId: input.outletId,
          userId: ctx.session.user.id,
          taskId: {
            in: baseTasks.map((task) => task.id),
          },
        },
      });

      const statusMap = new Map(
        storedStatuses.map((record) => [record.taskId, record]),
      );

      const tasks = baseTasks.map((task) => {
        const record = statusMap.get(task.id);
        const resolvedStatus = record ? record.status : task.defaultStatus;
        return {
          id: task.id,
          title: task.title,
          description: task.description,
          status: resolvedStatus.toLowerCase() as "pending" | "complete",
          notes: record?.notes ?? undefined,
        };
      });

      return {
        tasks,
        alerts: alerts.map((alert) => ({
          productId: alert.productId,
          productName: alert.product.name,
          quantity: inventoryMap.get(alert.productId) ?? 0,
          minStock: alert.product?.minStock ?? undefined,
        })),
        shiftActive: !!shift,
      };
    }),
  updateTaskStatus: requireOutletAccess(({ input }) => input.outletId)
    .input(taskStatusUpdateSchema)
    .output(taskStatusUpdateOutputSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;
      const record = await db.cashierTaskStatus.upsert({
        where: {
          taskId_userId_outletId: {
            taskId: input.taskId,
            userId,
            outletId: input.outletId,
          },
        },
        create: {
          taskId: input.taskId,
          userId,
          outletId: input.outletId,
          status: input.status.toUpperCase() as TaskStatus,
          notes: input.notes ?? null,
        },
        update: {
          status: input.status.toUpperCase() as TaskStatus,
          notes: input.notes ?? undefined,
        },
      });

      return {
        status: record.status.toLowerCase() as "pending" | "complete",
        notes: record.notes ?? null,
      };
    }),
});
