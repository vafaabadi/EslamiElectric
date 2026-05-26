(function (global) {
  var STR = {
    en: {
      footerCopyright: '© 2026 Eslami Electric. All rights reserved.',
      footerDev: 'Website developed by Vafa Abadi.',
      footerPrivacy: 'Privacy Policy'
    },
    fa: {
      footerCopyright: '© ۲۰۲۶ الکتریکی اسلامی. تمامی حقوق محفوظ است.',
      footerDev: 'وب‌سایت توسعه‌یافته توسط وفا آبادی.',
      footerPrivacy: 'سیاست حریم خصوصی'
    }
  };

  function lang() {
    return global.localStorage && global.localStorage.getItem('lang') === 'fa' ? 'fa' : 'en';
  }

  function privacyHref(l) {
    return '/' + l + '/privacy';
  }

  function ensureFooterPrivacyLink(t, l) {
    global.document.querySelectorAll('footer .border-t, footer > div').forEach(function (block) {
      if (!block.querySelector('[data-i18n="footer-copyright"]') && !block.querySelector('[data-i18n="footer-dev"]')) {
        return;
      }
      var link = block.querySelector('[data-footer-privacy]');
      if (!link) {
        link = global.document.createElement('p');
        link.className = 'mt-2';
        link.innerHTML =
          '<a data-footer-privacy href="' +
          privacyHref(l) +
          '" class="text-amber-400 hover:underline"></a>';
        var dev = block.querySelector('[data-i18n="footer-dev"]');
        if (dev && dev.parentNode) {
          dev.parentNode.insertBefore(link, dev);
        } else {
          block.appendChild(link);
        }
        link = link.querySelector('[data-footer-privacy]') || link;
      }
      link.textContent = t.footerPrivacy;
      link.setAttribute('href', privacyHref(l));
    });
  }

  function applyFooterI18n() {
    var l = lang();
    var t = STR[l];
    global.document.querySelectorAll('[data-i18n="footer-copyright"]').forEach(function (el) {
      el.textContent = t.footerCopyright;
    });
    global.document.querySelectorAll('[data-i18n="footer-dev"]').forEach(function (el) {
      el.textContent = t.footerDev;
    });
    ensureFooterPrivacyLink(t, l);
  }

  function runWhenReady() {
    if (global.document.documentElement.classList.contains('locale-ready')) {
      applyFooterI18n();
    } else {
      global.document.addEventListener(
        'localehint',
        function onLh() {
          applyFooterI18n();
        },
        { once: true }
      );
    }
  }

  runWhenReady();

  global.document.addEventListener(
    'click',
    function (ev) {
      var id = ev.target && ev.target.id;
      if (id === 'lang-en' || id === 'lang-fa') {
        global.setTimeout(applyFooterI18n, 0);
      }
    },
    true
  );

  global.applyFooterI18n = applyFooterI18n;
})(typeof window !== 'undefined' ? window : this);
