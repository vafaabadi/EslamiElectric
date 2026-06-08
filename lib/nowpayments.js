'use strict';

const crypto = require('crypto');
const https = require('https');

const DEFAULT_API_BASE = 'https://api-sandbox.nowpayments.io/v1';
const PRODUCTION_API_BASE = 'https://api.nowpayments.io/v1';
const REQUEST_TIMEOUT_MS = 30000;
const USER_AGENT = 'eslamielectric/1.0 (nowpayments)';

function cleanEnv(val) {
  return String(val || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
}

function getConfig() {
  const apiKey = cleanEnv(process.env.NOWPAYMENTS_API_KEY).replace(/\s+/g, '');
  const ipnSecret = cleanEnv(process.env.NOWPAYMENTS_IPN_SECRET).replace(/\s+/g, '');
  const sandboxRaw = cleanEnv(process.env.NOWPAYMENTS_SANDBOX).toLowerCase();
  const sandbox =
    sandboxRaw === '1' ||
    sandboxRaw === 'true' ||
    (sandboxRaw !== '0' && sandboxRaw !== 'false');
  const configuredBase = cleanEnv(process.env.NOWPAYMENTS_API_BASE).replace(/\/$/, '');
  let baseUrl = configuredBase || (sandbox ? DEFAULT_API_BASE : PRODUCTION_API_BASE);
  if (!/^https:\/\/[^\s/]+/i.test(baseUrl)) {
    baseUrl = sandbox ? DEFAULT_API_BASE : PRODUCTION_API_BASE;
  }
  const payCurrency = cleanEnv(process.env.NOWPAYMENTS_DEFAULT_PAY_CURRENCY || 'usdc').toLowerCase();
  const priceCurrency = cleanEnv(process.env.NOWPAYMENTS_PRICE_CURRENCY || 'usd').toLowerCase();
  const allowedPayCurrencies = parseAllowedPayCurrencies(
    process.env.NOWPAYMENTS_ALLOWED_PAY_CURRENCIES,
    payCurrency
  );
  const sandboxCase = cleanEnv(process.env.NOWPAYMENTS_SANDBOX_CASE);
  const useInvoice =
    process.env.NOWPAYMENTS_USE_INVOICE === '1' || process.env.NOWPAYMENTS_USE_INVOICE === 'true';
  return {
    apiKey,
    ipnSecret,
    baseUrl,
    payCurrency,
    allowedPayCurrencies,
    priceCurrency,
    sandbox,
    sandboxCase,
    useInvoice
  };
}

/** NOWPayments pay_currency tickers → human network labels (see GET /v1/full-currencies). */
const PAY_CURRENCY_NETWORK_MAP = {
  usdc: { networkLabel: 'Ethereum (ERC-20)', network: 'eth', shortLabel: 'Ethereum', stable: 'USDC' },
  usdcbase: { networkLabel: 'Base', network: 'base', shortLabel: 'Base', stable: 'USDC' },
  usdcmatic: { networkLabel: 'Polygon', network: 'matic', shortLabel: 'Polygon', stable: 'USDC' },
  usdcarb: { networkLabel: 'Arbitrum', network: 'arbitrum', shortLabel: 'Arbitrum', stable: 'USDC' },
  usdcsol: { networkLabel: 'Solana', network: 'sol', shortLabel: 'Solana', stable: 'USDC' },
  usdcopt: { networkLabel: 'Optimism', network: 'optimism', shortLabel: 'Optimism', stable: 'USDC' },
  usdcbsc: { networkLabel: 'BNB Smart Chain', network: 'bsc', shortLabel: 'BSC', stable: 'USDC' },
  usdtsol: { networkLabel: 'Solana', network: 'sol', shortLabel: 'Solana', stable: 'USDT' },
  usdtbsc: { networkLabel: 'BNB Smart Chain', network: 'bsc', shortLabel: 'BSC', stable: 'USDT' },
  usdtmatic: { networkLabel: 'Polygon', network: 'matic', shortLabel: 'Polygon', stable: 'USDT' },
  usdtarb: { networkLabel: 'Arbitrum', network: 'arbitrum', shortLabel: 'Arbitrum', stable: 'USDT' }
};

function parseAllowedPayCurrencies(raw, defaultTicker) {
  const fallback = normalizePayCurrencyTicker(defaultTicker) || 'usdc';
  const parts = String(raw || '')
    .split(',')
    .map((s) => normalizePayCurrencyTicker(s))
    .filter(Boolean);
  const unique = [];
  for (const ticker of parts.length ? parts : [fallback]) {
    if (!unique.includes(ticker)) unique.push(ticker);
  }
  if (!unique.includes(fallback)) unique.unshift(fallback);
  return unique;
}

function normalizePayCurrencyTicker(val) {
  const ticker = cleanEnv(val).toLowerCase().replace(/[^a-z0-9]/g, '');
  return ticker || null;
}

function getPayCurrencyInfo(ticker) {
  const normalized = normalizePayCurrencyTicker(ticker) || 'usdc';
  const mapped = PAY_CURRENCY_NETWORK_MAP[normalized];
  if (mapped) {
    const stable = mapped.stable || 'USDC';
    return {
      payCurrency: normalized,
      networkLabel: mapped.networkLabel,
      network: mapped.network,
      shortLabel: mapped.shortLabel,
      stable,
      selectorLabel: mapped.networkLabel + ' (' + stable + ')'
    };
  }
  const upper = normalized.toUpperCase();
  return {
    payCurrency: normalized,
    networkLabel: upper,
    network: normalized,
    shortLabel: upper,
    selectorLabel: upper
  };
}

function listAllowedPayCurrencyOptions() {
  const { allowedPayCurrencies } = getConfig();
  return allowedPayCurrencies.map((ticker) => getPayCurrencyInfo(ticker));
}

const AVAILABLE_CURRENCIES_CACHE_MS = 5 * 60 * 1000;
let cachedAvailablePayCurrencies = null;
let cachedAvailablePayCurrenciesAt = 0;

function normalizeAvailableCurrencyList(data) {
  if (!data) return [];
  const raw = Array.isArray(data.currencies) ? data.currencies : Array.isArray(data) ? data : [];
  const out = [];
  for (const item of raw) {
    const ticker =
      typeof item === 'string'
        ? normalizePayCurrencyTicker(item)
        : normalizePayCurrencyTicker(item && (item.code || item.currency || item.ticker));
    if (ticker && !out.includes(ticker)) out.push(ticker);
  }
  return out;
}

/** GET /v1/currencies — coins NOWPayments accepts for this API key (cached). */
async function fetchAvailablePayCurrencies({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (
    !forceRefresh &&
    cachedAvailablePayCurrencies &&
    now - cachedAvailablePayCurrenciesAt < AVAILABLE_CURRENCIES_CACHE_MS
  ) {
    return cachedAvailablePayCurrencies;
  }
  const data = await npRequest('/currencies');
  cachedAvailablePayCurrencies = normalizeAvailableCurrencyList(data);
  cachedAvailablePayCurrenciesAt = now;
  return cachedAvailablePayCurrencies;
}

function filterPayCurrencyOptionsByAvailability(options, availableTickers) {
  if (!Array.isArray(availableTickers) || availableTickers.length === 0) return options;
  const allowed = new Set(availableTickers);
  return options.filter((opt) => allowed.has(opt.payCurrency));
}

/** Env allowlist intersected with NOWPayments GET /currencies (falls back to env-only on API failure). */
async function listAvailablePayCurrencyOptions() {
  const options = listAllowedPayCurrencyOptions();
  try {
    const available = await fetchAvailablePayCurrencies();
    return filterPayCurrencyOptionsByAvailability(options, available);
  } catch (err) {
    console.warn('NOWPayments list currencies failed, using env allowlist only:', err.message);
    return options;
  }
}

function isCurrencyUnavailableError(err, payCurrency) {
  if (!err) return false;
  const code = err.code ? String(err.code) : '';
  const msg = err.message ? String(err.message).toLowerCase() : '';
  if (code === 'CURRENCY_NOT_AVAILABLE') return true;
  if (/currency.*was not found|currency is not available|currency not available|not enabled for merchant/i.test(msg)) {
    return true;
  }
  if (code === 'BAD_REQUEST' && payCurrency && msg.includes(String(payCurrency).toLowerCase())) return true;
  return false;
}

/** Human-readable message for a disabled / unknown pay_currency ticker. */
function formatCurrencyUnavailableError(ticker) {
  const info = getPayCurrencyInfo(ticker);
  if (info.stable && info.shortLabel && info.shortLabel !== info.stable) {
    return `${info.shortLabel} ${info.stable} is not enabled in your NOWPayments account. Choose another network or enable it in the NOWPayments dashboard.`;
  }
  return `${info.selectorLabel || String(ticker || '').toUpperCase()} is not enabled in your NOWPayments account. Choose another network or enable it in the NOWPayments dashboard.`;
}

function mapNowPaymentsErrorHttpStatus(err) {
  if (!err) return 500;
  if (err.status === 429) return 429;
  if (err.code === 'NOWPAYMENTS_NETWORK_ERROR' || err.code === 'NOWPAYMENTS_INVALID_URL') return 502;
  if (err.code === 'INVALID_PAY_CURRENCY' || err.code === 'INVALID_AMOUNT') return 400;
  if (isCurrencyUnavailableError(err)) return 400;
  if (err.status >= 400 && err.status < 500) return 400;
  return 500;
}

function buildNowPaymentsApiErrorBody(err, payCurrency) {
  const unavailable = isCurrencyUnavailableError(err, payCurrency);
  const userMessage = unavailable
    ? formatCurrencyUnavailableError(payCurrency)
    : formatUserFacingError(err);
  const body = {
    error: userMessage,
    code: unavailable ? 'CURRENCY_NOT_AVAILABLE' : err.code || 'NOWPAYMENTS_ERROR'
  };
  if (err.message && !unavailable) body.npMessage = String(err.message);
  if (err.status) body.npStatus = err.status;
  return body;
}

/**
 * Resolve requested pay_currency against env allowlist; throws on invalid.
 * @param {string|undefined|null} requested
 */
function resolvePayCurrency(requested) {
  const { payCurrency, allowedPayCurrencies } = getConfig();
  const ticker = normalizePayCurrencyTicker(requested) || payCurrency;
  if (!allowedPayCurrencies.includes(ticker)) {
    const err = new Error(
      `Unsupported pay currency "${ticker}". Allowed: ${allowedPayCurrencies.join(', ')}`
    );
    err.code = 'INVALID_PAY_CURRENCY';
    throw err;
  }
  return ticker;
}

function isNowPaymentsConfigured() {
  return !!getConfig().apiKey;
}

/** Extract safe diagnostic detail from a network/TLS/DNS error (no secrets). */
function describeNetworkError(err, hostname) {
  const cause = err && err.cause ? err.cause : err;
  const code = cause && (cause.code || cause.errno);
  const parts = [];
  if (hostname) parts.push(`host=${hostname}`);
  if (code) parts.push(`code=${String(code)}`);
  const hints = {
    ENOTFOUND: 'DNS lookup failed',
    EAI_AGAIN: 'DNS temporary failure',
    ECONNREFUSED: 'connection refused',
    ETIMEDOUT: 'timed out',
    ECONNRESET: 'connection reset',
    CERT_HAS_EXPIRED: 'TLS certificate expired',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'TLS certificate invalid',
    ERR_TLS_CERT_ALTNAME_INVALID: 'TLS hostname mismatch',
    EPROTO: 'TLS protocol error',
    SELF_SIGNED_CERT_IN_CHAIN: 'TLS certificate chain invalid'
  };
  if (code && hints[code]) parts.push(hints[code]);
  const msg = cause && cause.message ? String(cause.message) : err && err.message ? String(err.message) : '';
  if (msg && !parts.some((p) => p === msg)) parts.push(msg);
  return parts.length ? parts.join('; ') : 'network request failed';
}

function formatNetworkError(err, baseUrl) {
  let hostname = '';
  try {
    hostname = new URL(baseUrl || '').hostname;
  } catch (_) {
    /* ignore */
  }
  return describeNetworkError(err, hostname);
}

function httpsJsonRequest(urlStr, method, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(urlStr);
    } catch (_) {
      const err = new Error(`Invalid NOWPayments API URL: ${urlStr}`);
      err.code = 'NOWPAYMENTS_INVALID_URL';
      return reject(err);
    }

    if (parsed.protocol !== 'https:') {
      const err = new Error(`NOWPayments API URL must use HTTPS: ${parsed.origin}`);
      err.code = 'NOWPAYMENTS_INVALID_URL';
      return reject(err);
    }

    const bodyStr = bodyObj != null ? JSON.stringify(bodyObj) : null;
    const reqHeaders = {
      ...headers,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      Host: parsed.hostname
    };
    if (bodyStr != null) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method,
        headers: reqHeaders,
        timeout: REQUEST_TIMEOUT_MS,
        family: 4
      },
      (res) => {
        let text = '';
        res.on('data', (chunk) => {
          text += chunk;
        });
        res.on('end', () => {
          resolve({ status: res.statusCode || 0, text });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      const err = new Error(`timed out after ${REQUEST_TIMEOUT_MS}ms`);
      err.code = 'ETIMEDOUT';
      reject(err);
    });

    req.on('error', (netErr) => {
      reject(netErr);
    });

    if (bodyStr != null) req.write(bodyStr);
    req.end();
  });
}

async function npRequest(path, opts = {}) {
  const { apiKey, baseUrl } = getConfig();
  if (!apiKey) {
    const err = new Error('NOWPayments is not configured. Set NOWPAYMENTS_API_KEY in .env');
    err.code = 'NOWPAYMENTS_NOT_CONFIGURED';
    throw err;
  }

  const method = (opts.method || 'GET').toUpperCase();
  const pathPart = path.startsWith('/') ? path : '/' + path;
  const url = baseUrl + pathPart + (opts.query ? '?' + new URLSearchParams(opts.query).toString() : '');
  const headers = { 'x-api-key': apiKey };

  let res;
  try {
    res = await httpsJsonRequest(url, method, headers, opts.body != null ? opts.body : null);
  } catch (netErr) {
    const detail = formatNetworkError(netErr, baseUrl);
    const err = new Error(`network error (${baseUrl}): ${detail}`);
    err.code = 'NOWPAYMENTS_NETWORK_ERROR';
    err.cause = netErr;
    err.networkDetail = detail;
    throw err;
  }

  const text = res.text;
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = { message: text };
  }

  if (res.status < 200 || res.status >= 300) {
    const parts = [];
    if (data && data.message) parts.push(String(data.message));
    if (data && data.error && data.error !== data.message) parts.push(String(data.error));
    if (data && data.status && data.status !== data.message) parts.push(String(data.status));
    if (data && data.code && !parts.length) parts.push(String(data.code));
    const msg = parts.length ? parts.join(' — ') : `NOWPayments HTTP ${res.status}`;
    const err = new Error(msg);
    err.code = (data && data.code) || 'NOWPAYMENTS_HTTP_ERROR';
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

function lineItemsTotalCents(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return 0;
  return lineItems.reduce((sum, item) => {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const unit = Math.round(Number(item.price) * 100);
    return sum + unit * qty;
  }, 0);
}

function centsToFiatAmount(amountCents) {
  const cents = Math.max(0, Math.round(Number(amountCents) || 0));
  if (cents <= 0) {
    const err = new Error('Order total must be greater than zero');
    err.code = 'INVALID_AMOUNT';
    throw err;
  }
  return Number((cents / 100).toFixed(2));
}

/**
 * @param {object} opts
 * @param {string} opts.orderId
 * @param {number} opts.amountCents
 * @param {string} opts.orderDescription
 * @param {string} opts.ipnCallbackUrl
 */
async function createPayment(opts) {
  const { priceCurrency, sandbox, sandboxCase } = getConfig();
  const payCurrency = resolvePayCurrency(opts.payCurrency);
  const body = {
    price_amount: centsToFiatAmount(opts.amountCents),
    price_currency: priceCurrency,
    pay_currency: payCurrency,
    order_id: String(opts.orderId),
    order_description: opts.orderDescription || `Order ${opts.orderId}`,
    ipn_callback_url: opts.ipnCallbackUrl
  };
  if (sandbox && sandboxCase) {
    body.case = sandboxCase;
  }
  return npRequest('/payment', { method: 'POST', body });
}

/**
 * Hosted invoice page (optional; useful for Android Custom Tab).
 */
async function createInvoice(opts) {
  const { priceCurrency, sandbox, sandboxCase } = getConfig();
  const payCurrency = resolvePayCurrency(opts.payCurrency);
  const body = {
    price_amount: centsToFiatAmount(opts.amountCents),
    price_currency: priceCurrency,
    pay_currency: payCurrency,
    order_id: String(opts.orderId),
    order_description: opts.orderDescription || `Order ${opts.orderId}`,
    ipn_callback_url: opts.ipnCallbackUrl,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl
  };
  if (sandbox && sandboxCase) {
    body.case = sandboxCase;
  }
  return npRequest('/invoice', { method: 'POST', body });
}

async function getPaymentStatus(paymentId) {
  return npRequest(`/payment/${encodeURIComponent(String(paymentId))}`);
}

function normalizePaymentId(payment) {
  if (!payment) return null;
  const id = payment.payment_id != null ? payment.payment_id : payment.id;
  return id != null ? String(id) : null;
}

function normalizePaymentStatus(payment) {
  if (!payment) return 'waiting';
  return String(payment.payment_status || payment.status || 'waiting');
}

function isNowPaymentsPaidStatus(status) {
  return status === 'finished';
}

function isNowPaymentsTerminalFailure(status) {
  return status === 'failed' || status === 'expired' || status === 'refunded';
}

function isNowPaymentsInProgress(status) {
  return (
    status === 'waiting' ||
    status === 'confirming' ||
    status === 'confirmed' ||
    status === 'sending' ||
    status === 'partially_paid'
  );
}

function verifyIpnSignature(body, signatureHeader) {
  const { ipnSecret } = getConfig();
  if (!ipnSecret) return false;
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;
  if (!body || typeof body !== 'object') return false;

  const sorted = JSON.stringify(body, Object.keys(body).sort());
  const expected = crypto.createHmac('sha512', ipnSecret).update(sorted).digest('hex');
  const received = signatureHeader.trim().toLowerCase();
  if (expected.length !== received.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(received, 'utf8'));
  } catch (_) {
    return false;
  }
}

const CRYPTO_PAYMENT_ID_RE = /^[0-9]+$/;

/** User-facing order save failure (never prefix NOWPayments). */
function formatOrderSaveUserError(err) {
  const msg = formatSupabaseError(err);
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|getaddrinfo/i.test(msg)) {
    return 'Could not reach the order database. Check SUPABASE_URL on the server.';
  }
  return msg;
}

/** Sanitized PostgREST/Supabase error for API responses (no secrets). */
function formatSupabaseError(err) {
  if (!err || typeof err !== 'object') return 'Failed to save order';
  const code = err.code ? String(err.code) : '';
  const msg = err.message ? String(err.message) : 'Failed to save order';
  if (
    /fetch failed|getaddrinfo|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ECONNRESET/i.test(msg) ||
    (err.cause && /ENOTFOUND|fetch failed/i.test(String(err.cause.message || err.cause)))
  ) {
    return 'Database connection failed. Check SUPABASE_URL points at your live Supabase project (not a deleted staging host).';
  }
  if (code === 'PGRST204') {
    return 'Order database schema is out of date (missing column). Apply migration 023_nowpayments.sql.';
  }
  if (code === '42501') {
    return 'Order save blocked by database permissions. Check SUPABASE_SERVICE_ROLE_KEY on Vercel.';
  }
  if (code === '23505') {
    return 'Duplicate order reference. Please try checkout again.';
  }
  if (code === '23503') {
    return 'Checkout profile is invalid. Sign out, sign in again, and retry.';
  }
  return code ? `${code}: ${msg}` : msg;
}

/** User-facing message; never echo Stripe key formats or API secrets from misconfigured env. */
function formatUserFacingError(err) {
  const raw =
    err && typeof err.message === 'string'
      ? err.message
      : err
        ? String(err)
        : 'NOWPayments request failed';
  if (/sk_(test|live)_/i.test(raw) || /expired api key/i.test(raw)) {
    return 'NOWPayments is misconfigured: set NOWPAYMENTS_API_KEY to your NOWPayments API key (not a Stripe key).';
  }
  if (err && err.code === 'NOWPAYMENTS_INVALID_URL') {
    return 'NOWPayments is misconfigured: check NOWPAYMENTS_API_BASE (must be https://api-sandbox.nowpayments.io/v1 or https://api.nowpayments.io/v1).';
  }
  if (err && err.code === 'NOWPAYMENTS_NETWORK_ERROR') {
    const detail = err.networkDetail || formatNetworkError(err.cause || err, getConfig().baseUrl);
    return `NOWPayments: network error — ${detail}`;
  }
  if (err && err.code === 'INVALID_PAY_CURRENCY') {
    return raw;
  }
  if (err && err.code === 'AMOUNT_MINIMAL_ERROR') {
    return 'NOWPayments: order amount is below the minimum for this coin. Try a higher total or another network.';
  }
  if (err && (err.code === 'CURRENCY_NOT_AVAILABLE' || isCurrencyUnavailableError(err, err.payCurrency))) {
    if (err.payCurrency) return formatCurrencyUnavailableError(err.payCurrency);
    return 'NOWPayments: this coin is not enabled in your NOWPayments account. Enable it in the dashboard or pick another network.';
  }
  if (/currency .* was not found/i.test(raw) || /currency is not available/i.test(raw)) {
    const match = raw.match(/currency\s+([a-z0-9]+)\s+was not found/i);
    if (match) return formatCurrencyUnavailableError(match[1]);
  }
  if (err && err.code === 'INVALID_API_KEY') {
    return 'NOWPayments: invalid API key. Check NOWPAYMENTS_API_KEY on the server.';
  }
  if (/^NOWPayments:/i.test(raw)) return raw;
  return 'NOWPayments: ' + raw;
}

module.exports = {
  getConfig,
  isNowPaymentsConfigured,
  createPayment,
  createInvoice,
  getPaymentStatus,
  lineItemsTotalCents,
  centsToFiatAmount,
  normalizePaymentId,
  normalizePaymentStatus,
  isNowPaymentsPaidStatus,
  isNowPaymentsTerminalFailure,
  isNowPaymentsInProgress,
  verifyIpnSignature,
  formatSupabaseError,
  formatOrderSaveUserError,
  formatUserFacingError,
  formatNetworkError,
  PAY_CURRENCY_NETWORK_MAP,
  getPayCurrencyInfo,
  listAllowedPayCurrencyOptions,
  listAvailablePayCurrencyOptions,
  fetchAvailablePayCurrencies,
  filterPayCurrencyOptionsByAvailability,
  isCurrencyUnavailableError,
  formatCurrencyUnavailableError,
  mapNowPaymentsErrorHttpStatus,
  buildNowPaymentsApiErrorBody,
  resolvePayCurrency,
  normalizePayCurrencyTicker,
  CRYPTO_PAYMENT_ID_RE
};
