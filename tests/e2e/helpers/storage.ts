import type { Page } from '@playwright/test';

/**
 * Clears basket + checkout session keys on the real origin. Call once per test in `beforeEach`
 * (do not use `page.addInitScript` for this — that runs on every navigation and wipes the basket).
 */
export async function resetShoppingBrowserState(
  page: Page,
  options: { alsoLogout?: boolean } = {}
): Promise<void> {
  await page.goto('/en/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((logout) => {
    localStorage.removeItem('basket');
    sessionStorage.removeItem('pendingCheckoutOrderId');
    sessionStorage.removeItem('pendingCheckoutOrderLabel');
    if (logout) localStorage.removeItem('token');
  }, options.alsoLogout === true);
}
