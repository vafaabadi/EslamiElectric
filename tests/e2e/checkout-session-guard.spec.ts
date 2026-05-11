/**
 * Checkout session-guard tests
 *
 * Covers three security / UX surfaces:
 *   1. Expired / invalid JWT — should redirect to login, not show a confusing guest-checkout error
 *   2. Guest checkout client-side validation (name, email, address)
 *   3. Registered-user client-side validation (delivery address required)
 *
 * All tests mock /api/create-checkout-session and /api/me so no real Stripe or
 * Supabase calls are made.
 *
 * NOTE: localStorage is seeded via page.goto('/en/') + page.evaluate() rather than
 * page.addInitScript(), because addInitScript re-runs on every navigation — including
 * the redirect to login — which would re-seed the stale token and break the assertions.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** A structurally valid JWT whose signature will fail server-side verification. */
const STALE_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItc3RhbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0' +
  '.invalid_signature_so_server_rejects_it';

const SAMPLE_BASKET = JSON.stringify([
  {
    id: 'prod-guard-001',
    name: '2.5mm Twin & Earth Cable 100m',
    price: 85.0,
    quantity: 1,
    image_url: '/img/placeholder.jpg'
  }
]);

// ---------------------------------------------------------------------------
// Shared route mocks
// ---------------------------------------------------------------------------

async function mockLocaleHint(page: Page): Promise<void> {
  await page.route('**/api/locale-hint', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ defaultLang: 'en', usdToToman: 60000 })
    })
  );
}

async function mockMeOk(page: Page): Promise<void> {
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkoutProfileRequired: false,
        checkoutProfileComplete: true,
        checkoutProfileMissing: []
      })
    })
  );
}

async function mockCheckoutSessionExpired(page: Page): Promise<void> {
  await page.route('**/api/create-checkout-session', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Session expired. Please log in again.',
        code: 'SESSION_EXPIRED'
      })
    })
  );
}

async function mockCheckoutSessionSuccess(page: Page, localePrefix = '/en'): Promise<void> {
  await page.route('**/api/create-checkout-session', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    const origin = new URL(route.request().url()).origin;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: `${origin}${localePrefix}/checkout-success?session_id=guard_mock` })
    });
  });
}

// ---------------------------------------------------------------------------
// localStorage helpers
//
// We navigate to /en/ first and use page.evaluate() to set storage.
// This is intentional: page.addInitScript() re-fires on every navigation
// (including the redirect to login), which would re-seed the token and make
// the post-redirect toBeNull() assertion fail.
// ---------------------------------------------------------------------------

async function seedStaleSession(page: Page): Promise<void> {
  await page.goto('/en/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ basket, token }: { basket: string; token: string }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('basket', basket);
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localeInitialized', '1');
    },
    { basket: SAMPLE_BASKET, token: STALE_TOKEN }
  );
}

async function seedStaleSessionFa(page: Page): Promise<void> {
  await page.goto('/en/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ basket, token }: { basket: string; token: string }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('basket', basket);
      localStorage.setItem('lang', 'fa');
      localStorage.setItem('localeInitialized', '1');
    },
    { basket: SAMPLE_BASKET, token: STALE_TOKEN }
  );
}

async function seedGuestSession(page: Page): Promise<void> {
  await page.goto('/en/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ basket }: { basket: string }) => {
      localStorage.removeItem('token');
      localStorage.setItem('basket', basket);
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localeInitialized', '1');
    },
    { basket: SAMPLE_BASKET }
  );
}

async function seedFakeLoggedInSession(page: Page): Promise<void> {
  await page.goto('/en/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ basket, token }: { basket: string; token: string }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('basket', basket);
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localeInitialized', '1');
    },
    { basket: SAMPLE_BASKET, token: STALE_TOKEN }
  );
}

// ---------------------------------------------------------------------------
// 1. Expired / invalid JWT
// ---------------------------------------------------------------------------

test.describe('Expired / invalid JWT session guard', () => {
  test('expired token on checkout → client clears token and redirects to login', async ({ page }) => {
    await seedStaleSession(page);
    await mockLocaleHint(page);
    await mockMeOk(page);
    await mockCheckoutSessionExpired(page);

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });

    // Registered delivery address section should be visible (UI thinks user is logged in)
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#reg-address').fill('123 High Street, London');

    await page.locator('#btn-checkout').click();

    // Must land on login page
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });

    // Stale token must have been cleared from localStorage before the redirect
    const remaining = await page.evaluate(() => localStorage.getItem('token'));
    expect(remaining).toBeNull();
  });

  test('expired token (Persian locale) → clears token and redirects to login', async ({ page }) => {
    await seedStaleSessionFa(page);
    await mockLocaleHint(page);
    await mockMeOk(page);
    await mockCheckoutSessionExpired(page);

    await page.goto('/fa/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#reg-address').fill('تهران، خیابان ولیعصر، پلاک ۱۰');
    await page.locator('#btn-checkout').click();

    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
    const remaining = await page.evaluate(() => localStorage.getItem('token'));
    expect(remaining).toBeNull();
  });

  test('true guest (no token) → validation error shown, no redirect to login', async ({ page }) => {
    await seedGuestSession(page);
    await mockLocaleHint(page);

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });

    // Click checkout without filling any guest fields → client-side validation, not a redirect
    await page.locator('#btn-checkout').click();

    // Should stay on basket
    await expect(page).not.toHaveURL(/login/, { timeout: 2_000 });
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// 2. Guest checkout client-side validation
// ---------------------------------------------------------------------------

test.describe('Guest checkout – client-side validation', () => {
  test('empty basket → checkout button is disabled', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('basket');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localeInitialized', '1');
    });
    await mockLocaleHint(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#basket-empty')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-checkout')).toBeDisabled();
  });

  test('missing name → shows validation error, no network call', async ({ page }) => {
    await seedGuestSession(page);
    await mockLocaleHint(page);

    let checkoutCalled = false;
    await page.route('**/api/create-checkout-session', (route) => { checkoutCalled = true; route.continue(); });

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });

    await page.locator('#guest-email').fill('guest@example.com');
    await page.locator('#guest-address').fill('10 Test Lane, London');
    // name intentionally blank
    await page.locator('#btn-checkout').click();

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(checkoutCalled).toBe(false);
  });

  test('missing email → shows validation error, no network call', async ({ page }) => {
    await seedGuestSession(page);
    await mockLocaleHint(page);

    let checkoutCalled = false;
    await page.route('**/api/create-checkout-session', (route) => { checkoutCalled = true; route.continue(); });

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });

    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-address').fill('10 Test Lane, London');
    // email intentionally blank
    await page.locator('#btn-checkout').click();

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(checkoutCalled).toBe(false);
  });

  test('invalid email format → shows validation error, no network call', async ({ page }) => {
    await seedGuestSession(page);
    await mockLocaleHint(page);

    let checkoutCalled = false;
    await page.route('**/api/create-checkout-session', (route) => { checkoutCalled = true; route.continue(); });

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });

    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-email').fill('not-an-email');
    await page.locator('#guest-address').fill('10 Test Lane, London');
    await page.locator('#btn-checkout').click();

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(checkoutCalled).toBe(false);
  });

  test('delivery mode + missing address → shows error, no network call', async ({ page }) => {
    await seedGuestSession(page);
    await mockLocaleHint(page);

    let checkoutCalled = false;
    await page.route('**/api/create-checkout-session', (route) => { checkoutCalled = true; route.continue(); });

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();

    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-email').fill('guest@example.com');
    // address blank
    await page.locator('#btn-checkout').click();

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(checkoutCalled).toBe(false);
  });

  test('delivery mode + too-short address → shows error, no network call', async ({ page }) => {
    await seedGuestSession(page);
    await mockLocaleHint(page);

    let checkoutCalled = false;
    await page.route('**/api/create-checkout-session', (route) => { checkoutCalled = true; route.continue(); });

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();

    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-email').fill('guest@example.com');
    await page.locator('#guest-address').fill('AB'); // < 5 chars
    await page.locator('#btn-checkout').click();

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(checkoutCalled).toBe(false);
  });

  test('collection mode → no address required, checkout proceeds', async ({ page }) => {
    await seedGuestSession(page);
    await mockLocaleHint(page);
    await mockCheckoutSessionSuccess(page, '/en');

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="collection"]').check();

    await page.locator('#guest-name').fill('Pickup Customer');
    await page.locator('#guest-email').fill('pickup@example.com');
    // no address — collection skips address validation

    await page.locator('#btn-checkout').click();
    await expect(page).toHaveURL(/checkout-success/, { timeout: 15_000 });
  });

  test('valid guest delivery → checkout proceeds', async ({ page }) => {
    await seedGuestSession(page);
    await mockLocaleHint(page);
    await mockCheckoutSessionSuccess(page, '/en');

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();

    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-email').fill('jane@example.com');
    await page.locator('#guest-address').fill('42 Broad Street, Bristol');

    await page.locator('#btn-checkout').click();
    await expect(page).toHaveURL(/checkout-success/, { timeout: 15_000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Registered-user client-side validation
// ---------------------------------------------------------------------------

test.describe('Registered user – client-side delivery validation', () => {
  test('delivery mode + empty address → shows error before any network call', async ({ page }) => {
    await seedFakeLoggedInSession(page);
    await mockLocaleHint(page);
    await mockMeOk(page);

    let checkoutCalled = false;
    await page.route('**/api/create-checkout-session', (route) => { checkoutCalled = true; route.continue(); });

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();
    // address blank
    await page.locator('#btn-checkout').click();

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(checkoutCalled).toBe(false);
  });

  test('delivery mode + too-short address → shows error', async ({ page }) => {
    await seedFakeLoggedInSession(page);
    await mockLocaleHint(page);
    await mockMeOk(page);

    let checkoutCalled = false;
    await page.route('**/api/create-checkout-session', (route) => { checkoutCalled = true; route.continue(); });

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();
    await page.locator('#reg-address').fill('A'); // < 5 chars
    await page.locator('#btn-checkout').click();

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(checkoutCalled).toBe(false);
  });

  test('collection mode → no address needed, proceeds to checkout call', async ({ page }) => {
    await seedFakeLoggedInSession(page);
    await mockLocaleHint(page);
    await mockMeOk(page);
    await mockCheckoutSessionSuccess(page, '/en');

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="collection"]').check();

    await expect(page.locator('#registered-checkout-section')).toBeHidden({ timeout: 5_000 });
    await page.locator('#btn-checkout').click();
    await expect(page).toHaveURL(/checkout-success/, { timeout: 15_000 });
  });

  test('valid delivery address → checkout call is made', async ({ page }) => {
    await seedFakeLoggedInSession(page);
    await mockLocaleHint(page);
    await mockMeOk(page);
    await mockCheckoutSessionSuccess(page, '/en');

    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();
    await page.locator('#reg-address').fill('10 Whitechapel High Street, London');

    await page.locator('#btn-checkout').click();
    await expect(page).toHaveURL(/checkout-success/, { timeout: 15_000 });
  });
});
