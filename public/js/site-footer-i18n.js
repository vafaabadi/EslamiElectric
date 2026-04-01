(function (global) {
  var STR = {
    en: {
      footerCopyright: '© 2026 Eslami Electric. All rights reserved.',
      footerDev: 'Website developed by Vafa Abadi.'
    },
    fa: {
      footerCopyright: '© ۲۰۲۶ الکتریکی اسلامی. تمامی حقوق محفوظ است.',
      footerDev: 'وب‌سایت توسعه‌یافته توسط وفا آبادی.'
    }
  };

  function lang() {
    return global.localStorage && global.localStorage.getItem('lang') === 'fa' ? 'fa' : 'en';
  }

  function applyFooterI18n() {
    var t = STR[lang()];
    global.document.querySelectorAll('[data-i18n="footer-copyright"]').forEach(function (el) {
      el.textContent = t.footerCopyright;
    });
    global.document.querySelectorAll('[data-i18n="footer-dev"]').forEach(function (el) {
      el.textContent = t.footerDev;
    });
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
