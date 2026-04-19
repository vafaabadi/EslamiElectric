import { expect, type Page } from '@playwright/test';
import type { SiteLocale } from '../locale.js';

/** Shared header/footer checks for locale pages that use the standard chrome. */
export class SiteLayout {
  static async expectSiteBrandInHeader(page: Page, locale: SiteLocale = 'en') {
    await expect(page.locator('#site-title').first()).toBeVisible();
    if (locale === 'en') {
      await expect(page.getByRole('heading', { name: 'Eslami Electric' }).first()).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: /الکتریکی/ }).first()).toBeVisible();
    }
  }

  static async expectFooterI18n(page: Page) {
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
    await expect(footer.locator('[data-i18n="footer-copyright"]')).toBeVisible();
  }
}
