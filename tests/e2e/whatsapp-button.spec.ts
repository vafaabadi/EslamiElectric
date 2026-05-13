import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';

const WA_NUMBER = '989155417904';

test.describe('WhatsApp FAB: English home (/en/)', () => {
  test('#whatsapp-fab is visible', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();

    const fab = page.locator('#whatsapp-fab');
    await expect(fab).toBeVisible({ timeout: 15_000 });
  });

  test('#whatsapp-fab href contains wa.me/989155417904', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();

    const fab = page.locator('#whatsapp-fab');
    await expect(fab).toHaveAttribute('href', new RegExp(`wa\\.me/${WA_NUMBER}`));
  });

  test('#whatsapp-fab opens in a new tab (target=_blank)', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();

    const fab = page.locator('#whatsapp-fab');
    await expect(fab).toHaveAttribute('target', '_blank');
  });

  test('#whatsapp-fab has accessible aria-label', async ({ page }) => {
    const home = new HomePage(page);
    await home.openEnglishHome();

    const fab = page.locator('#whatsapp-fab');
    const label = await fab.getAttribute('aria-label');
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(0);
  });
});

test.describe('WhatsApp FAB: Persian home (/fa/)', () => {
  test('#whatsapp-fab is visible on Persian home', async ({ page }) => {
    const home = new HomePage(page);
    await home.openPersianHome();

    const fab = page.locator('#whatsapp-fab');
    await expect(fab).toBeVisible({ timeout: 15_000 });
  });

  test('#whatsapp-fab on Persian home has aria-label in Farsi', async ({ page }) => {
    const home = new HomePage(page);
    await home.openPersianHome();

    const fab = page.locator('#whatsapp-fab');
    await expect(fab).toHaveAttribute('aria-label', /واتساپ/);
  });
});
