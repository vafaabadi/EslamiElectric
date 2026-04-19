import { expect, type Page } from '@playwright/test';
import type { SiteLocale } from '../locale.js';
import { BasePage } from './BasePage.js';

/** Home (`/en/` or `/fa/`). */
export class HomePage extends BasePage {
  static readonly pathEn = '/en/';
  static readonly pathFa = '/fa/';

  constructor(page: Page) {
    super(page);
  }

  async openEnglishHome() {
    await this.goto(HomePage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersianHome() {
    await this.goto(HomePage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectBrandingVisible(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Eslami Electric/i);
      await expect(this.page.getByRole('heading', { name: /Eslami Electric/i }).first()).toBeVisible();
    } else {
      await expect(this.page.locator('html')).toHaveAttribute('lang', 'fa', { timeout: 15_000 });
      await expect(this.page).toHaveTitle(/الکتریکی اسلامی|Eslami Electric/i);
      await expect(this.page.locator('#site-title')).toHaveText(/الکتریکی/);
    }
  }

  async expectMainContentVisible() {
    await expect(this.page.locator('#home-main-product-area, main')).toBeVisible();
  }

  /** Home feed finished loading from `/api/products` (or error path handled). */
  async expectHomeFeedReady(loadingHiddenTimeout = 30_000) {
    await expect(this.page.locator('#loading')).toBeHidden({ timeout: loadingHiddenTimeout });
    await expect(this.page.locator('#error')).toBeHidden();
    await expect(this.page.locator('#product-search')).toBeVisible();
  }

  async expectContactSectionVisible(locale: SiteLocale = 'en') {
    await expect(this.page.locator('#contact-title')).toBeVisible();
    if (locale === 'fa') {
      await expect(this.page.locator('#contact-title')).toHaveText(/تماس/);
    }
  }

  /** Branding, main, catalog fetch, search, contact block, and footer copyright. */
  async expectFullyLoaded(locale: SiteLocale = 'en') {
    await this.expectBrandingVisible(locale);
    await this.expectMainContentVisible();
    await this.expectHomeFeedReady();
    await this.expectContactSectionVisible(locale);
    await expect(this.page.locator('[data-i18n="footer-copyright"]')).toBeVisible();
  }
}
