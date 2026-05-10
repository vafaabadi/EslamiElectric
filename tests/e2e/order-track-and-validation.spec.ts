import { expect, test } from '@playwright/test';
import { resetShoppingBrowserState } from './helpers/storage.js';
import { OrderTrackPage } from './pages/CommercePages.js';

test.describe('Order tracking and checkout validation', () => {
  test.beforeEach(async ({ page }) => {
    await resetShoppingBrowserState(page, { alsoLogout: true });
  });

  test('track order finder submits and surfaces not-found for nonsense ids', async ({ page }) => {
    const track = new OrderTrackPage(page);
    await track.openEnglish();
    await track.expectFullyLoaded('en');

    await page.locator('#finder-email').fill('no-such-buyer@example.com');
    await page.locator('#finder-order-id').fill('ORD-FAKE-NOT-REAL');
    await page.locator('#finder-submit').click();

    await expect
      .poll(async () => {
        const notFound = await page.locator('#order-not-found').isVisible();
        const err = await page.locator('#finder-error').isVisible();
        return notFound || err;
      })
      .toBeTruthy();
  });

  test('guest basket: missing email shows checkout validation error', async ({ page }) => {
    await page.goto('/en/products.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#loading')).toBeHidden({ timeout: 30_000 });
    await page.locator('.btn-add-to-basket').first().click();

    await page.goto('/en/basket.html', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#basket-content')).toBeVisible({ timeout: 20_000 });
    await page.locator('input[name="fulfillment"][value="collection"]').check();
    await page.locator('#guest-name').fill('No Email User');
    await page.locator('#guest-email').fill('');
    await page.locator('#btn-checkout').click();

    await expect(page.locator('#checkout-error')).toBeVisible({ timeout: 12_000 });
    await expect(page.locator('#checkout-error')).not.toBeEmpty();
  });
});
