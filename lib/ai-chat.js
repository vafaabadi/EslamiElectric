'use strict';

const { streamText } = require('ai');
const { google, createGoogleGenerativeAI } = require('@ai-sdk/google');
const { createGateway } = require('@ai-sdk/gateway');

const DEFAULT_GOOGLE_MODEL = 'gemini-2.5-flash-lite';
const DEFAULT_GATEWAY_MODEL = 'openai/gpt-4o-mini';
/** @deprecated Use DEFAULT_GOOGLE_MODEL or DEFAULT_GATEWAY_MODEL */
const DEFAULT_MODEL = DEFAULT_GOOGLE_MODEL;
const MAX_CATALOG_PRODUCTS = 48;
const MAX_OUTPUT_TOKENS = 1200;

const SHOP_FAQ = `
## Store basics
- Eslami Electric — electrical shop in Zahedan, Sistan and Baluchestan, Iran.
- Address: Azadi Avenue, Zahedan.
- Opening hours: Saturday–Thursday 9:00 AM – 9:00 PM; Friday closed.
- Contact: mobile +98 912 345 6789, landline +98 21 3456 7890.
- WhatsApp: +98 915 541 7904. Telegram: @EslamiElectric. Instagram: @EslamiElectricOfficial.

## Ordering & fulfillment
- Browse products on the website; add items to the basket; checkout online.
- Fulfillment: **delivery** to an address, or **collection** (pickup at the shop). For collection, staff contact the customer when the order is ready.
- Registered users can view order history at My Orders. Guests can look up orders with the email used at checkout and the guest order link/token from the confirmation email.

## Payments
- **Card**: Stripe Checkout (secure card payment).
- **Crypto**: NOWPayments — USDC/USDT on supported networks (e.g. Solana, BSC, Base, Polygon). Customer selects crypto currency at checkout; payment address and amount are shown after creating the payment.

## Account
- Sign up / log in with email and password, Google, or Telegram Login.
- Profile: update contact details, delivery address, push notification preferences.
- Password reset via forgot-password email link.

## Policies & help
- For complex quotes, bulk orders, or product advice not in the catalog, suggest WhatsApp or phone.
- Do not invent stock levels, prices, or order statuses — use catalog snippet and general guidance only.
- Never ask for passwords, full card numbers, or crypto seed phrases.
`.trim();

/**
 * @returns {string}
 */
function getGoogleApiKey() {
  return (
    (process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || '').trim()
  );
}

/**
 * @returns {string}
 */
function getGatewayApiKey() {
  return (process.env.AI_GATEWAY_API_KEY || '').trim();
}

/**
 * @returns {import('@ai-sdk/google').GoogleGenerativeAIProvider | null}
 */
function getGoogleProvider() {
  const primary = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || '').trim();
  const fallback = (process.env.GEMINI_API_KEY || '').trim();
  if (primary) return google;
  if (fallback) return createGoogleGenerativeAI({ apiKey: fallback });
  return null;
}

/**
 * @param {Array<{ name?: string, name_fa?: string, price?: number, category?: string, category_fa?: string, description?: string }>} products
 * @param {{ locale?: string, max?: number }} [opts]
 * @returns {string}
 */
function buildCatalogSnippet(products, opts) {
  const locale = (opts && opts.locale) || 'en';
  const max = (opts && opts.max) || MAX_CATALOG_PRODUCTS;
  const list = Array.isArray(products) ? products.slice(0, max) : [];
  if (!list.length) {
    return locale === 'fa'
      ? '(فهرست محصولات در حال حاضر در دسترس نیست — مشتری را به صفحه محصولات هدایت کنید.)'
      : '(Product catalog snippet unavailable — direct the customer to the Products page.)';
  }
  const lines = list.map((p) => {
    const name = locale === 'fa' && p.name_fa ? p.name_fa : p.name || 'Product';
    const cat =
      locale === 'fa' && p.category_fa ? p.category_fa : p.category || '';
    const price =
      typeof p.price === 'number' && Number.isFinite(p.price)
        ? `$${p.price.toFixed(2)} USD`
        : '';
    const desc = (locale === 'fa' ? p.description_fa : p.description) || '';
    const shortDesc = desc ? String(desc).replace(/\s+/g, ' ').trim().slice(0, 120) : '';
    return `- ${name}${cat ? ` [${cat}]` : ''}${price ? ` — ${price}` : ''}${shortDesc ? ` — ${shortDesc}` : ''}`;
  });
  const header =
    locale === 'fa'
      ? `نمونه محصولات (${list.length} مورد از فروشگاه):`
      : `Sample products (${list.length} items from the shop):`;
  return `${header}\n${lines.join('\n')}`;
}

/**
 * @param {{ locale?: string, user?: { email?: string, firstName?: string, surname?: string } | null, catalogSnippet?: string }} ctx
 * @returns {string}
 */
function buildSystemPrompt(ctx) {
  const locale = ctx && ctx.locale === 'fa' ? 'fa' : 'en';
  const user = ctx && ctx.user;
  const catalogSnippet = (ctx && ctx.catalogSnippet) || '';

  const langBlock =
    locale === 'fa'
      ? 'پاسخ‌ها را به فارسی بنویسید مگر مشتری صریحاً انگلیسی بخواهد. لحن: مودب، روشن، کوتاه.'
      : 'Reply in English unless the customer explicitly asks for Farsi/Persian. Tone: polite, clear, concise.';

  let userBlock = '';
  if (user && (user.email || user.firstName || user.surname)) {
    const name = [user.firstName, user.surname].filter(Boolean).join(' ').trim();
    userBlock =
      locale === 'fa'
        ? `\nمشتری وارد شده: ${name || '—'}${user.email ? ` (${user.email})` : ''}. برای سفارش‌ها و حساب کاربری می‌توانید به «سفارش‌های من» اشاره کنید.`
        : `\nLogged-in customer: ${name || '—'}${user.email ? ` (${user.email})` : ''}. You may refer them to My Orders for order/account help.`;
  } else {
    userBlock =
      locale === 'fa'
        ? '\nمشتری مهمان است — برای پیگیری سفارش، ایمیل checkout و لینک مهمان را توضیح دهید.'
        : '\nGuest visitor — for order tracking, explain guest checkout email and guest order link from confirmation.';
  }

  return [
    'You are the helpful AI assistant for Eslami Electric (eslamielectric.com), an electrical retail shop in Zahedan, Iran with online ordering.',
    langBlock,
    userBlock,
    '',
    SHOP_FAQ,
    '',
    '## Product catalog (reference only — prices may change)',
    catalogSnippet,
    '',
    'Help with: products, basket, checkout (card/crypto), delivery vs collection, orders, account, contact.',
    'If unsure or the request needs a human, suggest WhatsApp +98 915 541 7904 or phone.'
  ].join('\n');
}

/**
 * @returns {{ ok: boolean, provider: 'google' | 'gateway' | null, model: string, reason?: string }}
 */
function getChatConfig() {
  if (getGoogleApiKey()) {
    const model =
      (process.env.AI_CHAT_MODEL || DEFAULT_GOOGLE_MODEL).trim() || DEFAULT_GOOGLE_MODEL;
    return { ok: true, provider: 'google', model };
  }
  if (getGatewayApiKey()) {
    const model =
      (process.env.AI_CHAT_MODEL || DEFAULT_GATEWAY_MODEL).trim() || DEFAULT_GATEWAY_MODEL;
    return { ok: true, provider: 'gateway', model };
  }
  return {
    ok: false,
    provider: null,
    model: '',
    reason:
      'Neither GOOGLE_GENERATIVE_AI_API_KEY nor AI_GATEWAY_API_KEY is set'
  };
}

/**
 * @param {{ provider: 'google' | 'gateway', model: string }} config
 * @returns {import('ai').LanguageModel}
 */
function resolveChatModel(config) {
  if (config.provider === 'google') {
    const googleProvider = getGoogleProvider();
    if (!googleProvider) {
      throw new Error('Google provider not configured');
    }
    return googleProvider(config.model);
  }
  const gateway = createGateway({ apiKey: getGatewayApiKey() });
  return gateway(config.model);
}

/**
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} message
 */
function sendChatError(res, status, message) {
  if (res.headersSent) return;
  res.status(status).json({ error: message });
}

/**
 * Map provider / SDK failures to a safe client message and HTTP status.
 * @param {unknown} err
 * @returns {{ status: number, message: string }}
 */
function mapChatApiError(err) {
  const msg = err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('429')
  ) {
    return {
      status: 429,
      message:
        'AI quota exceeded for this model. Wait a minute and try again, or set AI_CHAT_MODEL to gemini-2.5-flash-lite on the server.'
    };
  }

  if (
    lower.includes('api key') ||
    lower.includes('api_key') ||
    lower.includes('permission_denied') ||
    lower.includes('unauthenticated') ||
    lower.includes('invalid key')
  ) {
    return {
      status: 503,
      message:
        'AI assistant is misconfigured. Set GOOGLE_GENERATIVE_AI_API_KEY from https://aistudio.google.com/apikey (a valid Google AI Studio key).'
    };
  }

  if (lower.includes('not found') || lower.includes('no such model') || lower.includes('404')) {
    return {
      status: 503,
      message:
        'AI model is not available. Set AI_CHAT_MODEL to a supported model such as gemini-2.5-flash-lite.'
    };
  }

  return {
    status: 500,
    message: 'Failed to generate a reply. Please try again.'
  };
}

/**
 * Stream an assistant reply to the Express response.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {{
 *   messages: Array<{ role: string, content: string }>,
 *   locale?: string,
 *   user?: object | null,
 *   getAllProducts?: () => Array<object>
 * }} input
 */
async function streamChatReply(req, res, input) {
  const config = getChatConfig();
  if (!config.ok) {
    return sendChatError(
      res,
      503,
      'AI assistant is not configured. Set GOOGLE_GENERATIVE_AI_API_KEY (free key from https://aistudio.google.com/apikey) or AI_GATEWAY_API_KEY on the server.'
    );
  }

  const locale = input.locale === 'fa' ? 'fa' : 'en';
  const products = typeof input.getAllProducts === 'function' ? input.getAllProducts() : [];
  const catalogSnippet = buildCatalogSnippet(products, { locale });
  const system = buildSystemPrompt({
    locale,
    user: input.user || null,
    catalogSnippet
  });

  const coreMessages = (input.messages || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 4000)
    }))
    .filter((m) => m.content.length > 0);

  if (!coreMessages.length || coreMessages[coreMessages.length - 1].role !== 'user') {
    return sendChatError(res, 400, 'messages must end with a user message');
  }

  const streamHeaders = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'X-Content-Type-Options': 'nosniff'
  };

  try {
    const result = streamText({
      model: resolveChatModel(config),
      system,
      messages: coreMessages,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      abortSignal: req.signal
    });

    const reader = result.textStream.getReader();
    const first = await reader.read();

    if (first.done && !first.value) {
      try {
        const text = await result.text;
        if (!text || !text.trim()) {
          return sendChatError(res, 502, 'AI returned an empty response. Please try again.');
        }
        res.set(streamHeaders);
        res.send(text);
        return;
      } catch (err) {
        console.error('POST /api/chat provider error:', err);
        const mapped = mapChatApiError(err);
        return sendChatError(res, mapped.status, mapped.message);
      }
    }

    res.set(streamHeaders);
    if (first.value) res.write(first.value);

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (chunk.value) res.write(chunk.value);
    }
    res.end();
  } catch (err) {
    console.error('POST /api/chat stream error:', err);
    if (!res.headersSent) {
      const mapped = mapChatApiError(err);
      sendChatError(res, mapped.status, mapped.message);
    }
  }
}

module.exports = {
  DEFAULT_MODEL,
  DEFAULT_GOOGLE_MODEL,
  DEFAULT_GATEWAY_MODEL,
  buildCatalogSnippet,
  buildSystemPrompt,
  getChatConfig,
  mapChatApiError,
  streamChatReply
};
