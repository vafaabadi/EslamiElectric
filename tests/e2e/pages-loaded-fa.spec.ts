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

/** Persian (`/fa/...`) routes: same coverage as `pages-loaded.spec.ts` for English. */
test.describe('Persian locale: pages fully loaded', () => {
  test('home', async ({ page }) => {
    const home = new HomePage(page);
    await home.openPersianHome();
    await home.expectFullyLoaded('fa');
  });

  test('products', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.openPersianProducts();
    await products.expectFullyLoaded('fa');
  });

  test('basket', async ({ page }) => {
    const basket = new BasketPage(page);
    await basket.openPersian();
    await basket.expectFullyLoaded('fa');
  });

  test('login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.openPersian();
    await login.expectFullyLoaded('fa');
  });

  test('account (sign up)', async ({ page }) => {
    const account = new AccountPage(page);
    await account.openPersian();
    await account.expectFullyLoaded('fa');
  });

  test('forgot password', async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.openPersian();
    await forgot.expectFullyLoaded('fa');
  });

  test('reset password', async ({ page }) => {
    const reset = new ResetPasswordPage(page);
    await reset.openPersian();
    await reset.expectFullyLoaded('fa');
  });

  test('update password', async ({ page }) => {
    const update = new UpdatePasswordPage(page);
    await update.openPersian();
    await update.expectFullyLoaded('fa');
  });

  test('claim account', async ({ page }) => {
    const claim = new ClaimAccountPage(page);
    await claim.openPersian();
    await claim.expectFullyLoaded('fa');
  });

  test('orders (guest)', async ({ page }) => {
    const orders = new OrdersPage(page);
    await orders.openPersian();
    await orders.expectFullyLoadedGuest('fa');
  });

  test('track order', async ({ page }) => {
    const track = new OrderTrackPage(page);
    await track.openPersian();
    await track.expectFullyLoaded('fa');
  });

  test('checkout success', async ({ page }) => {
    const success = new CheckoutSuccessPage(page);
    await success.openPersian();
    await success.expectFullyLoaded('fa');
  });

  test('profile (guest)', async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.openPersian();
    await profile.expectFullyLoadedGuest('fa');
  });
});
