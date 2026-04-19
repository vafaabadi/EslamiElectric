import { test } from '@playwright/test';
import {
  AccountPage,
  ClaimAccountPage,
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  UpdatePasswordPage
} from './pages/AuthPages.js';
import {
  BasketPage,
  CheckoutSuccessPage,
  OrderTrackPage,
  OrdersPage,
  ProfilePage
} from './pages/CommercePages.js';
import { HomePage } from './pages/HomePage.js';
import { ProductsPage } from './pages/ProductsPage.js';

/**
 * English locale routes: each test waits for async UI (loading states) to finish
 * and asserts primary content + footer are visible.
 */
test.describe('English locale: pages fully loaded', () => {
  test('home', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();
    await home.expectFullyLoaded();
  });

  test('products', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.openEnglishProducts();
    await products.expectFullyLoaded();
  });

  test('basket', async ({ page }) => {
    const basket = new BasketPage(page);
    await basket.openEnglish();
    await basket.expectFullyLoaded();
  });

  test('login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.openEnglish();
    await login.expectFullyLoaded();
  });

  test('account (sign up)', async ({ page }) => {
    const account = new AccountPage(page);
    await account.openEnglish();
    await account.expectFullyLoaded();
  });

  test('forgot password', async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.openEnglish();
    await forgot.expectFullyLoaded();
  });

  test('reset password', async ({ page }) => {
    const reset = new ResetPasswordPage(page);
    await reset.openEnglish();
    await reset.expectFullyLoaded();
  });

  test('update password', async ({ page }) => {
    const update = new UpdatePasswordPage(page);
    await update.openEnglish();
    await update.expectFullyLoaded();
  });

  test('claim account', async ({ page }) => {
    const claim = new ClaimAccountPage(page);
    await claim.openEnglish();
    await claim.expectFullyLoaded();
  });

  test('orders (guest)', async ({ page }) => {
    const orders = new OrdersPage(page);
    await orders.openEnglish();
    await orders.expectFullyLoadedGuest();
  });

  test('track order', async ({ page }) => {
    const track = new OrderTrackPage(page);
    await track.openEnglish();
    await track.expectFullyLoaded();
  });

  test('checkout success', async ({ page }) => {
    const success = new CheckoutSuccessPage(page);
    await success.openEnglish();
    await success.expectFullyLoaded();
  });

  test('profile (guest)', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.openEnglish();
    await profile.expectFullyLoadedGuest();
  });
});
