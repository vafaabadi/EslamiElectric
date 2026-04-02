/**
 * Run Lighthouse against local (or remote) site. Requires a running server by default:
 *   npm start
 *   npm run lighthouse
 *
 * Env:
 *   LIGHTHOUSE_BASE_URL — default http://localhost:3000
 *   LIGHTHOUSE_PATHS    — comma-separated pathnames (e.g. /en/,/en/products)
 *   CHROME_PATH         — optional path to Chrome/Chromium binary
 *
 * Flags:
 *   --all  — audit every known HTML route (longer run)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import lighthouse from 'lighthouse';
import { launch as launchChrome } from 'chrome-launcher';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'lighthouse-reports');

const PATHS_DEFAULT = [
  '/en/',
  '/en/products',
  '/en/basket',
  '/en/login',
  '/en/account',
  '/en/orders',
  '/en/order',
  '/en/profile',
  '/offline.html'
];

const PATHS_ALL = [
  '/en/',
  '/fa/',
  '/en/products',
  '/en/basket',
  '/en/login',
  '/en/account',
  '/en/orders',
  '/en/order',
  '/en/checkout-success',
  '/en/forgot-password',
  '/en/reset-password',
  '/en/update-password',
  '/en/auth-callback',
  '/en/claim-account',
  '/en/profile',
  '/offline.html'
];

function slugFromPath(p) {
  const s = p.replace(/^\/+/, '').replace(/\//g, '-') || 'root';
  return s.replace(/[^a-z0-9_-]/gi, '_');
}

function checkServer(baseUrl) {
  return new Promise((resolve) => {
    const u = new URL(baseUrl);
    const req = http.request(
      { hostname: u.hostname, port: u.port || 80, path: '/en/', method: 'HEAD', timeout: 5000 },
      (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function main() {
  const useAll = process.argv.includes('--all');
  const base = (process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  let paths;
  if (process.env.LIGHTHOUSE_PATHS) {
    paths = process.env.LIGHTHOUSE_PATHS.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    paths = useAll ? PATHS_ALL : PATHS_DEFAULT;
  }

  const ok = await checkServer(base);
  if (!ok) {
    console.error(`Lighthouse: no server at ${base} (HEAD /en/ failed). Start it first: npm start`);
    process.exit(1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  const chromeFlags = ['--headless', '--disable-gpu'];
  if (process.env.CI) chromeFlags.push('--no-sandbox');

  const chrome = await launchChrome({
    chromePath: process.env.CHROME_PATH || undefined,
    chromeFlags
  });

  const rows = [];

  try {
    for (const pathname of paths) {
      const url = new URL(pathname, base + '/').href;
      const slug = slugFromPath(pathname);
      process.stdout.write(`Lighthouse: ${url}\n`);

      const runnerResult = await lighthouse(url, {
        logLevel: 'error',
        port: chrome.port,
        output: 'html',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
      });

      if (!runnerResult) {
        console.error(`  skipped (no result)`);
        continue;
      }

      const { lhr, report } = runnerResult;
      const baseName = `${stamp}__${slug}`;
      const htmlPath = path.join(OUT_DIR, `${baseName}.html`);
      const jsonPath = path.join(OUT_DIR, `${baseName}.lhr.json`);

      await fs.writeFile(htmlPath, report, 'utf8');
      await fs.writeFile(jsonPath, JSON.stringify(lhr, null, 2), 'utf8');

      const cat = lhr.categories || {};
      const score = (c) => (c && typeof c.score === 'number' ? Math.round(c.score * 100) : '—');
      rows.push({
        path: pathname,
        performance: score(cat.performance),
        accessibility: score(cat.accessibility),
        bestPractices: score(cat['best-practices']),
        seo: score(cat.seo),
        html: baseName + '.html'
      });
    }
  } finally {
    await chrome.kill();
  }

  console.log('\n--- Lighthouse summary (0–100) ---\n');
  const w = (s, n) => String(s).padEnd(n);
  console.log(w('Path', 28) + w('Perf', 6) + w('A11y', 6) + w('BP', 6) + w('SEO', 6) + 'Report');
  console.log('-'.repeat(80));
  for (const r of rows) {
    console.log(
      w(r.path, 28) +
        w(r.performance, 6) +
        w(r.accessibility, 6) +
        w(r.bestPractices, 6) +
        w(r.seo, 6) +
        r.html
    );
  }
  console.log(`\nHTML + JSON written under: ${OUT_DIR}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
