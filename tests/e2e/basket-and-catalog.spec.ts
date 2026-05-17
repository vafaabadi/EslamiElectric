import { expect, test } from '@playwright/test';
import { resetShoppingBrowserState } from './helpers/storage.js';
import { BasketPage } from './pages/CommercePages.js';
import { HomePage } from './pages/HomePage.js';
import { ProductsPage } from './pages/ProductsPage.js';

test.describe('Basket editing and catalog behaviour', () => {
  test.beforeEach(async ({ page }) => {
    await resetShoppingBrowserState(page, { alsoLogout: true });
  });

  test('empty basket shows continue shopping', async ({ page }) => {
    const basket = new BasketPage(page);
    await basket.openEnglish();
    await basket.expectFullyLoaded();
    await expect(page.locator('#basket-empty')).toBeVisible();
    await expect(page.locator('#empty-link')).toBeVisible();
  });

  test('line quantities, manual removal, and totals update', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.openEnglishProducts();
    await products.addFirstProductToBasket(1);

    const basket = new BasketPage(page);
    await basket.openEnglish();
    await basket.expectNonEmptyBasket();
    const totalBefore = await page.locator('#basket-total').textContent();

    await basket.incrementFirstLineQuantity();
    await expect(page.locator('#basket-total')).not.toHaveText(totalBefore || '');

    // 2 → 1 → remove line (minus at qty 1 drops the row)
    await basket.decrementFirstLineQuantity();
    await basket.decrementFirstLineQuantity();
    await expect(page.locator('#basket-empty')).toBeVisible({ timeout: 15_000 });
  });

  test('remove button clears a line', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.openEnglishProducts();
    await products.addFirstProductToBasket(1);

    const basket = new BasketPage(page);
    await basket.openEnglish();
    await basket.expectNonEmptyBasket();
    await basket.clickRemoveFirstLine();
    await expect(page.locator('#basket-empty')).toBeVisible({ timeout: 15_000 });
  });

  test('continue shopping link from basket reaches products', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.openEnglishProducts();
    await products.addFirstProductToBasket(1);

    const basket = new BasketPage(page);
    await basket.openEnglish();
    await page.locator('#continue-shopping-link').click();
    await expect(page).toHaveURL(/\/en\/products/i);
    await products.expectFullyLoaded('en');
  });

  test('home grid add-to-basket updates header badge', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();
    await home.addFirstHomeProductToBasket(2);
    const badge = page.locator('#basket-count');
    await expect(badge).not.toHaveClass(/hidden/);
    await expect(badge).toHaveText(/2|99\+/);
  });

  test('home search input accepts text without crashing', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();
    await home.typeProductSearch('cable');
    await expect(page.locator('#product-search')).toHaveValue('cable');
  });

  test('products: change sort mode and switch category tab', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.openEnglishProducts();
    await products.expectProductAreaReady();
    await products.setSortMode('price_asc');
    await products.setSortMode('name_asc');
    await products.openCategoryTab(0);
    await products.openCategoryTab(1);
    await products.expectProductAreaReady();
  });

  test('GET /api/products payloads include storefront image_alt fields when catalog is populated', async ({ request }) => {
    const res = await request.get('/api/products');
    expect(res.status()).toBe(200);
    const data = (await res.json()) as Record<string, unknown>[];
    expect(Array.isArray(data)).toBeTruthy();
    if (data.length === 0) return;
    expect(data[0]).toHaveProperty('image_alt_en');
    expect(data[0]).toHaveProperty('image_alt_fa');
    expect(typeof (data[0].image_alt_en as string)).toBe('string');
    expect(typeof (data[0].image_alt_fa as string)).toBe('string');
  });

  test('basket language toggle still shows content', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.openEnglishProducts();
    await products.addFirstProductToBasket(1);

    const basket = new BasketPage(page);
    await basket.openEnglish();
    await basket.expectNonEmptyBasket();
    await page.locator('#lang-fa').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa', { timeout: 10_000 });
    await expect(page.locator('#basket-list > li').first()).toBeVisible();
    await page.locator('#lang-en').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 10_000 });
  });
});
