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
   * Integer Toman: Persian digits + ٬ grouping + " تومان". No bidi chars — parent must use
   * <span dir="ltr" class="tabular-nums"> in RTL pages so separators stay aligned.
   */
  function formatTomanRtl(tom) {
    var n = Math.max(0, Math.round(Number(tom) || 0));
    return latinIntToPersianGrouped(String(n)) + ' تومان';
  }

  /**
   * Nonnegative integers: Persian digits + ٬ grouping. Pair with dir="ltr" on the container
   * (e.g. basket qty input has dir="ltr").
   */
  function formatPersianIntegerRtl(n) {
    var x = Math.max(0, Math.round(Number(n) || 0));
    return latinIntToPersianGrouped(String(x));
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

  /** Use around any formatted price/qty string embedded in RTL HTML so ٬ and digits stay LTR. */
  function ltrNumSpan(html) {
    return '<span dir="ltr" class="tabular-nums">' + String(html) + '</span>';
  }

  global.formatPriceUSD = formatPriceUSD;
  global.formatStripeUsdCents = formatStripeUsdCents;
  global.formatPersianIntegerRtl = formatPersianIntegerRtl;
  global.ltrNumSpan = ltrNumSpan;
  /** Stable name for inline scripts: always use `window.wrapLtrPrice` (never bare `ltrNumSpan`). */
  global.wrapLtrPrice = ltrNumSpan;
})(typeof window !== 'undefined' ? window : this);
