(function (global) {
  function getRate() {
    var r = parseFloat(localStorage.getItem('usdToToman') || '42000', 10);
    return Number.isFinite(r) && r > 0 ? r : 42000;
  }

  function getCurrency() {
    return localStorage.getItem('currency') || 'usd';
  }

  /** Display-only: catalog and basket prices are stored as USD numbers. */
  function formatPriceUSD(usd) {
    var n = Number(usd) || 0;
    if (getCurrency() === 'toman') {
      var tom = Math.round(n * getRate());
      return tom.toLocaleString('fa-IR') + ' تومان';
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
