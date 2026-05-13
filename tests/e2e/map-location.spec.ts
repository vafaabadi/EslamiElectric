import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
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

/** Wait for the home page loading spinner to disappear. */
async function waitForHomeReady(page: Page): Promise<void> {
  await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });
}

// ---------------------------------------------------------------------------
// 1. Map section visible on /en/
// ---------------------------------------------------------------------------

test.describe('Map location – section visible', () => {
  test.beforeEach(async ({ page }) => {
    await mockLocaleHint(page);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);
  });

  test('#map-section is visible on /en/', async ({ page }) => {
    await expect(page.locator('#map-section')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. English locale — text content
// ---------------------------------------------------------------------------

test.describe('Map location – English locale', () => {
  test.beforeEach(async ({ page }) => {
    await mockLocaleHint(page);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);
  });

  test('#map-heading contains "Find Us" on /en/', async ({ page }) => {
    await expect(page.locator('#map-heading')).toContainText('Find Us');
  });

  test('#map-view-card is visible in the DOM', async ({ page }) => {
    await expect(page.locator('#map-view-card')).toBeVisible();
  });

  test('#map-view-card shows shop name "Eslami Electric"', async ({ page }) => {
    await expect(page.locator('#map-view-card')).toContainText('Eslami Electric');
  });

  test('#map-address shows English address hints on /en/', async ({ page }) => {
    const address = page.locator('#map-address');
    await expect(address).toBeVisible();
    await expect(address).toContainText('Zahedan');
    await expect(address).toContainText('Iran');
  });

  test('#map-hours shows English hours hints on /en/', async ({ page }) => {
    const hours = page.locator('#map-hours');
    await expect(hours).toBeVisible();
    await expect(hours).toContainText('Sat');
    await expect(hours).toContainText('9:00');
  });

  test('#map-link has correct href containing coordinates', async ({ page }) => {
    const href = await page.locator('#map-link').getAttribute('href');
    expect(href).toContain('29.495104');
    expect(href).toContain('60.869775');
  });
});

// ---------------------------------------------------------------------------
// 3. Persian locale — text content
// ---------------------------------------------------------------------------

test.describe('Map location – Persian locale', () => {
  test.beforeEach(async ({ page }) => {
    await mockLocaleHint(page);
    await page.goto('/fa/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);
  });

  test('#map-heading contains "موقعیت ما" on /fa/', async ({ page }) => {
    await expect(page.locator('#map-heading')).toContainText('موقعیت ما');
  });

  test('#map-address shows Persian address fragments on /fa/', async ({ page }) => {
    const address = page.locator('#map-address');
    await expect(address).toBeVisible();
    await expect(address).toContainText('زاهدان');
    await expect(address).toContainText('آزادی');
  });

  test('#map-hours shows Persian hours fragments on /fa/', async ({ page }) => {
    const hours = page.locator('#map-hours');
    await expect(hours).toBeVisible();
    await expect(hours).toContainText('شنبه');
    await expect(hours).toContainText('صبح');
  });
});

// ---------------------------------------------------------------------------
// 4. Locale switch: EN heading → FA heading
// ---------------------------------------------------------------------------

test.describe('Map location – locale switch EN → FA', () => {
  test('heading updates after navigating from /en/ to /fa/', async ({ page }) => {
    await mockLocaleHint(page);

    // Start on English home
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);

    // Verify English heading
    await expect(page.locator('#map-heading')).toContainText('Find Us');

    // Navigate to Persian home
    await page.goto('/fa/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);

    // Verify Persian heading
    await expect(page.locator('#map-heading')).toContainText('موقعیت ما');

    await expect(page.locator('#map-address')).toContainText('زاهدان');
    await expect(page.locator('#map-hours')).toContainText('شنبه');
  });
});
