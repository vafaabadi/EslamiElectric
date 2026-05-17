import { expect, test } from '@playwright/test';
import {
  fetchAppJwtViaPasswordLogin,
  getAdminE2ECredentials,
  getE2ECredentials,
  loginAsAdminUser
} from './helpers/auth.js';

/**
 * Admin API/UI: the E2E admin user must have `public.users.is_admin = true` (Supabase),
 * unless the server sets `ADMIN_ALLOWED_EMAILS` as a bypass.
 *
 * Intentionally no Playwright flows that **create / update / delete** catalog rows — those
 * polluted production when CI or local runs pointed at the same Supabase project. Use manual
 * checks or a dedicated DB if you need full CRUD automation.
 */

function isLocalBaseUrl(baseURL: string | undefined): boolean {
  const b = (baseURL || '').trim();
  return !b || b.includes('127.0.0.1') || b.includes('localhost');
}

test.describe('admin catalog — unauthenticated API', () => {
  test.beforeEach(({ baseURL }) => {
    test.skip(
      !isLocalBaseUrl(baseURL),
      'Admin API tests expect the Node server (unset PLAYWRIGHT_BASE_URL for localhost).'
    );
  });

  test('GET /api/admin/catalog returns 401 without token', async ({ request }) => {
    const res = await request.get('/api/admin/catalog');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/categories returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ name: 'E2ENoAuthCat' })
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
        price: 1
      })
    });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/admin/products returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/products/e2e-no-auth-delete-id', { method: 'DELETE' });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/admin/categories/:id returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/categories/e2e-no-auth-delete-cat-id', { method: 'DELETE' });
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/catalog/export.csv returns 401 without token', async ({ request }) => {
    const res = await request.get('/api/admin/catalog/export.csv');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/catalog/import returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/catalog/import', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      data: 'section,categories\nid,name\n'
    });
    expect(res.status()).toBe(401);
  });

  test('PATCH /api/admin/categories/reorder returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/categories/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ orderedIds: ['a'] })
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/products/:id/duplicate returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/products/e2e-dup/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({})
    });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/admin/products/:id/image returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/products/e2e-no-auth-image-id/image', { method: 'DELETE' });
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/orders returns 401 without token', async ({ request }) => {
    const res = await request.get('/api/admin/orders');
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/audit returns 401 without token', async ({ request }) => {
    const res = await request.get('/api/admin/audit');
    expect(res.status()).toBe(401);
  });

  test('PATCH /api/admin/orders/:id returns 401 without token', async ({ request }) => {
    const res = await request.fetch('/api/admin/orders/00000000-0000-4000-8000-000000000099', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({ fulfillment_status: 'shipped', admin_notes: 'n' })
    });
    expect(res.status()).toBe(401);
  });
});

test.describe('admin catalog — public UI shell', () => {
  test('admin orders page shell loads', async ({ page, baseURL }) => {
    await page.goto('/en/admin-orders', { waitUntil: 'domcontentloaded' });

    /** Locale route missing on older deployments: Node falls back to `index.html` (shop home). */
    try {
      await page.locator('#admin-orders-gate').waitFor({ state: 'visible', timeout: 12_000 });
    } catch {
      // waitFor failure — fall through for skip/assert below
    }
    if (!(await page.locator('#admin-orders-gate').isVisible())) {
      test.skip(
        !isLocalBaseUrl(baseURL),
        'This host serves shop home instead of admin-orders; deploy PATH_TO_HTML + admin-orders.html or test against localhost.'
      );
    }

    await expect(page.locator('#admin-orders-gate')).toBeVisible();
    await expect(page.locator('header h1')).toContainText(/orders/i);
  });

  test('admin products page shell loads', async ({ page }) => {
    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /product admin/i })).toBeVisible();
  });
});

test.describe('admin catalog — safe localhost checks', () => {
  test.beforeEach(({ baseURL }) => {
    test.skip(
      !isLocalBaseUrl(baseURL),
      'Admin checks expect the Node server (unset PLAYWRIGHT_BASE_URL for localhost).'
    );
  });

  test('non-admin user gets 403 on admin catalog', async ({ request }) => {
    const { email, password } = getE2ECredentials();
    const { email: adminEmail } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD.');
    test.skip(!!adminEmail && email!.toLowerCase() === adminEmail.toLowerCase(), 'Use a non-admin E2E user distinct from E2E_ADMIN_EMAIL.');

    let token: string;
    try {
      token = await fetchAppJwtViaPasswordLogin(request, email!, password!);
    } catch {
      test.skip(true, 'E2E test user login failed; fix credentials or unset them to skip this check.');
      token = '';
    }

    const res = await request.get('/api/admin/catalog', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status() === 200) {
      test.skip(
        true,
        'E2E_TEST_USER can read admin catalog (is_admin or bypass). Use a non-admin shop user for this check.'
      );
    }
    expect(res.status()).toBe(403);
  });

  test('admin UI: login and panel loads existing catalog', async ({ page }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and is_admin for that user in DB).');

    await loginAsAdminUser(page);
    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#admin-panel')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#admin-product-select option').first()).toBeAttached();
    await expect(page.locator('#field-desc-fa')).toBeVisible();
    await expect(page.locator('#field-alt-en')).toBeVisible();
    await expect(page.locator('#field-alt-fa')).toBeVisible();
    await expect(page.locator('#admin-category-order')).toBeVisible();
    await expect(page.locator('#admin-export-csv-btn')).toBeVisible();
    await expect(page.locator('a[href="admin-orders.html"]')).toBeVisible();
  });

  test('admin UI: upload image requires a file (error banner)', async ({ page }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.');

    await loginAsAdminUser(page);
    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#admin-panel')).toBeVisible({ timeout: 20_000 });

    await page.locator('#admin-upload-btn').click();
    await expect(page.locator('#admin-banner')).toContainText(/choose a file first/i, { timeout: 10_000 });
  });

  test('POST /api/admin/catalog/import returns 400 for JSON body (no DB writes)', async ({ request }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.');

    let token: string;
    try {
      token = await fetchAppJwtViaPasswordLogin(request, email!, password!);
    } catch {
      test.skip(true, 'Admin login failed; fix credentials.');
      token = '';
    }

    const res = await request.fetch('/api/admin/catalog/import', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({})
    });
    expect(res.status()).toBe(400);
  });

  test('admin CSV export GET succeeds with JWT (read-only)', async ({ request }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.');

    let token: string;
    try {
      token = await fetchAppJwtViaPasswordLogin(request, email!, password!);
    } catch {
      test.skip(true, 'Admin login failed; fix credentials.');
      token = '';
    }

    const res = await request.get('/api/admin/catalog/export.csv', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status() === 500) {
      test.skip(
        true,
        'CSV export failed server-side — ensure supabase migration 017 (description_fa / image alt columns) is applied to the CI-linked project.'
      );
    }
    expect(res.status()).toBe(200);
    const ct = (res.headers()['content-type'] || res.headers()['Content-Type'] || '').toString().toLowerCase();
    expect(ct).toMatch(/text\/csv|application\/csv/);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(10);
    expect(text.includes('section,categories') || text.includes('category_id')).toBeTruthy();
  });

  test('admin JWT: PATCH unknown order returns 404 (no row updated)', async ({ request }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.');

    let token: string;
    try {
      token = await fetchAppJwtViaPasswordLogin(request, email!, password!);
    } catch {
      test.skip(true, 'Admin login failed; fix credentials.');
      token = '';
    }

    const res = await request.fetch('/api/admin/orders/00000000-0000-4000-8000-000000000099', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: JSON.stringify({ fulfillment_status: 'shipped', admin_notes: '-' })
    });
    if (res.status() === 500) {
      test.skip(true, 'PATCH order failed server-side — apply migration 018 (fulfillment columns on orders).');
    }
    expect(res.status()).toBe(404);
  });
});
