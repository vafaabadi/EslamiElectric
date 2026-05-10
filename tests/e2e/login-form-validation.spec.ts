import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/AuthPages.js';

test.describe('Login form client validation', () => {
  test('empty submit shows an inline error without calling home', async ({ page }) => {
    const login = new LoginPage(page);
    await login.openEnglish();
    await login.expectFullyLoaded('en');

    await page.locator('#login-form').evaluate((f) => f.setAttribute('novalidate', 'novalidate'));
    await page.locator('#email').fill('');
    await page.locator('#password').fill('');
    await page.locator('#submit-btn').click();

    const msg = page.locator('#login-message');
    await expect(msg).toBeVisible();
    await expect(msg).toHaveClass(/text-red-600/);
    await expect(msg).not.toBeEmpty();
    await expect(page).toHaveURL(/\/en\/login/i);
  });
});
