'use strict';

/**
 * Test NOWPayments POST /payment for each ticker (uses env from vercel env run).
 * Usage: vercel env run --environment production node scripts/test-np-currencies.mjs
 */

import https from 'https';

function cleanEnv(val) {
  return String(val || '').trim().replace(/^["']|["']$/g, '').trim();
}

const apiKey = cleanEnv(process.env.NOWPAYMENTS_API_KEY).replace(/\s+/g, '');
const sandboxRaw = cleanEnv(process.env.NOWPAYMENTS_SANDBOX).toLowerCase();
const sandbox =
  sandboxRaw === '1' ||
  sandboxRaw === 'true' ||
  (sandboxRaw !== '0' && sandboxRaw !== 'false' && !process.env.NOWPAYMENTS_API_BASE);
const baseUrl =
  cleanEnv(process.env.NOWPAYMENTS_API_BASE).replace(/\/$/, '') ||
  (sandbox ? 'https://api-sandbox.nowpayments.io/v1' : 'https://api.nowpayments.io/v1');

const tickers = [
  'usdc',
  'usdcbase',
  'usdcmatic',
  'usdcarb',
  'usdcsol',
  'usdcopt',
  'usdcbsc',
  'usdtsol',
  'usdtbsc',
  'usdtmatic',
  'usdtarb'
];

function npRequest(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const bodyStr = JSON.stringify(body);
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          Accept: 'application/json',
          'User-Agent': 'eslamielectric/1.0 (np-currency-test)'
        },
        timeout: 30000,
        family: 4
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode, text }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(bodyStr);
    req.end();
  });
}

function npGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
          'User-Agent': 'eslamielectric/1.0 (np-currency-test)'
        },
        timeout: 30000,
        family: 4
      },
      (res) => {
        let text = '';
        res.on('data', (c) => (text += c));
        res.on('end', () => resolve({ status: res.statusCode, text }));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

async function main() {
  if (!apiKey) {
    console.error('NOWPAYMENTS_API_KEY not set');
    process.exit(1);
  }
  console.log('baseUrl:', baseUrl);
  console.log('sandbox:', sandbox);

  try {
    const curRes = await npGet('/currencies');
    console.log('\nGET /currencies status:', curRes.status);
    if (curRes.status === 200) {
      const list = JSON.parse(curRes.text);
      const enabled = Array.isArray(list.currencies) ? list.currencies : list;
      console.log('NP currencies count:', Array.isArray(enabled) ? enabled.length : '?');
      for (const t of tickers) {
        const ok = Array.isArray(enabled) && enabled.includes(t);
        console.log(`  ${t}: ${ok ? 'in /currencies' : 'NOT in /currencies'}`);
      }
    } else {
      console.log('currencies response:', curRes.text.slice(0, 300));
    }
  } catch (e) {
    console.error('GET /currencies failed:', e.message);
  }

  console.log('\nPOST /payment tests ($36 each):');
  for (const ticker of tickers) {
    const orderId = `test-${ticker}-${Date.now()}`;
    try {
      const res = await npRequest('/payment', {
        price_amount: 36,
        price_currency: 'usd',
        pay_currency: ticker,
        order_id: orderId,
        order_description: `Test ${ticker}`,
        ipn_callback_url: 'https://www.eslamielectric.com/api/webhooks/nowpayments'
      });
      let parsed = null;
      try {
        parsed = JSON.parse(res.text);
      } catch (_) {
        parsed = { raw: res.text.slice(0, 120) };
      }
      const code = parsed && parsed.code ? parsed.code : '';
      const msg = parsed && parsed.message ? parsed.message : parsed && parsed.raw ? parsed.raw : res.text.slice(0, 80);
      const pid = parsed && parsed.payment_id ? parsed.payment_id : '';
      console.log(
        `${ticker}: HTTP ${res.status}${code ? ' code=' + code : ''}${pid ? ' payment_id=' + pid : ''} — ${msg}`
      );
    } catch (e) {
      console.log(`${ticker}: ERROR — ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
