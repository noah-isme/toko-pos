import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { getServerAuthSession } from "@/server/auth";
import {
  assertAdminOrOwner,
  assertOutletAccess,
  ensureCashierOutletAccess,
  getUserAccess,
  type UserAccess,
} from "@/server/api/utils/access";
import { db } from "@/server/db";
import { Prisma } from "@/server/db/enums";
import { Role } from "@/server/db/enums";

type CashSessionWithUser = Prisma.CashSessionGetPayload<{
  include: { user: { select: { id: true; name: true } } };
}>;

export type TRPCContext = {
  session: Awaited<ReturnType<typeof getServerAuthSession>>;
  activeShift?: CashSessionWithUser;
  outletAccess?: UserAccess;
} & Record<string, unknown>;

export const createTRPCContext = async (
  overrides?: { session?: TRPCContext["session"] },
): Promise<TRPCContext> => {
  // Allow callers outside a request scope (e.g. tests) to inject a session,
  // skipping getServerAuthSession() which needs Next's request headers.
  const session =
    overrides && "session" in overrides
      ? (overrides.session ?? null)
      : await getServerAuthSession();

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

const enforceUserIsAdminOrOwner = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const outletAccess = await getUserAccess(
    ctx.session.user.id,
    ctx.session.user.email,
  );
  assertAdminOrOwner(outletAccess.role);

  return next({
    ctx: {
      session: ctx.session,
      outletAccess,
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

    // Only return the ctx patch; tRPC merges it with the existing context, so
    // spreading `...ctx` here would re-widen `session` back to nullable.
    return next({
      ctx: {
        ...resolution.context,
        activeShift,
      },
    });
  });

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const adminProcedure = t.procedure.use(enforceUserIsAdminOrOwner);

/**
 * Default shape for resolvers that pull outlet id(s) off the validated input.
 * Covers the single-outlet procedures (`outletId`) and the transfer procedure
 * (`fromOutletId`/`toOutletId`). Call sites can override `TInput` when needed.
 */
type OutletResolverInput = {
  outletId?: string;
  fromOutletId?: string;
  toOutletId?: string;
};

type OutletResolver<TInput> = (params: {
  ctx: TRPCContext;
  input: TInput;
}) =>
  | string
  | ReadonlyArray<string | undefined>
  | undefined
  | Promise<string | ReadonlyArray<string | undefined> | undefined>;

export const withOutletAccess = <TInput = OutletResolverInput>(
  resolveOutletIds?: OutletResolver<TInput>,
) =>
  t.middleware(async ({ ctx, getRawInput, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const outletAccess = await getUserAccess(
      ctx.session.user.id,
      ctx.session.user.email,
    );
    // `requireOutletAccess` attaches this middleware before the procedure's
    // `.input()` parser runs, so the middleware's own `input` is undefined at
    // this point. Read the raw input directly to resolve outlet id(s).
    const resolved = resolveOutletIds
      ? await resolveOutletIds({ ctx, input: (await getRawInput()) as TInput })
      : undefined;
    const outletIds = (
      resolved === undefined
        ? []
        : Array.isArray(resolved)
          ? resolved
          : [resolved]
    ).filter((value): value is string => typeof value === "string");

    if (outletIds.length > 0) {
      for (const outletId of outletIds) {
        assertOutletAccess(outletAccess.role, outletAccess.outletIds, outletId);
      }
    } else if (outletAccess.role === Role.CASHIER) {
      ensureCashierOutletAccess(outletAccess.role, outletAccess.outletIds);
    }

    // Return only the ctx patch so tRPC merges it, preserving the non-null
    // `session` narrowing from `protectedProcedure`.
    return next({
      ctx: {
        outletAccess,
      },
    });
  });

export const protectedOutletProcedure = protectedProcedure.use(
  withOutletAccess(),
);

export const requireOutletAccess = <TInput = OutletResolverInput>(
  resolveOutletIds: OutletResolver<TInput>,
) => protectedProcedure.use(withOutletAccess(resolveOutletIds));

export const getOutletAccessFromContext = (ctx: TRPCContext) => {
  if (!ctx.outletAccess) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Outlet access context belum tersedia.",
    });
  }

  return ctx.outletAccess;
};
