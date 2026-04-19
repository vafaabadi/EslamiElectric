import { expect, type Page } from '@playwright/test';
import type { SiteLocale } from '../locale.js';
import { BasePage } from './BasePage.js';
import { SiteLayout } from './SiteLayout.js';

export class BasketPage extends BasePage {
  static readonly pathEn = '/en/basket.html';
  static readonly pathFa = '/fa/basket.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(BasketPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(BasketPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Basket/i);
      await expect(this.page.locator('#page-title')).toHaveText(/Your Basket/);
    } else {
      await expect(this.page).toHaveTitle(/سبد خرید|Basket/i);
      await expect(this.page.locator('#page-title')).toHaveText(/سبد خرید شما/);
    }
    const empty = this.page.locator('#basket-empty');
    const content = this.page.locator('#basket-content');
    await expect
      .poll(async () => (await empty.isVisible()) || (await content.isVisible()), {
        timeout: 25_000
      })
      .toBeTruthy();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class OrdersPage extends BasePage {
  static readonly pathEn = '/en/orders.html';
  static readonly pathFa = '/fa/orders.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(OrdersPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(OrdersPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoadedGuest(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/My Orders/i);
      await expect(this.page.locator('#page-title')).toHaveText(/My Orders/);
    } else {
      await expect(this.page).toHaveTitle(/سفارشات من|My Orders/i);
      await expect(this.page.locator('#page-title')).toHaveText(/سفارشات من/);
    }
    await expect(this.page.locator('#orders-loading')).toBeHidden({ timeout: 30_000 });
    await expect(this.page.locator('#orders-login-required')).toBeVisible();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class OrderTrackPage extends BasePage {
  static readonly pathEn = '/en/order.html';
  static readonly pathFa = '/fa/order.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(OrderTrackPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(OrderTrackPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Track Order/i);
      await expect(this.page.locator('#page-title')).toHaveText(/Track your order/);
    } else {
      await expect(this.page).toHaveTitle(/پیگیری سفارش|Track Order/i);
      await expect(this.page.locator('#page-title')).toHaveText(/پیگیری سفارش شما/);
    }
    await expect(this.page.locator('#finder-section')).toBeVisible();
    await expect(this.page.locator('#finder-form')).toBeVisible();
    await expect(this.page.locator('#order-loading')).toBeHidden();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class CheckoutSuccessPage extends BasePage {
  static readonly pathEn = '/en/checkout-success.html';
  static readonly pathFa = '/fa/checkout-success.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(CheckoutSuccessPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(CheckoutSuccessPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Payment Successful/i);
      await expect(this.page.locator('#success-title')).toHaveText(/Payment successful/);
    } else {
      await expect(this.page).toHaveTitle(/پرداخت موفق|Payment Successful/i);
      await expect(this.page.locator('#success-title')).toHaveText(/پرداخت با موفقیت انجام شد/);
    }
    await expect(this.page.locator('#success-thanks')).toBeVisible();
    await expect(this.page.locator('#link-home')).toBeVisible();
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class ProfilePage extends BasePage {
  static readonly pathEn = '/en/profile.html';
  static readonly pathFa = '/fa/profile.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(ProfilePage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(ProfilePage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoadedGuest(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/My Profile/i);
      await expect(this.page.locator('#page-title')).toHaveText(/My Profile/);
    } else {
      await expect(this.page).toHaveTitle(/پروفایل من|My Profile/i);
      await expect(this.page.locator('#page-title')).toHaveText(/پروفایل من/);
    }
    await expect(this.page.locator('#profile-loading')).toBeHidden({ timeout: 30_000 });
    await expect(this.page.locator('#profile-redirect')).toBeVisible();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}
