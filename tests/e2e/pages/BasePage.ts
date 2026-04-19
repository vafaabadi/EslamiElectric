import type { Page } from '@playwright/test';

/**
 * Shared plumbing for route-relative navigation (`baseURL` from Playwright config).
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string, options?: NonNullable<Parameters<Page['goto']>[1]>) {
    await this.page.goto(path, options);
  }
}
