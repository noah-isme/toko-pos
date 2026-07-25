import { z } from "zod";

import { requireOutletAccess, router } from "@/server/api/trpc";
import { createEDCGateway, createQRISGateway } from "@/server/api/services/payments/factory";
import { env } from "@/env";

const qrisCreateInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
  amount: z.number().int().min(1, { message: "Jumlah harus lebih dari 0" }),
  referenceId: z.string().min(1, { message: "Reference ID wajib diisi" }),
  description: z.string().min(1).max(255).optional(),
  customerName: z.string().max(100).optional(),
  expiresInSeconds: z.number().int().min(30).max(3600).optional(),
});

const paymentStatusInputSchema = z.object({
  transactionId: z.string().min(1, { message: "Transaction ID wajib diisi" }),
});

const edcInitiateInputSchema = z.object({
  outletId: z.string().min(1, { message: "Outlet wajib dipilih" }),
  amount: z.number().int().min(1, { message: "Jumlah harus lebih dari 0" }),
  referenceId: z.string().min(1, { message: "Reference ID wajib diisi" }),
  description: z.string().min(1).max(255).optional(),
  terminalId: z.string().optional(),
});

export const paymentsRouter = router({
  createQRIS: requireOutletAccess(({ input }) => input.outletId)
    .input(qrisCreateInputSchema)
    .mutation(async ({ input }) => {
      const gateway = createQRISGateway();
      return gateway.createQRISCharge({
        amount: input.amount,
        referenceId: input.referenceId,
        description:
          input.description ?? `Pembayaran ${input.referenceId}`,
        customerName: input.customerName,
        expiresInSeconds: input.expiresInSeconds,
      });
    }),

  checkQRIS: requireOutletAccess(() => undefined)
    .input(paymentStatusInputSchema)
    .query(async ({ input }) => {
      const gateway = createQRISGateway();
      return gateway.checkQRISStatus(input.transactionId);
    }),

  initiateEDC: requireOutletAccess(({ input }) => input.outletId)
    .input(edcInitiateInputSchema)
    .mutation(async ({ input }) => {
      const gateway = createEDCGateway();
      return gateway.initiateEDCCharge({
        amount: input.amount,
        referenceId: input.referenceId,
        description:
          input.description ?? `Pembayaran ${input.referenceId}`,
        terminalId: input.terminalId,
      });
    }),

  checkEDC: requireOutletAccess(() => undefined)
    .input(paymentStatusInputSchema)
    .query(async ({ input }) => {
      const gateway = createEDCGateway();
      return gateway.checkEDCStatus(input.transactionId);
    }),

  getGatewayConfig: requireOutletAccess(() => undefined).query(async () => {
    return {
      qrisProvider: env.PAYMENT_GATEWAY_PROVIDER,
      edcProvider: env.EDC_PROVIDER,
      mode: env.PAYMENT_GATEWAY_MODE,
      isMock: env.PAYMENT_GATEWAY_PROVIDER === "mock" && env.EDC_PROVIDER === "mock",
    };
  }),
});
