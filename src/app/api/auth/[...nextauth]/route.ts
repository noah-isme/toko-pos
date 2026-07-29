import { GET as nextAuthGET, POST } from '@/server/auth';
import { e2eBypassSession, isE2EAuthBypassEnabled } from '@/lib/e2e-bypass';

export { POST };

/**
 * `SessionProvider` refetches `GET /api/auth/session` after mount. The real
 * NextAuth handler answers from the JWT cookie, and E2E runs have no cookie, so
 * it returns an empty session and `useSession()` flips to "unauthenticated"
 * even though the server-rendered page was authenticated via
 * `getServerAuthSession()`. Answer this one route from the same bypass so the
 * client and server agree.
 */
export async function GET(req: Request) {
  if (isE2EAuthBypassEnabled() && new URL(req.url).pathname.endsWith('/session')) {
    return Response.json(e2eBypassSession());
  }

  return nextAuthGET(req);
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: 'GET,POST,OPTIONS,HEAD' } });
}
