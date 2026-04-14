(function () {
  function finish() {
    window.geoLocaleReady = true;
    document.documentElement.classList.add('locale-ready');
    try {
      window.dispatchEvent(new Event('localehint'));
    } catch (e) {}
  }

  function backfillMissing() {
    if (!localStorage.getItem('usdToToman')) {
      localStorage.setItem('usdToToman', '42000');
    }
  }

  if ((window.location.pathname || '').indexOf('auth-callback') !== -1) {
    backfillMissing();
    finish();
    return;
  }

  if (localStorage.getItem('localePref') === 'user') {
    backfillMissing();
    finish();
    return;
  }

  if (localStorage.getItem('localeInitialized')) {
    backfillMissing();
    finish();
    return;
  }

  /** Abort so a hung /api/locale-hint never blocks finish() — without this, runWhenLocaleReady never runs (profile, basket, etc. stay on loading forever). */
  var ctrl = new AbortController();
  var hintTimeout = setTimeout(function () {
    try {
      ctrl.abort();
    } catch (e) {}
  }, 8000);

  fetch('/api/locale-hint', { signal: ctrl.signal })
    .then(function (r) {
      clearTimeout(hintTimeout);
      return r.json();
    })
    .then(function (d) {
      var rate = d.usdToToman != null ? d.usdToToman : 42000;
      localStorage.setItem('usdToToman', String(rate));
      if (!localStorage.getItem('lang')) {
        localStorage.setItem('lang', d.defaultLang || 'en');
      }
      localStorage.setItem('localeInitialized', '1');
      finish();
    })
    .catch(function () {
      clearTimeout(hintTimeout);
      if (!localStorage.getItem('usdToToman')) {
        localStorage.setItem('usdToToman', '42000');
      }
      if (!localStorage.getItem('lang')) {
        localStorage.setItem('lang', 'en');
      }
      localStorage.setItem('localeInitialized', '1');
      finish();
    });
})();
