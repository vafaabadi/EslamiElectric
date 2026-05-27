(function (global) {
  var STR = {
    en: {
      siteTitle: 'Eslami Electric',
      siteSubtitle: 'Quality electrical supplies'
    },
    fa: {
      siteTitle: 'الکتریکی اسلامی',
      siteSubtitle: 'لوازم برق و روشنایی'
    }
  };

  function lang() {
    return global.localStorage && global.localStorage.getItem('lang') === 'fa' ? 'fa' : 'en';
  }

  function applyLang(l) {
    var t = STR[l];
    var enBlock = global.document.getElementById('privacy-en');
    var faBlock = global.document.getElementById('privacy-fa');
    var enBtn = global.document.getElementById('lang-en');
    var faBtn = global.document.getElementById('lang-fa');
    var title = global.document.getElementById('site-title');
    var sub = global.document.getElementById('site-subtitle');

    if (title) title.textContent = t.siteTitle;
    if (sub) sub.textContent = t.siteSubtitle;

    if (enBlock && faBlock) {
      if (l === 'fa') {
        enBlock.classList.add('hidden');
        faBlock.classList.remove('hidden');
        global.document.documentElement.setAttribute('dir', 'rtl');
        global.document.documentElement.setAttribute('lang', 'fa');
      } else {
        faBlock.classList.add('hidden');
        enBlock.classList.remove('hidden');
        global.document.documentElement.setAttribute('dir', 'ltr');
        global.document.documentElement.setAttribute('lang', 'en');
      }
    }

    if (enBtn && faBtn) {
      if (l === 'fa') {
        enBtn.className =
          'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
        faBtn.className = 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900';
      } else {
        enBtn.className = 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900';
        faBtn.className =
          'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      }
    }

    if (global.applyFooterI18n) global.applyFooterI18n();
  }

  function switchTo(l) {
    global.localStorage.setItem('lang', l);
    global.localStorage.setItem('localePref', 'user');
    applyLang(l);
  }

  function bindLangButtons() {
    var enBtn = global.document.getElementById('lang-en');
    var faBtn = global.document.getElementById('lang-fa');
    if (enBtn) {
      enBtn.addEventListener('click', function () {
        if (lang() !== 'en') switchTo('en');
      });
    }
    if (faBtn) {
      faBtn.addEventListener('click', function () {
        if (lang() !== 'fa') switchTo('fa');
      });
    }
  }

  function init() {
    applyLang(lang());
    bindLangButtons();
  }

  if (global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
