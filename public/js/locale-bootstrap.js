(function () {
  window.geoLocaleReady = false;
  window.runWhenLocaleReady = function (fn) {
    if (typeof fn !== 'function') return;
    if (window.geoLocaleReady) {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
      return;
    }
    window.addEventListener(
      'localehint',
      function onLocale() {
        try {
          fn();
        } catch (e) {
          console.error(e);
        }
      },
      { once: true }
    );
  };
})();

/** After EN/FA click handlers update localStorage, refresh price displays that listen for this event. */
(function () {
  document.addEventListener(
    'click',
    function (e) {
      var t = e.target;
      if (!t || (t.id !== 'lang-en' && t.id !== 'lang-fa')) return;
      setTimeout(function () {
        try {
          window.dispatchEvent(new CustomEvent('appcurrencychange'));
        } catch (err) {}
      }, 0);
    },
    false
  );
})();
