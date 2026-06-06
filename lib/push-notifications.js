'use strict';

/**
 * Firebase Cloud Messaging (FCM) helper for the Eslami Electric Android app.
 *
 * Setup:
 *   1. Firebase Console → Project settings → Service accounts → Generate new private key.
 *   2. Paste the JSON into env var FIREBASE_SERVICE_ACCOUNT_JSON (single line, escaped, or stored as a
 *      multiline secret on Vercel — the SDK accepts the JSON string verbatim).
 *      Alternative: FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 (base64-encoded JSON, easier for Vercel).
 *   3. (Optional) FIREBASE_PROJECT_ID override; default uses project_id from the credentials JSON.
 *
 * If no credentials are set, every sendXxx() returns { sent: 0, skipped: true } and logs a single
 * info line — keeps the app working in environments without push (local dev, preview deploys, etc.).
 *
 * The `supabase` and `getPreferredLocaleForUser` dependencies are injected so this module stays
 * decoupled from server.js (and can be unit-tested separately).
 */

let admin = null;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.warn('firebase-admin not installed; push notifications disabled.', e && e.message);
}

/** @type {import('firebase-admin').app.App | null} */
let cachedApp = null;
let initFailed = false;

function loadServiceAccountJson() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (raw && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', e && e.message);
      return null;
    }
  }
  if (b64 && b64.trim()) {
    try {
      const decoded = Buffer.from(b64.trim(), 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 could not be decoded as JSON:', e && e.message);
      return null;
    }
  }
  return null;
}

function getFirebaseApp() {
  if (!admin) return null;
  if (cachedApp) return cachedApp;
  if (initFailed) return null;
  const cred = loadServiceAccountJson();
  if (!cred) {
    initFailed = true;
    console.log('Push notifications: FIREBASE_SERVICE_ACCOUNT_JSON not set — sends will be skipped.');
    return null;
  }
  try {
    cachedApp =
      admin.apps && admin.apps.length > 0
        ? admin.app()
        : admin.initializeApp({
            credential: admin.credential.cert(cred),
            projectId: process.env.FIREBASE_PROJECT_ID || cred.project_id
          });
    console.log('Firebase Admin initialized for FCM (project:', cred.project_id, ')');
    return cachedApp;
  } catch (e) {
    initFailed = true;
    console.error('Firebase Admin init failed:', e && e.message ? e.message : e);
    return null;
  }
}

function isConfigured() {
  return !!getFirebaseApp();
}

/**
 * Mark a token as disabled when FCM returns UNREGISTERED / INVALID_ARGUMENT.
 * @param {ReturnType<typeof require('@supabase/supabase-js').createClient>} supabase
 * @param {string} token
 */
async function disableToken(supabase, token) {
  if (!supabase || !token) return;
  try {
    await supabase
      .from('push_tokens')
      .update({ disabled_at: new Date().toISOString() })
      .eq('token', token);
  } catch (e) {
    console.error('disableToken update error:', e && e.message ? e.message : e);
  }
}

async function touchLastSeen(supabase, tokens) {
  if (!supabase || !Array.isArray(tokens) || tokens.length === 0) return;
  try {
    await supabase
      .from('push_tokens')
      .update({ last_seen_at: new Date().toISOString() })
      .in('token', tokens);
  } catch (e) {
    // non-fatal
  }
}

/**
 * Fetch active tokens for a user that match channel preferences.
 * Returns array of { token, locale }.
 *
 * @param {ReturnType<typeof require('@supabase/supabase-js').createClient>} supabase
 * @param {string} userId
 * @param {string} channel  one of: orders | promotions | account | general
 */
async function getActiveTokensForUser(supabase, userId, channel) {
  if (!supabase || !userId) return [];
  const { data: prefs } = await supabase
    .from('push_preferences')
    .select('master_enabled, channels')
    .eq('user_id', userId)
    .maybeSingle();
  if (prefs) {
    if (prefs.master_enabled === false) return [];
    const channels = prefs.channels && typeof prefs.channels === 'object' ? prefs.channels : {};
    if (channel && channels[channel] === false) return [];
  }
  const { data: rows, error } = await supabase
    .from('push_tokens')
    .select('token, locale')
    .eq('user_id', userId)
    .is('disabled_at', null);
  if (error) {
    console.error('getActiveTokensForUser error:', error.message);
    return [];
  }
  return Array.isArray(rows) ? rows : [];
}

/** Build a FCM message from a channel, route, data, and locale-aware title/body. */
function buildMessage({ token, title, body, channel, route, data, locale }) {
  /** @type {Record<string, string>} */
  const flatData = {
    channel: channel || 'general'
  };
  if (route) flatData.route = String(route);
  if (locale) flatData.locale = String(locale);
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      if (v != null) flatData[String(k)] = String(v);
    }
  }
  const channelId =
    channel === 'orders'
      ? 'orders'
      : channel === 'promotions'
        ? 'promotions'
        : channel === 'account'
          ? 'account'
          : 'general';
  return {
    token,
    notification: { title, body },
    data: flatData,
    android: {
      priority: channel === 'orders' || channel === 'account' ? 'high' : 'normal',
      notification: {
        channelId,
        // Tag groups together so a new order-status push replaces the previous one.
        tag: route ? `tag-${channelId}-${route.slice(0, 60)}` : `tag-${channelId}`
      }
    }
  };
}

/**
 * Send a notification to all of a user's devices (respecting channel preferences).
 *
 * @param {object} args
 * @param {ReturnType<typeof require('@supabase/supabase-js').createClient>} args.supabase
 * @param {string} args.userId
 * @param {string} args.channel — orders | promotions | account | general
 * @param {(locale: string) => { title: string, body: string }} args.localizedContent — picks copy by locale
 * @param {string} [args.route] — deep-link route (e.g. "order:<orderId>", "basket", "product:<id>")
 * @param {Record<string, string|number|null|undefined>} [args.data] — extra data payload
 * @param {string} [args.fallbackLocale] — used when a token has no stored locale (default: 'en')
 * @returns {Promise<{sent: number, failed: number, skipped?: boolean}>}
 */
async function sendToUser({
  supabase,
  userId,
  channel,
  localizedContent,
  route,
  data,
  fallbackLocale = 'en'
}) {
  const app = getFirebaseApp();
  if (!app) return { sent: 0, failed: 0, skipped: true };
  if (!userId) return { sent: 0, failed: 0 };
  const tokens = await getActiveTokensForUser(supabase, userId, channel);
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  const messaging = admin.messaging(app);
  let sent = 0;
  let failed = 0;
  const succeeded = [];
  await Promise.all(
    tokens.map(async (row) => {
      const localeForToken = row.locale || fallbackLocale;
      const { title, body } = localizedContent(localeForToken);
      try {
        const message = buildMessage({
          token: row.token,
          title,
          body,
          channel,
          route,
          data,
          locale: localeForToken
        });
        await messaging.send(message);
        sent += 1;
        succeeded.push(row.token);
      } catch (e) {
        failed += 1;
        const code = e && (e.code || (e.errorInfo && e.errorInfo.code));
        const isUnregistered =
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument';
        if (isUnregistered) {
          await disableToken(supabase, row.token);
        } else {
          console.error('FCM send error:', code || (e && e.message));
        }
      }
    })
  );
  if (succeeded.length > 0) {
    touchLastSeen(supabase, succeeded).catch(() => {});
  }
  return { sent, failed };
}

/** Resolve a user's preferred locale: contact_email column doesn't store it; use first device locale. */
async function resolvePreferredLocale(supabase, userId) {
  if (!supabase || !userId) return null;
  try {
    const { data } = await supabase
      .from('push_tokens')
      .select('locale, last_seen_at')
      .eq('user_id', userId)
      .is('disabled_at', null)
      .order('last_seen_at', { ascending: false })
      .limit(1);
    if (Array.isArray(data) && data.length > 0 && data[0].locale) {
      return data[0].locale;
    }
  } catch (e) {
    // non-fatal
  }
  return null;
}

/** ---------- Locale strings for order events ---------- */

function orderConfirmedContent(orderDisplay) {
  const safe = orderDisplay || '';
  return (locale) =>
    locale === 'fa'
      ? {
          title: 'سفارش شما ثبت شد',
          body: safe ? `سفارش ${safe} پرداخت شد و در حال آماده‌سازی است.` : 'سفارش شما پرداخت شد و در حال آماده‌سازی است.'
        }
      : {
          title: 'Order confirmed',
          body: safe ? `Order ${safe} is paid and being prepared.` : 'Your order is paid and being prepared.'
        };
}

function orderStatusContent(orderDisplay, status) {
  const safe = orderDisplay || '';
  const map = {
    processing: {
      en: { title: 'Order in progress', body: safe ? `Order ${safe} is being processed.` : 'Your order is being processed.' },
      fa: { title: 'سفارش در حال پردازش', body: safe ? `سفارش ${safe} در حال پردازش است.` : 'سفارش شما در حال پردازش است.' }
    },
    shipped: {
      en: { title: 'Order shipped', body: safe ? `Order ${safe} is on its way.` : 'Your order is on its way.' },
      fa: { title: 'سفارش ارسال شد', body: safe ? `سفارش ${safe} ارسال شد.` : 'سفارش شما ارسال شد.' }
    },
    delivered: {
      en: { title: 'Order delivered', body: safe ? `Order ${safe} was delivered. Enjoy!` : 'Your order was delivered. Enjoy!' },
      fa: { title: 'سفارش تحویل داده شد', body: safe ? `سفارش ${safe} تحویل داده شد.` : 'سفارش شما تحویل داده شد.' }
    },
    cancelled: {
      en: { title: 'Order cancelled', body: safe ? `Order ${safe} was cancelled.` : 'Your order was cancelled.' },
      fa: { title: 'سفارش لغو شد', body: safe ? `سفارش ${safe} لغو شد.` : 'سفارش شما لغو شد.' }
    },
    payment_failed: {
      en: { title: 'Payment failed', body: safe ? `Payment for order ${safe} did not complete.` : 'Your payment did not complete.' },
      fa: { title: 'پرداخت ناموفق', body: safe ? `پرداخت سفارش ${safe} انجام نشد.` : 'پرداخت شما انجام نشد.' }
    }
  };
  return (locale) => {
    const set = map[status] || map.processing;
    return locale === 'fa' ? set.fa : set.en;
  };
}

/**
 * Helper: notify a user that their order is paid (called from Stripe webhook + confirm-by-session).
 * Routes to "order:<orderId>" so the Android client deep-links to the order detail.
 */
function notifyOrderPaid(supabase, { userId, orderId, orderNumber }) {
  if (!userId || !orderId) return Promise.resolve({ sent: 0, failed: 0, skipped: true });
  return sendToUser({
    supabase,
    userId,
    channel: 'orders',
    localizedContent: orderConfirmedContent(orderNumber || ''),
    route: `order:${orderId}`,
    data: { orderId, orderNumber: orderNumber || '', status: 'paid' }
  });
}

function notifyOrderStatusChange(supabase, { userId, orderId, orderNumber, status }) {
  if (!userId || !orderId || !status) return Promise.resolve({ sent: 0, failed: 0, skipped: true });
  return sendToUser({
    supabase,
    userId,
    channel: 'orders',
    localizedContent: orderStatusContent(orderNumber || '', status),
    route: `order:${orderId}`,
    data: { orderId, orderNumber: orderNumber || '', status }
  });
}

function notifyPaymentFailed(supabase, { userId, orderId, orderNumber }) {
  if (!userId) return Promise.resolve({ sent: 0, failed: 0, skipped: true });
  return sendToUser({
    supabase,
    userId,
    channel: 'orders',
    localizedContent: orderStatusContent(orderNumber || '', 'payment_failed'),
    route: orderId ? `order:${orderId}` : 'orders',
    data: { orderId: orderId || '', orderNumber: orderNumber || '', status: 'payment_failed' }
  });
}

function abandonedBasketReminderContent() {
  return (locale) =>
    locale === 'fa'
      ? {
          title: 'سبد خرید شما منتظر است',
          body: 'اقلام سبد خرید شما هنوز منتظر پرداخت هستند. همین حالا تکمیل کنید.'
        }
      : {
          title: 'Your basket is waiting',
          body: 'Items in your basket are still waiting. Complete your order now.'
        };
}

function notifyAbandonedBasket(supabase, userId) {
  if (!userId) return Promise.resolve({ sent: 0, failed: 0, skipped: true });
  return sendToUser({
    supabase,
    userId,
    channel: 'promotions',
    localizedContent: abandonedBasketReminderContent(),
    route: 'basket'
  });
}

/**
 * Send a promotional (or other channel) broadcast to up to `maxRecipients` devices.
 * Respects per-user master + channel preferences. One send per device token.
 *
 * @param {object} args
 * @param {ReturnType<typeof require('@supabase/supabase-js').createClient>} args.supabase
 * @param {string} args.channel
 * @param {(locale: string) => { title: string, body: string }} args.localizedContent
 * @param {number} [args.maxRecipients]
 * @param {string} [args.route]
 * @returns {Promise<{ targeted: number, sent: number, failed: number, skipped?: boolean }>}
 */
async function sendBroadcast({ supabase, channel, localizedContent, maxRecipients = 500, route }) {
  const app = getFirebaseApp();
  if (!app) return { targeted: 0, sent: 0, failed: 0, skipped: true };
  if (!supabase) return { targeted: 0, sent: 0, failed: 0 };

  const cap = Math.min(Math.max(1, maxRecipients), 500);
  const { data: tokenRows, error: tokErr } = await supabase
    .from('push_tokens')
    .select('token, locale, user_id')
    .is('disabled_at', null)
    .not('user_id', 'is', null)
    .limit(cap * 4);
  if (tokErr) {
    console.error('sendBroadcast token query error:', tokErr.message);
    return { targeted: 0, sent: 0, failed: 0 };
  }
  const tokens = Array.isArray(tokenRows) ? tokenRows : [];
  if (tokens.length === 0) return { targeted: 0, sent: 0, failed: 0 };

  const userIds = [...new Set(tokens.map((t) => t.user_id).filter(Boolean))];
  /** @type {Map<string, { master_enabled?: boolean, channels?: Record<string, boolean> }>} */
  const prefsMap = new Map();
  if (userIds.length > 0) {
    const { data: prefRows } = await supabase
      .from('push_preferences')
      .select('user_id, master_enabled, channels')
      .in('user_id', userIds);
    if (Array.isArray(prefRows)) {
      for (const row of prefRows) {
        if (row && row.user_id) prefsMap.set(row.user_id, row);
      }
    }
  }

  const eligible = [];
  for (const row of tokens) {
    if (!row || !row.token || !row.user_id) continue;
    const prefs = prefsMap.get(row.user_id);
    if (prefs) {
      if (prefs.master_enabled === false) continue;
      const channels = prefs.channels && typeof prefs.channels === 'object' ? prefs.channels : {};
      if (channel && channels[channel] === false) continue;
    }
    eligible.push(row);
    if (eligible.length >= cap) break;
  }
  if (eligible.length === 0) return { targeted: 0, sent: 0, failed: 0 };

  const messaging = admin.messaging(app);
  let sent = 0;
  let failed = 0;
  const succeeded = [];
  await Promise.all(
    eligible.map(async (row) => {
      const localeForToken = row.locale || 'en';
      const { title, body } = localizedContent(localeForToken);
      try {
        const message = buildMessage({
          token: row.token,
          title,
          body,
          channel,
          route,
          locale: localeForToken
        });
        await messaging.send(message);
        sent += 1;
        succeeded.push(row.token);
      } catch (e) {
        failed += 1;
        const code = e && (e.code || (e.errorInfo && e.errorInfo.code));
        const isUnregistered =
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/invalid-argument';
        if (isUnregistered) {
          await disableToken(supabase, row.token);
        } else {
          console.error('FCM broadcast send error:', code || (e && e.message));
        }
      }
    })
  );
  if (succeeded.length > 0) {
    touchLastSeen(supabase, succeeded).catch(() => {});
  }
  return { targeted: eligible.length, sent, failed };
}

module.exports = {
  isConfigured,
  sendToUser,
  sendBroadcast,
  notifyOrderPaid,
  notifyOrderStatusChange,
  notifyPaymentFailed,
  notifyAbandonedBasket,
  resolvePreferredLocale,
  // Exported for tests:
  _internal: { buildMessage, orderConfirmedContent, orderStatusContent, abandonedBasketReminderContent }
};
