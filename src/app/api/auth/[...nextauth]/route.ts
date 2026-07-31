import { handler } from '@/server/auth';
import { e2eBypassSession, isE2EAuthBypassEnabled } from '@/lib/e2e-bypass';

// Next.js 16 passes params as a Promise; NextAuth v4 expects the resolved
// string array. We await and forward for both GET and POST so NextAuth can
// determine the action (session, csrf, callback/credentials, signout, …).
type RouteContext = { params: Promise<{ nextauth: string[] }> };

// NextAuth v4 App Router handler signature
type NextAuthAppHandler = (
  req: Request,
  ctx: { params: { nextauth: string[] } },
) => Promise<Response>;

const nextAuthApp = handler as unknown as NextAuthAppHandler;

/**
 * GET /api/auth/[...nextauth]
 *
 * `SessionProvider` refetches `GET /api/auth/session` after mount. The real
 * NextAuth handler answers from the JWT cookie, and E2E runs have no cookie, so
 * it returns an empty session and `useSession()` flips to "unauthenticated"
 * even though the server-rendered page was authenticated via
 * `getServerAuthSession()`. Answer this one route from the same bypass so the
 * client and server agree.
 */
export async function GET(req: Request, context: RouteContext) {
  const url = new URL(req.url);
  // Handle E2E bypass BEFORE invoking NextAuth
  if (isE2EAuthBypassEnabled() && url.pathname.endsWith('/session')) {
    return Response.json(e2eBypassSession());
  }

  const params = await context.params;
  return nextAuthApp(req, { params });
}

/**
 * POST /api/auth/[...nextauth]
 *
 * Handles credentials sign-in, sign-out, and other mutating NextAuth actions.
 */
export async function POST(req: Request, context: RouteContext) {
  const params = await context.params;
  return nextAuthApp(req, { params });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: 'GET,POST,OPTIONS,HEAD' } });
}
