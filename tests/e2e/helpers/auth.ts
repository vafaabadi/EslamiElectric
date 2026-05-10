import { expect, type Page } from '@playwright/test';

export function getE2ECredentials(): { email: string | undefined; password: string | undefined } {
  return {
    email: process.env.E2E_TEST_USER_EMAIL?.trim(),
    password: process.env.E2E_TEST_USER_PASSWORD?.trim()
  };
}

/** Email/password login against Supabase-backed `/api/login`; lands on English home. */
export async function loginAsTestUser(page: Page): Promise<void> {
  const { email, password } = getE2ECredentials();
  if (!email || !password) {
    throw new Error('Set E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD for this test.');
  }

  await page.goto('/en/login.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#login-form')).toBeVisible();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#submit-btn').click();

  await expect(page).toHaveURL(/\/en\/?$/, { timeout: 30_000 });
}
