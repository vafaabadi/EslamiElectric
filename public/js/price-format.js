(function (global) {
  var PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  /** Arabic thousands separator (U+066C) — correct for Persian; avoids bidi misplacing ASCII comma. */
  var PERSIAN_GROUP_SEP = '\u066C';

  function getRate() {
    var r = parseFloat(localStorage.getItem('usdToToman') || '42000', 10);
    return Number.isFinite(r) && r > 0 ? r : 42000;
  }

  /** Toman with Farsi UI; USD with English (no separate currency preference). */
  function getCurrency() {
    return localStorage.getItem('lang') === 'fa' ? 'toman' : 'usd';
  }

  function latinIntToPersianGrouped(s) {
    var t = String(s).replace(/\D/g, '');
    if (!t) return PERSIAN_DIGITS[0];
    var parts = [];
    var rest = t;
    while (rest.length > 3) {
      parts.unshift(rest.slice(-3));
      rest = rest.slice(0, -3);
    }
    if (rest) parts.unshift(rest);
    return parts
      .join(PERSIAN_GROUP_SEP)
      .replace(/\d/g, function (d) {
        return PERSIAN_DIGITS[parseInt(d, 10)];
      });
  }

  /**
   * Integer Toman for RTL: group from the right (…٬۰۰۰٬۰۰۰), Persian digits, then LTR isolate
   * so separators stay between the correct digit triplets (Intl alone can confuse UAX #9 in RTL).
   */
  function formatTomanRtl(tom) {
    var n = Math.max(0, Math.round(Number(tom) || 0));
    var formatted = latinIntToPersianGrouped(String(n));
    return '\u2066\u200E' + formatted + '\u2069' + ' تومان';
  }

  /**
   * Nonnegative integers for RTL (e.g. line quantities): Persian digits + thousands grouping,
   * wrapped in LTR isolate so ٬ stays correct next to Persian text.
   */
  function formatPersianIntegerRtl(n) {
    var x = Math.max(0, Math.round(Number(n) || 0));
    var formatted = latinIntToPersianGrouped(String(x));
    return '\u2066\u200E' + formatted + '\u2069';
  }

  /** Display-only: catalog and basket prices are stored as USD numbers. */
  function formatPriceUSD(usd) {
    var n = Number(usd) || 0;
    if (getCurrency() === 'toman') {
      var tom = Math.round(n * getRate());
      return formatTomanRtl(tom);
    }
    return '$' + n.toFixed(2);
  }

  /** Stripe amounts are integer cents in USD. */
  function formatStripeUsdCents(cents) {
    return formatPriceUSD((Number(cents) || 0) / 100);
  }

  global.formatPriceUSD = formatPriceUSD;
  global.formatStripeUsdCents = formatStripeUsdCents;
  global.formatPersianIntegerRtl = formatPersianIntegerRtl;
})(typeof window !== 'undefined' ? window : this);
