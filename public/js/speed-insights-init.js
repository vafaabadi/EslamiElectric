/**
 * Vercel Speed Insights — client entry (not Next.js). Loads metrics script once per page.
 * @see https://vercel.com/docs/speed-insights/quickstart
 */
import { injectSpeedInsights } from '/vendor/speed-insights/index.mjs';

var host = typeof location !== 'undefined' ? location.hostname : '';
var isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');

injectSpeedInsights(
  isLocal
    ? {
        framework: 'html',
        scriptSrc: 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js',
        debug: true
      }
    : { framework: 'html' }
);
