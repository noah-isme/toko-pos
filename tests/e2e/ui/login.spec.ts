import { test, expect } from '@playwright/test';

// UI-level test for the password sign-in form.
//
// Note: with NEXT_PUBLIC_E2E=true the *server* always resolves a fixed session
// (kasir@example.com), so we can't assert a specific signed-in identity in the
// page body. What this test verifies is the client wiring: the form submits
// real credentials via next-auth signIn() and, on success, surfaces the success
// state and navigates home. Credential correctness itself is covered separately
// by tests/e2e/auth-credentials.spec.ts (API level).

test.describe('UI sign-in', () => {
  test('signs in via /auth/login and redirects to /', async ({ page, baseURL }) => {
    const base = baseURL || 'http://localhost:5000';
    await page.goto(`${base}/auth/login`);

    await page.getByRole('heading', { name: 'Masuk ke akun Anda' }).waitFor();

    await page.locator('input[type="email"]').fill('owner@example.com');
    await page.locator('input[type="password"]').fill('password');

    await page.getByRole('button', { name: 'Masuk' }).click();

    // signIn(redirect:false) resolves, the page shows the success state, then
    // does window.location.href = "/" after a short delay. Credential auth hits
    // the real DB over a remote pooler, so allow generous time for the callback.
    await expect(page.getByText('Login berhasil', { exact: false })).toBeVisible({
      timeout: 20000,
    });

    await page.waitForURL(`${base}/`, { timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe('/');
  });
});
