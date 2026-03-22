const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
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
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 3000));
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

// Redirect eslamielectric.ir to eslamielectric.com/fa/
app.use((req, res, next) => {
  const host = (req.hostname || req.get('host') || '').toLowerCase().split(':')[0];
  if (host === 'eslamielectric.ir' || host.endsWith('.eslamielectric.ir')) {
    const target = 'https://eslamielectric.com/fa/';
    return res.redirect(302, target);
  }
  next();
});

const validationPatterns = {
  name: /^[\u0600-\u06FFa-zA-Z\s]{2,50}$/,
  dob: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
  mobile: /^(\+98|0|0098)?9\d{9}$|^(\+|00)[1-9]\d{6,14}$/,
  landline: /^0[1-9]{2}\d{8}$|^(\+|00)[1-9]\d{6,14}$/,
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
  try {
    const fullSession = await stripe.checkout.sessions.retrieve(stripeSessionId, { expand: ['line_items.data.price.product'] });
    if (fullSession.line_items && fullSession.line_items.data) {
      lineItems = fullSession.line_items.data.map((li) => ({
        name: (li.price && li.price.product && typeof li.price.product === 'object' && li.price.product.name) ? li.price.product.name : (li.description || 'Item'),
        quantity: li.quantity || 1,
        unit_amount: li.price ? li.price.unit_amount : 0,
        amount_total: li.amount_total
      }));
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
      const { error } = await supabase.from('orders').insert({
        user_id: userId || null,
        stripe_session_id: stripeSessionId,
        amount_total: amountTotal,
        currency,
        status: 'paid',
        line_items: lineItems,
        customer_email: customerEmail,
        customer_name: customerName || null
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
      .select('id, order_number, customer_email, guest_access_token, customer_name, user_id, line_items, amount_total, currency')
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
function serveLocalePage(locale, subPath, res) {
  const base = '/' + locale + '/';
  const baseTag = '<base href="' + base + '">';
  const langScript = '<script>(function(){var p=location.pathname;var l=p.indexOf("/fa")===0?"fa":"en";localStorage.setItem("lang",l);document.addEventListener("DOMContentLoaded",function(){var rest=p.replace(/^\\/en\\/?|^\\/fa\\/?/i,"")||"index";var enEl=document.getElementById("lang-en");var faEl=document.getElementById("lang-fa");if(enEl){enEl.addEventListener("click",function(){if(l==="fa")location.href="/en/"+(rest==="index"?"":rest);});}if(faEl){faEl.addEventListener("click",function(){if(l==="en")location.href="/fa/"+(rest==="index"?"":rest);});}});})();</script>';
  const inject = baseTag + '\n  ' + langScript + '\n  ';
  const seg = (subPath || '').replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  const htmlFile = PATH_TO_HTML[seg];
  if (htmlFile) {
    const filePath = path.join(publicDir, htmlFile);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') return res.status(404).send('Not found');
        return res.status(500).send('Error loading page');
      }
      const injected = data.replace(/<head(\s[^>]*)?>/, '<head$1>' + inject);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
    const injected = data.replace(/<head(\s[^>]*)?>/, '<head$1>' + inject);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(injected);
  });
}

LOCALE_PREFIXES.forEach((locale) => {
  app.get(new RegExp('^/' + locale + '(?:/.*)?$'), (req, res) => {
    const subPath = req.path.slice(('/' + locale).length) || '/';
    serveLocalePage(locale, subPath, res);
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
  res.json({ supabaseUrl, supabaseAnonKey, baseUrl: baseUrl.replace(/\/$/, '') });
});

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
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error('check-email error:', error);
        return res.status(500).json({ error: 'Failed to check email' });
      }
      const users = (data && data.users) ? data.users : [];
      exists = users.some(u => (u.email || '').trim().toLowerCase() === email);
      if (exists) break;

      page = data && data.nextPage ? data.nextPage : null;
      if (!page) break;
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
    const firstName = (meta.first_name || '').trim() || '';
    const surname = (meta.surname || '').trim() || '';
    const type = (meta.type || '').trim() || 'person';
    const mobile = (meta.mobile || '').trim() || '';
    const address = (meta.address || '').trim() || '';
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

    // Detect whether this is the first time we sync this user into `public.users`.
    const { data: existingBefore } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    const isNewUser = !existingBefore;

    const { error: upsertErr } = await supabase.from('users').upsert(
      {
        id: userId,
        email,
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
      },
      { onConflict: 'id' }
    );
    if (upsertErr) {
      console.error('Users upsert error:', upsertErr);
      return { ok: false, status: 500, error: 'Failed to sync profile' };
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
    const emailNorm = (email || '').trim().toLowerCase();
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

// Signup notifications for the Supabase auth signUp flow (runs immediately after signUp request).
// This avoids waiting for email confirmation / /api/auth/token to be called.
app.post('/api/notify/signup', async (req, res) => {
  try {
    const body = req.body || {};
    const type = body.type || 'person';
    const skipEmail = !!body.skipEmail;
    const password = body.password || null;
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
      .select('id, type, first_name, surname, dob, mobile, landline, email, address, bank_details, company_name, company_number, company_contact_number, company_principal_contact, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    res.json(profileRowToJson(user));
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

const PROFILE_PATCH_KEYS = [
  'firstName',
  'surname',
  'dob',
  'mobile',
  'landline',
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
      .select('id, type, first_name, surname, dob, mobile, landline, email, address, bank_details, company_name, company_number, company_contact_number, company_principal_contact, created_at')
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

// Forgot password: request a reset link
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const emailNormalized = (email && typeof email === 'string') ? email.trim().toLowerCase() : '';
    if (!emailNormalized) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailNormalized)
      .single();

    if (!user) {
      return res.json({ ok: true, message: 'If that email is registered, you will receive a reset link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const { error } = await supabase
      .from('users')
      .update({ reset_token: resetToken, reset_token_expires: expiresAt.toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Forgot password update error:', error);
      return res.status(500).json({ error: 'Failed to request reset' });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const resetLink = baseUrl + '/reset-password.html?token=' + resetToken;

    res.json({ ok: true, resetLink });
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
      locale
    } = req.body || {};

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
      const addr = shippingAddress && typeof shippingAddress === 'object' ? shippingAddress : null;
      const addressLine1 = (addr && (addr.line1 || addr.address || addr.street)) ? String(addr.line1 || addr.address || addr.street).trim() : '';
      if (!addressLine1 || addressLine1.length < 5) {
        return res.status(400).json({ error: 'Shipping address is required for guest checkout' });
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

    const orderId = crypto.randomUUID();
    let orderNumber = generateOrderNumber();
    const sessionParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { order_id: orderId }
    };
    if (userId) sessionParams.client_reference_id = String(userId);
    if (isGuest && guestEmail) {
      sessionParams.customer_email = (guestEmail || '').trim().toLowerCase();
    }
    const session = await stripe.checkout.sessions.create(sessionParams);

    const amountTotal = session.amount_total || 0;
    const lineItemsForDb = Array.isArray(bodyLineItems) && bodyLineItems.length > 0
      ? bodyLineItems.map((item) => ({
          name: item.name || 'Item',
          quantity: item.quantity || 1,
          unit_amount: Math.round(Number(item.price) * 100),
          amount_total: Math.round(Number(item.price) * 100) * (item.quantity || 1)
        }))
      : [];

    const orderRow = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId || null,
      stripe_session_id: session.id,
      amount_total: amountTotal,
      currency: 'usd',
      status: 'pending',
      line_items: lineItemsForDb
    };
    if (isGuest) {
      orderRow.guest_access_token = crypto.randomBytes(24).toString('hex');
      orderRow.customer_email = (guestEmail || '').trim().toLowerCase();
      orderRow.customer_name = (guestName || '').trim() || null;
      orderRow.customer_phone = (guestPhone || '').trim() || null;
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
      }
    }
    await supabase.from('orders').insert(orderRow);

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
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
      .select('id, order_number, stripe_session_id, amount_total, currency, status, line_items, tracking_number, created_at')
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
      .select('id, order_number, stripe_session_id, amount_total, currency, status, line_items, customer_email, customer_name, guest_access_token, created_at')
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
      .select('id, order_number, amount_total, currency, status, line_items, customer_email, customer_name, shipping_address, tracking_number, created_at')
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
      .select('id, order_number, amount_total, currency, status, line_items, customer_email, customer_name, shipping_address, tracking_number, created_at')
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
      .select('id, status, order_number, guest_access_token, customer_name')
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

    sendTelegramMessage(
      [
        'Order paid (fallback)',
        `Order: ${order.order_number || order.id || sessionId}`,
        order.customer_name ? `Customer name: ${order.customer_name}` : null,
        `Customer email: ${customerEmail || 'guest'}`,
        `Type: ${isGuest ? 'guest' : 'registered'}`,
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
  console.log(`Eslami Electric server running at http://localhost:${PORT}`);
  console.log(`On same WiFi, others can use: http://<this-PC-IP>:${PORT}  (run "ipconfig" to find IP)`);
});
