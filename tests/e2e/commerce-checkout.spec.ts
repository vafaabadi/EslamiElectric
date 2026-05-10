import { expect, test } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import { getE2ECredentials, loginAsTestUser } from './helpers/auth.js';
import { mockCreateCheckoutSessionSuccess } from './helpers/checkout-mock.js';
import { skipWhenCheckoutBlockedByProfile } from './helpers/profile-gate.js';
import { resetShoppingBrowserState } from './helpers/storage.js';
import { BasketPage, CheckoutSuccessPage } from './pages/CommercePages.js';
import { ProductsPage } from './pages/ProductsPage.js';

test.describe('Checkout journeys (Stripe mocked)', () => {
  test.describe('guest', () => {
    test.beforeEach(async ({ page }) => {
      await resetShoppingBrowserState(page, { alsoLogout: true });
    });

    test('adds from catalog, basket review, guest delivery, proceeds to success', async ({ page }) => {
      await mockCreateCheckoutSessionSuccess(page, { localePrefix: '/en' });

      const products = new ProductsPage(page);
      await products.openEnglishProducts();
      await products.addFirstProductToBasket(2);

      const basket = new BasketPage(page);
      await basket.openEnglish();
      await basket.expectNonEmptyBasket();
      await expect(page.locator('#basket-total')).not.toHaveText('$0.00');

      await basket.chooseFulfillment('delivery');
      await basket.fillGuestContactAndAddress({
        name: 'E2E Guest',
        email: 'e2e-guest@example.com',
        address: '123 Integration Test Street, Zahedan'
      });

      await expect(page.locator('#btn-checkout')).toBeEnabled({ timeout: 25_000 });
      await basket.clickProceedToCheckout();

      await page.waitForURL(/\/en\/checkout-success\?session_id=/, { timeout: 25_000 });
      const done = new CheckoutSuccessPage(page);
      await done.expectFullyLoaded('en');
    });

    test('guest collection skips street address and completes checkout', async ({ page }) => {
      await mockCreateCheckoutSessionSuccess(page, { localePrefix: '/en' });

      const products = new ProductsPage(page);
      await products.openEnglishProducts();
      await products.bumpFirstCardQuantityThenAdd();

      const basket = new BasketPage(page);
      await basket.openEnglish();
      await basket.expectNonEmptyBasket();
      await basket.chooseFulfillment('collection');
      await basket.fillGuestContactAndAddress({
        name: 'Pickup Customer',
        email: 'pickup@example.com'
      });

      await expect(page.locator('#btn-checkout')).toBeEnabled({ timeout: 25_000 });
      await basket.clickProceedToCheckout();
      await page.waitForURL(/\/en\/checkout-success\?session_id=/, { timeout: 25_000 });
      await expect(page.locator('#success-title')).toBeVisible();
    });

    test('Persian locale: guest collection reaches checkout success', async ({ page }) => {
      await mockCreateCheckoutSessionSuccess(page, { localePrefix: '/fa' });

      const products = new ProductsPage(page);
      await products.openPersianProducts();
      await products.addFirstProductToBasket(1);

      const basket = new BasketPage(page);
      await basket.openPersian();
      await basket.expectFullyLoaded('fa');
      await basket.expectNonEmptyBasket();
      await basket.chooseFulfillment('collection');
      await basket.fillGuestContactAndAddress({
        name: 'کاربر تست',
        email: 'fa-guest@example.com'
      });
      await expect(page.locator('#btn-checkout')).toBeEnabled({ timeout: 25_000 });
      await basket.clickProceedToCheckout();
      await page.waitForURL(/\/fa\/checkout-success\?session_id=/, { timeout: 25_000 });
      await expect(page.locator('#success-title')).toBeVisible();
    });
  });

  test.describe('signed-in user', () => {
    test.beforeEach(async ({ page }) => {
      await resetShoppingBrowserState(page, { alsoLogout: true });
    });

    test('collection checkout without delivery address fields', async ({ page }, testInfo: TestInfo) => {
      const { email, password } = getE2ECredentials();
      test.skip(!email || !password, 'Requires E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD');

      await mockCreateCheckoutSessionSuccess(page, { localePrefix: '/en' });
      await loginAsTestUser(page);

      const products = new ProductsPage(page);
      await products.openEnglishProducts();
      await products.openCategoryTab(1);
      await products.addFirstProductToBasket(1);

      const basket = new BasketPage(page);
      await basket.openEnglish();
      await basket.expectNonEmptyBasket();
      await basket.chooseFulfillment('collection');

      await expect(page.locator('#registered-checkout-section')).toBeHidden();
      await skipWhenCheckoutBlockedByProfile(page, testInfo);
      await expect(page.locator('#btn-checkout')).toBeEnabled({ timeout: 15_000 });
      await basket.clickProceedToCheckout();
      await page.waitForURL(/\/en\/checkout-success\?session_id=/, { timeout: 25_000 });
      await expect(page.locator('#success-thanks')).toBeVisible();
    });

    test('delivery checkout uses registered address block', async ({ page }, testInfo: TestInfo) => {
      const { email, password } = getE2ECredentials();
      test.skip(!email || !password, 'Requires E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD');

      await mockCreateCheckoutSessionSuccess(page, { localePrefix: '/en' });
      await loginAsTestUser(page);

      const products = new ProductsPage(page);
      await products.openEnglishProducts();
      await products.addFirstProductToBasket(1);

      const basket = new BasketPage(page);
      await basket.openEnglish();
      await basket.expectNonEmptyBasket();
      await basket.chooseFulfillment('delivery');
      await expect(page.locator('#registered-checkout-section')).toBeVisible({ timeout: 15_000 });
      await basket.fillRegisteredDeliveryAddress('456 Delivery Row, Test City 99999');

      await skipWhenCheckoutBlockedByProfile(page, testInfo);
      await expect(page.locator('#btn-checkout')).toBeEnabled({ timeout: 15_000 });
      await basket.clickProceedToCheckout();
      await page.waitForURL(/\/en\/checkout-success\?session_id=/, { timeout: 25_000 });
      const done = new CheckoutSuccessPage(page);
      await done.expectFullyLoaded('en');
    });
  });
});
