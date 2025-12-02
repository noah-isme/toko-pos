import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { getServerAuthSession } from "@/server/auth";
import { db } from "@/server/db";
import { Prisma } from "@/server/db/enums";

type CashSessionWithUser = Prisma.CashSessionGetPayload<{
  include: { user: { select: { id: true; name: true } } };
}>;

export type TRPCContext = {
  session: Awaited<ReturnType<typeof getServerAuthSession>>;
  activeShift?: CashSessionWithUser;
} & Record<string, unknown>;

export const createTRPCContext = async (): Promise<TRPCContext> => {
  const session = await getServerAuthSession();

  return {
    session,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

type OutletResolution<TInput> = {
  outletId: string;
  context?: Partial<TRPCContext>;
};

export const requireActiveShift = <TInput>(
  resolveOutlet: (params: { ctx: TRPCContext; input: TInput }) =>
    Promise<OutletResolution<TInput>> | OutletResolution<TInput>,
) =>
  t.middleware(async ({ ctx, input, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const resolution = await resolveOutlet({
      ctx,
      input: input as TInput,
    });

    if (!resolution?.outletId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Outlet tidak valid untuk shift kasir.",
      });
    }

    const activeShift = await db.cashSession.findFirst({
      where: {
        outletId: resolution.outletId,
        userId: ctx.session.user.id,
        closeTime: null,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        openTime: "desc",
      },
    });

    if (!activeShift) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Buka shift kasir sebelum melakukan aksi ini.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        ...resolution.context,
        activeShift,
      },
    });
  });

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
