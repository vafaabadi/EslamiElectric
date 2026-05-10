import { expect, test } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';

test.describe('Home navigation extras', () => {
  test('View all products reaches the catalog', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();
    await home.expectHomeFeedReady();

    const viewAll = page.locator('#home-view-all');
    await expect(viewAll).toBeVisible({ timeout: 15_000 });
    await viewAll.click();
    await expect(page).toHaveURL(/\/en\/products/i);
  });

  test('Back to top scrolls toward the top of the page', async ({ page }) => {
    await page.goto('/en/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });

    await page.evaluate(() => window.scrollTo(0, 800));
    const btn = page.locator('#back-to-top');
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await btn.click();
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeLessThan(200);
  });
});
