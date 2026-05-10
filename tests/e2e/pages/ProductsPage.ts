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

  firstAddToBasketButton() {
    return this.page.locator('.btn-add-to-basket').first();
  }

  async addFirstProductToBasket(times = 1) {
    await this.expectProductAreaReady();
    const btn = this.firstAddToBasketButton();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    for (let i = 0; i < times; i++) {
      await btn.click();
    }
  }

  async openCategoryTab(index: number) {
    const tab = this.page.locator('#category-tabs button').nth(index);
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
    }
  }

  async setSortMode(mode: 'default' | 'price_asc' | 'price_desc' | 'name_asc') {
    const sel = this.page.locator('#product-sort');
    if (await sel.isVisible().catch(() => false)) {
      await sel.selectOption(mode);
    }
  }

  async bumpFirstCardQuantityThenAdd() {
    await this.expectProductAreaReady();
    const card = this.page.locator('article[data-product-id]').first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await card.locator('.btn-qty-plus').click();
    await card.locator('.btn-qty-plus').click();
    await card.locator('.btn-add-to-basket').click();
  }
}
