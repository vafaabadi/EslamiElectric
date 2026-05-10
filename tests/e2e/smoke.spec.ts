import { test } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { ProductsPage } from './pages/ProductsPage.js';

test.describe('Smoke: home (English locale)', () => {
  test('loads home with site title and main landmark', async ({ page }) => {
    const home = new HomePage(page);

    await test.step('Open English home', async () => {
      await home.openEnglishHome();
    });

    await test.step('Shell, catalog fetch, and footer are ready', async () => {
      await home.expectFullyLoaded();
    });
  });
});

test.describe('Smoke: products page', () => {
  test('loads products route without permanent error state', async ({ page }) => {
    const products = new ProductsPage(page);
    await products.openEnglishProducts();

    await products.expectFullyLoaded();
  });
});