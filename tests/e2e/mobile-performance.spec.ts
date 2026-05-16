import { expect, test, type Page } from '@playwright/test';

async function mockLocaleHint(page: Page): Promise<void> {
  await page.route('**/api/locale-hint', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ defaultLang: 'en', usdToToman: 60000 })
    })
  );
}

function assertCacheControlIndicatesStaticAsset(headers: Record<string, string>): void {
  const raw = headers['cache-control'];
  expect(raw && raw.length > 0).toBeTruthy();
  const cc = raw!.toLowerCase();
  expect(cc.includes('max-age')).toBeTruthy();
  /** Local `node server.js` often runs without `NODE_ENV=development`, so immutable long-cache applies. */
  const longCacheReady = /\bimmutable\b/.test(cc) || /^public,\s*max-age=\d{4,}\b/.test(cc);
  const devShort = cc.includes('max-age=0') && cc.includes('must-revalidate');
  expect(longCacheReady || devShort).toBeTruthy();
}

test.describe('Mobile-facing performance semantics', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await mockLocaleHint(page);
  });

  test('English home: viewport meta, preconnect/preload cues, hero image prioritization', async ({
    page,
    request
  }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);

    await expect(page.locator('link[rel="preconnect"][href*="cdn.jsdelivr.net"]').first()).toBeAttached();

    const heroPreload = page.locator('link[rel="preload"][as="image"]');
    await expect(heroPreload).toHaveCount(1);
    await expect(heroPreload).toHaveAttribute('href', /\.jpg$/);
    await expect(heroPreload).toHaveAttribute('fetchpriority', 'high');

    await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });

    /** Home `#product-grid` is the catalogue sample on `/en/` / `/fa/`. */
    const images = page.locator('#product-grid img.product-card-img');
    await expect(images.first()).toBeVisible({ timeout: 20_000 });
    const total = await images.count();
    expect(total).toBeGreaterThanOrEqual(2);

    await expect(images.first()).toHaveAttribute('fetchpriority', 'high');
    await expect(images.first()).toHaveAttribute('loading', 'eager');
    await expect(images.first()).toHaveAttribute('decoding', 'async');

    const lazyBeyondFirst = await images.evaluateAll((imgs) =>
      imgs.slice(1).filter((img) => img.getAttribute('loading') === 'lazy')
    );
    expect(lazyBeyondFirst.length).toBe(total - 1);

    assertCacheControlIndicatesStaticAsset((await request.head('/css/tailwind.css')).headers());
  });

  test('Persian home: viewport + non-hero catalogue images are lazy-loaded', async ({ page }) => {
    await page.goto('/fa/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
    await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });

    const imgs = page.locator('#product-grid img.product-card-img');
    await expect(imgs.first()).toBeVisible({ timeout: 20_000 });
    const n = await imgs.count();
    if (n <= 1) return;
    for (let i = 1; i < n; i++) {
      await expect(imgs.nth(i)).toHaveAttribute('loading', 'lazy');
    }
  });

  test('Products page (English): viewport and grid prefers lazy loads after first tile', async ({ page }) => {
    await page.goto('/en/products', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);

    await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });
    await expect(page.locator('#products-grid:not(.hidden)')).toBeVisible({ timeout: 25_000 });

    const imgs = page.locator('#products-grid img.product-card-img');
    const count = await imgs.count();
    if (count < 2) return;

    await expect(imgs.first()).toHaveAttribute('fetchpriority', 'high');
    for (let i = 1; i < count; i++) {
      await expect(imgs.nth(i)).toHaveAttribute('loading', 'lazy');
    }
  });
});
