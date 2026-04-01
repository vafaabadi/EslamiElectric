(function (global) {
  function getRate() {
    var r = parseFloat(localStorage.getItem('usdToToman') || '42000', 10);
    return Number.isFinite(r) && r > 0 ? r : 42000;
  }

  /** Toman with Farsi UI; USD with English (no separate currency preference). */
  function getCurrency() {
    return localStorage.getItem('lang') === 'fa' ? 'toman' : 'usd';
  }

  /**
   * Format integer Toman for RTL pages: isolate the numeric part as LTR so thousands
   * separators (٬) stay in the correct positions (UAX #9 / bidi).
   */
  function formatTomanRtl(tom) {
    var n = Math.round(Number(tom) || 0);
    var formatted;
    try {
      formatted = new Intl.NumberFormat('fa-IR', {
        maximumFractionDigits: 0,
        useGrouping: true
      }).format(n);
    } catch (e) {
      formatted = String(n);
    }
    return '\u2066' + formatted + '\u2069' + ' تومان';
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
})(typeof window !== 'undefined' ? window : this);
