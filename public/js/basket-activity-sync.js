/**
 * Debounced server sync for logged-in basket snapshots (v2 abandoned-basket reminders).
 * Guests are not synced on web (no X-Basket-Session); Android handles guest sync.
 */
(function (global) {
  var debounceTimer = null;
  var DEBOUNCE_MS = 2000;

  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map(function (item) {
      return {
        id: item.id,
        categoryId: item.categoryId != null ? item.categoryId : item.category_id || null,
        name: item.name,
        name_fa: item.name_fa != null ? item.name_fa : item.nameFa || null,
        image_url: item.image_url != null ? item.image_url : item.imageUrl || null,
        price: item.price,
        quantity: item.quantity
      };
    });
  }

  function syncBasketActivity(items) {
    var token = global.localStorage && global.localStorage.getItem('token');
    if (!token) return;
    if (debounceTimer) global.clearTimeout(debounceTimer);
    debounceTimer = global.setTimeout(function () {
      debounceTimer = null;
      global
        .fetch('/api/me/basket-activity', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({ items: normalizeItems(items) })
        })
        .catch(function () {});
    }, DEBOUNCE_MS);
  }

  global.syncBasketActivity = syncBasketActivity;
})(typeof window !== 'undefined' ? window : globalThis);
