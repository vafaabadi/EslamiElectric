import { expect, test } from '@playwright/test';
import { getE2ECredentials, loginAsTestUser } from './helpers/auth.js';
import { resetShoppingBrowserState } from './helpers/storage.js';
import { OrdersPage, ProfilePage } from './pages/CommercePages.js';

test.describe('Authenticated shell: orders & profile', () => {
  test.beforeEach(async ({ page }) => {
    await resetShoppingBrowserState(page, { alsoLogout: true });
  });

  test('after login, orders page is not the guest gate', async ({ page }) => {
    const { email, password } = getE2ECredentials();
    test.skip(!email || !password, 'Requires E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD');

    await loginAsTestUser(page);
    const orders = new OrdersPage(page);
    await orders.openEnglish();
    await orders.expectLoadedWhenAuthenticated('en');
  });

  test('after login, profile form is available', async ({ page }) => {
    const { email, password } = getE2ECredentials();
    test.skip(!email || !password, 'Requires E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD');

    await loginAsTestUser(page);
    const profile = new ProfilePage(page);
    await profile.openEnglish();
    await profile.expectLoadedWhenAuthenticated('en');
  });

  test('header shows logout when authenticated', async ({ page }) => {
    const { email, password } = getE2ECredentials();
    test.skip(!email || !password, 'Requires E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD');

    await loginAsTestUser(page);
    await expect(page.locator('#nav-logout')).toBeVisible();
    await expect(page.locator('#nav-login')).toBeHidden();
  });
});
