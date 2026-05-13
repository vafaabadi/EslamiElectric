'use strict';

/**
 * Single place for deployment detection and public site URL resolution.
 * Vercel sets VERCEL_ENV to production | preview | development.
 * @see https://vercel.com/docs/projects/environment-variables#system-environment-variables
 */

/**
 * @returns {'production' | 'preview' | 'development'}
 */
function getDeploymentEnvironment() {
  const explicit = (process.env.APP_ENV || '').trim().toLowerCase();
  if (explicit === 'production' || explicit === 'preview' || explicit === 'development') {
    return explicit;
  }
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV;
  }
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    return 'production';
  }
  return 'development';
}

function isProductionDeployment() {
  return getDeploymentEnvironment() === 'production';
}

/**
 * Explicit site URL from env (no trailing slash), or ''.
 * Prefer PUBLIC_SITE_URL / PUBLIC_BASE_URL for SEO/canonical symmetry; same keys work for Stripe/email base.
 */
function getExplicitSiteUrlTrimmed() {
  const ordered = ['PUBLIC_SITE_URL', 'PUBLIC_BASE_URL', 'NEXT_PUBLIC_BASE_URL', 'BASE_URL'];
  for (const key of ordered) {
    const v = (process.env[key] || '').trim();
    if (v) return v.replace(/\/$/, '');
  }
  return '';
}

/**
 * Canonical base URL for Stripe redirects, emails, receipts (no trailing slash).
 * Prefer PUBLIC_SITE_URL / PUBLIC_BASE_URL / NEXT_PUBLIC_BASE_URL / BASE_URL; on Vercel, falls back to https://VERCEL_URL.
 */
function resolvePublicBaseUrl() {
  const explicit = getExplicitSiteUrlTrimmed();
  if (explicit) {
    return explicit;
  }
  const vercelUrl = (process.env.VERCEL_URL || '').trim();
  if (vercelUrl) {
    const host = vercelUrl.replace(/^https?:\/\//, '').split('/')[0];
    return 'https://' + host;
  }
  const port = process.env.PORT || 3000;
  return 'http://localhost:' + port;
}

function stripeKeyMode() {
  const k = process.env.STRIPE_SECRET_KEY;
  if (!k) return 'off';
  return k.indexOf('sk_live_') === 0 ? 'live' : 'test';
}

/** True if STRIPE_ALLOW_TEST_IN_PRODUCTION is set (use sk_test_ on Vercel Production on purpose). */
function stripeTestAllowedInProduction() {
  const v = String(process.env.STRIPE_ALLOW_TEST_IN_PRODUCTION || '')
    .trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function logStartupSummary() {
  const dep = getDeploymentEnvironment();
  const base = resolvePublicBaseUrl();
  const stripe = stripeKeyMode();
  const allowTestProd = stripeTestAllowedInProduction();
  console.log(
    '[env] deployment=' +
      dep +
      ' VERCEL_ENV=' +
      (process.env.VERCEL_ENV || '—') +
      ' publicBaseUrl=' +
      base +
      ' stripe=' +
      stripe +
      (isProductionDeployment() && stripe === 'test' && allowTestProd ? ' (test ok: STRIPE_ALLOW_TEST_IN_PRODUCTION)' : '') +
      ' resend=' +
      (process.env.RESEND_API_KEY ? 'on' : 'off')
  );

  if (isProductionDeployment() && stripe === 'test' && !allowTestProd) {
    console.warn(
      '[env] Production uses Stripe TEST keys (sk_test_). For real charges, use live keys; or set STRIPE_ALLOW_TEST_IN_PRODUCTION=1 if test mode is intentional.'
    );
  }
  if (!isProductionDeployment() && stripe === 'live') {
    console.warn(
      '[env] Non-production deployment is using Stripe LIVE keys. Prefer sk_test_ on preview/local to avoid real charges.'
    );
  }
}

module.exports = {
  getDeploymentEnvironment,
  isProductionDeployment,
  getExplicitSiteUrlTrimmed,
  resolvePublicBaseUrl,
  stripeTestAllowedInProduction,
  logStartupSummary
};
