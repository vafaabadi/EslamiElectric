/**
 * Vercel Web Analytics — client entry (not Next.js). Calls inject() once per page.
 * @see https://vercel.com/docs/analytics/quickstart
 */
import { inject } from '/vendor/analytics/index.mjs';

var host = typeof location !== 'undefined' ? location.hostname : '';
var isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');

inject(
  isLocal
    ? {
        framework: 'html',
        scriptSrc: 'https://va.vercel-scripts.com/v1/script.debug.js'
      }
    : { framework: 'html' }
);
