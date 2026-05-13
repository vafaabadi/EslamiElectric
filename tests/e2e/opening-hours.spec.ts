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
// 1. English locale — text content
// ---------------------------------------------------------------------------

test.describe('Opening hours – English locale', () => {
  test.beforeEach(async ({ page }) => {
    await mockLocaleHint(page);
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);
  });

  test('#hours-label contains "Opening Hours"', async ({ page }) => {
    await expect(page.locator('#hours-label')).toContainText('Opening Hours');
  });

  test('#hours-weekdays contains "Saturday"', async ({ page }) => {
    await expect(page.locator('#hours-weekdays')).toContainText('Saturday');
  });

  test('#hours-friday contains "Closed"', async ({ page }) => {
    await expect(page.locator('#hours-friday')).toContainText('Closed');
  });
});

// ---------------------------------------------------------------------------
// 2. Persian locale — text content
// ---------------------------------------------------------------------------

test.describe('Opening hours – Persian locale', () => {
  test.beforeEach(async ({ page }) => {
    await mockLocaleHint(page);
    await page.goto('/fa/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);
  });

  test('#hours-label contains "ساعت کاری"', async ({ page }) => {
    await expect(page.locator('#hours-label')).toContainText('ساعت کاری');
  });

  test('#hours-weekdays contains "شنبه"', async ({ page }) => {
    await expect(page.locator('#hours-weekdays')).toContainText('شنبه');
  });

  test('#hours-friday contains "تعطیل"', async ({ page }) => {
    await expect(page.locator('#hours-friday')).toContainText('تعطیل');
  });
});

// ---------------------------------------------------------------------------
// 3. Elements are visible — both locales
// ---------------------------------------------------------------------------

test.describe('Opening hours – elements visible', () => {
  for (const locale of ['en', 'fa'] as const) {
    test.describe(`locale: ${locale}`, () => {
      test.beforeEach(async ({ page }) => {
        await mockLocaleHint(page);
        await page.goto(`/${locale}/`, { waitUntil: 'domcontentloaded' });
        await waitForHomeReady(page);
      });

      test('#hours-label is visible', async ({ page }) => {
        await expect(page.locator('#hours-label')).toBeVisible();
      });

      test('#hours-weekdays is visible', async ({ page }) => {
        await expect(page.locator('#hours-weekdays')).toBeVisible();
      });

      test('#hours-friday is visible', async ({ page }) => {
        await expect(page.locator('#hours-friday')).toBeVisible();
      });
    });
  }
});

// ---------------------------------------------------------------------------
// 4. Locale switch: EN → FA text changes correctly
// ---------------------------------------------------------------------------

test.describe('Opening hours – locale switch EN → FA', () => {
  test('text updates after navigating from /en/ to /fa/', async ({ page }) => {
    await mockLocaleHint(page);

    // Start on English home
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);

    // Verify English text
    await expect(page.locator('#hours-label')).toContainText('Opening Hours');
    await expect(page.locator('#hours-weekdays')).toContainText('Saturday');
    await expect(page.locator('#hours-friday')).toContainText('Closed');

    // Navigate to Persian home
    await page.goto('/fa/', { waitUntil: 'domcontentloaded' });
    await waitForHomeReady(page);

    // Verify Persian text
    await expect(page.locator('#hours-label')).toContainText('ساعت کاری');
    await expect(page.locator('#hours-weekdays')).toContainText('شنبه');
    await expect(page.locator('#hours-friday')).toContainText('تعطیل');
  });
});
