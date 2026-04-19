import { expect, type Page } from '@playwright/test';
import type { SiteLocale } from '../locale.js';
import { BasePage } from './BasePage.js';
import { SiteLayout } from './SiteLayout.js';

/** Products listing (`/en/products.html` or `/fa/products.html`). */
export class ProductsPage extends BasePage {
  static readonly pathEn = '/en/products.html';
  static readonly pathFa = '/fa/products.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglishProducts() {
    await this.goto(ProductsPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersianProducts() {
    await this.goto(ProductsPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  private errorBanner() {
    return this.page.locator('#error');
  }

  async expectHeadingVisible(locale: SiteLocale = 'en', timeout = 20_000) {
    const title = this.page.locator('#page-title');
    await expect(title).toBeVisible({ timeout });
    if (locale === 'fa') {
      await expect(title).toHaveText(/محصولات/);
    }
  }

  /** Assert categories finished loading (no stuck spinner, no error banner). */
  async expectCategoriesLoaded(loadingHiddenTimeout = 25_000) {
    await expect(this.errorBanner()).toBeHidden();
    await expect(this.page.locator('#loading')).toBeHidden({ timeout: loadingHiddenTimeout });
  }

  /**
   * Categories API done: tabs + product grid (or empty states). Assumes `expectCategoriesLoaded` already ran.
   */
  async expectProductAreaReady() {
    const noCat = this.page.locator('#no-categories');
    const firstTab = this.page.locator('#category-tabs button').first();
    await expect
      .poll(async () => (await noCat.isVisible()) || (await firstTab.isVisible()), {
        timeout: 20_000
      })
      .toBeTruthy();
    if (await noCat.isVisible()) return;
    await expect(firstTab).toBeVisible();
    const grid = this.page.locator('#products-grid');
    const noProducts = this.page.locator('#no-products');
    await expect
      .poll(async () => (await grid.isVisible()) || (await noProducts.isVisible()), {
        timeout: 20_000
      })
      .toBeTruthy();
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    await this.expectHeadingVisible(locale);
    await this.expectCategoriesLoaded();
    await expect(this.page.locator('#products-page-main')).toBeVisible();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
    await this.expectProductAreaReady();
  }
}
