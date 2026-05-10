import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

dotenv.config({ path: path.join(process.cwd(), '.env'), override: false });

/**
 * Target for `page.goto('/')` etc. Set in `.env` or the shell:
 *   PLAYWRIGHT_BASE_URL=https://eslamielectric.com   (no trailing slash)
 * Unset → http://127.0.0.1:3000 and optional webServer.
 */
const baseURL =
  (process.env.PLAYWRIGHT_BASE_URL || process.env.PLAYWRIGHT_TEST_URL || '')
    .trim()
    .replace(/\/$/, '') || 'http://127.0.0.1:3000';

function isLocalPlaywrightTarget(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return true;
  }
}

/** Start local server only when targeting localhost (not when testing a real deployed URL). */
const useWebServer =
  isLocalPlaywrightTarget(baseURL) && process.env.PLAYWRIGHT_SKIP_WEBSERVER !== '1';

/**
 * E2E tests for the Express app.
 * Real site: set PLAYWRIGHT_BASE_URL in `.env` (loaded above). No local webServer.
 * Local app: leave PLAYWRIGHT_BASE_URL unset → :3000 + auto-start server (needs `.env` for Supabase/JWT).
 *
 * Coverage: `public/js` is loaded as many individual scripts (not one webpack bundle), so V8 coverage
 * tools rarely map execution back to repo files reliably. This suite targets broad **flow coverage**
 * (auth, catalog, basket, checkout, orders, validation). For Istanbul-style line %, instrument a bundle or server code separately.
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    navigationTimeout: 30_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(useWebServer
    ? {
        webServer: {
          command: 'node server.js',
          url: 'http://127.0.0.1:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          stdout: 'pipe',
          stderr: 'pipe'
        }
      }
    : {})
});
