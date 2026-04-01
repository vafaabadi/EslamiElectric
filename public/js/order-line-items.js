(function (global) {
  var cache = null;

  function ensureProductCatalog() {
    if (cache) return Promise.resolve(cache);
    return fetch('/api/products')
      .then(function (r) {
        return r.json();
      })
      .then(function (products) {
        var m = Object.create(null);
        (products || []).forEach(function (p) {
          if (p && p.id) m[p.id] = p;
        });
        cache = m;
        return m;
      })
      .catch(function () {
        cache = Object.create(null);
        return cache;
      });
  }

  /** Call after lang change so names re-resolve (catalog cache is id→product only). */
  function invalidateProductCatalog() {
    cache = null;
  }

  /**
   * @param {object} item - line item from order API
   * @param {string} lang - 'en' | 'fa'
   * @param {object} byId - product id → product row from /api/products
   */
  function lineItemDisplayName(item, lang, byId) {
    var fb = lang === 'fa' ? 'کالا' : 'Item';
    if (!item) return fb;
    var pid = item.product_id || item.productId;
    if (pid && byId && byId[pid]) {
      var p = byId[pid];
      if (lang === 'fa' && p.name_fa) return p.name_fa;
      return p.name || (item.name != null ? String(item.name) : fb);
    }
    if (lang === 'fa' && byId && item.name) {
      var en = String(item.name);
      var keys = Object.keys(byId);
      for (var i = 0; i < keys.length; i++) {
        var pr = byId[keys[i]];
        if (pr && pr.name === en && pr.name_fa) return pr.name_fa;
      }
    }
    return item.name != null ? String(item.name) : fb;
  }

  global.orderLineItemsLocale = {
    ensureProductCatalog: ensureProductCatalog,
    lineItemDisplayName: lineItemDisplayName,
    invalidateProductCatalog: invalidateProductCatalog
  };
})(typeof window !== 'undefined' ? window : this);
