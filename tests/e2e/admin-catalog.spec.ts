import { expect, test } from '@playwright/test';

/**
 * Admin API/UI: the E2E user must have `public.users.is_admin = true` on the database the app uses
 * (Supabase Dashboard), unless the server sets `ADMIN_ALLOWED_EMAILS` as an optional bypass.
 */
const adminEmail = process.env.E2E_ADMIN_EMAIL?.trim();
const adminPassword = process.env.E2E_ADMIN_PASSWORD?.trim();

test.describe('admin catalog', () => {
  test.beforeEach(({ baseURL }) => {
    const b = (baseURL || '').trim();
    const isLocal = !b || b.includes('127.0.0.1') || b.includes('localhost');
    test.skip(
      !isLocal,
      'Point Playwright at localhost (unset PLAYWRIGHT_BASE_URL in .env) to exercise admin routes on this server.'
    );
  });

  test('admin products page shell loads', async ({ page }) => {
    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /product admin/i })).toBeVisible();
  });

  test('GET /api/admin/catalog returns 401 without token', async ({ request }) => {
    const res = await request.get('/api/admin/catalog');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/categories returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: 'E2ENoAuthCat' }),
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/products returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        category_id: 'does-not-exist',
        name: 'E2ENoAuthProduct',
        price: 1,
      }),
    });
    expect(res.status()).toBe(401);
  });

  test.skip(
    true,
    'Manual smoke (Bearer admin JWT): POST /api/admin/categories { name, name_fa?, sort_order?, id? } then POST /api/admin/products { category_id, name, price }; expect 200 and new rows in GET /api/admin/catalog.'
  );

  test('admin can open catalog UI when E2E admin credentials are set', async ({ page }) => {
    // Requires public.users.is_admin = true for that user on the DB the server uses (set in Supabase Dashboard),
    // unless the server sets ADMIN_ALLOWED_EMAILS as a bypass.
    test.skip(!adminEmail || !adminPassword, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and is_admin for that user in DB).');

    await page.goto('/en/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#login-form')).toBeVisible();
    await page.locator('#email').fill(adminEmail!);
    await page.locator('#password').fill(adminPassword!);
    await page.locator('#submit-btn').click();

    await expect(page).toHaveURL(/\/en\/?$/, { timeout: 30_000 });

    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#admin-panel')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#admin-product-select option').first()).toBeAttached();
  });
});
