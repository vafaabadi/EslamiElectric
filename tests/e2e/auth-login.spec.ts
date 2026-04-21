import { expect, test } from '@playwright/test';
import { LoginPage } from './pages/AuthPages.js';
import { HomePage } from './pages/HomePage.js';

test.describe('Auth: email/password login (E2E creds)', () => {
  test('logs in and reaches English home', async ({ page }) => {
    // GitHub "Repository secrets" often store a trailing newline when the value was pasted — trim both.
    const email = process.env.E2E_TEST_USER_EMAIL?.trim();
    const password = process.env.E2E_TEST_USER_PASSWORD?.trim();
    test.skip(
      !email || !password,
      'Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD (e.g. in .env or GitHub Actions secrets).'
    );

    const login = new LoginPage(page);
    await login.openEnglish();
    await expect(page.locator('#login-form')).toBeVisible();

    await page.locator('#email').fill(email!);
    await page.locator('#password').fill(password!);
    await page.locator('#submit-btn').click();

    // If this fails with "Invalid email or password": re-save GitHub secrets without a trailing newline, and ensure the user exists in the Supabase project behind SUPABASE_URL for CI.
    await expect(page.locator('#login-message')).toContainText(/Login successful|Redirecting/i, {
      timeout: 20_000
    });

    await expect(page).toHaveURL(/\/en\/?$/, { timeout: 15_000 });
    const home = new HomePage(page);
    await home.expectBrandingVisible('en');
  });
});
