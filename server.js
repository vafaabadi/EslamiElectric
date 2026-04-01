const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
const {
  resolvePublicBaseUrl,
  logStartupSummary,
  getDeploymentEnvironment
} = require('./config/environment');
const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const https = require('https');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

const CATEGORIES_FILE = path.join(__dirname, 'categories.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!jwtSecret) {
  console.error('Missing JWT_SECRET in .env (use a long random string for signing tokens)');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseAnon = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
/** Failed password attempts before lock; default 5 */
const LOGIN_LOCKOUT_MAX_ATTEMPTS = Math.max(1, parseInt(process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS || '5', 10) || 5);
/** Lock duration after too many failures (minutes); default 60 */
const LOGIN_LOCKOUT_MINUTES = Math.max(1, parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '60', 10) || 60);

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
/** Public site URL for Stripe redirects, emails, receipts (see config/environment.js). */
const baseUrl = resolvePublicBaseUrl();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Locale path prefix: /en/ and /fa/. Map path segment to HTML file in public/
const LOCALE_PREFIXES = ['en', 'fa'];
const PATH_TO_HTML = {
  '': 'index.html',
  'index': 'index.html',
  'products': 'products.html',
  'basket': 'basket.html',
  'login': 'login.html',
  'account': 'account.html',
  'orders': 'orders.html',
  'order': 'order.html',
  'checkout-success': 'checkout-success.html',
  'forgot-password': 'forgot-password.html',
  'reset-password': 'reset-password.html',
  'update-password': 'update-password.html',
  'auth-callback': 'auth-callback.html',
  'claim-account': 'claim-account.html',
  'profile': 'profile.html'
};
const publicDir = path.join(__dirname, 'public');

/**
 * Public site origin for OAuth redirectTo, Stripe, and email links.
 * Prefer NEXT_PUBLIC_BASE_URL / BASE_URL; otherwise use the incoming request (fixes custom domains on Vercel when env is unset).
 */
function getPublicBaseUrlForClient(req) {
  const explicit = (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (req && req.get) {
    const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
    if (host) {
      const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
      return `${proto}://${host}`.replace(/\/$/, '');
    }
  }
  return resolvePublicBaseUrl();
}

/** Supabase URL + anon key + baseUrl: embedded only in HTML pages that need them (not via a separate JSON API). */
function getPublicConfigForClient(req) {
  const url = process.env.SUPABASE_URL || '';
  const anon = process.env.SUPABASE_ANON_KEY || '';
  const base = getPublicBaseUrlForClient(req);
  const telegramBotUsername = (process.env.TELEGRAM_LOGIN_BOT_USERNAME || '').replace(/^@/, '').trim();
  const telegramLoginBotToken = (process.env.TELEGRAM_LOGIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const telegramAuthDomain = (process.env.TELEGRAM_AUTH_EMAIL_DOMAIN || '').trim().replace(/^@/, '');
  const telegramLoginEnabled = !!(telegramBotUsername && telegramLoginBotToken && telegramAuthDomain);
  /** Every hostname where Telegram Login Widget may run (must each be set in BotFather /setdomain). */
  const telegramLoginWidgetHostnames = telegramLoginEnabled
    ? collectTelegramLoginWidgetHostnames(req)
    : [];
  const telegramLoginWidgetHostname =
    telegramLoginWidgetHostnames.length > 0 ? telegramLoginWidgetHostnames[0] : '';
  return {
    supabaseUrl: url,
    supabaseAnonKey: anon,
    baseUrl: base,
    telegramBotUsername: telegramLoginEnabled ? telegramBotUsername : '',
    telegramLoginEnabled,
    telegramLoginWidgetHostname,
    telegramLoginWidgetHostnames
  };
}

/**
 * Hostnames allowed to show our Telegram widget UI (Telegram still validates via BotFather /setdomain).
 * Includes: env list, BASE_URL, VERCEL_URL, and the current request Host (so *.vercel.app matches live URL).
 */
function collectTelegramLoginWidgetHostnames(req) {
  const out = [];
  const add = (h) => {
    if (!h || typeof h !== 'string') return;
    const x = h.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!x || x === 'localhost' || x === '127.0.0.1') return;
    if (!out.includes(x)) out.push(x);
  };
  const raw = (process.env.TELEGRAM_LOGIN_WIDGET_DOMAIN || '').trim();
  if (raw) {
    for (const part of raw.split(',')) {
      const p = part.trim();
      if (!p) continue;
      try {
        const u = new URL(p.includes('://') ? p : 'https://' + p);
        add(u.hostname);
      } catch (e) {
        add(p);
      }
    }
  }
  const baseForHost = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || '';
  if (baseForHost) {
    try {
      const u = new URL(baseForHost.includes('://') ? baseForHost : 'https://' + baseForHost);
      add(u.hostname);
    } catch (e) {}
  }
  add(process.env.VERCEL_URL || '');
  add(process.env.VERCEL_PROJECT_PRODUCTION_URL || '');
  if (req && typeof req.get === 'function') {
    // Prefer X-Forwarded-Host (first hop) — on Vercel/custom domains this is often the public hostname.
    const xfh = req.get('x-forwarded-host');
    if (xfh) {
      for (const part of xfh.split(',')) {
        const segment = part.trim().split(':')[0];
        add(segment);
      }
    }
    const host = (req.get('host') || '').split(':')[0];
    add(host);
    if (typeof req.hostname === 'string' && req.hostname) {
      add(req.hostname);
    }
  }
  return out;
}

/** Log whether Telegram Login Widget can run (see TELEGRAM_* env vars). */
function logTelegramLoginStatus() {
  const u = (process.env.TELEGRAM_LOGIN_BOT_USERNAME || '').replace(/^@/, '').trim();
  const tok = (process.env.TELEGRAM_LOGIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const dom = (process.env.TELEGRAM_AUTH_EMAIL_DOMAIN || '').trim().replace(/^@/, '');
  if (u && tok && dom) {
    const hosts = collectTelegramLoginWidgetHostnames(null);
    console.log(
      'Telegram login: enabled (bot ' +
        u +
        '; synthetic email @' +
        dom +
        '). Widget allowed hostnames: ' +
        (hosts.length ? hosts.join(', ') : '(set TELEGRAM_LOGIN_WIDGET_DOMAIN or BASE_URL)') +
        ' — each must match BotFather /setdomain.'
    );
  } else {
    const need = [];
    if (!u) need.push('TELEGRAM_LOGIN_BOT_USERNAME');
    if (!tok) need.push('TELEGRAM_LOGIN_BOT_TOKEN (or TELEGRAM_BOT_TOKEN)');
    if (!dom) need.push('TELEGRAM_AUTH_EMAIL_DOMAIN');
    console.log('Telegram login: disabled — set ' + need.join(', '));
  }
}

function jsonForInlineScript(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function injectPublicConfig(html, req) {
  const config = getPublicConfigForClient(req);
  const script = '<script id="server-public-config" type="application/json">' + jsonForInlineScript(config) + '</script>';
  if (html.includes('<!--SERVER_PUBLIC_CONFIG-->')) {
    return html.replace('<!--SERVER_PUBLIC_CONFIG-->', script);
  }
  return html.replace(/<head(\s[^>]*)?>/, '<head$1>' + script + '\n');
}

const HTML_WITH_PUBLIC_CONFIG = new Set([
  'index.html',
  'auth-callback.html',
  'account.html',
  'forgot-password.html',
  'update-password.html',
  'login.html'
]);

function serveHtmlWithPublicConfig(req, res, relativePath) {
  const filePath = path.join(publicDir, relativePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return res.status(404).send('Not found');
      return res.status(500).send('Error loading page');
    }
    const injected = injectPublicConfig(data, req);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(injected);
  });
}

const resendApiKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM || 'Eslami Electric <onboarding@resend.dev>';
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Telegram notifications (optional).
// Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your environment to enable.

function sendTelegramMessage(text) {
  return new Promise((resolve) => {
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    if (!telegramBotToken || !telegramChatId) {
      console.log('Telegram skipped: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
      return resolve(false);
    }
    console.log('Telegram send attempt chat_id:', telegramChatId);
    if (!text || typeof text !== 'string') return resolve(false);

    const payload = JSON.stringify({
      chat_id: telegramChatId,
      text,
      disable_web_page_preview: true
    });

    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${telegramBotToken}/sendMessage`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 8000
      },
      (resp) => {
        let body = '';
        resp.on('data', (chunk) => { body += String(chunk); });
        resp.on('end', () => {
          if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
            console.log('Telegram message sent');
            return resolve(true);
          }
          console.error('Telegram send failed:', resp.statusCode, body && body.slice(0, 500));
          return resolve(false);
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Telegram request timeout'));
      resolve(false);
    });
    req.on('error', (err) => {
      console.error('Telegram send error:', err && err.message ? err.message : err);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

// Redirect eslamielectric.ir to canonical www host (Persian home).
app.use((req, res, next) => {
  const host = (req.hostname || req.get('host') || '').toLowerCase().split(':')[0];
  if (host === 'eslamielectric.ir' || host.endsWith('.eslamielectric.ir')) {
    const target = 'https://www.eslamielectric.com/fa/';
    return res.redirect(302, target);
  }
  next();
});

// Apex → www: matches Telegram Login Widget domain (BotFather /setdomain) and one canonical URL.
// 308 preserves method/body so POST (e.g. /api/webhooks/stripe) still works after redirect.
app.use((req, res, next) => {
  const host = (req.hostname || req.get('host') || '').toLowerCase().split(':')[0];
  if (host === 'eslamielectric.com') {
    const pathAndQuery = req.originalUrl || req.url || '/';
    const target = 'https://www.eslamielectric.com' + pathAndQuery;
    return res.redirect(308, target);
  }
  next();
});

const validationPatterns = {
  name: /^[\u0600-\u06FFa-zA-Z\s]{2,50}$/,
  dob: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
  // E.164 (+… 8–15 digits) plus Iran local mobile; intl-tel-input submits +country…
  mobile: /^(\+98|0|0098)?9\d{9}$|^\+[1-9]\d{7,14}$|^00[1-9]\d{7,14}$/,
  landline: /^0[1-9]{2}\d{8}$|^\+[1-9]\d{7,14}$|^00[1-9]\d{7,14}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  address: /^[\u0600-\u06FFa-zA-Z0-9\s.,()/-]{10,200}$/,
  companyName: /^[\u0600-\u06FFa-zA-Z0-9\s&.,'/-]{2,100}$/,
  companyNumber: /^[A-Za-z0-9\-]{2,40}$/,
  principalContact: /^[\u0600-\u06FFa-zA-Z0-9\s.,'-]{0,100}$/
};

/** Landline/mobile patterns miss some valid national numbers (e.g. longer UK lines). */
function isValidPhoneOrCompanyLine(v) {
  if (!v || typeof v !== 'string') return false;
  const s = v.trim();
  if (validationPatterns.landline.test(s)) return true;
  if (validationPatterns.mobile.test(s)) return true;
  // National format: leading 0, then 10–13 subscriber digits (e.g. UK 01xxx / 02xx / 07… variants)
  if (/^0[1-9]\d{9,12}$/.test(s)) return true;
  return false;
}

/** Supabase Auth email for Telegram login is synthetic: tg_<telegramUserId>@<domain>. */
function isSyntheticTelegramAuthEmail(email) {
  const e = (email && String(email).trim().toLowerCase()) || '';
  return /^tg_\d+@/.test(e);
}

/**
 * Required fields for post-purchase contact, delivery coordination, and collection pickup.
 * All logged-in purchasers need first name, surname, mobile, and a reachable email (account email,
 * or contact email when Telegram sign-in uses a synthetic auth address).
 */
function computeMissingCheckoutProfileFields(profileRow, authEmailOptional) {
  const missing = [];
  const fn = (profileRow.first_name || '').trim();
  const sn = (profileRow.surname || '').trim();
  if (!fn || !validationPatterns.name.test(fn) || fn === 'User') missing.push('firstName');
  if (!sn || !validationPatterns.name.test(sn) || sn === 'Account') missing.push('surname');
  const mob = (profileRow.mobile || '').trim();
  if (!mob || !validationPatterns.mobile.test(mob)) missing.push('mobile');
  const email = (profileRow.email || '').trim().toLowerCase();
  const contact = (profileRow.contact_email || '').trim().toLowerCase();
  const authEmail = (authEmailOptional || '').trim().toLowerCase();
  if (isSyntheticTelegramAuthEmail(email)) {
    if (!contact || !validationPatterns.email.test(contact)) missing.push('contactEmail');
  } else {
    const profileOk = email && validationPatterns.email.test(email);
    const authOk = authEmail && validationPatterns.email.test(authEmail);
    if (!profileOk && !authOk) missing.push('email');
  }
  if (profileRow.type === 'company') {
    const cn = (profileRow.company_name || '').trim();
    if (!cn || !validationPatterns.companyName.test(cn)) missing.push('companyName');
    const cc = (profileRow.company_contact_number || '').trim();
    if (!cc || !isValidPhoneOrCompanyLine(cc)) missing.push('companyContactNumber');
  }
  return [...new Set(missing)];
}

async function getCheckoutProfileStatus(userId, profileRowOptional) {
  let row = profileRowOptional;
  if (!row) {
    const { data: r, error: rowErr } = await supabase
      .from('users')
      .select(
        'id, type, email, contact_email, first_name, surname, mobile, telegram_id, company_name, company_contact_number'
      )
      .eq('id', userId)
      .maybeSingle();
    if (rowErr || !r) {
      return { requiresCheckoutProfile: false, complete: true, missing: [], authEmail: null };
    }
    row = r;
  }
  const { data: gu, error: guErr } = await supabase.auth.admin.getUserById(userId);
  if (guErr || !gu || !gu.user) {
    return { requiresCheckoutProfile: false, complete: true, missing: [], authEmail: null };
  }
  const authEmail = gu.user.email || '';
  const missing = computeMissingCheckoutProfileFields(row, authEmail);
  return {
    requiresCheckoutProfile: true,
    complete: missing.length === 0,
    missing,
    authEmail: authEmail || null
  };
}

function profileRowToJson(user) {
  if (!user) return null;
  return {
    id: user.id,
    type: user.type,
    firstName: user.first_name,
    surname: user.surname,
    dob: user.dob,
    mobile: user.mobile,
    landline: user.landline,
    email: user.email,
    contactEmail: user.contact_email,
    canLinkEmail: isSyntheticTelegramAuthEmail(user.email),
    address: user.address,
    bankDetails: user.bank_details,
    companyName: user.company_name,
    companyNumber: user.company_number,
    companyContactNumber: user.company_contact_number,
    companyPrincipalContact: user.company_principal_contact,
    createdAt: user.created_at
  };
}

// Generate a short, readable order number (e.g. ORD-A3X9K2). Avoids 0/O, 1/I.
function generateOrderNumber() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'ORD-';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

/** Optional delivery notes from checkout (max 2000 chars stored). */
function trimDeliveryAdditionalInfo(addr) {
  if (!addr || typeof addr !== 'object') return '';
  const raw = String(addr.additional_info || addr.additionalInfo || '').trim();
  if (!raw) return '';
  return raw.length > 2000 ? raw.slice(0, 2000) : raw;
}

// Send receipt/order confirmation email (Resend). For guests who are not yet registered, creates a claim token and adds "Claim your account" link.
// Returns a Promise; callers should .catch() to log errors.
async function sendOrderReceiptEmail(order) {
  if (!resend) {
    console.log('Receipt email skipped: RESEND_API_KEY not set');
    return;
  }
  if (!order || !order.customer_email) {
    console.log('Receipt email skipped: order missing customer_email', order ? { hasEmail: !!order.customer_email } : 'no order');
    return;
  }
  const siteUrl = baseUrl.replace(/\/$/, '');
  // Prefer `orders.customer_name`. If missing (older orders), fall back to `public.users`.
  let name = order.customer_name || '';
  if (!name && order.user_id) {
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('first_name, surname')
        .eq('id', order.user_id)
        .maybeSingle();
      const fullName = `${userRow?.first_name || ''} ${userRow?.surname || ''}`.trim();
      name = fullName || '';
    } catch (e) {
      // If fallback fails, we just use the generic name.
      name = '';
    }
  }
  name = name || 'Customer';
  const totalCents = order.amount_total != null ? Number(order.amount_total) : 0;
  const totalFormatted = '$' + (totalCents / 100).toFixed(2);
  const items = order.line_items || [];
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const itemsList = items.map((item) => {
    const qty = item.quantity || 1;
    const label = item.name || 'Item';
    const amt = item.amount_total != null ? (Number(item.amount_total) / 100).toFixed(2) : '0.00';
    return `<tr><td>${escapeHtml(label)}</td><td>${qty}</td><td>$${amt}</td></tr>`;
  }).join('');
  const orderDisplay = order.order_number || order.id;
  const fulfillLine = order.fulfillment_type === 'collection'
    ? '<p><strong>Fulfillment:</strong> Collection (pickup)</p>'
    : '<p><strong>Fulfillment:</strong> Delivery</p>';
  const shipAddr = order.shipping_address;
  const extraInfo = (shipAddr && typeof shipAddr === 'object' && shipAddr.additional_info)
    ? String(shipAddr.additional_info).trim()
    : '';
  const additionalInfoLine = extraInfo
    ? `<p><strong>Additional info:</strong> ${escapeHtml(extraInfo)}</p>`
    : '';
  const trackBlock = order.guest_access_token
    ? `<p>Track your order anytime: <a href="${siteUrl}/order.html?token=${encodeURIComponent(order.guest_access_token)}">${siteUrl}/order.html?token=...</a></p>`
    : `<p>View this order and all your orders: <a href="${siteUrl}/orders.html">${siteUrl}/orders.html</a></p>`;

  const emailNorm = (order.customer_email || '').trim().toLowerCase();
  let alreadyRegistered = false;
  if (emailNorm) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailNorm)
      .maybeSingle();
    alreadyRegistered = !!userByEmail;
  }

  let claimBlock = '';
  // Only show "Claim your account" for true guests (email not already in our users table).
  if (order.guest_access_token && !alreadyRegistered) {
    const claimToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error: claimErr } = await supabase.from('account_claims').insert({
      token: claimToken,
      email: emailNorm,
      expires_at: expiresAt
    });
    if (!claimErr) {
      const claimUrl = siteUrl + '/claim-account.html?token=' + encodeURIComponent(claimToken);
      claimBlock = `<p style="margin-top:1em; padding:0.75em; background:#fef3c7; border-radius:0.5rem;"><strong>Claim your account</strong><br>Set a password to claim this order history and see it in My Orders: <a href="${claimUrl}">${claimUrl}</a></p>`;
    }
  }

  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>Thank you for your order. Please find your receipt below.</p>
    <p><strong>Order number: ${escapeHtml(orderDisplay)}</strong></p>
    ${fulfillLine}
    ${additionalInfoLine}
    <table style="border-collapse:collapse; margin:1em 0;" cellpadding="6" border="1">
      <thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>
      <tbody>${itemsList}</tbody>
    </table>
    <p><strong>Total: ${totalFormatted}</strong></p>
    ${trackBlock}
    ${claimBlock}
    <p style="margin-top:1em; color:#64748b; font-size:0.875rem;">If you don't see this in your inbox, check your spam folder.</p>
    <p>— Eslami Electric</p>
  `;
  await resend.emails.send({
    from: resendFrom,
    to: [order.customer_email],
    subject: 'Your receipt – Order ' + (order.order_number || order.id),
    html
  });
  console.log('Receipt email sent to', order.customer_email);
}

// Stripe webhook needs raw body for signature verification (must be before express.json())
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    return res.status(503).send('Webhook not configured');
  }
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing stripe-signature');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err) {
    return res.status(400).send('Webhook signature verification failed');
  }
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).send('OK');
  }
  const session = event.data.object;
  const userId = session.client_reference_id || null;
  const stripeSessionId = session.id;
  const amountTotal = session.amount_total || 0;
  const currency = (session.currency || 'usd').toLowerCase();
  const customerEmail = session.customer_email || session.customer_details?.email || null;
  const customerName = session.customer_details?.name
    || session.customer_details?.full_name
    || session.shipping_details?.name
    || '';
  const siteUrl = baseUrl.replace(/\/$/, '');
  let lineItems = [];
  let prevLineItems = [];
  try {
    const { data: rowBefore } = await supabase
      .from('orders')
      .select('line_items')
      .eq('stripe_session_id', stripeSessionId)
      .maybeSingle();
    if (rowBefore && Array.isArray(rowBefore.line_items)) prevLineItems = rowBefore.line_items;
  } catch (e) {
    /* non-fatal */
  }
  try {
    const fullSession = await stripe.checkout.sessions.retrieve(stripeSessionId, { expand: ['line_items.data.price.product'] });
    if (fullSession.line_items && fullSession.line_items.data) {
      lineItems = fullSession.line_items.data.map((li, idx) => {
        const fromStripe = {
          name: (li.price && li.price.product && typeof li.price.product === 'object' && li.price.product.name)
            ? li.price.product.name
            : (li.description || 'Item'),
          quantity: li.quantity || 1,
          unit_amount: li.price ? li.price.unit_amount : 0,
          amount_total: li.amount_total
        };
        const prev = prevLineItems[idx];
        const pid = prev && (prev.product_id || prev.productId) ? String(prev.product_id || prev.productId).trim() : '';
        if (pid) fromStripe.product_id = pid;
        return fromStripe;
      });
    }
  } catch (e) {
    console.error('Stripe session retrieve error:', e);
  }
  try {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
      .eq('stripe_session_id', stripeSessionId)
      .single();

    let shouldTelegramNotify = false;

    if (existingOrder) {
      // Only notify if the order isn't paid yet (prevents duplicate notifications on retries).
      shouldTelegramNotify = existingOrder.status !== 'paid';
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          amount_total: amountTotal,
          currency,
          line_items: lineItems,
          customer_email: customerEmail,
          customer_name: customerName || null
        })
        .eq('stripe_session_id', stripeSessionId);
      if (updateError) {
        console.error('Orders update error:', updateError);
        return res.status(500).send('Error updating order');
      }
    } else {
      const fulfillmentFromMeta = (session.metadata && session.metadata.fulfillment) === 'collection' ? 'collection' : 'delivery';
      const { error } = await supabase.from('orders').insert({
        user_id: userId || null,
        stripe_session_id: stripeSessionId,
        amount_total: amountTotal,
        currency,
        status: 'paid',
        line_items: lineItems,
        customer_email: customerEmail,
        customer_name: customerName || null,
        fulfillment_type: fulfillmentFromMeta
      });
      if (error) {
        if (error.code === '23505') return res.status(200).send('OK');
        console.error('Orders insert error:', error);
        return res.status(500).send('Error recording order');
      }
      shouldTelegramNotify = true;
    }
    // Send receipt email to customer (guest or logged-in) when we have their email
    const { data: orderForEmail } = await supabase
      .from('orders')
      .select('id, order_number, customer_email, guest_access_token, customer_name, user_id, line_items, amount_total, currency, fulfillment_type, shipping_address')
      .eq('stripe_session_id', stripeSessionId)
      .single();
    if (orderForEmail && orderForEmail.customer_email) {
      sendOrderReceiptEmail(orderForEmail).catch((err) => console.error('Receipt email error:', err));
    }
    if (shouldTelegramNotify && orderForEmail) {
      const orderDisplay = orderForEmail.order_number || orderForEmail.id || stripeSessionId;
      const isGuest = !!orderForEmail.guest_access_token;
      const customer = orderForEmail.customer_email || (isGuest ? 'guest' : 'unknown');
      const customerName = orderForEmail.customer_name || '';
      const amountUsd = orderForEmail.amount_total != null ? (Number(orderForEmail.amount_total) / 100) : 0;

      const items = Array.isArray(orderForEmail.line_items) ? orderForEmail.line_items : [];
      const itemsLines = items.slice(0, 10).map((it) => {
        const name = it.name || 'Item';
        const qty = it.quantity || 1;
        const cents = it.amount_total != null ? Number(it.amount_total) : 0;
        const lineUsd = (cents / 100).toFixed(2);
        return `- ${name} x${qty} = $${lineUsd}`;
      });

      const itemsText = itemsLines.length > 0 ? itemsLines.join('\n') : '- (no line items)';
      const trackLink = isGuest
        ? `${siteUrl}/order.html?token=${encodeURIComponent(orderForEmail.guest_access_token)}`
        : `${siteUrl}/orders.html`;

      const msgLines = [];
      msgLines.push('Order paid');
      msgLines.push(`Order: ${orderDisplay}`);
      if (customerName) msgLines.push(`Customer name: ${customerName}`);
      msgLines.push(`Customer: ${customer}`);
      msgLines.push(`Type: ${isGuest ? 'guest' : 'registered'}`);
      msgLines.push(`Fulfillment: ${orderForEmail.fulfillment_type === 'collection' ? 'collection' : 'delivery'}`);
      const extraShip = orderForEmail.shipping_address && typeof orderForEmail.shipping_address === 'object'
        ? String(orderForEmail.shipping_address.additional_info || '').trim()
        : '';
      if (extraShip) msgLines.push(`Additional info: ${extraShip.slice(0, 500)}${extraShip.length > 500 ? '…' : ''}`);
      msgLines.push(`Amount: $${amountUsd.toFixed(2)} ${String(orderForEmail.currency || currency).toUpperCase()}`);
      msgLines.push(`Stripe session: ${stripeSessionId}`);
      msgLines.push('Items:');
      msgLines.push(itemsText);
      msgLines.push(`Tracking: ${trackLink}`);

      sendTelegramMessage(msgLines.join('\n'))
        .catch((err) => console.error('Telegram order notification error:', err));
    }
  } catch (e) {
    console.error('Webhook order create error:', e);
    return res.status(500).send('Error recording order');
  }
  res.status(200).send('OK');
});

app.use(express.json());

// Root redirect to English locale
app.get('/', (req, res) => {
  res.redirect(302, '/en/');
});

// Serve locale-prefixed routes: /en/, /en/products, /fa/, /fa/basket, etc.
function serveLocalePage(locale, subPath, req, res) {
  const base = '/' + locale + '/';
  const baseTag = '<base href="' + base + '">';
  const langScript = '<script>(function(){var p=location.pathname;var l=p.indexOf("/fa")===0?"fa":"en";localStorage.setItem("lang",l);document.addEventListener("DOMContentLoaded",function(){var rest=p.replace(/^\\/en\\/?|^\\/fa\\/?/i,"")||"index";var enEl=document.getElementById("lang-en");var faEl=document.getElementById("lang-fa");if(enEl){enEl.addEventListener("click",function(){if(l==="fa"){localStorage.setItem("lang","en");localStorage.setItem("localePref","user");location.href="/en/"+(rest==="index"?"":rest);}});}if(faEl){faEl.addEventListener("click",function(){if(l==="en"){localStorage.setItem("lang","fa");localStorage.setItem("localePref","user");location.href="/fa/"+(rest==="index"?"":rest);}});}});})();</script>';
  const inject = baseTag + '\n  ' + langScript + '\n  ';
  let seg = (subPath || '').replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  if (seg.endsWith('.html')) {
    seg = seg.slice(0, -'.html'.length);
  }
  const htmlFile = PATH_TO_HTML[seg];
  if (htmlFile) {
    const filePath = path.join(publicDir, htmlFile);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') return res.status(404).send('Not found');
        return res.status(500).send('Error loading page');
      }
      let body = HTML_WITH_PUBLIC_CONFIG.has(htmlFile) ? injectPublicConfig(data, req) : data;
      const injected = body.replace(/<head(\s[^>]*)?>/, '<head$1>' + inject);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(injected);
    });
    return;
  }
  // Static asset: /en/css/mobile.css -> public/css/mobile.css
  const rest = (subPath || '').replace(/^\/+/, '');
  const assetPath = path.join(publicDir, rest);
  const ext = path.extname(rest);
  if (ext && !rest.includes('..')) {
    fs.access(assetPath, fs.constants.R_OK, (err) => {
      if (err) return res.status(404).send('Not found');
      res.sendFile(assetPath);
    });
    return;
  }
  // Unknown path under locale: serve index with base so SPA-style or 404
  const indexPath = path.join(publicDir, 'index.html');
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) return res.status(404).send('Not found');
    let body = injectPublicConfig(data, req);
    const injected = body.replace(/<head(\s[^>]*)?>/, '<head$1>' + inject);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(injected);
  });
}

LOCALE_PREFIXES.forEach((locale) => {
  app.get(new RegExp('^/' + locale + '(?:/.*)?$'), (req, res) => {
    const subPath = req.path.slice(('/' + locale).length) || '/';
    serveLocalePage(locale, subPath, req, res);
  });
});

/**
 * Root /login.html is easy to serve as a raw static file on some hosts (no Node injection), so
 * SERVER_PUBLIC_CONFIG is missing and Telegram/Google break. Locale URLs always go through this app.
 */
app.get('/login.html', (req, res) => {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(302, '/en/login.html' + qs);
});

for (const name of HTML_WITH_PUBLIC_CONFIG) {
  if (name === 'login.html') continue;
  app.get('/' + name, (req, res) => {
    serveHtmlWithPublicConfig(req, res, name);
  });
}

app.use(express.static(path.join(__dirname, 'public')));

// Check whether a user email already exists in Supabase auth.
// This lets the frontend show a friendly error before attempting signUp.
app.post('/api/check-email', async (req, res) => {
  try {
    const body = req.body || {};
    const email = (body.email && typeof body.email === 'string') ? body.email.trim().toLowerCase() : '';
    if (!email) return res.status(400).json({ error: 'email required' });

    // With this supabase-js version:
    // - `getUserByEmail` is not available
    // - `auth` schema is not exposed via PostgREST
    // So we use `admin.listUsers` and search by email.
    const perPage = 100;
    let page = 1;
    let exists = false;

    // Cap pagination work to keep this endpoint snappy.
    // If you expect many users, we can increase limits or use a DB-backed index.
    for (let i = 0; i < 50; i++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error('check-email error:', error);
        return res.status(500).json({ error: 'Failed to check email' });
      }
      const users = (data && data.users) ? data.users : [];
      if (users.length === 0) break;
      exists = users.some(u => (u.email || '').trim().toLowerCase() === email);
      if (exists) break;
      if (users.length < perPage) break;
      page += 1;
    }

    res.json({ exists });
  } catch (err) {
    console.error('check-email exception:', err);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

/**
 * Exchange Supabase session JWT for app JWT; upsert public.users, attach guest orders.
 * @returns {Promise<{ ok: true, token: string, user: object } | { ok: false, status: number, error: string }>}
 */
async function exchangeSupabaseAccessTokenForAppJwt(accessToken) {
  try {
    const { data: authUserData, error: authErr } = await supabase.auth.getUser(accessToken);
    if (authErr || !authUserData || !authUserData.user) {
      console.error('Auth getUser error:', authErr);
      return { ok: false, status: 401, error: 'Invalid or expired token' };
    }
    const authUser = authUserData.user;
    const userId = authUser.id;
    // If the user arrived via an action link (magiclink) but the email isn't marked confirmed,
    // force-confirm it so subsequent password login works.
    const isConfirmed =
      !!authUser.confirmed_at ||
      !!authUser.email_confirmed_at;
    const wasConfirmed = isConfirmed;
    console.log('auth/token: userId', userId, 'email', (authUser.email || '').trim(), 'confirmed=', isConfirmed);
    if (!isConfirmed) {
      try {
        const { error: confirmErr } = await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true,
          role: 'authenticated'
        });
        if (confirmErr) console.error('Auth token: confirm email error:', confirmErr);
        else console.log('Auth token: email confirmed for user', userId);

        if (!wasConfirmed) {
          const email = (authUser.email || '').trim() || '';
          console.log('auth/token: sending second signup telegram for user', userId);
          sendTelegramMessage(`Signup confirmed\nUser id: ${userId}\nEmail: ${email}`)
            .catch((err) => console.error('Telegram signup confirmed error:', err));
        }
      } catch (e) {
        console.error('Telegram login flow: confirm email exception:', e);
      }
    }
    const meta = authUser.user_metadata || {};
    const email = (authUser.email || '').trim() || '';
    /** Google OAuth uses full_name / name / given_name; our signup form uses first_name / surname. */
    function sanitizePersonName(s, fallback) {
      let t = String(s || '')
        .replace(/[^\u0600-\u06FFa-zA-Z\s]/g, '')
        .trim();
      if (t.length < 2) t = fallback;
      if (t.length > 50) t = t.slice(0, 50);
      return t;
    }
    let firstName = (meta.first_name || meta.given_name || '').trim();
    let surname = (meta.surname || meta.family_name || '').trim();
    const rawFull = (meta.full_name || meta.name || '').trim();
    if ((!firstName || !surname) && rawFull) {
      const parts = rawFull.split(/\s+/).filter(Boolean);
      if (!firstName) firstName = parts[0] || '';
      if (!surname) surname = parts.length > 1 ? parts.slice(1).join(' ') : '';
    }
    if (!firstName && email) {
      const local = email.split('@')[0].replace(/[^a-zA-Z\u0600-\u06FF]+/g, ' ').trim();
      const bit = local.split(/\s+/).filter(Boolean)[0] || '';
      firstName = bit;
    }
    firstName = sanitizePersonName(firstName, 'User');
    surname = sanitizePersonName(surname, 'Account');
    const type = (meta.type || '').trim() || 'person';
    const mobile = (meta.mobile || '').trim() || '';
    let address = (meta.address || '').trim() || '';
    if (address && !validationPatterns.address.test(address)) {
      address = '';
    }
    const landline = (meta.landline || '').trim() || null;
    const bankDetails = (meta.bank_details || '').trim() || null;
    const companyName = (meta.company_name || '').trim() || null;
    const companyNumber = (meta.company_number || '').trim() || null;
    const companyContactNumber = (meta.company_contact_number || '').trim() || null;
    const companyPrincipalContact = (meta.company_principal_contact || '').trim() || null;
    let dob = null;
    if (meta.dob && String(meta.dob).trim()) {
      const d = new Date(meta.dob);
      if (!isNaN(d.getTime())) dob = d.toISOString().slice(0, 10);
    }

    const emailNorm = (email || '').trim().toLowerCase();

    // Detect whether this is the first time we sync this user into `public.users`.
    const { data: existingBefore } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    const isNewUser = !existingBefore;

    // Legacy guest-claim or /api/users may have created public.users with the same email but a
    // different id than Supabase Auth. Upsert uses onConflict:id so Postgres tries INSERT and
    // hits users_email_key. Free the email, then remove the stale row after we upsert the Auth id.
    let staleUserId = null;
    let mergedPasswordHash = null;
    let mergedLoginFailedCount = null;
    let mergedLockedUntil = null;
    if (emailNorm) {
      const { data: emailConflict } = await supabase
        .from('users')
        .select('id, password_hash, login_failed_count, locked_until')
        .ilike('email', emailNorm)
        .maybeSingle();
      if (emailConflict && emailConflict.id !== userId) {
        staleUserId = emailConflict.id;
        mergedPasswordHash = emailConflict.password_hash;
        mergedLoginFailedCount = emailConflict.login_failed_count;
        mergedLockedUntil = emailConflict.locked_until;
        const legacyEmail = `legacy+${emailConflict.id}@migrated.invalid`;
        const { error: renameErr } = await supabase
          .from('users')
          .update({ email: legacyEmail })
          .eq('id', emailConflict.id);
        if (renameErr) {
          console.error('Users email conflict rename error:', renameErr);
          return { ok: false, status: 500, error: 'Failed to sync profile' };
        }
      }
    }

    const telegramIdMeta = (meta.telegram_id != null && String(meta.telegram_id).trim()) ? String(meta.telegram_id).trim() : null;

    const upsertRow = {
      id: userId,
      email: emailNorm || email,
      first_name: firstName,
      surname,
      type,
      dob: dob || null,
      mobile,
      landline,
      address,
      bank_details: bankDetails,
      company_name: companyName,
      company_number: companyNumber,
      company_contact_number: companyContactNumber,
      company_principal_contact: companyPrincipalContact
    };
    if (mergedPasswordHash != null && mergedPasswordHash !== '') {
      upsertRow.password_hash = mergedPasswordHash;
    }
    if (mergedLoginFailedCount != null) {
      upsertRow.login_failed_count = mergedLoginFailedCount;
    }
    if (mergedLockedUntil != null) {
      upsertRow.locked_until = mergedLockedUntil;
    }
    if (telegramIdMeta) {
      upsertRow.telegram_id = telegramIdMeta;
    }

    const { error: upsertErr } = await supabase.from('users').upsert(upsertRow, { onConflict: 'id' });
    if (upsertErr) {
      console.error('Users upsert error:', upsertErr);
      return { ok: false, status: 500, error: 'Failed to sync profile' };
    }
    if (staleUserId) {
      const { error: ordErr } = await supabase
        .from('orders')
        .update({ user_id: userId })
        .eq('user_id', staleUserId);
      if (ordErr) console.error('Users merge: orders reassign error:', ordErr);
      const { error: delErr } = await supabase.from('users').delete().eq('id', staleUserId);
      if (delErr) {
        console.error('Users merge: delete stale row error:', delErr);
        return { ok: false, status: 500, error: 'Failed to sync profile' };
      }
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, surname')
      .eq('id', userId)
      .single();
    if (error || !user) {
      return { ok: false, status: 404, error: 'User profile not found' };
    }

    // Guest checkouts store orders with customer_email but user_id = null.
    // When this user logs in, attach those orders so they appear under My Orders.
    if (emailNorm) {
      const { data: attachedRows, error: attachErr } = await supabase
        .from('orders')
        .update({ user_id: userId })
        .ilike('customer_email', emailNorm)
        .is('user_id', null)
        .select('id');
      if (attachErr) {
        console.error('Attach guest orders error:', attachErr);
      } else if (attachedRows && attachedRows.length) {
        console.log('Attached', attachedRows.length, 'guest order(s) to user', userId);
      }
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });

    if (isNewUser) {
      const signupLines = [];
      signupLines.push('User signed up');
      signupLines.push(`User id: ${user.id}`);
      signupLines.push(`Email: ${email}`);
      signupLines.push(`Name: ${(firstName || '').trim()} ${(surname || '').trim()}`.trim());
      signupLines.push(`Type: ${type}`);
      if (dob) signupLines.push(`DOB: ${dob}`);
      if (mobile) signupLines.push(`Mobile: ${mobile}`);
      if (landline) signupLines.push(`Landline: ${landline}`);
      if (address) signupLines.push(`Address: ${address.slice(0, 60)}${address.length > 60 ? '...' : ''}`);
      if (type === 'company') {
        if (companyName) signupLines.push(`Company name: ${companyName}`);
        if (companyNumber) signupLines.push(`Company number: ${companyNumber}`);
        if (companyContactNumber) signupLines.push(`Company contact: ${companyContactNumber}`);
        if (companyPrincipalContact) signupLines.push(`Company principal contact: ${companyPrincipalContact}`);
      }
      sendTelegramMessage(signupLines.join('\n'))
        .catch((err) => console.error('Telegram signup (auth-token) error:', err));

      // Send a welcome email to the user (for the Supabase Auth signup flow).
      if (resend && resendFrom) {
        const escapeHtml = (str) => {
          if (str == null) return '';
          return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        };
        const siteUrl = baseUrl.replace(/\/$/, '');
        const loginUrl = `${siteUrl}/login.html`;
        const nameLine = `${firstName || ''} ${surname || ''}`.trim() || 'there';
        const html = `
          <p>Hi ${escapeHtml(nameLine)},</p>
          <p>Welcome to <strong>Eslami Electric</strong>!</p>
          <p>Your account is ready. You can log in and start placing orders.</p>
          <p><a href="${loginUrl}">${loginUrl}</a></p>
          <p style="margin-top:1em; color:#64748b; font-size:0.875rem;">— Eslami Electric</p>
        `;
        resend.emails.send({
          from: resendFrom,
          to: [email],
          subject: 'Welcome — your account is ready',
          html
        }).then(() => {
          console.log('Welcome email sent to', email);
        }).catch((err) => {
          console.error('Welcome email error:', err);
        });
      }
    }

    return {
      ok: true,
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, surname: user.surname }
    };
  } catch (err) {
    console.error('Auth token error:', err);
    return { ok: false, status: 500, error: 'Failed to issue token' };
  }
}

app.post('/api/auth/token', async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'accessToken required' });
    }
    const result = await exchangeSupabaseAccessTokenForAppJwt(accessToken);
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.json({ ok: true, token: result.token, user: result.user });
  } catch (err) {
    console.error('Auth token route error:', err);
    return res.status(500).json({ error: 'Failed to issue token' });
  }
});

function verifyTelegramLoginPayload(payload, botToken) {
  if (!payload || typeof payload !== 'object' || !botToken) return false;
  const hash = payload.hash;
  if (!hash || typeof hash !== 'string') return false;
  const authDate = Number(payload.auth_date);
  if (!Number.isFinite(authDate)) return false;
  if (Date.now() / 1000 - authDate > 86400) return false;
  const check = { ...payload };
  delete check.hash;
  const keys = Object.keys(check).sort();
  const dataCheckString = keys.map((k) => `${k}=${check[k]}`).join('\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return hmac === hash;
}

/**
 * Per-login password rotation for Telegram synthetic accounts (users never type this password).
 * Supabase Auth often enforces complexity (lower, upper, digit, symbol) — hex from randomBytes fails that.
 */
function generateTelegramRotationPassword() {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';
  const all = lower + upper + digits + special;
  const chars = [];
  chars.push(lower[crypto.randomInt(lower.length)]);
  chars.push(upper[crypto.randomInt(upper.length)]);
  chars.push(digits[crypto.randomInt(digits.length)]);
  chars.push(special[crypto.randomInt(special.length)]);
  const targetLen = 48;
  while (chars.length < targetLen) {
    chars.push(all[crypto.randomInt(all.length)]);
  }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    const t = chars[i];
    chars[i] = chars[j];
    chars[j] = t;
  }
  return chars.join('');
}

async function findAuthUserIdByEmail(emailNormalized) {
  const target = emailNormalized.trim().toLowerCase();
  try {
    const authBase = `${supabaseUrl.replace(/\/$/, '')}/auth/v1`;
    const url = `${authBase}/admin/users?email=${encodeURIComponent(target)}`;
    const r = await fetch(url, {
      headers: {
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`
      }
    });
    const json = await r.json().catch(() => ({}));
    if (r.ok && json && Array.isArray(json.users)) {
      const hit = json.users.find((u) => (u.email || '').trim().toLowerCase() === target);
      if (hit && hit.id) return hit.id;
    }
  } catch (e) {
    console.warn('findAuthUserIdByEmail direct email lookup:', e.message);
  }
  let page = 1;
  const perPage = 1000;
  // Do not trust data.nextPage from listUsers — Link-header parsing in auth-js can be wrong for page > 9.
  for (let attempt = 0; attempt < 100; attempt++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('findAuthUserIdByEmail listUsers:', error);
      return null;
    }
    const users = data?.users || [];
    if (users.length === 0) break;
    const hit = users.find((u) => (u.email || '').trim().toLowerCase() === target);
    if (hit) return hit.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

/** After linking a real email, Telegram login resolves by this (not by synthetic tg_*@domain). */
async function findUserIdByTelegramId(tgId) {
  if (!tgId || typeof tgId !== 'string') return null;
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', tgId.trim())
    .maybeSingle();
  if (error) {
    console.error('findUserIdByTelegramId:', error);
    return null;
  }
  return data && data.id ? data.id : null;
}

/**
 * Merge Telegram auth metadata without spreading full prevMeta (nested OAuth blobs can break Auth API limits).
 */
function mergeTelegramAuthMetadata(prevMeta, meta) {
  const p = prevMeta && typeof prevMeta === 'object' ? prevMeta : {};
  const out = { ...meta };
  const scalarKeys = [
    'dob',
    'mobile',
    'landline',
    'address',
    'bank_details',
    'company_name',
    'company_number',
    'company_contact_number',
    'company_principal_contact',
    'type'
  ];
  for (const k of scalarKeys) {
    const v = p[k];
    if (v != null && typeof v !== 'object') out[k] = v;
  }
  if (!out.first_name && p.first_name) out.first_name = String(p.first_name).trim();
  if (!out.surname && (p.surname || p.family_name)) {
    out.surname = String(p.surname || p.family_name || '').trim();
  }
  return out;
}

/** Telegram Login Widget: verify hash, create or rotate-password sign-in, return app JWT. */
app.post('/api/auth/telegram', async (req, res) => {
  try {
    const body = req.body || {};
    const telegramBotUsername = (process.env.TELEGRAM_LOGIN_BOT_USERNAME || '').replace(/^@/, '').trim();
    const botToken = (process.env.TELEGRAM_LOGIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const emailDomain = (process.env.TELEGRAM_AUTH_EMAIL_DOMAIN || '').trim().replace(/^@/, '');
    if (!telegramBotUsername || !botToken || !emailDomain) {
      return res.status(503).json({ error: 'Telegram login is not configured' });
    }
    if (!supabaseAnon) {
      return res.status(503).json({ error: 'Server auth is not configured' });
    }
    if (!verifyTelegramLoginPayload(body, botToken)) {
      return res.status(401).json({
        error:
          'Invalid Telegram login data. Use the same bot token as @' +
          telegramBotUsername +
          ' in TELEGRAM_LOGIN_BOT_TOKEN (hash verification failed).'
      });
    }
    const tgId = body.id != null ? String(body.id) : '';
    if (!tgId) return res.status(400).json({ error: 'Missing Telegram user id' });

    const syntheticEmail = `tg_${tgId}@${emailDomain}`.toLowerCase();
    const password = generateTelegramRotationPassword();
    const firstName = (body.first_name && String(body.first_name).trim()) || 'Telegram';
    const lastName = (body.last_name && String(body.last_name).trim()) || '';
    const username = body.username != null ? String(body.username) : '';

    const meta = {
      first_name: firstName,
      surname: lastName,
      telegram_id: tgId,
      telegram_username: username,
      auth_provider: 'telegram',
      address: '',
      type: 'person'
    };

    let created = false;
    let signInEmail = syntheticEmail;

    const byTg = await findUserIdByTelegramId(tgId);
    const bySynthetic = byTg ? null : await findAuthUserIdByEmail(syntheticEmail);
    let existingUserId = byTg || bySynthetic;

    if (existingUserId) {
      let { data: gu, error: guErr } = await supabase.auth.admin.getUserById(existingUserId);
      if (guErr || !gu || !gu.user) {
        const fallbackId = await findAuthUserIdByEmail(syntheticEmail);
        if (fallbackId && fallbackId !== existingUserId) {
          console.warn(
            'Telegram login: auth getUserById failed for public.users id; using auth id from email lookup',
            { tried: existingUserId, fallback: fallbackId }
          );
          existingUserId = fallbackId;
          ({ data: gu, error: guErr } = await supabase.auth.admin.getUserById(existingUserId));
        }
      }
      if (guErr || !gu || !gu.user) {
        console.error('Telegram login getUserById:', guErr);
        return res.status(500).json({
          error:
            'Could not complete Telegram login. Your profile may be out of sync — contact support or try signing in with email if you have a password.'
        });
      }
      signInEmail = (gu.user.email || '').trim().toLowerCase() || syntheticEmail;
      const prevMeta = gu.user.user_metadata || {};
      const mergedMeta = mergeTelegramAuthMetadata(prevMeta, {
        ...meta,
        first_name: firstName || (prevMeta.first_name || '').trim() || meta.first_name,
        surname: lastName || (prevMeta.surname || '').trim() || meta.surname
      });
      const { error: pwdErr } = await supabase.auth.admin.updateUserById(existingUserId, {
        password,
        email_confirm: true
      });
      if (pwdErr) {
        console.error('Telegram login updateUser password:', pwdErr);
        return res.status(500).json({
          error: 'Telegram sign-in failed. Please try again.'
        });
      }
      const { error: metaErr } = await supabase.auth.admin.updateUserById(existingUserId, {
        user_metadata: mergedMeta
      });
      if (metaErr) {
        console.error('Telegram login updateUser metadata (non-fatal):', metaErr);
      }
      await supabase.from('users').update({ telegram_id: tgId }).eq('id', existingUserId).is('telegram_id', null);
    } else {
      const { data: createdData, error: createErr } = await supabase.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: meta
      });
      if (createErr) {
        const msg = (createErr.message || '').toLowerCase();
        const code = String(createErr.code || createErr.status || '');
        if (
          msg.includes('registered') ||
          msg.includes('already') ||
          msg.includes('exists') ||
          code.includes('422') ||
          code.includes('email_exists')
        ) {
          const userId = await findAuthUserIdByEmail(syntheticEmail);
          if (!userId) {
            console.error('Telegram login: user exists but not found in listUsers', syntheticEmail);
            return res.status(500).json({ error: 'Could not complete Telegram login' });
          }
          const { data: gu2 } = await supabase.auth.admin.getUserById(userId);
          signInEmail = (gu2 && gu2.user && gu2.user.email) ? gu2.user.email.trim().toLowerCase() : syntheticEmail;
          const prev2 = gu2 && gu2.user && gu2.user.user_metadata ? gu2.user.user_metadata : {};
          const merged2 = mergeTelegramAuthMetadata(prev2, meta);
          const { error: pwdErr2 } = await supabase.auth.admin.updateUserById(userId, {
            password,
            email_confirm: true
          });
          if (pwdErr2) {
            console.error('Telegram login updateUser password (exists branch):', pwdErr2);
            return res.status(500).json({ error: 'Telegram sign-in failed. Please try again.' });
          }
          const { error: metaErr2 } = await supabase.auth.admin.updateUserById(userId, {
            user_metadata: merged2
          });
          if (metaErr2) {
            console.error('Telegram login updateUser metadata (exists branch, non-fatal):', metaErr2);
          }
          await supabase.from('users').update({ telegram_id: tgId }).eq('id', userId).is('telegram_id', null);
        } else {
          console.error('Telegram login createUser:', createErr);
          return res.status(500).json({ error: 'Could not create account' });
        }
      } else {
        created = !!(createdData && createdData.user);
      }
    }

    signInEmail = signInEmail.trim().toLowerCase();
    let signData = null;
    let signErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await supabaseAnon.auth.signInWithPassword({
        email: signInEmail,
        password
      });
      signData = r.data;
      signErr = r.error;
      if (!signErr && signData?.session?.access_token) break;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
    if (signErr || !signData?.session?.access_token) {
      console.error('Telegram login signIn:', signErr);
      return res.status(500).json({
        error:
          'Could not start session. If this persists, confirm TELEGRAM_AUTH_EMAIL_DOMAIN is a valid domain and the account email is confirmed in Supabase.'
      });
    }

    const accessToken = signData.session.access_token;
    const result = await exchangeSupabaseAccessTokenForAppJwt(accessToken);
    await supabaseAnon.auth.signOut().catch(() => {});

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    await clearLoginLockout(result.user.id);
    return res.json({ ok: true, token: result.token, user: result.user, created });
  } catch (err) {
    console.error('Telegram auth error:', err);
    return res.status(500).json({ error: 'Telegram login failed' });
  }
});

// Signup notifications for the Supabase auth signUp flow (runs immediately after signUp request).
// This avoids waiting for email confirmation / /api/auth/token to be called.
app.post('/api/notify/signup', async (req, res) => {
  try {
    const body = req.body || {};
    const type = body.type || 'person';
    const skipEmail = !!body.skipEmail;
    const firstName = (body.firstName || '').trim();
    const surname = (body.surname || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const dob = body.dob || null;
    const mobile = (body.mobile || '').trim() || null;
    const landline = (body.landline || '').trim() || null;
    const address = (body.address || '').trim() || null;
    const bankDetails = (body.bankDetails || '').trim() || null;
    const companyName = (body.companyName || '').trim() || null;
    const companyNumber = (body.companyNumber || '').trim() || null;
    const companyContactNumber = (body.companyContactNumber || '').trim() || null;
    const companyPrincipalContact = (body.companyPrincipalContact || '').trim() || null;

    if (!email) return res.status(400).json({ error: 'email required' });

    console.log('notify/signup received:', { type, email });

    const fullName = `${firstName} ${surname}`.trim() || 'Customer';

    const lines = [];
    lines.push('New signup (web)');
    lines.push(`Name: ${fullName}`);
    lines.push(`Type: ${type}`);
    lines.push(`Email: ${email}`);
    if (dob) lines.push(`DOB: ${dob}`);
    if (mobile) lines.push(`Mobile: ${mobile}`);
    if (landline) lines.push(`Landline: ${landline}`);
    if (address) lines.push(`Address: ${address.length > 80 ? address.slice(0, 80) + '...' : address}`);
    if (bankDetails) lines.push(`Bank details: [provided]`);
    if (type === 'company') {
      if (companyName) lines.push(`Company name: ${companyName}`);
      if (companyNumber) lines.push(`Company number: ${companyNumber}`);
      if (companyContactNumber) lines.push(`Company contact: ${companyContactNumber}`);
      if (companyPrincipalContact) lines.push(`Company principal contact: ${companyPrincipalContact}`);
    }
    sendTelegramMessage(lines.join('\n'))
      .then(() => console.log('Telegram signup (notify) sent'))
      .catch((err) => console.error('Telegram signup (notify) error:', err));

    if (!skipEmail && resend && resendFrom) {
      const escapeHtml = (str) => {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      };

      const siteUrl = baseUrl.replace(/\/$/, '');
      const redirectTo = `${siteUrl}/auth-callback.html`;

      // Try generating a signup/confirm email link first (needs fewer assumptions).
      // If it fails (e.g. missing password requirement), fall back to a magic link.
      let actionLink = null;
      let usedActionLinkType = null;
      // IMPORTANT:
      // Use `magiclink` for activation, and let `/api/auth/token` force-confirm the email.
      // This avoids any chance of "signup" action links overwriting the user's password.
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo }
      });
      if (linkErr) throw linkErr;
      actionLink = linkData && linkData.properties && linkData.properties.action_link
        ? linkData.properties.action_link
        : null;
      usedActionLinkType = 'magiclink';

      if (!actionLink) {
        throw new Error('Failed to generate Supabase action link');
      }

      console.log('notify/signup: using action link type', usedActionLinkType, 'for', email);

      const html = `
        <p>Hi ${escapeHtml(fullName)},</p>
        <p>Welcome to <strong>Eslami Electric</strong>.</p>
        <p>Please click the button below to activate your account and continue:</p>
        <p style="margin:1em 0;">
          <a href="${actionLink}" style="display:inline-block;background:#f59e0b;color:#111827;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600;">
            Activate / Continue
          </a>
        </p>
        <p style="color:#64748b;font-size:0.875rem;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break:break-word;color:#334155;">${escapeHtml(actionLink)}</p>
        <p style="color:#64748b;font-size:0.875rem;margin-top:1em;">— Eslami Electric</p>
      `;

      resend.emails.send({
        from: resendFrom,
        to: [email],
        subject: 'Activate your account — Eslami Electric',
        html
      }).then(() => {
        console.log('Signup activation email sent to', email);
      }).catch((err) => {
        console.error('Signup activation email error:', err);
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('notify/signup error:', err);
    res.status(500).json({ error: 'Failed to notify signup' });
  }
});

function getCategories() {
  const data = fs.readFileSync(CATEGORIES_FILE, 'utf8');
  return JSON.parse(data).categories;
}

function getAllProducts() {
  const categories = getCategories();
  const products = [];
  for (const cat of categories) {
    for (const p of cat.products) {
      products.push({
        ...p,
        category: cat.name,
        category_fa: cat.name_fa,
        categoryId: cat.id
      });
    }
  }
  return products;
}

// GET all categories (with their products)
app.get('/api/categories', (req, res) => {
  try {
    const categories = getCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// GET all products (flattened, for homepage)
app.get('/api/products', (req, res) => {
  try {
    const products = getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  if (req.socket && req.socket.remoteAddress) return String(req.socket.remoteAddress);
  return '';
}

function normalizeIpForGeo(ip) {
  if (!ip) return '';
  let s = String(ip).trim();
  if (s.startsWith('::ffff:')) s = s.slice(7);
  const colon = s.lastIndexOf(':');
  if (colon > 0 && s.includes('.') && /^[\d.:]+$/.test(s)) {
    const after = s.slice(colon + 1);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(after)) s = after;
  }
  return s;
}

function fetchJsonFromUrl(urlString) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(urlString);
    } catch (e) {
      return resolve(null);
    }
    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { 'User-Agent': 'eslami-electric/1' },
      timeout: 6000
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

async function lookupCountryCodeByIp(ip) {
  const raw = normalizeIpForGeo(ip);
  if (!raw) return '';
  if (raw === '127.0.0.1' || raw === '::1') return '';
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(raw);
  const pathSeg = ipv4 ? `${raw}/json/` : `${encodeURIComponent(raw)}/json/`;
  const j = await fetchJsonFromUrl(`https://ipapi.co/${pathSeg}`);
  if (j && j.country_code) return String(j.country_code).toUpperCase();
  return '';
}

/** IP-based defaults for language and display currency (first visit; client may override). */
app.get('/api/locale-hint', async (req, res) => {
  try {
    const override = (process.env.LOCAL_GEO_COUNTRY || '').trim().toUpperCase();
    let country = '';
    if (override && /^[A-Z]{2}$/.test(override)) {
      country = override;
    } else {
      const raw = normalizeIpForGeo(getClientIp(req));
      const isLocal = !raw || raw === '127.0.0.1' || raw === '::1';
      if (isLocal) {
        country = 'US';
      } else {
        country = await lookupCountryCodeByIp(raw);
      }
    }
    if (!country) country = 'US';
    const usdToToman = Math.max(1, parseInt(process.env.USD_TO_TOMAN || '42000', 10) || 42000);
    const inIran = country === 'IR';
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      country,
      inIran,
      defaultLang: inIran ? 'fa' : 'en',
      defaultCurrency: inIran ? 'toman' : 'usd',
      usdToToman
    });
  } catch (err) {
    console.error('locale-hint error:', err);
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({
      country: 'US',
      inIran: false,
      defaultLang: 'en',
      defaultCurrency: 'usd',
      usdToToman: Math.max(1, parseInt(process.env.USD_TO_TOMAN || '42000', 10) || 42000)
    });
  }
});

// Create user account
app.post('/api/users', async (req, res) => {
  try {
    const {
      type,
      firstName,
      surname,
      dob,
      mobile,
      landline,
      email,
      bankDetails,
      address,
      companyName,
      companyNumber,
      companyContactNumber,
      companyPrincipalContact
    } = req.body;

    if (!type || !['person', 'company'].includes(type)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    const password = req.body.password;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!firstName || !surname || !mobile || !email || !address) {
      return res.status(400).json({ error: 'Missing required personal fields' });
    }

    const emailNormalized = email.trim().toLowerCase();

    if (!validationPatterns.name.test(firstName)) {
      return res.status(400).json({ error: 'First name must be 2-50 letters (English or Persian)' });
    }
    if (!validationPatterns.name.test(surname)) {
      return res.status(400).json({ error: 'Surname must be 2-50 letters (English or Persian)' });
    }
    if (dob && !validationPatterns.dob.test(dob)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    }
    if (!validationPatterns.mobile.test(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }
    if (landline && !validationPatterns.landline.test(landline)) {
      return res.status(400).json({ error: 'Invalid landline format' });
    }
    if (!validationPatterns.email.test(emailNormalized)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validationPatterns.address.test(address)) {
      return res.status(400).json({ error: 'Address must be 10-200 characters' });
    }

    if (type === 'company' && (!companyName || !companyNumber)) {
      return res.status(400).json({ error: 'Missing required company fields' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        type,
        first_name: firstName,
        surname,
        dob: dob || null,
        mobile,
        landline: landline || null,
        email: emailNormalized,
        password_hash: passwordHash,
        bank_details: bankDetails || null,
        address,
        company_name: type === 'company' ? companyName : null,
        company_number: type === 'company' ? companyNumber : null,
        company_contact_number: type === 'company' ? companyContactNumber : null,
        company_principal_contact: type === 'company' ? companyPrincipalContact : null
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'This email is already registered' });
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    const token = jwt.sign({ userId: newUser.id }, jwtSecret, { expiresIn: '7d' });
    // Fire-and-forget admin notification (only if Telegram env vars are set).
    const signupLines = [];
    signupLines.push('New signup');
    signupLines.push(`Name: ${(firstName || '').trim()} ${(surname || '').trim()}`.trim());
    signupLines.push(`Type: ${type}`);
    signupLines.push(`Email: ${emailNormalized}`);
    if (dob) signupLines.push(`DOB: ${dob}`);
    if (mobile) signupLines.push(`Mobile: ${mobile}`);
    if (landline) signupLines.push(`Landline: ${landline}`);
    if (address) signupLines.push(`Address: ${address}`);
    if (type === 'company') {
      if (companyName) signupLines.push(`Company name: ${companyName}`);
      if (companyNumber) signupLines.push(`Company number: ${companyNumber}`);
      if (companyContactNumber) signupLines.push(`Company contact: ${companyContactNumber}`);
      if (companyPrincipalContact) signupLines.push(`Company principal contact: ${companyPrincipalContact}`);
    }
    signupLines.push(`User id: ${newUser.id}`);
    sendTelegramMessage(signupLines.join('\n'))
      .catch((err) => console.error('Telegram signup notification error:', err));
    res.status(201).json({ ok: true, userId: newUser.id, token });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

async function clearLoginLockout(userId) {
  await supabase
    .from('users')
    .update({ login_failed_count: 0, locked_until: null })
    .eq('id', userId);
}

/** Record a failed password attempt; may set locked_until when threshold reached. */
async function recordFailedPasswordAttempt(emailNormalized) {
  const { data: row } = await supabase
    .from('users')
    .select('id, login_failed_count')
    .eq('email', emailNormalized)
    .maybeSingle();
  if (!row) return { locked: false };
  const n = (row.login_failed_count || 0) + 1;
  const updates = { login_failed_count: n };
  let lockedUntilIso = null;
  if (n >= LOGIN_LOCKOUT_MAX_ATTEMPTS) {
    lockedUntilIso = new Date(Date.now() + LOGIN_LOCKOUT_MINUTES * 60 * 1000).toISOString();
    updates.locked_until = lockedUntilIso;
  }
  await supabase.from('users').update(updates).eq('id', row.id);
  return { locked: n >= LOGIN_LOCKOUT_MAX_ATTEMPTS, lockedUntilIso };
}

// Password login (Supabase Auth + optional legacy bcrypt in public.users). Enforces lockout on failures.
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailNormalized = (email && typeof email === 'string') ? email.trim().toLowerCase() : '';
    if (!emailNormalized || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: profileRow } = await supabase
      .from('users')
      .select('id, email, first_name, surname, password_hash, locked_until, login_failed_count')
      .eq('email', emailNormalized)
      .maybeSingle();

    // Clear expired lock only (do not block login here — correct password must work after Forgot password reset).
    if (profileRow && profileRow.locked_until) {
      const until = new Date(profileRow.locked_until);
      if (until <= new Date()) {
        await supabase
          .from('users')
          .update({ locked_until: null, login_failed_count: 0 })
          .eq('id', profileRow.id);
        profileRow.locked_until = null;
        profileRow.login_failed_count = 0;
      }
    }

    let accessToken = null;

    if (supabaseAnon) {
      const { data: signData, error: signErr } = await supabaseAnon.auth.signInWithPassword({
        email: emailNormalized,
        password
      });
      if (!signErr && signData && signData.session && signData.session.access_token) {
        accessToken = signData.session.access_token;
      }
    }

    if (!accessToken && profileRow && profileRow.password_hash) {
      const match = await bcrypt.compare(password, profileRow.password_hash);
      if (match) {
        await clearLoginLockout(profileRow.id);
        const token = jwt.sign({ userId: profileRow.id }, jwtSecret, { expiresIn: '7d' });
        return res.json({
          ok: true,
          token,
          user: {
            id: profileRow.id,
            email: profileRow.email,
            firstName: profileRow.first_name,
            surname: profileRow.surname
          }
        });
      }
    }

    if (accessToken) {
      const result = await exchangeSupabaseAccessTokenForAppJwt(accessToken);
      if (supabaseAnon) await supabaseAnon.auth.signOut().catch(() => {});
      if (!result.ok) {
        return res.status(result.status).json({ error: result.error });
      }
      await clearLoginLockout(result.user.id);
      return res.json({ ok: true, token: result.token, user: result.user });
    }

    // Auth failed: if still locked, do not count another failure (fresh read — e.g. after reset in another tab).
    const { data: lockRow } = await supabase
      .from('users')
      .select('locked_until')
      .eq('email', emailNormalized)
      .maybeSingle();
    if (lockRow && lockRow.locked_until && new Date(lockRow.locked_until) > new Date()) {
      return res.status(423).json({
        error: `Too many failed login attempts. Try again after ${new Date(lockRow.locked_until).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC or use Forgot password.`,
        lockedUntil: lockRow.locked_until
      });
    }

    const { locked, lockedUntilIso } = await recordFailedPasswordAttempt(emailNormalized);
    if (locked && lockedUntilIso) {
      return res.status(423).json({
        error: `Too many failed login attempts. Account locked for ${LOGIN_LOCKOUT_MINUTES} minutes. You can also use Forgot password.`,
        lockedUntil: lockedUntilIso
      });
    }
    return res.status(401).json({ error: 'Invalid email or password' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user (requires Authorization: Bearer <token>)
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Not authenticated' });
  }
}

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, type, first_name, surname, dob, mobile, landline, email, contact_email, address, bank_details, company_name, company_number, company_contact_number, company_principal_contact, created_at, telegram_id')
      .eq('id', req.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    const json = profileRowToJson(user);
    const checkout = await getCheckoutProfileStatus(req.userId, user);
    json.checkoutProfileComplete = checkout.complete;
    json.checkoutProfileMissing = checkout.missing;
    json.checkoutProfileRequired = checkout.requiresCheckoutProfile;
    if (json && !isSyntheticTelegramAuthEmail(user.email)) {
      const ae = checkout.authEmail != null ? String(checkout.authEmail).trim() : '';
      const pe = (user.email || '').trim().toLowerCase();
      if (ae && validationPatterns.email.test(ae.toLowerCase()) && (!pe || !validationPatterns.email.test(pe))) {
        json.email = ae;
      }
    }
    res.json(json);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

/** Telegram-only synthetic auth email → real email + password (same Supabase user id). */
app.post('/api/auth/link-email-password', authMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailNormalized = (email && String(email).trim().toLowerCase()) || '';
    const passwordPlain = password != null ? String(password) : '';
    if (!emailNormalized || !validationPatterns.email.test(emailNormalized)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (passwordPlain.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const { data: authUser, error: getErr } = await supabase.auth.admin.getUserById(req.userId);
    if (getErr || !authUser || !authUser.user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const currentEmail = (authUser.user.email || '').trim().toLowerCase();
    if (!isSyntheticTelegramAuthEmail(currentEmail)) {
      return res.status(400).json({ error: 'Your account already has a real email address.' });
    }
    const otherId = await findAuthUserIdByEmail(emailNormalized);
    if (otherId && otherId !== req.userId) {
      return res.status(400).json({
        error:
          'That email is already registered to another account. Use Contact email on your profile (Save changes) for orders and receipts, or sign in with that email instead of Telegram.'
      });
    }
    const tgId =
      authUser.user.user_metadata && authUser.user.user_metadata.telegram_id != null
        ? String(authUser.user.user_metadata.telegram_id).trim()
        : '';
    const { error: updErr } = await supabase.auth.admin.updateUserById(req.userId, {
      email: emailNormalized,
      password: passwordPlain,
      email_confirm: true
    });
    if (updErr) {
      console.error('link-email-password auth update:', updErr);
      return res.status(400).json({ error: updErr.message || 'Could not update email' });
    }
    const { error: dbErr } = await supabase
      .from('users')
      .update({
        email: emailNormalized,
        contact_email: null,
        ...(tgId ? { telegram_id: tgId } : {})
      })
      .eq('id', req.userId);
    if (dbErr) {
      console.error('link-email-password users update:', dbErr);
      return res.status(500).json({ error: 'Could not update profile' });
    }
    if (resend && resendFrom) {
      const siteUrl = baseUrl.replace(/\/$/, '');
      const loginUrl = `${siteUrl}/login.html`;
      const esc = (s) =>
        String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const html = `
        <p>Hi,</p>
        <p>Your Eslami Electric account email is now <strong>${esc(emailNormalized)}</strong>.</p>
        <p>You can sign in with this email and the password you just set. Telegram sign-in still works too.</p>
        <p><a href="${esc(loginUrl)}">${esc(loginUrl)}</a></p>
        <p style="margin-top:1em;color:#64748b;font-size:0.875rem;">— Eslami Electric</p>
      `;
      resend.emails
        .send({
          from: resendFrom,
          to: [emailNormalized],
          subject: 'Your account email is set',
          html
        })
        .catch((err) => console.error('link-email-password welcome email:', err));
    }
    res.json({ ok: true, email: emailNormalized });
  } catch (err) {
    console.error('link-email-password error:', err);
    res.status(500).json({ error: 'Failed to link email' });
  }
});

const PROFILE_PATCH_KEYS = [
  'firstName',
  'surname',
  'dob',
  'mobile',
  'landline',
  'contactEmail',
  'address',
  'bankDetails',
  'companyName',
  'companyNumber',
  'companyContactNumber',
  'companyPrincipalContact'
];

app.patch('/api/me', authMiddleware, async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (body.email !== undefined) {
      return res.status(400).json({ error: 'Email cannot be changed here' });
    }

    const patch = {};
    for (const k of PROFILE_PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) patch[k] = body[k];
    }
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data: row, error: fetchErr } = await supabase
      .from('users')
      .select('id, type')
      .eq('id', req.userId)
      .single();

    if (fetchErr || !row) return res.status(404).json({ error: 'User not found' });

    const companyKeys = ['companyName', 'companyNumber', 'companyContactNumber', 'companyPrincipalContact'];
    const hasCompanyKey = companyKeys.some((k) => Object.prototype.hasOwnProperty.call(patch, k));
    if (row.type !== 'company' && hasCompanyKey) {
      return res.status(400).json({ error: 'Company fields are only for company accounts' });
    }

    const updates = {};

    if (patch.firstName !== undefined) {
      const v = String(patch.firstName).trim();
      if (!validationPatterns.name.test(v)) {
        return res.status(400).json({ error: 'First name must be 2-50 letters (English or Persian)' });
      }
      updates.first_name = v;
    }
    if (patch.surname !== undefined) {
      const v = String(patch.surname).trim();
      if (!validationPatterns.name.test(v)) {
        return res.status(400).json({ error: 'Surname must be 2-50 letters (English or Persian)' });
      }
      updates.surname = v;
    }
    if (patch.dob !== undefined) {
      const v = patch.dob === null || patch.dob === '' ? null : String(patch.dob).trim();
      if (v && !validationPatterns.dob.test(v)) {
        return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
      }
      updates.dob = v;
    }
    if (patch.mobile !== undefined) {
      const v = String(patch.mobile).trim();
      if (!validationPatterns.mobile.test(v)) {
        return res.status(400).json({ error: 'Invalid mobile number format' });
      }
      updates.mobile = v;
    }
    if (patch.landline !== undefined) {
      const v = patch.landline === null || patch.landline === '' ? null : String(patch.landline).trim();
      if (v && !validationPatterns.landline.test(v)) {
        return res.status(400).json({ error: 'Invalid landline format' });
      }
      updates.landline = v;
    }
    if (patch.contactEmail !== undefined) {
      const raw = patch.contactEmail;
      const v = raw === null || raw === '' ? null : String(raw).trim().toLowerCase();
      if (v && !validationPatterns.email.test(v)) {
        return res.status(400).json({ error: 'Invalid contact email format' });
      }
      updates.contact_email = v;
    }
    if (patch.address !== undefined) {
      const v = String(patch.address).trim();
      if (!validationPatterns.address.test(v)) {
        return res.status(400).json({ error: 'Address must be 10-200 characters' });
      }
      updates.address = v;
    }
    if (patch.bankDetails !== undefined) {
      const raw = patch.bankDetails;
      const v = raw === null || raw === '' ? null : String(raw).trim();
      if (v && v.length > 500) {
        return res.status(400).json({ error: 'Bank details must be at most 500 characters' });
      }
      updates.bank_details = v;
    }

    if (row.type === 'company') {
      if (patch.companyName !== undefined) {
        const v = String(patch.companyName).trim();
        if (!validationPatterns.companyName.test(v)) {
          return res.status(400).json({ error: 'Invalid company name' });
        }
        updates.company_name = v;
      }
      if (patch.companyNumber !== undefined) {
        const v = String(patch.companyNumber).trim();
        if (!validationPatterns.companyNumber.test(v)) {
          return res.status(400).json({ error: 'Invalid company number' });
        }
        updates.company_number = v;
      }
      if (patch.companyContactNumber !== undefined) {
        const v = patch.companyContactNumber === null || patch.companyContactNumber === ''
          ? null
          : String(patch.companyContactNumber).trim();
        if (v && !isValidPhoneOrCompanyLine(v)) {
          return res.status(400).json({ error: 'Invalid company contact number' });
        }
        updates.company_contact_number = v;
      }
      if (patch.companyPrincipalContact !== undefined) {
        const raw = patch.companyPrincipalContact;
        let v = null;
        if (raw !== null && raw !== '') {
          v = String(raw).trim();
          if (v === '') v = null;
        }
        if (v !== null && !validationPatterns.principalContact.test(v)) {
          return res.status(400).json({ error: 'Invalid principal contact' });
        }
        updates.company_principal_contact = v;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data: updated, error: upErr } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.userId)
      .select('id, type, first_name, surname, dob, mobile, landline, email, contact_email, address, bank_details, company_name, company_number, company_contact_number, company_principal_contact, created_at')
      .single();

    if (upErr) {
      console.error('PATCH /api/me error:', upErr);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json(profileRowToJson(updated));
  } catch (err) {
    console.error('Patch me error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Forgot password: request a reset link (emailed via Resend; do not expose reset URLs in JSON)
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const emailNormalized = (email && typeof email === 'string') ? email.trim().toLowerCase() : '';
    if (!emailNormalized) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!validationPatterns.email.test(emailNormalized)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    const siteUrl = getPublicBaseUrlForClient(req);
    const escapeHtml = (str) => {
      if (str == null) return '';
      return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    };
    const genericOk = () =>
      res.json({
        ok: true,
        message: 'If that email is registered, you will receive a reset link. Check your inbox and spam folder.'
      });

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailNormalized)
      .maybeSingle();

    if (userErr) {
      console.error('Forgot password lookup error:', userErr);
      return res.status(500).json({ error: 'Failed to request reset' });
    }

    if (userRow && userRow.id) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      const { error } = await supabase
        .from('users')
        .update({ reset_token: resetToken, reset_token_expires: expiresAt.toISOString() })
        .eq('id', userRow.id);

      if (error) {
        console.error('Forgot password update error:', error);
        return res.status(500).json({ error: 'Failed to request reset' });
      }

      const resetLink = `${siteUrl}/reset-password.html?token=${encodeURIComponent(resetToken)}`;

      if (!resend || !resendFrom) {
        console.error('Forgot password: RESEND_API_KEY / RESEND_FROM not configured; cannot send email');
        return res.status(503).json({ error: 'Password reset email is not configured' });
      }

      try {
        await resend.emails.send({
          from: resendFrom,
          to: [emailNormalized],
          subject: 'Reset your Eslami Electric password',
          html: `
            <p>Hi,</p>
            <p>We received a request to reset the password for your account.</p>
            <p><a href="${escapeHtml(resetLink)}">Set a new password</a></p>
            <p style="margin-top:1em;color:#64748b;font-size:0.875rem;">This link expires in one hour. If you did not request this, you can ignore this email.</p>
            <p style="margin-top:1em;color:#64748b;font-size:0.875rem;">— Eslami Electric</p>
          `
        });
        console.log('Forgot password email sent (app token) to', emailNormalized);
      } catch (sendErr) {
        console.error('Forgot password Resend error:', sendErr);
        return res.status(500).json({ error: 'Failed to send reset email' });
      }

      return genericOk();
    }

    const authUserId = await findAuthUserIdByEmail(emailNormalized);
    if (!authUserId) {
      return genericOk();
    }

    const { data: linkData, error: glErr } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: emailNormalized,
      options: {
        redirectTo: `${siteUrl}/update-password.html`
      }
    });

    const actionLink =
      linkData &&
      linkData.properties &&
      (linkData.properties.action_link || linkData.properties.href || linkData.properties.confirmation_url);

    if (glErr || !actionLink) {
      console.error('Forgot password generateLink:', glErr, linkData);
      return res.status(500).json({ error: 'Failed to request reset' });
    }

    if (!resend || !resendFrom) {
      console.error('Forgot password: RESEND_API_KEY / RESEND_FROM not configured; cannot send recovery email');
      return res.status(503).json({ error: 'Password reset email is not configured' });
    }

    try {
      await resend.emails.send({
        from: resendFrom,
        to: [emailNormalized],
        subject: 'Reset your Eslami Electric password',
        html: `
          <p>Hi,</p>
          <p>We received a request to reset the password for your account.</p>
          <p><a href="${escapeHtml(actionLink)}">Set a new password</a></p>
          <p style="margin-top:1em;color:#64748b;font-size:0.875rem;">If you did not request this, you can ignore this email.</p>
          <p style="margin-top:1em;color:#64748b;font-size:0.875rem;">— Eslami Electric</p>
        `
      });
      console.log('Forgot password email sent (Supabase recovery link) to', emailNormalized);
    } catch (sendErr) {
      console.error('Forgot password Resend error (recovery):', sendErr);
      return res.status(500).json({ error: 'Failed to send reset email' });
    }

    return genericOk();
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to request reset' });
  }
});

// Reset password: set new password using token
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (findError || !user) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    const expires = user.reset_token_expires ? new Date(user.reset_token_expires) : null;
    if (!expires || expires < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires: null,
        login_failed_count: 0,
        locked_until: null
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Reset password update error:', updateError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    const { error: authPwdErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword
    });
    if (authPwdErr) {
      console.error('Reset password: Supabase Auth password sync failed (login may still work via app DB):', authPwdErr);
    }

    res.json({ ok: true, message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Claim account: get claim token validity and masked email (for guest who purchased)
app.get('/api/claim-account/:token', async (req, res) => {
  try {
    const token = (req.params.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token required' });
    const { data: claim, error } = await supabase
      .from('account_claims')
      .select('email, expires_at, used_at')
      .eq('token', token)
      .single();
    if (error || !claim) return res.status(404).json({ error: 'Invalid or expired link' });
    if (claim.used_at) return res.status(400).json({ error: 'This link has already been used' });
    const expires = claim.expires_at ? new Date(claim.expires_at) : null;
    if (!expires || expires < new Date()) return res.status(400).json({ error: 'This link has expired' });
    const email = claim.email || '';
    const at = email.indexOf('@');
    const masked = at > 0 ? email.slice(0, Math.min(2, at)) + '***' + email.slice(at) : '***';
    res.json({ valid: true, email: masked });
  } catch (err) {
    console.error('Claim get error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Claim account: set password and create user, attach guest orders to new user
app.post('/api/claim-account', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords do not match' });

    const { data: claim, error: claimErr } = await supabase
      .from('account_claims')
      .select('id, email, expires_at, used_at')
      .eq('token', token)
      .single();
    if (claimErr || !claim) return res.status(400).json({ error: 'Invalid or expired link' });
    if (claim.used_at) return res.status(400).json({ error: 'This link has already been used' });
    const expires = claim.expires_at ? new Date(claim.expires_at) : null;
    if (!expires || expires < new Date()) return res.status(400).json({ error: 'This link has expired' });

    const emailNormalized = (claim.email || '').trim().toLowerCase();
    if (!validationPatterns.email.test(emailNormalized)) return res.status(400).json({ error: 'Invalid email on claim' });

    const { data: existingUser } = await supabase.from('users').select('id').eq('email', emailNormalized).single();
    if (existingUser) return res.status(400).json({ error: 'This email is already registered. Please log in instead.' });

    const { data: orderRow } = await supabase
      .from('orders')
      .select('id, order_number, stripe_session_id, amount_total, currency, guest_access_token, customer_name, customer_email, line_items, created_at')
      .eq('customer_email', emailNormalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const name = (orderRow && orderRow.customer_name) ? String(orderRow.customer_name).trim() : '';
    const parts = (name || 'Customer').trim().split(/\s+/);
    const firstName = parts[0] || 'Customer';
    const surname = parts.slice(1).join(' ') || '';

    const passwordHash = await bcrypt.hash(password, 10);
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        type: 'person',
        first_name: firstName,
        surname: surname || '—',
        email: emailNormalized,
        password_hash: passwordHash,
        mobile: '',
        landline: null,
        address: '—'
      })
      .select('id')
      .single();
    if (insertErr) {
      if (insertErr.code === '23505') return res.status(400).json({ error: 'This email is already registered' });
      console.error('Claim user insert error:', insertErr);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    const { error: ordersErr } = await supabase.from('orders').update({ user_id: newUser.id }).eq('customer_email', emailNormalized).is('user_id', null);
    if (ordersErr) console.error('Claim orders update error:', ordersErr);

    await supabase.from('account_claims').update({ used_at: new Date().toISOString() }).eq('token', token);

    const jwtToken = jwt.sign({ userId: newUser.id }, jwtSecret, { expiresIn: '7d' });
    // Fire-and-forget admin notification (only if Telegram env vars are set).
    const claimLines = [];
    claimLines.push('Guest account claimed');
    claimLines.push(`Email: ${emailNormalized}`);
    claimLines.push(`New user id: ${newUser.id}`);
    if (orderRow) {
      claimLines.push(`Latest order: ${orderRow.order_number || orderRow.id || '-'}`);
      if (orderRow.amount_total != null) {
        const usd = Number(orderRow.amount_total) / 100;
        claimLines.push(`Amount: $${usd.toFixed(2)} ${String(orderRow.currency || 'usd').toUpperCase()}`);
      }
      if (orderRow.customer_name) claimLines.push(`Customer name: ${orderRow.customer_name}`);
      const items = Array.isArray(orderRow.line_items) ? orderRow.line_items : [];
      if (items.length > 0) {
        claimLines.push(`Items:`);
        items.slice(0, 8).forEach((it) => {
          const name = it.name || 'Item';
          const qty = it.quantity || 1;
          const cents = it.amount_total != null ? Number(it.amount_total) : 0;
          claimLines.push(`- ${name} x${qty} = $${(cents / 100).toFixed(2)}`);
        });
        if (items.length > 8) claimLines.push(`(+${items.length - 8} more items)`);
      }
      if (orderRow.guest_access_token) {
        const siteUrl = baseUrl.replace(/\/$/, '');
        const trackLink = `${siteUrl}/order.html?token=${encodeURIComponent(orderRow.guest_access_token)}`;
        claimLines.push(`Tracking: ${trackLink}`);
      }
      if (orderRow.stripe_session_id) claimLines.push(`Stripe session: ${orderRow.stripe_session_id}`);
    } else {
      claimLines.push('Latest order: none found for this email');
    }
    sendTelegramMessage(claimLines.join('\n'))
      .catch((err) => console.error('Telegram claim notification error:', err));

    // Send welcome/account-ready email to the guest.
    // Guests create the account via this endpoint, so they won't automatically get Supabase auth emails.
    if (resend && resendFrom) {
      const escapeHtml = (str) => {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
      };
      const siteUrl = baseUrl.replace(/\/$/, '');
      const loginUrl = `${siteUrl}/login.html`;
      const orderNumber = orderRow && (orderRow.order_number || orderRow.id) ? (orderRow.order_number || orderRow.id) : '';
      const trackingUrl = orderRow && orderRow.guest_access_token
        ? `${siteUrl}/order.html?token=${encodeURIComponent(orderRow.guest_access_token)}`
        : `${siteUrl}/orders.html`;

      const html = `
        <p>Hi ${escapeHtml(`${firstName} ${surname}`.trim() || firstName || 'Customer')},</p>
        <p>Your account has been created successfully.</p>
        <p>You can log in using the <strong>email</strong> you provided and the <strong>password</strong> you set on this page.</p>
        <p><a href="${loginUrl}">${loginUrl}</a></p>
        ${orderNumber ? `<p style="margin-top:1em;">Order reference: <strong>${escapeHtml(orderNumber)}</strong></p>` : ''}
        <p>Track your order anytime: <a href="${trackingUrl}">${trackingUrl}</a></p>
        <p style="color:#64748b;font-size:0.875rem;margin-top:1em;">— Eslami Electric</p>
      `;

      resend.emails.send({
        from: resendFrom,
        to: [emailNormalized],
        subject: 'Welcome — your account is ready',
        html
      }).then(() => {
        console.log('Welcome email sent to', emailNormalized);
      }).catch((err) => {
        console.error('Welcome email error:', err);
      });
    }
    res.json({ ok: true, token: jwtToken, message: 'Account claimed. You can now view your orders.' });
  } catch (err) {
    console.error('Claim account error:', err);
    res.status(500).json({ error: 'Failed to claim account' });
  }
});

const ORDER_RESUME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Stripe Checkout: create session (priceId, amount in cents, or lineItems from basket)
app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env' });
  }
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const payload = jwt.verify(token, jwtSecret);
        userId = payload.userId;
      } catch (_) { /* optional auth */ }
    }
    const {
      priceId,
      amount,
      lineItems: bodyLineItems,
      guestEmail,
      guestName,
      guestPhone,
      shippingAddress,
      locale,
      fulfillmentType: rawFulfillment,
      pendingOrderId: rawPendingOrderId
    } = req.body || {};
    const pendingOrderId = rawPendingOrderId != null ? String(rawPendingOrderId).trim() : '';

    if (userId) {
      const checkout = await getCheckoutProfileStatus(userId);
      if (checkout.requiresCheckoutProfile && !checkout.complete) {
        return res.status(403).json({
          error:
            'Complete your profile before checkout: first name, surname, mobile, and email. Open My Profile to finish.',
          code: 'PROFILE_INCOMPLETE',
          missing: checkout.missing
        });
      }
    }

    const fulfillmentType = rawFulfillment === 'collection' ? 'collection' : 'delivery';

    const isGuest = !userId;
    const localeSeg = (locale === 'fa' || locale === 'en') ? locale : 'en';
    const pathPrefix = '/' + localeSeg + '/';
    if (isGuest && Array.isArray(bodyLineItems) && bodyLineItems.length > 0) {
      const email = (guestEmail || '').trim().toLowerCase();
      const name = (guestName || '').trim();
      if (!email || !validationPatterns.email.test(email)) {
        return res.status(400).json({ error: 'Valid email is required for guest checkout' });
      }
      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Full name is required for guest checkout' });
      }
      if (fulfillmentType === 'delivery') {
        const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
        const addressLine1 = (addr && (addr.line1 || addr.address || addr.street)) ? String(addr.line1 || addr.address || addr.street).trim() : '';
        if (!addressLine1 || addressLine1.length < 5) {
          return res.status(400).json({ error: 'Shipping address is required for delivery' });
        }
      }
    }
    if (!isGuest && userId && fulfillmentType === 'delivery' && Array.isArray(bodyLineItems) && bodyLineItems.length > 0) {
      const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
      const addressLine1 = (addr && (addr.line1 || addr.address || addr.street)) ? String(addr.line1 || addr.address || addr.street).trim() : '';
      if (!addressLine1 || addressLine1.length < 5) {
        return res.status(400).json({ error: 'Delivery address is required for delivery orders' });
      }
    }

    const successUrl = baseUrl.replace(/\/$/, '') + pathPrefix + 'checkout-success?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = baseUrl.replace(/\/$/, '') + pathPrefix + 'basket';

    let lineItems;
    if (priceId) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else if (Array.isArray(bodyLineItems) && bodyLineItems.length > 0) {
      lineItems = bodyLineItems.map((item) => ({
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(item.price) * 100),
          product_data: { name: item.name || 'Item' }
        },
        quantity: item.quantity || 1
      }));
    } else if (amount != null && Number(amount) > 0) {
      const amountCents = Math.round(Number(amount));
      lineItems = [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: 'Order' }
        },
        quantity: 1
      }];
    } else {
      return res.status(400).json({ error: 'Provide priceId, amount (in cents), or lineItems' });
    }

    if (pendingOrderId) {
      if (!userId) {
        return res.status(400).json({ error: 'Sign in to update a pending order before payment.' });
      }
      if (!ORDER_RESUME_UUID.test(pendingOrderId)) {
        return res.status(400).json({ error: 'Invalid order id' });
      }
      if (priceId) {
        return res.status(400).json({ error: 'Use basket line items when updating a pending order.' });
      }
      if (!Array.isArray(bodyLineItems) || bodyLineItems.length === 0) {
        return res.status(400).json({ error: 'Basket line items are required to update a pending order.' });
      }
    }

    let loggedInCustomerEmail = null;
    if (userId) {
      const { data: prof } = await supabase
        .from('users')
        .select('email, contact_email')
        .eq('id', userId)
        .maybeSingle();
      if (prof) {
        const authEmail = (prof.email || '').trim().toLowerCase();
        const contact = (prof.contact_email || '').trim().toLowerCase();
        const contactOk = contact && validationPatterns.email.test(contact);
        const authOk = authEmail && validationPatterns.email.test(authEmail) && !isSyntheticTelegramAuthEmail(authEmail);
        loggedInCustomerEmail = contactOk ? contact : authOk ? authEmail : null;
      }
    }

    const lineItemsForDb = Array.isArray(bodyLineItems) && bodyLineItems.length > 0
      ? bodyLineItems.map((item) => {
          const pid = item.productId != null ? String(item.productId).trim() : item.id != null ? String(item.id).trim() : '';
          const row = {
            name: item.name || 'Item',
            quantity: item.quantity || 1,
            unit_amount: Math.round(Number(item.price) * 100),
            amount_total: Math.round(Number(item.price) * 100) * (item.quantity || 1)
          };
          if (pid) row.product_id = pid;
          return row;
        })
      : [];

    if (pendingOrderId) {
      const { data: existingOrder, error: exErr } = await supabase
        .from('orders')
        .select('id, order_number, status, user_id, stripe_session_id')
        .eq('id', pendingOrderId)
        .eq('user_id', userId)
        .single();
      if (exErr || !existingOrder) {
        return res.status(404).json({ error: 'Order not found' });
      }
      if (existingOrder.status !== 'pending') {
        return res.status(400).json({ error: 'This order is not pending payment.' });
      }
      await expireStripeCheckoutSessionIfPossible(existingOrder.stripe_session_id);

      const sessionParamsPending = {
        mode: 'payment',
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { order_id: existingOrder.id, fulfillment: fulfillmentType }
      };
      sessionParamsPending.client_reference_id = String(userId);
      if (loggedInCustomerEmail) {
        sessionParamsPending.customer_email = loggedInCustomerEmail;
      }
      const sessionPending = await stripe.checkout.sessions.create(sessionParamsPending);
      const amountTotal = sessionPending.amount_total || 0;

      const updatePayload = {
        stripe_session_id: sessionPending.id,
        amount_total: amountTotal,
        currency: 'usd',
        line_items: lineItemsForDb,
        fulfillment_type: fulfillmentType
      };
      if (loggedInCustomerEmail) {
        updatePayload.customer_email = loggedInCustomerEmail;
      }
      if (fulfillmentType === 'delivery') {
        const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
        if (addr) {
          updatePayload.shipping_address = {
            line1: (addr.line1 || addr.address || addr.street || '').trim() || null,
            line2: (addr.line2 || '').trim() || null,
            city: (addr.city || '').trim() || null,
            state: (addr.state || addr.province || '').trim() || null,
            postal_code: (addr.postal_code || addr.postalCode || '').trim() || null,
            country: (addr.country || '').trim() || null
          };
          const extra = trimDeliveryAdditionalInfo(addr);
          if (extra) updatePayload.shipping_address.additional_info = extra;
        }
      } else {
        updatePayload.shipping_address = null;
      }

      const { data: updatedRows, error: upErr } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', existingOrder.id)
        .eq('status', 'pending')
        .select('id');
      if (upErr) {
        console.error('Update pending order checkout error:', upErr);
        return res.status(500).json({ error: 'Failed to update order' });
      }
      if (!updatedRows || updatedRows.length === 0) {
        return res.status(409).json({ error: 'Order is no longer pending.' });
      }
      return res.json({ url: sessionPending.url, sessionId: sessionPending.id });
    }

    const orderId = crypto.randomUUID();
    let orderNumber = generateOrderNumber();
    const sessionParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { order_id: orderId, fulfillment: fulfillmentType }
    };
    if (userId) sessionParams.client_reference_id = String(userId);
    if (isGuest && guestEmail) {
      sessionParams.customer_email = (guestEmail || '').trim().toLowerCase();
    } else if (userId && loggedInCustomerEmail) {
      sessionParams.customer_email = loggedInCustomerEmail;
    }
    const session = await stripe.checkout.sessions.create(sessionParams);

    const amountTotal = session.amount_total || 0;

    const orderRow = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId || null,
      stripe_session_id: session.id,
      amount_total: amountTotal,
      currency: 'usd',
      status: 'pending',
      line_items: lineItemsForDb,
      fulfillment_type: fulfillmentType
    };
    if (userId && loggedInCustomerEmail) {
      orderRow.customer_email = loggedInCustomerEmail;
    }
    if (isGuest) {
      orderRow.guest_access_token = crypto.randomBytes(24).toString('hex');
      orderRow.customer_email = (guestEmail || '').trim().toLowerCase();
      orderRow.customer_name = (guestName || '').trim() || null;
      orderRow.customer_phone = (guestPhone || '').trim() || null;
      const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
      if (addr && fulfillmentType === 'delivery') {
        orderRow.shipping_address = {
          line1: (addr.line1 || addr.address || addr.street || '').trim() || null,
          line2: (addr.line2 || '').trim() || null,
          city: (addr.city || '').trim() || null,
          state: (addr.state || addr.province || '').trim() || null,
          postal_code: (addr.postal_code || addr.postalCode || '').trim() || null,
          country: (addr.country || '').trim() || null
        };
        const extra = trimDeliveryAdditionalInfo(addr);
        if (extra) orderRow.shipping_address.additional_info = extra;
      }
    } else if (userId && fulfillmentType === 'delivery') {
      const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
      if (addr) {
        orderRow.shipping_address = {
          line1: (addr.line1 || addr.address || addr.street || '').trim() || null,
          line2: (addr.line2 || '').trim() || null,
          city: (addr.city || '').trim() || null,
          state: (addr.state || addr.province || '').trim() || null,
          postal_code: (addr.postal_code || addr.postalCode || '').trim() || null,
          country: (addr.country || '').trim() || null
        };
        const extra = trimDeliveryAdditionalInfo(addr);
        if (extra) orderRow.shipping_address.additional_info = extra;
      }
    }
    await supabase.from('orders').insert(orderRow);

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

function checkoutSuccessCancelUrls(localeSeg) {
  const seg = localeSeg === 'fa' ? 'fa' : 'en';
  const pathPrefix = '/' + seg + '/';
  const base = baseUrl.replace(/\/$/, '');
  return {
    successUrl: base + pathPrefix + 'checkout-success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: base + pathPrefix + 'basket'
  };
}

function stripeLineItemsFromOrderRow(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return [];
  const out = [];
  for (const item of lineItems) {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    let unitAmount = item.unit_amount != null ? Math.round(Number(item.unit_amount)) : null;
    if (unitAmount == null || unitAmount <= 0) {
      if (item.amount_total != null) unitAmount = Math.round(Number(item.amount_total) / qty);
    }
    if (!unitAmount || unitAmount <= 0) continue;
    out.push({
      price_data: {
        currency: 'usd',
        unit_amount: unitAmount,
        product_data: { name: String(item.name || 'Item').slice(0, 120) }
      },
      quantity: qty
    });
  }
  return out;
}

/**
 * Reuse open Stripe Checkout URL, or create a new session and point the order at it (pending only).
 */
async function resumePendingCheckoutForOrder(order, localeSeg) {
  if (!stripe) {
    const e = new Error('Stripe is not configured');
    e.code = 'NO_STRIPE';
    throw e;
  }
  if (!order || order.status !== 'pending') {
    const e = new Error('Order is not pending payment');
    e.code = 'NOT_PENDING';
    throw e;
  }
  const sid = order.stripe_session_id;
  if (!sid) {
    const e = new Error('Missing checkout session on order');
    e.code = 'NO_SESSION';
    throw e;
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sid);
    if (session.status === 'complete' && session.payment_status === 'paid') {
      const e = new Error('Payment already recorded by Stripe. Refresh your orders.');
      e.code = 'ALREADY_PAID';
      throw e;
    }
    if (session.status === 'open' && session.url) {
      return { url: session.url, recreated: false };
    }
  } catch (e) {
    if (e.code === 'ALREADY_PAID') throw e;
    console.error('Resume checkout: retrieve session, will recreate if possible:', e && e.message);
  }

  const lineItems = stripeLineItemsFromOrderRow(order.line_items);
  if (lineItems.length === 0) {
    const e = new Error('Cannot rebuild checkout: order has no line items.');
    e.code = 'NO_LINE_ITEMS';
    throw e;
  }

  const { successUrl, cancelUrl } = checkoutSuccessCancelUrls(localeSeg);
  const fulfillmentType = order.fulfillment_type === 'collection' ? 'collection' : 'delivery';
  const sessionParams = {
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { order_id: order.id, fulfillment: fulfillmentType }
  };
  if (order.user_id) sessionParams.client_reference_id = String(order.user_id);
  if (order.customer_email) {
    sessionParams.customer_email = String(order.customer_email).trim().toLowerCase();
  }

  const newSession = await stripe.checkout.sessions.create(sessionParams);
  const amountTotal = newSession.amount_total || 0;
  const currency = (newSession.currency || 'usd').toLowerCase();
  const { error: upErr } = await supabase
    .from('orders')
    .update({
      stripe_session_id: newSession.id,
      amount_total: amountTotal,
      currency
    })
    .eq('id', order.id);
  if (upErr) {
    console.error('Resume checkout: update order failed', upErr);
    const e = new Error('Failed to attach new checkout session');
    e.code = 'UPDATE_FAILED';
    throw e;
  }
  return { url: newSession.url, recreated: true };
}

/** Best-effort: close an open Checkout Session so the customer cannot pay after cancel. */
async function expireStripeCheckoutSessionIfPossible(sessionId) {
  if (!stripe || !sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return;
  try {
    await stripe.checkout.sessions.expire(sessionId);
  } catch (e) {
    console.log('Expire checkout session (non-fatal):', e && e.message);
  }
}

// Logged-in user: cancel a pending (unpaid) order
app.post('/api/orders/:orderId/cancel', authMiddleware, async (req, res) => {
  const orderId = (req.params.orderId || '').trim();
  if (!ORDER_RESUME_UUID.test(orderId)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, stripe_session_id')
      .eq('id', orderId)
      .eq('user_id', req.userId)
      .single();
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only unpaid orders can be cancelled.' });
    }
    await expireStripeCheckoutSessionIfPossible(order.stripe_session_id);
    const { data: updated, error: upErr } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)
      .eq('status', 'pending')
      .select('id');
    if (upErr) {
      console.error('Cancel order update error:', upErr);
      return res.status(500).json({ error: 'Failed to cancel order' });
    }
    if (!updated || updated.length === 0) {
      return res.status(409).json({ error: 'Order is no longer pending.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ error: err.message || 'Failed to cancel order' });
  }
});

// Guest: cancel pending order using guest_access_token (same as tracking link)
app.post('/api/orders/guest-cancel', async (req, res) => {
  const token = req.body && req.body.token ? String(req.body.token).trim() : '';
  if (!token || token.length < 10) {
    return res.status(400).json({ error: 'Valid order token required' });
  }
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, stripe_session_id')
      .eq('guest_access_token', token)
      .single();
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only unpaid orders can be cancelled.' });
    }
    await expireStripeCheckoutSessionIfPossible(order.stripe_session_id);
    const { data: updated, error: upErr } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)
      .eq('status', 'pending')
      .select('id');
    if (upErr) {
      console.error('Guest cancel order update error:', upErr);
      return res.status(500).json({ error: 'Failed to cancel order' });
    }
    if (!updated || updated.length === 0) {
      return res.status(409).json({ error: 'Order is no longer pending.' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Guest cancel order error:', err);
    res.status(500).json({ error: err.message || 'Failed to cancel order' });
  }
});

// Logged-in user: resume pending order checkout
app.post('/api/orders/:orderId/resume-checkout', authMiddleware, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }
  const orderId = (req.params.orderId || '').trim();
  if (!ORDER_RESUME_UUID.test(orderId)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }
  const localeSeg = req.body && (req.body.locale === 'fa' || req.body.locale === 'en') ? req.body.locale : 'en';
  try {
    const checkout = await getCheckoutProfileStatus(req.userId);
    if (checkout.requiresCheckoutProfile && !checkout.complete) {
      return res.status(403).json({
        error:
          'Complete your profile before checkout: first name, surname, mobile, and email. Open My Profile to finish.',
        code: 'PROFILE_INCOMPLETE',
        missing: checkout.missing
      });
    }
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        'id, stripe_session_id, status, line_items, user_id, customer_email, fulfillment_type, guest_access_token'
      )
      .eq('id', orderId)
      .eq('user_id', req.userId)
      .single();
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const result = await resumePendingCheckoutForOrder(order, localeSeg);
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_PENDING' || err.code === 'NO_LINE_ITEMS') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'ALREADY_PAID') {
      return res.status(409).json({ error: err.message });
    }
    console.error('Resume checkout (auth) error:', err);
    res.status(500).json({ error: err.message || 'Failed to resume checkout' });
  }
});

// Logged-in: load basket + fulfillment from a pending order for editing before payment
app.get('/api/orders/:orderId/basket-draft', authMiddleware, async (req, res) => {
  const orderId = (req.params.orderId || '').trim();
  if (!ORDER_RESUME_UUID.test(orderId)) {
    return res.status(400).json({ error: 'Invalid order id' });
  }
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, status, line_items, fulfillment_type, shipping_address, user_id')
      .eq('id', orderId)
      .eq('user_id', req.userId)
      .single();
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Only unpaid orders can be edited.' });
    }
    const basket = [];
    for (const row of order.line_items || []) {
      const qty = Math.max(1, parseInt(row.quantity, 10) || 1);
      let unitCents = row.unit_amount != null ? Math.round(Number(row.unit_amount)) : null;
      if (unitCents == null || unitCents <= 0) {
        if (row.amount_total != null) unitCents = Math.round(Number(row.amount_total) / qty);
      }
      if (unitCents == null || unitCents < 0) unitCents = 0;
      basket.push({
        id: row.product_id || row.id || null,
        name: row.name || 'Item',
        name_fa: row.name_fa || undefined,
        price: unitCents / 100,
        quantity: qty,
        image_url: row.image_url || '',
        categoryId: row.category_id || null
      });
    }
    res.json({
      orderId: order.id,
      orderNumber: order.order_number,
      basket,
      fulfillmentType: order.fulfillment_type === 'collection' ? 'collection' : 'delivery',
      shippingAddress: order.shipping_address || null
    });
  } catch (err) {
    console.error('Basket draft error:', err);
    res.status(500).json({ error: err.message || 'Failed to load order draft' });
  }
});

// Guest: resume by guest_access_token (same token as order tracking link)
app.post('/api/orders/guest-resume-checkout', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }
  const token = (req.body && req.body.token) ? String(req.body.token).trim() : '';
  if (!token || token.length < 10) {
    return res.status(400).json({ error: 'Valid order token required' });
  }
  const localeSeg = req.body && (req.body.locale === 'fa' || req.body.locale === 'en') ? req.body.locale : 'en';
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(
        'id, stripe_session_id, status, line_items, user_id, customer_email, fulfillment_type, guest_access_token'
      )
      .eq('guest_access_token', token)
      .single();
    if (error || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!order.guest_access_token || order.guest_access_token !== token) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    const result = await resumePendingCheckoutForOrder(order, localeSeg);
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_PENDING' || err.code === 'NO_LINE_ITEMS') {
      return res.status(400).json({ error: err.message });
    }
    if (err.code === 'ALREADY_PAID') {
      return res.status(409).json({ error: err.message });
    }
    console.error('Resume checkout (guest) error:', err);
    res.status(500).json({ error: err.message || 'Failed to resume checkout' });
  }
});

// Get current user's orders (requires auth)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    // Idempotent: link any guest orders (same email, user_id null) to this account.
    const { data: profile } = await supabase
      .from('users')
      .select('email')
      .eq('id', req.userId)
      .maybeSingle();
    const profileEmail = (profile && profile.email) ? String(profile.email).trim().toLowerCase() : '';
    if (profileEmail) {
      await supabase
        .from('orders')
        .update({ user_id: req.userId })
        .ilike('customer_email', profileEmail)
        .is('user_id', null);
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, order_number, stripe_session_id, amount_total, currency, status, line_items, tracking_number, created_at, fulfillment_type, shipping_address')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders fetch error:', error);
      return res.status(500).json({ error: 'Failed to load orders' });
    }
    res.json(orders || []);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Get single order by Stripe session ID (for success page; no auth)
app.get('/api/orders/by-session/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, stripe_session_id, amount_total, currency, status, line_items, customer_email, customer_name, guest_access_token, created_at, fulfillment_type')
      .eq('stripe_session_id', sessionId)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Get order by session error:', err);
    res.status(500).json({ error: 'Failed to load order' });
  }
});

// Get order by guest token (for guest order link; no auth)
app.get('/api/orders/guest/:token', async (req, res) => {
  try {
    const token = req.params.token;
    if (!token || token.length < 10) {
      return res.status(400).json({ error: 'Invalid link' });
    }
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, amount_total, currency, status, line_items, customer_email, customer_name, shipping_address, tracking_number, created_at, fulfillment_type')
      .eq('guest_access_token', token)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Get order by guest token error:', err);
    res.status(500).json({ error: 'Failed to load order' });
  }
});

// Guest order lookup by email + order id or order number (for "Order Finder" page; no auth)
app.get('/api/orders/guest-lookup', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    const orderIdOrNumber = (req.query.order_id || '').trim();
    if (!email || !orderIdOrNumber) {
      return res.status(400).json({ error: 'Email and order ID or order number are required' });
    }
    if (!validationPatterns.email.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdOrNumber);
    let query = supabase
      .from('orders')
      .select('id, order_number, amount_total, currency, status, line_items, customer_email, customer_name, shipping_address, tracking_number, created_at, fulfillment_type')
      .eq('customer_email', email);
    if (isUuid) query = query.eq('id', orderIdOrNumber);
    else query = query.eq('order_number', orderIdOrNumber);
    const { data: order, error } = await query.single();

    if (error || !order) return res.status(404).json({ error: 'Order not found. Check your email and order ID.' });
    res.json(order);
  } catch (err) {
    console.error('Guest lookup error:', err);
    res.status(500).json({ error: 'Failed to look up order' });
  }
});

// Confirm payment and set order to paid using Stripe session (for success page; no auth)
// Use when webhook did not run (e.g. local testing). Idempotent.
app.post('/api/orders/confirm-by-session/:sessionId', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  try {
    const sessionId = req.params.sessionId;
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price.product'] });
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Session not paid' });
    }
    const amountTotal = session.amount_total || 0;
    const currency = (session.currency || 'usd').toLowerCase();
    const customerEmail = session.customer_email || session.customer_details?.email || null;
    let lineItems = [];
    if (session.line_items && session.line_items.data) {
      lineItems = session.line_items.data.map((li) => ({
        name: (li.price && li.price.product && typeof li.price.product === 'object' && li.price.product.name) ? li.price.product.name : (li.description || 'Item'),
        quantity: li.quantity || 1,
        unit_amount: li.price ? li.price.unit_amount : 0,
        amount_total: li.amount_total
      }));
    }
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('id, status, order_number, guest_access_token, customer_name, fulfillment_type, shipping_address')
      .eq('stripe_session_id', sessionId)
      .single();
    if (findError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status === 'paid') {
      return res.json({ updated: false, status: 'paid' });
    }
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        amount_total: amountTotal,
        currency,
        line_items: lineItems,
        customer_email: customerEmail
      })
      .eq('stripe_session_id', sessionId);
    if (updateError) {
      console.error('Confirm order update error:', updateError);
      return res.status(500).json({ error: 'Failed to update order' });
    }
    // If we had to mark the order as paid here (webhook missing), notify admins too.
    const siteUrl = baseUrl.replace(/\/$/, '');
    const isGuest = !!order.guest_access_token;
    const trackLink = isGuest
      ? `${siteUrl}/order.html?token=${encodeURIComponent(order.guest_access_token)}`
      : `${siteUrl}/orders.html`;

    const items = Array.isArray(lineItems) ? lineItems : [];
    const itemsText = items.slice(0, 10).map((it) => {
      const name = it.name || 'Item';
      const qty = it.quantity || 1;
      const cents = it.amount_total != null ? Number(it.amount_total) : 0;
      return `- ${name} x${qty} = $${(cents / 100).toFixed(2)}`;
    }).join('\n') || '- (no line items)';

    const extraFallback = order.shipping_address && typeof order.shipping_address === 'object'
      ? String(order.shipping_address.additional_info || '').trim()
      : '';
    sendTelegramMessage(
      [
        'Order paid (fallback)',
        `Order: ${order.order_number || order.id || sessionId}`,
        order.customer_name ? `Customer name: ${order.customer_name}` : null,
        `Customer email: ${customerEmail || 'guest'}`,
        `Type: ${isGuest ? 'guest' : 'registered'}`,
        `Fulfillment: ${order.fulfillment_type === 'collection' ? 'collection' : 'delivery'}`,
        extraFallback ? `Additional info: ${extraFallback.slice(0, 500)}${extraFallback.length > 500 ? '…' : ''}` : null,
        `Amount: $${(amountTotal / 100).toFixed(2)} ${String(currency).toUpperCase()}`,
        `Stripe session: ${sessionId}`,
        'Items:',
        itemsText,
        `Tracking: ${trackLink}`
      ].filter(Boolean).join('\n')
    ).catch((err) => console.error('Telegram confirm-by-session notification error:', err));
    // Receipt is sent only from the Stripe webhook so the customer gets exactly one email.
    // If the webhook hasn't run yet (e.g. local dev), Stripe will still fire it and the receipt will be sent then.
    res.json({ updated: true, status: 'paid' });
  } catch (err) {
    console.error('Confirm by session error:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm order' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  logStartupSummary();
  const dep = getDeploymentEnvironment();
  if (process.env.VERCEL || dep === 'preview') {
    console.log('Eslami Electric server (Vercel / cloud): public URL from env — see [env] publicBaseUrl above');
  } else {
    console.log(`Eslami Electric server running at http://localhost:${PORT}`);
    console.log(`On same WiFi, others can use: http://<this-PC-IP>:${PORT}  (run "ipconfig" to find IP)`);
  }
  logTelegramLoginStatus();
});
