'use strict';

const { getDeploymentEnvironment } = require('../config/environment');

/**
 * Builds a single Content-Security-Policy string for this app (vanilla HTML + inline scripts,
 * Supabase, Stripe, Telegram widget, jsDelivr, Vercel analytics scripts).
 * Inline scripts remain allowed via 'unsafe-inline' until pages move to nonces or external bundles.
 *
 * @param {{ supabaseUrl?: string }} opts
 * @returns {string}
 */
function buildContentSecurityPolicy(opts) {
  const supabaseUrl = (opts && opts.supabaseUrl) || '';
  const connect = new Set([
    "'self'",
    'https://cdn.jsdelivr.net',
    'https://telegram.org',
    'https://oauth.telegram.org',
    'https://va.vercel-scripts.com',
    'https://api.stripe.com',
    'https://checkout.stripe.com',
    'https://js.stripe.com',
    'https://q.stripe.com',
    'https://m.stripe.com',
    'https://accounts.google.com',
    'https://oauth2.googleapis.com',
    'https://www.googleapis.com',
    'https://*.supabase.co',
    'wss://*.supabase.co'
  ]);
  if (supabaseUrl) {
    try {
      const u = new URL(supabaseUrl);
      connect.add(u.origin);
      if (u.protocol === 'https:') {
        connect.add('wss://' + u.host);
      }
    } catch (_) {
      /* ignore invalid URL */
    }
  }

  const dep = getDeploymentEnvironment();
  const parts = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    // 'unsafe-eval' is required by Telegram's official telegram-widget.js: it eval()s data-onauth (e.g. onTelegramAuth(user)).
    // Without it, the widget silently fails to render after CSP was added. Prefer OIDC flow later if you want to drop eval.
    "script-src 'self' https://cdn.jsdelivr.net https://telegram.org https://va.vercel-scripts.com 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    'connect-src ' + Array.from(connect).join(' '),
    "frame-src 'self' https://telegram.org https://oauth.telegram.org https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://*.stripe.com https://www.openstreetmap.org",
    "form-action 'self' https://checkout.stripe.com https://js.stripe.com"
  ];

  if (dep !== 'development' && process.env.VERCEL) {
    parts.push('upgrade-insecure-requests');
  }

  return parts.join('; ');
}

/**
 * Express middleware: CSP + common hardening headers for HTML and API responses.
 * @param {{ supabaseUrl?: string }} opts
 */
function isHttpsRequest(req) {
  if (req.secure) return true;
  const proto = (req.get('x-forwarded-proto') || '').split(',')[0].trim().toLowerCase();
  return proto === 'https';
}

function securityHeadersMiddleware(opts) {
  const csp = buildContentSecurityPolicy(opts || {});
  return function securityHeaders(req, res, next) {
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (isHttpsRequest(req)) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
}

module.exports = {
  buildContentSecurityPolicy,
  securityHeadersMiddleware,
  isHttpsRequest
};
