import type { Page, TestInfo } from '@playwright/test';

/** Skip when the basket disables Pay because `/api/me` reports an incomplete checkout profile. */
export async function skipWhenCheckoutBlockedByProfile(page: Page, testInfo: TestInfo): Promise<void> {
  const btn = page.locator('#btn-checkout');
  await btn.waitFor({ state: 'visible', timeout: 20_000 });
  if (!(await btn.isDisabled())) return;
  const title = (await btn.getAttribute('title')) || '';
  if (/profile|first name|surname|mobile|email|My Profile/i.test(title)) {
    testInfo.skip(true, `Complete the E2E user's profile (name, mobile, email) or use a different account: ${title}`);
  }
}
