import { expect, test } from '@playwright/test';
import { getE2ECredentials, loginAsTestUser } from './helpers/auth.js';
import { HomePage } from './pages/HomePage.js';

test.describe('Auth: email/password login (E2E creds)', () => {
  test.slow();

  test('logs in and reaches English home', async ({ page }) => {
    const { email, password } = getE2ECredentials();
    test.skip(
      !email || !password,
      'Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD (e.g. in .env or GitHub Actions secrets).'
    );

    await loginAsTestUser(page);
    const home = new HomePage(page);
    await home.expectBrandingVisible('en');
  });
});
