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
 * Canonical base URL for Stripe redirects, emails, receipts (no trailing slash).
 * Prefer NEXT_PUBLIC_BASE_URL or BASE_URL; on Vercel, falls back to https://VERCEL_URL.
 */
function resolvePublicBaseUrl() {
  const explicit = (process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || '').trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
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

function logStartupSummary() {
  const dep = getDeploymentEnvironment();
  const base = resolvePublicBaseUrl();
  const stripe = stripeKeyMode();
  console.log(
    '[env] deployment=' +
      dep +
      ' VERCEL_ENV=' +
      (process.env.VERCEL_ENV || '—') +
      ' publicBaseUrl=' +
      base +
      ' stripe=' +
      stripe +
      ' resend=' +
      (process.env.RESEND_API_KEY ? 'on' : 'off')
  );

  if (isProductionDeployment() && stripe === 'test') {
    console.warn(
      '[env] Production deployment is using Stripe TEST keys (sk_test_). Switch to live keys for real charges.'
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
  resolvePublicBaseUrl,
  logStartupSummary
};
