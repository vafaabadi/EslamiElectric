import { expect, type APIRequestContext, type Page } from '@playwright/test';

export function getE2ECredentials(): { email: string | undefined; password: string | undefined } {
  return {
    email: process.env.E2E_TEST_USER_EMAIL?.trim(),
    password: process.env.E2E_TEST_USER_PASSWORD?.trim()
  };
}

export function getAdminE2ECredentials(): { email: string | undefined; password: string | undefined } {
  return {
    email: process.env.E2E_ADMIN_EMAIL?.trim(),
    password: process.env.E2E_ADMIN_PASSWORD?.trim()
  };
}

/** POST /api/login → app JWT (same token shape as the shop login form). */
export async function fetchAppJwtViaPasswordLogin(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const res = await request.fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({ email: email.trim().toLowerCase(), password })
  });
  const raw = await res.text();
  let body: { token?: string; error?: string };
  try {
    body = JSON.parse(raw) as { token?: string; error?: string };
  } catch {
    throw new Error(`Login response not JSON (${res.status()}): ${raw.slice(0, 240)}`);
  }
  if (!res.ok() || !body.token) {
    throw new Error(`Login failed (${res.status()}): ${body.error || raw.slice(0, 240)}`);
  }
  return body.token;
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

/** Admin login (requires E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD). */
export async function loginAsAdminUser(page: Page): Promise<void> {
  const { email, password } = getAdminE2ECredentials();
  if (!email || !password) {
    throw new Error('Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for this test.');
  }

  await page.goto('/en/login.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#login-form')).toBeVisible();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#submit-btn').click();

  await expect(page).toHaveURL(/\/en\/?$/, { timeout: 30_000 });
}
