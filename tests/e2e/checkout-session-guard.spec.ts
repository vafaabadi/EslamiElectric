/**
 * Checkout session-guard tests
 *
 * Covers three security / UX surfaces:
 *   1. Expired / invalid JWT — redirect to login, token cleared from storage
 *   2. Guest checkout client-side validation (name, email, address)
 *   3. Registered-user client-side validation (delivery address required)
 *
 * All network calls are intercepted — no real Stripe or Supabase requests.
 *
 * localStorage is seeded via page.goto() + page.evaluate() (not addInitScript)
 * so the seed fires exactly once and does NOT re-run when the page redirects.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Structurally valid JWT whose signature the server will reject.
 * Used only as a test fixture to simulate an expired session.
 */
const EXPIRED_JWT_FIXTURE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItc3RhbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0' +
  '.invalid_signature_so_server_rejects_it';

const SAMPLE_BASKET = JSON.stringify([
  { id: 'prod-guard-001', name: '2.5mm Twin & Earth Cable 100m', price: 85.0, quantity: 1, image_url: '/img/placeholder.jpg' }
]);

// ---------------------------------------------------------------------------
// Storage seeding
//
// Navigate to /en/ first so localStorage is writable, then set values.
// Omit `authHeader` for guest sessions; include it for logged-in sessions.
// ---------------------------------------------------------------------------

interface SeedOpts {
  /** Omit to simulate a guest (no auth). */
  authHeader?: string;
  lang?: 'en' | 'fa';
  withBasket?: boolean;
}

async function seedStorage(page: Page, opts: SeedOpts = {}): Promise<void> {
  const { authHeader, lang = 'en', withBasket = true } = opts;
  await page.goto('/en/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (args: { basket: string; authHeader: string; lang: string; withBasket: boolean }) => {
      if (args.authHeader) localStorage.setItem('token', args.authHeader);
      else localStorage.removeItem('token');
      if (args.withBasket) localStorage.setItem('basket', args.basket);
      else localStorage.removeItem('basket');
      localStorage.setItem('lang', args.lang);
      localStorage.setItem('localeInitialized', '1');
    },
    { basket: SAMPLE_BASKET, authHeader: authHeader ?? '', lang, withBasket }
  );
}

// ---------------------------------------------------------------------------
// Route mocks
// ---------------------------------------------------------------------------

async function mockLocaleHint(page: Page): Promise<void> {
  await page.route('**/api/locale-hint', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ defaultLang: 'en', usdToToman: 60000 }) })
  );
}

async function mockMeOk(page: Page): Promise<void> {
  await page.route('**/api/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ checkoutProfileRequired: false, checkoutProfileComplete: true, checkoutProfileMissing: [] }) })
  );
}

async function mockCheckoutExpired(page: Page): Promise<void> {
  await page.route('**/api/create-checkout-session', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json',
      body: JSON.stringify({ error: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' }) })
  );
}

async function mockCheckoutSuccess(page: Page, localePrefix = '/en'): Promise<void> {
  await page.route('**/api/create-checkout-session', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    const origin = new URL(route.request().url()).origin;
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ url: `${origin}${localePrefix}/checkout-success?session_id=guard_mock` }) });
  });
}

/** Registers a route spy that records whether the checkout endpoint was hit. */
async function spyOnCheckout(page: Page): Promise<() => boolean> {
  let called = false;
  await page.route('**/api/create-checkout-session', (route) => { called = true; void route.continue(); });
  return () => called;
}

// ---------------------------------------------------------------------------
// 1. Expired / invalid JWT session guard
// ---------------------------------------------------------------------------

test.describe('Expired / invalid JWT session guard', () => {
  test.beforeEach(async ({ page }) => {
    await mockLocaleHint(page);
    await mockMeOk(page);
    await mockCheckoutExpired(page);
  });

  test('expired token (EN) → clears auth and redirects to login', async ({ page }) => {
    await seedStorage(page, { authHeader: EXPIRED_JWT_FIXTURE });
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#reg-address').fill('123 High Street, London');
    await page.locator('#btn-checkout').click();

    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('expired token (FA locale) → clears auth and redirects to login', async ({ page }) => {
    await seedStorage(page, { authHeader: EXPIRED_JWT_FIXTURE, lang: 'fa' });
    await page.goto('/fa/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#reg-address').fill('تهران، خیابان ولیعصر، پلاک ۱۰');
    await page.locator('#btn-checkout').click();

    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });

  test('true guest (no auth) → validation error shown, stays on basket', async ({ page }) => {
    await seedStorage(page); // no authHeader → guest
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#btn-checkout').click();

    await expect(page).not.toHaveURL(/login/, { timeout: 2_000 });
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
  });
});

// ---------------------------------------------------------------------------
// 2. Guest checkout – client-side validation
// ---------------------------------------------------------------------------

test.describe('Guest checkout – client-side validation', () => {
  test.beforeEach(async ({ page }) => {
    await seedStorage(page); // guest with basket
    await mockLocaleHint(page);
  });

  test('empty basket → checkout button is disabled', async ({ page }) => {
    await seedStorage(page, { withBasket: false }); // override: no basket
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#basket-empty')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#btn-checkout')).toBeDisabled();
  });

  test('missing name → validation error, no network call', async ({ page }) => {
    const wasCalled = await spyOnCheckout(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#guest-email').fill('guest@example.com');
    await page.locator('#guest-address').fill('10 Test Lane, London');
    await page.locator('#btn-checkout').click();
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(wasCalled()).toBe(false);
  });

  test('missing email → validation error, no network call', async ({ page }) => {
    const wasCalled = await spyOnCheckout(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-address').fill('10 Test Lane, London');
    await page.locator('#btn-checkout').click();
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(wasCalled()).toBe(false);
  });

  test('invalid email format → validation error, no network call', async ({ page }) => {
    const wasCalled = await spyOnCheckout(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-email').fill('not-an-email');
    await page.locator('#guest-address').fill('10 Test Lane, London');
    await page.locator('#btn-checkout').click();
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(wasCalled()).toBe(false);
  });

  test('delivery + missing address → validation error, no network call', async ({ page }) => {
    const wasCalled = await spyOnCheckout(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();
    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-email').fill('guest@example.com');
    await page.locator('#btn-checkout').click();
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(wasCalled()).toBe(false);
  });

  test('delivery + too-short address → validation error, no network call', async ({ page }) => {
    const wasCalled = await spyOnCheckout(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();
    await page.locator('#guest-name').fill('Jane Smith');
    await page.locator('#guest-email').fill('guest@example.com');
    await page.locator('#guest-address').fill('AB'); // < 5 chars
    await page.locator('#btn-checkout').click();
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(wasCalled()).toBe(false);
  });

  test('collection mode → no address required, checkout proceeds', async ({ page }) => {
    await mockCheckoutSuccess(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="collection"]').check();
    await page.locator('#guest-name').fill('Pickup Customer');
    await page.locator('#guest-email').fill('pickup@example.com');
    await page.locator('#btn-checkout').click();
    await expect(page).toHaveURL(/checkout-success/, { timeout: 15_000 });
  });

  test('valid delivery → checkout proceeds', async ({ page }) => {
    await mockCheckoutSuccess(page);
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
// 3. Registered user – client-side delivery validation
// ---------------------------------------------------------------------------

test.describe('Registered user – client-side delivery validation', () => {
  test.beforeEach(async ({ page }) => {
    await seedStorage(page, { authHeader: EXPIRED_JWT_FIXTURE });
    await mockLocaleHint(page);
    await mockMeOk(page);
  });

  test('delivery + empty address → error before network call', async ({ page }) => {
    const wasCalled = await spyOnCheckout(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();
    await page.locator('#btn-checkout').click();
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(wasCalled()).toBe(false);
  });

  test('delivery + too-short address → error before network call', async ({ page }) => {
    const wasCalled = await spyOnCheckout(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();
    await page.locator('#reg-address').fill('A'); // < 5 chars
    await page.locator('#btn-checkout').click();
    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 5_000 });
    expect(wasCalled()).toBe(false);
  });

  test('collection mode → no address needed, checkout proceeds', async ({ page }) => {
    await mockCheckoutSuccess(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#basket-content').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="collection"]').check();
    await expect(page.locator('#registered-checkout-section')).toBeHidden({ timeout: 5_000 });
    await page.locator('#btn-checkout').click();
    await expect(page).toHaveURL(/checkout-success/, { timeout: 15_000 });
  });

  test('valid delivery address → checkout proceeds', async ({ page }) => {
    await mockCheckoutSuccess(page);
    await page.goto('/en/basket', { waitUntil: 'domcontentloaded' });
    await page.locator('#registered-checkout-section').waitFor({ state: 'visible', timeout: 10_000 });
    await page.locator('input[name="fulfillment"][value="delivery"]').check();
    await page.locator('#reg-address').fill('10 Whitechapel High Street, London');
    await page.locator('#btn-checkout').click();
    await expect(page).toHaveURL(/checkout-success/, { timeout: 15_000 });
  });
});
