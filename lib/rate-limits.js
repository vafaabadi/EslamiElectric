'use strict';

const { rateLimit } = require('express-rate-limit');

/**
 * Per-IP rate limits for sensitive public endpoints.
 * Uses in-memory store (per instance). On multi-instance hosts (e.g. Vercel), limits are approximate per instance.
 */

function json429(req, res) {
  res.status(429).json({ error: 'Too many requests. Try again later.' });
}

function createLimiter(options) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => json429(req, res),
    ...options
  });
}

/** Email existence check (signup UX) — tight enough to slow enumeration. */
const checkEmailLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 40
});

/** Password + session login. */
const apiLoginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 40
});

/** Supabase OAuth / magic-link → app JWT exchange. */
const apiAuthTokenLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60
});

/** Telegram Login Widget callback. */
const apiAuthTelegramLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 40
});

/** Forgot-password (sends email — abuse / spam risk). */
const forgotPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 8
});

/** Reset password with token. */
const resetPasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 30
});

/** New account registration. */
const signupUsersLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10
});

/** Link Telegram synthetic account to email + password. */
const apiAuthLinkEmailLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20
});

/** POST /api/notify/signup — emails + Telegram. */
const notifySignupLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 20
});

/** POST /api/account/request-deletion */
const accountDeletionLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5
});

/** PATCH /api/me */
const patchMeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 120
});

/** POST /api/create-checkout-session — Stripe session creation. */
const checkoutSessionLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 25
});

/** Cancel / resume / confirm guest order flows. */
const orderOpsLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 80
});

/** POST /api/claim-account */
const claimAccountLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 30
});

/** GET /api/orders/guest-lookup */
const guestLookupLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 40
});

module.exports = {
  checkEmailLimiter,
  apiLoginLimiter,
  apiAuthTokenLimiter,
  apiAuthTelegramLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  signupUsersLimiter,
  apiAuthLinkEmailLimiter,
  notifySignupLimiter,
  accountDeletionLimiter,
  patchMeLimiter,
  checkoutSessionLimiter,
  orderOpsLimiter,
  claimAccountLimiter,
  guestLookupLimiter
};
