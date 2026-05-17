import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIResponse } from '@playwright/test';
import {
  fetchAppJwtViaPasswordLogin,
  getAdminE2ECredentials,
  getE2ECredentials,
  loginAsAdminUser
} from './helpers/auth.js';

/**
 * Admin API/UI: the E2E admin user must have `public.users.is_admin = true` (Supabase),
 * unless the server sets `ADMIN_ALLOWED_EMAILS` as a bypass.
 */

function isLocalBaseUrl(baseURL: string | undefined): boolean {
  const b = (baseURL || '').trim();
  return !b || b.includes('127.0.0.1') || b.includes('localhost');
}

function assertOkStatus(res: APIResponse, bodyText: string, label: string): void {
  if (res.status() >= 400) {
    throw new Error(`${label} ${res.status()}: ${bodyText}`);
  }
}

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

test.describe('admin catalog — unauthenticated API', () => {
  /** POST admin routes exist on the Express app; a static / CDN-only deployment may 404 instead of 401. */
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
});

test.describe('admin catalog — public UI shell', () => {
  test('admin products page shell loads', async ({ page }) => {
    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /product admin/i })).toBeVisible();
  });
});

test.describe('admin catalog — localhost admin flows', () => {
  test.beforeEach(({ baseURL }) => {
    test.skip(
      !isLocalBaseUrl(baseURL),
      'Point Playwright at localhost (unset PLAYWRIGHT_BASE_URL) so admin flows only mutate a local/dev database.'
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
    expect(res.status()).toBe(403);
  });

  test('admin JWT: create category and product, catalog lists them, PATCH product', async ({ request }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and is_admin for that user in DB).');

    const token = await fetchAppJwtViaPasswordLogin(request, email!, password!);
    const auth = { Authorization: `Bearer ${token}` };
    const suffix = uniqueSuffix();
    const categoryId = `e2e-cat-${suffix}`;
    const catName = `e2e-category-${suffix}`;
    const productName = `e2e-product-${suffix}`;

    const catRes = await request.fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({ name: catName, id: categoryId })
    });
    const catTxt = await catRes.text();
    assertOkStatus(catRes, catTxt, 'POST /api/admin/categories');

    const prodRes = await request.fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({
        category_id: categoryId,
        name: productName,
        price: 9.99,
        description: `e2e-desc-${suffix}`
      })
    });
    const prodTxt = await prodRes.text();
    assertOkStatus(prodRes, prodTxt, 'POST /api/admin/products');
    const prodJson = JSON.parse(prodTxt) as { product?: { id?: string } };
    const productId = prodJson.product?.id;
    expect(productId).toBeTruthy();

    const listRes = await request.get('/api/admin/catalog', { headers: auth });
    const listTxt = await listRes.text();
    assertOkStatus(listRes, listTxt, 'GET /api/admin/catalog');
    const catalog = JSON.parse(listTxt) as {
      categories?: { id: string; products?: { id: string; name: string }[] }[];
    };
    const cat = catalog.categories?.find((c) => c.id === categoryId);
    expect(cat, 'new category in GET /api/admin/catalog').toBeTruthy();
    const p = cat?.products?.find((x) => x.id === productId);
    expect(p?.name).toBe(productName);

    const patchedName = `${productName}-patched`;
    const patchRes = await request.fetch(`/api/admin/products/${encodeURIComponent(productId!)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({
        name: patchedName,
        price: '12.5',
        category_id: categoryId
      })
    });
    const patchTxt = await patchRes.text();
    assertOkStatus(patchRes, patchTxt, 'PATCH /api/admin/products');

    const badPrice = await request.fetch(`/api/admin/products/${encodeURIComponent(productId!)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({ price: -1 })
    });
    expect(badPrice.status()).toBe(400);
  });

  test('admin JWT: DELETE product removes it from admin catalog', async ({ request }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and is_admin for that user in DB).');

    const token = await fetchAppJwtViaPasswordLogin(request, email!, password!);
    const auth = { Authorization: `Bearer ${token}` };
    const suffix = uniqueSuffix();
    const categoryId = `e2e-del-cat-${suffix}`;

    const catRes = await request.fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({ name: `e2e-del-category-${suffix}`, id: categoryId })
    });
    assertOkStatus(catRes, await catRes.text(), 'POST /api/admin/categories (delete test)');

    const prodRes = await request.fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({
        category_id: categoryId,
        name: `e2e-del-product-${suffix}`,
        price: 3.33
      })
    });
    const prodTxt = await prodRes.text();
    assertOkStatus(prodRes, prodTxt, 'POST /api/admin/products (delete test)');
    const prodJson = JSON.parse(prodTxt) as { product?: { id?: string } };
    const productId = prodJson.product?.id;
    expect(productId).toBeTruthy();

    const beforeRes = await request.get('/api/admin/catalog', { headers: auth });
    const beforeTxt = await beforeRes.text();
    assertOkStatus(beforeRes, beforeTxt, 'GET /api/admin/catalog (before delete)');
    const beforeCatalog = JSON.parse(beforeTxt) as {
      categories?: { id: string; products?: { id: string }[] }[];
    };
    const catBefore = beforeCatalog.categories?.find((c) => c.id === categoryId);
    expect(catBefore?.products?.some((p) => p.id === productId), 'product listed before delete').toBeTruthy();

    const delRes = await request.fetch(`/api/admin/products/${encodeURIComponent(productId!)}`, {
      method: 'DELETE',
      headers: auth
    });
    const delTxt = await delRes.text();
    assertOkStatus(delRes, delTxt, 'DELETE /api/admin/products');
    expect(JSON.parse(delTxt)).toMatchObject({ ok: true, deleted: true });

    const afterRes = await request.get('/api/admin/catalog', { headers: auth });
    const afterTxt = await afterRes.text();
    assertOkStatus(afterRes, afterTxt, 'GET /api/admin/catalog (after delete)');
    const afterCatalog = JSON.parse(afterTxt) as {
      categories?: { id: string; products?: { id: string }[] }[];
    };
    const stillPresent = (afterCatalog.categories || []).some((c) =>
      (c.products || []).some((p) => p.id === productId)
    );
    expect(stillPresent, 'deleted product id absent from catalog').toBe(false);
  });

  test('admin JWT: DELETE category removes category and cascades products', async ({ request }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and is_admin for that user in DB).');

    const token = await fetchAppJwtViaPasswordLogin(request, email!, password!);
    const auth = { Authorization: `Bearer ${token}` };
    const suffix = uniqueSuffix();
    const categoryId = `e2e-del-cat-all-${suffix}`;

    const catRes = await request.fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({ name: `e2e-del-cat-all-${suffix}`, id: categoryId })
    });
    assertOkStatus(catRes, await catRes.text(), 'POST /api/admin/categories (delete category test)');

    const prodRes = await request.fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({
        category_id: categoryId,
        name: `e2e-del-cat-all-prod-${suffix}`,
        price: 2.22
      })
    });
    const prodTxt = await prodRes.text();
    assertOkStatus(prodRes, prodTxt, 'POST /api/admin/products (delete category test)');
    const prodJson = JSON.parse(prodTxt) as { product?: { id?: string } };
    const productId = prodJson.product?.id;
    expect(productId).toBeTruthy();

    const delCatRes = await request.fetch(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
      method: 'DELETE',
      headers: auth
    });
    const delCatTxt = await delCatRes.text();
    assertOkStatus(delCatRes, delCatTxt, 'DELETE /api/admin/categories');
    expect(JSON.parse(delCatTxt)).toMatchObject({ ok: true, deleted: true });

    const afterRes = await request.get('/api/admin/catalog', { headers: auth });
    const afterTxt = await afterRes.text();
    assertOkStatus(afterRes, afterTxt, 'GET /api/admin/catalog (after category delete)');
    const afterCatalog = JSON.parse(afterTxt) as {
      categories?: { id: string; products?: { id: string }[] }[];
    };
    expect(afterCatalog.categories?.some((c) => c.id === categoryId)).toBe(false);
    const productStillListed = (afterCatalog.categories || []).some((c) =>
      (c.products || []).some((p) => p.id === productId)
    );
    expect(productStillListed, 'cascade: child product removed with category').toBe(false);
  });

  test('admin JWT: POST product image (skipped when storage unavailable)', async ({ request }, testInfo) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.');

    const token = await fetchAppJwtViaPasswordLogin(request, email!, password!);
    const auth = { Authorization: `Bearer ${token}` };
    const suffix = uniqueSuffix();
    const categoryId = `e2e-cat-img-${suffix}`;
    const catRes = await request.fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({ name: `e2e-cat-img-${suffix}`, id: categoryId })
    });
    const catTxt = await catRes.text();
    assertOkStatus(catRes, catTxt, 'POST /api/admin/categories (img test)');

    const prodRes = await request.fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      data: JSON.stringify({
        category_id: categoryId,
        name: `e2e-prod-img-${suffix}`,
        price: 1
      })
    });
    const prodTxt = await prodRes.text();
    assertOkStatus(prodRes, prodTxt, 'POST /api/admin/products (img test)');
    const prodJson = JSON.parse(prodTxt) as { product?: { id?: string } };
    const productId = prodJson.product?.id;
    expect(productId).toBeTruthy();

    const iconPath = path.join(process.cwd(), 'public/icons/icon-192.png');
    const imgRes = await request.fetch(`/api/admin/products/${encodeURIComponent(productId!)}/image`, {
      method: 'POST',
      headers: auth,
      multipart: {
        image: {
          name: 'e2e-icon.png',
          mimeType: 'image/png',
          buffer: fs.readFileSync(iconPath)
        }
      }
    });

    const imgTxt = await imgRes.text();
    if (imgRes.status() >= 400) {
      testInfo.skip(
        imgRes.status() === 500 && /bucket|Storage|upload|Failed to upload/i.test(imgTxt),
        `Image upload not available in this environment (${imgTxt.slice(0, 160)})`
      );
      throw new Error(`POST /api/admin/products/.../image ${imgRes.status()}: ${imgTxt}`);
    }
    const body = JSON.parse(imgTxt) as { image_url?: string };
    expect(body.image_url).toMatch(/^https?:\/\//);
  });

  test('admin UI: login, create category/product, edit and save', async ({ page }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and is_admin for that user in DB).');

    await loginAsAdminUser(page);
    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#admin-panel')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#admin-product-select option').first()).toBeAttached();

    const suf = uniqueSuffix();
    const slug = `e2e-ui-${suf}`;

    await page.locator('#toggle-add-category').click();
    await expect(page.locator('#add-category-panel')).toBeVisible();
    await page.locator('#new-category-name').fill(`e2e-ui-cat ${suf}`);
    await page.locator('#new-category-id-override').fill(slug);
    await page.locator('#new-category-form button[type="submit"]').click();
    await expect(page.locator('#admin-banner')).toContainText(/category created/i, { timeout: 20_000 });

    await page.locator('#toggle-add-product').click();
    await expect(page.locator('#add-product-panel')).toBeVisible();
    await page.locator('#new-product-category').selectOption({ value: slug });
    await page.locator('#new-product-name').fill(`e2e-ui-product ${suf}`);
    await page.locator('#new-product-price').fill('4.44');
    await page.locator('#new-product-form button[type="submit"]').click();
    await expect(page.locator('#admin-banner')).toContainText(/product created/i, { timeout: 20_000 });

    await page
      .locator('#admin-product-select')
      .selectOption({ label: `e2e-ui-product ${suf} — e2e-ui-cat ${suf}` });
    await expect(page.locator('#field-name')).toHaveValue(`e2e-ui-product ${suf}`);

    await page.locator('#field-name').fill(`e2e-ui-product ${suf} saved`);
    await page.locator('#admin-edit-form button[type="submit"]').click();
    await expect(page.locator('#admin-banner')).toContainText(/saved/i, { timeout: 20_000 });
  });

  test('admin UI: delete product with confirm and banner', async ({ page }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and is_admin for that user in DB).');

    await loginAsAdminUser(page);
    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#admin-panel')).toBeVisible({ timeout: 20_000 });

    const suf = uniqueSuffix();
    const productLabel = `e2e-del-ui-product ${suf}`;

    await page.locator('#toggle-add-category').click();
    await page.locator('#new-category-name').fill(`e2e-del-ui-cat ${suf}`);
    await page.locator('#new-category-id-override').fill(`e2e-del-ui-cat-${suf}`);
    await page.locator('#new-category-form button[type="submit"]').click();
    await expect(page.locator('#admin-banner')).toContainText(/category created/i, { timeout: 20_000 });

    await page.locator('#toggle-add-product').click();
    await page.locator('#new-product-category').selectOption({ value: `e2e-del-ui-cat-${suf}` });
    await page.locator('#new-product-name').fill(productLabel);
    await page.locator('#new-product-price').fill('1.11');
    await page.locator('#new-product-form button[type="submit"]').click();
    await expect(page.locator('#admin-banner')).toContainText(/product created/i, { timeout: 20_000 });

    await page
      .locator('#admin-product-select')
      .selectOption({ label: `${productLabel} — e2e-del-ui-cat ${suf}` });
    await expect(page.locator('#admin-delete-product')).toBeEnabled();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#admin-delete-product').click();
    await expect(page.locator('#admin-banner')).toContainText(/product deleted/i, { timeout: 20_000 });
    await expect(
      page.locator('#admin-product-select').locator('option').filter({ hasText: productLabel })
    ).toHaveCount(0);
  });

  test('admin UI: delete category with confirm and banner (cascade)', async ({ page }) => {
    const { email, password } = getAdminE2ECredentials();
    test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (and is_admin for that user in DB).');

    await loginAsAdminUser(page);
    await page.goto('/en/admin-products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#admin-panel')).toBeVisible({ timeout: 20_000 });

    const suf = uniqueSuffix();
    const slug = `e2e-del-cat-ui-${suf}`;
    const productLabel = `e2e-del-cat-ui-product ${suf}`;

    await page.locator('#toggle-add-category').click();
    await page.locator('#new-category-name').fill(`e2e-del-cat-ui-cat ${suf}`);
    await page.locator('#new-category-id-override').fill(slug);
    await page.locator('#new-category-form button[type="submit"]').click();
    await expect(page.locator('#admin-banner')).toContainText(/category created/i, { timeout: 20_000 });

    await page.locator('#toggle-add-product').click();
    await page.locator('#new-product-category').selectOption({ value: slug });
    await page.locator('#new-product-name').fill(productLabel);
    await page.locator('#new-product-price').fill('1.22');
    await page.locator('#new-product-form button[type="submit"]').click();
    await expect(page.locator('#admin-banner')).toContainText(/product created/i, { timeout: 20_000 });

    await page
      .locator('#admin-product-select')
      .selectOption({ label: `${productLabel} — e2e-del-cat-ui-cat ${suf}` });
    await expect(page.locator('#admin-delete-category')).toBeEnabled();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('#admin-delete-category').click();
    await expect(page.locator('#admin-banner')).toContainText(/category deleted/i, { timeout: 20_000 });
    await expect(
      page.locator('#admin-product-select').locator('option').filter({ hasText: productLabel })
    ).toHaveCount(0);
    await expect(page.locator(`#field-category option[value="${slug}"]`)).toHaveCount(0);
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
});
