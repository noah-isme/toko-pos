import { db } from '@/server/db';
import { env } from '@/env';
import { encode } from 'next-auth/jwt';

export async function GET(req: Request) {
  // Only allow in non-production
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get('secret') || undefined;
  const configured = process.env.DEV_LOGIN_SECRET;

  if (configured && secret !== configured) {
    return new Response('Unauthorized', { status: 401 });
  }

  const email = url.searchParams.get('email') || 'owner@example.com';

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return new Response('User not found', { status: 404 });

  // Generate NextAuth JWT token
  const token = await encode({
    secret: env.NEXTAUTH_SECRET,
    token: {
      sub: user.id,
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      role: user.role,
    },
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  // Set cookie compatible with next-auth JWT sessions on localhost (dev-only)
  const maxAge = 30 * 24 * 60 * 60;
  const cookie = `next-auth.session-token=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': cookie,
      'Cache-Control': 'no-store',
    },
  });
}
