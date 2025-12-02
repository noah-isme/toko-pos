import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/server/db";

type ActivityClient = {
  activityLog: Pick<(typeof db)["activityLog"], "create">;
};

export const auditActionSchema = z.enum([
  "SHIFT_OPEN",
  "SHIFT_CLOSE",
  "SALE_RECORD",
  "SALE_VOID",
  "SALE_REFUND",
  "LOW_STOCK_TRIGGER",
]);

export type AuditAction = z.infer<typeof auditActionSchema>;

export type AuditLogEntry = {
  userId?: string | null;
  outletId?: string | null;
  action: AuditAction;
  entity?: string | null;
  entityId?: string | null;
  details?: Prisma.JsonValue | null;
};

/**
 * Persist a structured audit log entry.
 * Accepts either the Prisma client or a transaction client (tx).
 */
export async function writeAuditLog(
  entry: AuditLogEntry,
  client: ActivityClient = db,
) {
  await client.activityLog.create({
    data: {
      userId: entry.userId ?? null,
      outletId: entry.outletId ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      details: entry.details ?? undefined,
    },
  });
}
