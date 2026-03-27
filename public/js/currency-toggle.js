/**
 * USD / Toman toggle + sync with language (FA → تومان, EN → USD by default).
 * Depends on price-format.js (formatPriceUSD reads localStorage.currency).
 */
(function () {
  var ACTIVE = 'px-2.5 py-1 rounded text-xs font-semibold bg-amber-500 text-slate-900';
  var IDLE = 'px-2.5 py-1 rounded text-xs font-semibold text-slate-200 hover:bg-slate-700 border border-slate-600';

  function getCurrency() {
    return localStorage.getItem('currency') === 'toman' ? 'toman' : 'usd';
  }

  function setCurrency(code) {
    var c = code === 'toman' ? 'toman' : 'usd';
    localStorage.setItem('currency', c);
    localStorage.setItem('localePref', 'user');
    syncToggleButtons();
    try {
      window.dispatchEvent(new CustomEvent('appcurrencychange', { detail: { currency: c } }));
    } catch (e) {}
  }

  function syncToggleButtons() {
    var cur = getCurrency();
    var root = document.getElementById('currency-toggle-host');
    if (!root) return;
    var usd = root.querySelector('[data-currency="usd"]');
    var tom = root.querySelector('[data-currency="toman"]');
    if (usd) {
      usd.setAttribute('aria-pressed', cur === 'usd' ? 'true' : 'false');
      usd.className = cur === 'usd' ? ACTIVE : IDLE;
    }
    if (tom) {
      tom.setAttribute('aria-pressed', cur === 'toman' ? 'true' : 'false');
      tom.className = cur === 'toman' ? ACTIVE : IDLE;
    }
  }

  function buildHost() {
    var host = document.getElementById('currency-toggle-host');
    if (host && host.querySelector('[data-currency]')) return host;

    if (!host) {
      host = document.createElement('div');
      host.id = 'currency-toggle-host';
      host.className = 'flex items-center gap-1 shrink-0';
      host.setAttribute('role', 'group');
      host.setAttribute('aria-label', 'Currency');

      var langEn = document.getElementById('lang-en');
      if (langEn && langEn.parentNode) {
        langEn.parentNode.insertBefore(host, langEn);
      } else {
        var nav = document.querySelector('header nav') || document.querySelector('header .max-w-6xl');
        if (nav) {
          nav.appendChild(host);
        } else {
          host.className =
            'fixed top-3 right-3 z-[100] flex items-center gap-1 rounded-lg bg-slate-800/95 px-2 py-1 shadow-md border border-slate-600';
          document.body.appendChild(host);
        }
      }
    }

    if (host.querySelector('[data-currency]')) {
      syncToggleButtons();
      return host;
    }

    host.innerHTML = '';
    var usd = document.createElement('button');
    usd.type = 'button';
    usd.setAttribute('data-currency', 'usd');
    usd.setAttribute('aria-label', 'US Dollar');
    usd.textContent = 'USD';
    usd.addEventListener('click', function () {
      setCurrency('usd');
    });

    var tom = document.createElement('button');
    tom.type = 'button';
    tom.setAttribute('data-currency', 'toman');
    tom.setAttribute('aria-label', 'Toman');
    tom.textContent = 'تومان';
    tom.addEventListener('click', function () {
      setCurrency('toman');
    });

    host.appendChild(usd);
    host.appendChild(tom);
    syncToggleButtons();
    return host;
  }

  function mount() {
    try {
      buildHost();
    } catch (e) {
      return;
    }
  }

  /** When user switches EN/FA, match currency to language (pages also set localStorage). */
  function syncCurrencyToLangFromClick() {
    document.addEventListener(
      'click',
      function (e) {
        var t = e.target;
        if (!t || !t.id) return;
        if (t.id === 'lang-en') {
          setTimeout(function () {
            localStorage.setItem('currency', 'usd');
            syncToggleButtons();
            try {
              window.dispatchEvent(new CustomEvent('appcurrencychange', { detail: { currency: 'usd' } }));
            } catch (err) {}
          }, 0);
        }
        if (t.id === 'lang-fa') {
          setTimeout(function () {
            localStorage.setItem('currency', 'toman');
            syncToggleButtons();
            try {
              window.dispatchEvent(new CustomEvent('appcurrencychange', { detail: { currency: 'toman' } }));
            } catch (err) {}
          }, 0);
        }
      },
      false
    );
  }

  syncCurrencyToLangFromClick();

  function onReady() {
    mount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }

  window.addEventListener('localehint', function () {
    mount();
  });

  window.setAppCurrency = setCurrency;
  window.syncCurrencyToggleUI = syncToggleButtons;
  window.initCurrencyToggle = mount;
})();
