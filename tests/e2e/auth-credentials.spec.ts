import { test, expect } from '@playwright/test';

// API-level credential sign-in check. Drives NextAuth's credentials callback
// directly (CSRF fetch → POST) and asserts a *real* successful sign-in: a
// redirect that is NOT the error page, and a session-token cookie actually set.
// The seed password for owner@example.com is "password" (see prisma/seed).

test('credentials sign-in sets a session cookie and does not redirect to the error page', async ({ request, baseURL }) => {
  const base = baseURL || 'http://localhost:5000';

  const csrfRes = await request.get(`${base}/api/auth/csrf`);
  expect(csrfRes.ok()).toBeTruthy();
  const { csrfToken } = await csrfRes.json();
  expect(typeof csrfToken).toBe('string');

  const postRes = await request.post(`${base}/api/auth/callback/credentials`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
    data: new URLSearchParams({
      csrfToken,
      email: 'owner@example.com',
      password: 'password',
      callbackUrl: `${base}/`,
    }).toString(),
  });

  // Successful credential auth redirects (to callbackUrl), never to /api/auth/error.
  expect([302, 303]).toContain(postRes.status());
  const location = postRes.headers()['location'] ?? '';
  expect(location).not.toContain('/api/auth/error');

  // A session cookie MUST be set on success — this is the real assertion the
  // previous version skipped (it only checked the cookie "if present").
  const setCookie = postRes.headers()['set-cookie'] ?? '';
  expect(setCookie).toContain('next-auth.session-token');
});

test('credentials sign-in with a wrong password is rejected (no session cookie)', async ({ request, baseURL }) => {
  const base = baseURL || 'http://localhost:5000';

  const csrfRes = await request.get(`${base}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  const postRes = await request.post(`${base}/api/auth/callback/credentials`, {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
    data: new URLSearchParams({
      csrfToken,
      email: 'owner@example.com',
      password: 'definitely-wrong',
      callbackUrl: `${base}/`,
    }).toString(),
  });

  const location = postRes.headers()['location'] ?? '';
  expect(location).toContain('error');
  const setCookie = postRes.headers()['set-cookie'] ?? '';
  expect(setCookie).not.toContain('next-auth.session-token');
});
