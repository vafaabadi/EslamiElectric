#!/usr/bin/env node
/**
 * Run the full Playwright suite with a visible browser (--headed).
 *
 * Usage (from repo root):
 *   node scripts/run-e2e-headed.mjs
 *   npm run e2e:headed
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const playwrightCli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const args = [playwrightCli, 'test', '-c', 'playwright.config.ts', '--headed'];

const result = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: 'inherit',
  env: process.env
});

process.exit(result.status ?? 1);
