import { expect, test } from '@playwright/test';

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

  test('admin can open catalog UI when E2E admin credentials are set', async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and ADMIN_ALLOWED_EMAILS on the server).');

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
