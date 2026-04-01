/**
 * Registers the service worker (offline + asset cache). Safe no-op if unsupported.
 * Update UX: bilingual banner + manual refresh; optional soft-reload when the tab is
 * backgrounded (industry pattern) except on sensitive URLs or dirty forms.
 */
(function () {
  if (!('serviceWorker' in navigator)) return;

  var STORAGE_KEY = 'sw-update-pending';
  var SOFT_RELOAD_DELAY_MS = 2500;
  /** Paths where automatic background reload is never performed (checkout, auth, account). */
  var SOFT_RELOAD_BLOCKLIST = [
    /^\/basket\.html$/i,
    /^\/order\.html$/i,
    /^\/checkout-success\.html$/i,
    /^\/auth-callback\.html$/i,
    /^\/login\.html$/i,
    /^\/forgot-password\.html$/i,
    /^\/reset-password\.html$/i,
    /^\/update-password\.html$/i,
    /^\/claim-account\.html$/i,
    /^\/profile\.html$/i,
    /^\/account\.html$/i
  ];

  var lastController = navigator.serviceWorker.controller;
  var softReloadTimer = null;
  var softListenersAttached = false;

  function markUpdatePending() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      /* private mode / quota */
    }
  }

  function clearUpdatePending() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function isUpdatePending() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function isSoftReloadBlockedPath() {
    var p = location.pathname || '';
    for (var i = 0; i < SOFT_RELOAD_BLOCKLIST.length; i++) {
      if (SOFT_RELOAD_BLOCKLIST[i].test(p)) return true;
    }
    return false;
  }

  function hasDirtyForm() {
    try {
      var all = document.querySelectorAll('input, textarea, select');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (!el || el.closest('iframe')) continue;
        var t = el.type;
        if (t === 'hidden' || t === 'submit' || t === 'button' || t === 'image' || el.disabled) continue;
        if (t === 'checkbox' || t === 'radio') {
          if (el.checked !== el.defaultChecked) return true;
        } else if (el.value !== el.defaultValue) return true;
      }
    } catch (e) {
      /* ignore */
    }
    return false;
  }

  function canSoftReloadNow() {
    return isUpdatePending() && !isSoftReloadBlockedPath() && !hasDirtyForm();
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      if (!canSoftReloadNow()) {
        clearTimeout(softReloadTimer);
        softReloadTimer = null;
        return;
      }
      clearTimeout(softReloadTimer);
      softReloadTimer = setTimeout(function () {
        if (document.visibilityState !== 'hidden') return;
        if (!canSoftReloadNow()) return;
        clearUpdatePending();
        window.location.reload();
      }, SOFT_RELOAD_DELAY_MS);
    } else {
      clearTimeout(softReloadTimer);
      softReloadTimer = null;
    }
  }

  function ensureSoftReloadListeners() {
    if (softListenersAttached) return;
    softListenersAttached = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function showUpdateBanner() {
    markUpdatePending();
    if (document.getElementById('sw-update-banner')) return;

    var wrap = document.createElement('div');
    wrap.id = 'sw-update-banner';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.style.cssText = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'z-index:99999',
      'display:flex',
      'flex-wrap:wrap',
      'align-items:center',
      'justify-content:space-between',
      'gap:0.75rem',
      'padding:0.75rem 1rem',
      'padding-bottom:calc(0.75rem + env(safe-area-inset-bottom,0))',
      'background:#0f172a',
      'color:#f8fafc',
      'border-top:1px solid #f59e0b',
      'box-shadow:0 -4px 24px rgba(0,0,0,0.35)',
      'font-family:system-ui,-apple-system,sans-serif',
      'font-size:0.875rem',
      'line-height:1.4'
    ].join(';');

    var text = document.createElement('div');
    text.style.cssText = 'flex:1;min-width:min(100%,12rem)';
    var lineEn = document.createElement('div');
    lineEn.textContent = 'A new version is available. Refresh to load the latest.';
    var lineHint = document.createElement('div');
    lineHint.style.cssText = 'margin-top:0.35rem;font-size:0.8rem;opacity:0.85';
    lineHint.textContent =
      'If you leave this tab briefly, we may refresh automatically (not on checkout or forms).';
    var lineFa = document.createElement('div');
    lineFa.setAttribute('dir', 'rtl');
    lineFa.style.cssText = 'margin-top:0.35rem;opacity:0.9';
    lineFa.textContent =
      'نسخهٔ جدید آماده است. با بازخوانی، آخرین نسخه بارگذاری می‌شود. اگر تب را کمی ترک کنید، در صفحات امن ممکن است خودکار بازخوانی شود.';
    text.appendChild(lineEn);
    text.appendChild(lineHint);
    text.appendChild(lineFa);

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center';

    var btnRefresh = document.createElement('button');
    btnRefresh.type = 'button';
    btnRefresh.textContent = 'Refresh · بازخوانی';
    btnRefresh.style.cssText =
      'cursor:pointer;border:none;border-radius:0.375rem;padding:0.5rem 0.875rem;font-weight:600;background:#f59e0b;color:#0f172a';
    btnRefresh.addEventListener('click', function () {
      clearUpdatePending();
      window.location.reload();
    });

    var btnDismiss = document.createElement('button');
    btnDismiss.type = 'button';
    btnDismiss.setAttribute('aria-label', 'Dismiss update notice');
    btnDismiss.textContent = 'Later · بعداً';
    btnDismiss.style.cssText =
      'cursor:pointer;border:1px solid rgba(248,250,252,0.35);border-radius:0.375rem;padding:0.5rem 0.75rem;background:transparent;color:#f8fafc';
    btnDismiss.addEventListener('click', function () {
      wrap.remove();
    });

    actions.appendChild(btnRefresh);
    actions.appendChild(btnDismiss);

    wrap.appendChild(text);
    wrap.appendChild(actions);

    function append() {
      if (document.body) document.body.appendChild(wrap);
      else
        document.addEventListener('DOMContentLoaded', function once() {
          document.removeEventListener('DOMContentLoaded', once);
          if (!document.getElementById('sw-update-banner')) document.body.appendChild(wrap);
        });
    }
    append();
  }

  navigator.serviceWorker.addEventListener('controllerchange', function () {
    var c = navigator.serviceWorker.controller;
    if (!c) return;
    if (lastController && lastController !== c) {
      showUpdateBanner();
    }
    lastController = c;
  });

  function register() {
    ensureSoftReloadListeners();

    if (isUpdatePending()) {
      showUpdateBanner();
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(function (reg) {
        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        reg.addEventListener('updatefound', function () {
          var installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', function () {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner();
            }
          });
        });

        window.addEventListener('focus', function () {
          reg.update();
        });
      })
      .catch(function () {
        /* ignore */
      });
  }

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register);
})();
