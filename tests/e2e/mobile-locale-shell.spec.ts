import { expect, test } from '@playwright/test';
import { resetShoppingBrowserState } from './helpers/storage.js';
import { HomePage } from './pages/HomePage.js';

test.describe('Responsive shell', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await resetShoppingBrowserState(page);
  });

  test('mobile menu toggles open state on home', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();
    await home.expectHomeFeedReady();

    const nav = page.locator('#header-nav');
    const toggle = page.locator('#nav-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(nav).toHaveClass(/mobile-open/);
  });
});
