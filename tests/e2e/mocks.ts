import type { Page, Request, Route } from "@playwright/test";
import type { inferRouterOutputs } from "@trpc/server";
import superjson, {
  type SuperJSONResult,
  type SuperJSONValue,
} from "superjson";

import type { AppRouter } from "@/server/api/root";

type RouterOutputs = inferRouterOutputs<AppRouter>;

/** Every mockable procedure as a dotted path, e.g. `"sales.listRecent"`. */
export type TrpcProcedurePath = {
  [R in keyof RouterOutputs]: {
    [P in keyof RouterOutputs[R]]: `${R & string}.${P & string}`;
  }[keyof RouterOutputs[R]];
}[keyof RouterOutputs];

/** The real output type of a procedure, resolved from its dotted path. */
export type TrpcOutputOf<K extends TrpcProcedurePath> =
  K extends `${infer R}.${infer P}`
    ? R extends keyof RouterOutputs
      ? P extends keyof RouterOutputs[R]
        ? RouterOutputs[R][P]
        : never
      : never
    : never;

type HandlerParams = {
  input: unknown;
  request: Request;
  route: Route;
};

export type TrpcHandler = (params: HandlerParams) => unknown;

/**
 * Fixture map where each handler's return value is checked against the real
 * router output type. Drift between a fixture and its procedure becomes a
 * `pnpm typecheck` failure instead of a runtime `undefined` in the browser.
 */
export type TypedTrpcHandlers = {
  [K in TrpcProcedurePath]?: (
    params: HandlerParams,
  ) => TrpcOutputOf<K> | Promise<TrpcOutputOf<K>>;
};

/**
 * Identity function that type-checks a fixture map against `AppRouter`, then
 * widens it for `setupTrpcMock`. Prefer this over an untyped object literal.
 */
export const defineTrpcMocks = (
  handlers: TypedTrpcHandlers,
): Record<string, TrpcHandler> =>
  handlers as Record<string, TrpcHandler>;

const serializeTrpcData = (data: unknown) => {
  const serialized = superjson.serialize((data ?? null) as SuperJSONValue);
  return { result: { data: serialized } };
};

const hasJsonEnvelope = (value: unknown): value is SuperJSONResult =>
  typeof value === "object" && value !== null && "json" in value;

const readRawPayload = (request: Request, url: URL): unknown => {
  if (request.method() === "GET") {
    const inputParam = url.searchParams.get("input");
    return inputParam ? JSON.parse(inputParam) : undefined;
  }

  const body = request.postData();
  return body ? JSON.parse(body) : undefined;
};

/**
 * tRPC keys batch inputs by their index within the batch and omits the key
 * entirely for procedures that take no input, so inputs must be looked up by
 * index rather than by position among the present keys.
 */
const readInputAt = (raw: unknown, index: number): unknown => {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  const container = Array.isArray(raw)
    ? raw[index]
    : typeof raw === "object"
      ? (raw as Record<string, unknown>)[String(index)]
      : raw;

  if (hasJsonEnvelope(container)) {
    try {
      return superjson.deserialize(container);
    } catch {
      return undefined;
    }
  }

  return container;
};

export const setupTrpcMock = async (
  page: Page,
  handlers: Record<string, TrpcHandler>,
) => {
  await page.route("**/api/trpc**", async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/?api\/?trpc\/?/, "");
    const procedures = path.split(",");
    if (process.env.DEBUG_TRPC_MOCK === "true") {
      console.info("[trpc-mock] intercepted", request.url(), procedures);
    }

    const raw = readRawPayload(request, url);

    const results = await Promise.all(
      procedures.map(async (proc, idx) => {
        const handler = handlers[proc];
        if (!handler) {
          // Surface the gap as a real tRPC error envelope. Returning a bare
          // `{ error }` with HTTP 200 leaves the client with `result.data ===
          // undefined`, which crashes far from the actual cause.
          return {
            error: {
              json: {
                message: `No mock registered for tRPC procedure: ${proc}`,
                code: -32004,
                data: { code: "NOT_FOUND", httpStatus: 404, path: proc },
              },
            },
          };
        }

        const data = await handler({
          input: readInputAt(raw, idx),
          request,
          route,
        });
        return serializeTrpcData(data);
      }),
    );

    const body =
      procedures.length > 1
        ? JSON.stringify(results)
        : JSON.stringify(results[0]);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });
};

export const mockAuthSession = async (page: Page) => {
  await page.route("**/api/auth/session**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "e2e-user",
          name: "Kasir Uji",
          email: "kasir@example.com",
          role: "ADMIN",
        },
        expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    });
  });
};
