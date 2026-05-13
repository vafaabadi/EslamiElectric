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

function schemaOrgTypes(entry: Record<string, unknown>): string[] {
  const t = entry['@type'];
  if (Array.isArray(t)) return t.map(String);
  if (typeof t === 'string') return [t];
  return [];
}

test.describe('Home SEO meta (locale routes)', () => {
  test.beforeEach(async ({ page }) => {
    await mockLocaleHint(page);
  });

  test('English /en/ documents', async ({ page, baseURL }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });

    await expect(page).toHaveTitle(/Zahedan/);

    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveCount(1);
    const content = (await desc.getAttribute('content')) ?? '';
    expect(content.length).toBeGreaterThan(20);

    const base = new URL(baseURL ?? 'http://127.0.0.1:3000');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const canonicalHref = (await canonical.getAttribute('href')) ?? '';
    expect(canonicalHref).toBeTruthy();
    const canonicalUrl = new URL(canonicalHref);
    expect(canonicalUrl.pathname).toBe('/en/');
    expect(canonicalUrl.origin).toBe(base.origin);

    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="fa"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);

    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    expect(count).toBeGreaterThan(0);
    let foundBusinessLike = false;
    for (let i = 0; i < count; i++) {
      const txt = await scripts.nth(i).textContent();
      expect(txt?.trim().length).toBeGreaterThan(2);
      const data = JSON.parse(txt ?? '{}') as Record<string, unknown>;
      const types = schemaOrgTypes(data);
      const isBusinessLike = types.some(
        (ty) =>
          ty === 'LocalBusiness' ||
          ty === 'Store' ||
          ty === 'ElectronicsStore'
      );
      if (isBusinessLike) {
        foundBusinessLike = true;
        const tel = typeof data.telephone === 'string' ? data.telephone : '';
        const geo = data.geo as Record<string, unknown> | undefined;
        expect(tel.length > 2 || typeof geo?.latitude === 'number').toBeTruthy();
      }
    }
    expect(foundBusinessLike).toBe(true);
  });

  test('Persian /fa/ documents', async ({ page, baseURL }) => {
    await page.goto('/fa/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });

    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page).toHaveTitle(/الکتریکی اسلامی|زاهدان/);

    const desc = page.locator('meta[name="description"]');
    await expect(desc).toHaveCount(1);
    const content = (await desc.getAttribute('content')) ?? '';
    expect(content.length).toBeGreaterThan(20);

    const base = new URL(baseURL ?? 'http://127.0.0.1:3000');
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    const canonicalHref = (await canonical.getAttribute('href')) ?? '';
    expect(canonicalHref).toBeTruthy();
    const canonicalUrl = new URL(canonicalHref);
    expect(canonicalUrl.pathname).toBe('/fa/');
    expect(canonicalUrl.origin).toBe(base.origin);

    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="fa"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);

    const scripts = page.locator('script[type="application/ld+json"]');
    const count = await scripts.count();
    let parsedOk = false;
    for (let i = 0; i < count; i++) {
      const txt = await scripts.nth(i).textContent();
      const data = JSON.parse(txt ?? '{}') as Record<string, unknown>;
      const types = schemaOrgTypes(data);
      if (types.some((t) => t === 'LocalBusiness' || t === 'ElectronicsStore')) {
        parsedOk = true;
        break;
      }
    }
    expect(parsedOk).toBe(true);
  });
});
