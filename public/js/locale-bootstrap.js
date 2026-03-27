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
