import { expect, type Page } from '@playwright/test';
import type { SiteLocale } from '../locale.js';
import { BasePage } from './BasePage.js';
import { SiteLayout } from './SiteLayout.js';

export class LoginPage extends BasePage {
  static readonly pathEn = '/en/login.html';
  static readonly pathFa = '/fa/login.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(LoginPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(LoginPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Log In/i);
      await expect(this.page.locator('#form-title')).toHaveText(/Log In/i);
    } else {
      await expect(this.page).toHaveTitle(/ورود|Log In/i);
      await expect(this.page.locator('#form-title')).toHaveText(/ورود/);
    }
    await expect(this.page.locator('#login-form')).toBeVisible();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class AccountPage extends BasePage {
  static readonly pathEn = '/en/account.html';
  static readonly pathFa = '/fa/account.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(AccountPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(AccountPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Create Account/i);
      await expect(this.page.locator('#form-title')).toHaveText(/Create an Account/);
    } else {
      await expect(this.page).toHaveTitle(/ایجاد حساب|Create Account/i);
      await expect(this.page.locator('#form-title')).toHaveText(/ایجاد حساب کاربری/);
    }
    await expect(this.page.locator('#account-form')).toBeVisible();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class ForgotPasswordPage extends BasePage {
  static readonly pathEn = '/en/forgot-password.html';
  static readonly pathFa = '/fa/forgot-password.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(ForgotPasswordPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(ForgotPasswordPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Forgot Password/i);
      await expect(this.page.locator('#form-title')).toHaveText(/Forgot Password/);
    } else {
      await expect(this.page).toHaveTitle(/فراموشی|Forgot Password/i);
      await expect(this.page.locator('#form-title')).toHaveText(/فراموشی رمز عبور/);
    }
    await expect(this.page.locator('#forgot-form')).toBeVisible();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class ResetPasswordPage extends BasePage {
  static readonly pathEn = '/en/reset-password.html';
  static readonly pathFa = '/fa/reset-password.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(ResetPasswordPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(ResetPasswordPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Reset Password/i);
      await expect(this.page.locator('#form-title')).toHaveText(/Reset Password/);
    } else {
      await expect(this.page).toHaveTitle(/تنظیم رمز|بازنشانی|Reset Password/i);
      await expect(this.page.locator('#form-title')).toHaveText(/بازنشانی رمز عبور/);
    }
    const resetForm = this.page.locator('#reset-form');
    const invalidToken = this.page.locator('#invalid-token-msg');
    await expect
      .poll(async () => (await resetForm.isVisible()) || (await invalidToken.isVisible()), {
        timeout: 15_000
      })
      .toBeTruthy();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class UpdatePasswordPage extends BasePage {
  static readonly pathEn = '/en/update-password.html';
  static readonly pathFa = '/fa/update-password.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(UpdatePasswordPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(UpdatePasswordPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Update Password/i);
      await expect(this.page.locator('#form-title')).toHaveText(/Update Password/);
    } else {
      await expect(this.page).toHaveTitle(/به‌روزرسانی|Update Password/i);
      await expect(this.page.locator('#form-title')).toHaveText(/به‌روزرسانی رمز عبور/);
    }
    const noSession = this.page.locator('#no-session');
    const updateForm = this.page.locator('#update-form');
    await expect
      .poll(async () => (await noSession.isVisible()) || (await updateForm.isVisible()), {
        timeout: 25_000
      })
      .toBeTruthy();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}

export class ClaimAccountPage extends BasePage {
  static readonly pathEn = '/en/claim-account.html';
  static readonly pathFa = '/fa/claim-account.html';

  constructor(page: Page) {
    super(page);
  }

  async openEnglish() {
    await this.goto(ClaimAccountPage.pathEn, { waitUntil: 'domcontentloaded' });
  }

  async openPersian() {
    await this.goto(ClaimAccountPage.pathFa, { waitUntil: 'domcontentloaded' });
  }

  async expectFullyLoaded(locale: SiteLocale = 'en') {
    if (locale === 'en') {
      await expect(this.page).toHaveTitle(/Claim Account/i);
      await expect(this.page.locator('#form-title')).toHaveText(/Claim your account/);
    } else {
      await expect(this.page).toHaveTitle(/تکمیل حساب|ادعای حساب|Claim Account/i);
      await expect(this.page.locator('#form-title')).toHaveText(/ادعای حساب کاربری/);
    }
    const claimForm = this.page.locator('#claim-form');
    const invalidMsg = this.page.locator('#invalid-msg');
    await expect
      .poll(async () => (await claimForm.isVisible()) || (await invalidMsg.isVisible()), {
        timeout: 20_000
      })
      .toBeTruthy();
    await SiteLayout.expectSiteBrandInHeader(this.page, locale);
    await SiteLayout.expectFooterI18n(this.page);
  }
}
