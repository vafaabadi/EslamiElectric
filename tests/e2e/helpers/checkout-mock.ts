import type { Page } from '@playwright/test';

/**
 * Avoids real Stripe calls in E2E. Fulfills POST /api/create-checkout-session with a redirect
 * to the localized checkout-success page (same shape as the live API).
 */
export async function mockCreateCheckoutSessionSuccess(
  page: Page,
  options: { localePrefix: '/en' | '/fa' } = { localePrefix: '/en' }
): Promise<void> {
  const prefix = options.localePrefix;
  await page.route('**/api/create-checkout-session', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const origin = new URL(route.request().url()).origin;
    const url = `${origin}${prefix}/checkout-success?session_id=e2e_mock_session`;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url })
    });
  });
}
