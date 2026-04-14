runWhenLocaleReady(function () {
    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        formTitle: 'Update Password',
        labelPassword: 'New password *',
        labelConfirm: 'Confirm new password *',
        submitBtn: 'Update Password',
        successMsg: 'Your password has been updated.',
        noSessionMsg: "This page is for setting a new password after clicking the link from your email. If you arrived here by mistake, go back to login.",
        backToLogin: 'Back to Log In',
        errorMismatch: 'Passwords do not match.',
        errorFailed: 'Failed to update password. Please try again or request a new link.',
        errorNoConfig: 'Password update is not configured.'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        formTitle: 'به‌روزرسانی رمز عبور',
        labelPassword: 'رمز عبور جدید *',
        labelConfirm: 'تکرار رمز عبور جدید *',
        submitBtn: 'به‌روزرسانی رمز عبور',
        successMsg: 'رمز عبور شما به‌روزرسانی شد.',
        noSessionMsg: 'این صفحه برای تنظیم رمز عبور جدید پس از کلیک روی لینک ایمیل است. در صورت ورود اشتباه، به صفحه ورود برگردید.',
        backToLogin: 'بازگشت به ورود',
        errorMismatch: 'رمزهای عبور یکسان نیستند.',
        errorFailed: 'به‌روزرسانی رمز عبور ناموفق بود. دوباره تلاش کنید یا لینک جدید درخواست کنید.',
        errorNoConfig: 'به‌روزرسانی رمز عبور پیکربندی نشده است.'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';
    let supabaseClient = null;

    const updateForm = document.getElementById('update-form');
    const noSession = document.getElementById('no-session');
    const successBox = document.getElementById('success-box');
    const updateMessage = document.getElementById('update-message');
    const submitBtn = document.getElementById('submit-btn');

    function updatePwFeedback(isError, text) {
      updateMessage.className = isError ? 'text-sm mt-2 text-red-600' : 'text-sm mt-2 text-emerald-600';
      updateMessage.textContent = text;
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, !!isError);
      }
      if (typeof window.scrollFeedbackIntoView === 'function') {
        window.scrollFeedbackIntoView(updateMessage);
      }
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('form-title').textContent = t.formTitle;
      document.getElementById('label-password').textContent = t.labelPassword;
      document.getElementById('label-confirm').textContent = t.labelConfirm;
      document.getElementById('submit-btn').textContent = t.submitBtn;
      document.getElementById('success-msg').textContent = t.successMsg;
      document.getElementById('no-session-msg').textContent = t.noSessionMsg;
      document.querySelector('main .mt-6 a').textContent = t.backToLogin;
      document.getElementById('nav-login').textContent = currentLang === 'fa' ? 'ورود' : 'Log In';
      document.getElementById('lang-en').className = currentLang === 'en'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      document.getElementById('lang-fa').className = currentLang === 'fa'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      if (typeof applyFooterI18n === 'function') applyFooterI18n();
    }

    document.getElementById('lang-en').addEventListener('click', function() {
      currentLang = 'en';
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localePref', 'user');
      applyPageLanguage();
    });
    document.getElementById('lang-fa').addEventListener('click', function() {
      currentLang = 'fa';
      localStorage.setItem('lang', 'fa');
      localStorage.setItem('localePref', 'user');
      applyPageLanguage();
    });

    async function init() {
      applyPageLanguage();
      function readServerPublicConfig() {
        const el = document.getElementById('server-public-config');
        if (!el || !el.textContent) return null;
        try { return JSON.parse(el.textContent); } catch (e) { return null; }
      }
      const config = readServerPublicConfig();
      if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
        noSession.querySelector('p').textContent = translations[currentLang].errorNoConfig;
        noSession.classList.remove('hidden');
        return;
      }

      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      if (typeof supabaseClient.auth.initialize === 'function') {
        await supabaseClient.auth.initialize();
      }
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        noSession.classList.remove('hidden');
        return;
      }

      noSession.classList.add('hidden');
      updateForm.classList.remove('hidden');
    }

    updateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      updateMessage.textContent = '';
      updateMessage.className = 'text-sm mt-2';
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, false);
      }
      const t = translations[currentLang];
      const password = document.getElementById('password').value;
      const confirmVal = document.getElementById('confirm').value;

      if (password !== confirmVal) {
        updatePwFeedback(true, t.errorMismatch);
        return;
      }

      if (!supabaseClient) {
        updatePwFeedback(true, t.errorNoConfig);
        return;
      }

      try {
        submitBtn.disabled = true;
        const { error } = await supabaseClient.auth.updateUser({ password });

        if (error) {
          updatePwFeedback(true, error.message || t.errorFailed);
          return;
        }

        updateForm.classList.add('hidden');
        successBox.classList.remove('hidden');
        if (typeof window.setPrimaryButtonError === 'function') {
          window.setPrimaryButtonError(submitBtn, false);
        }
        if (typeof window.scrollFeedbackIntoView === 'function') {
          window.scrollFeedbackIntoView(successBox);
        }
      } catch (err) {
        updatePwFeedback(true, t.errorFailed);
      } finally {
        submitBtn.disabled = false;
      }
    });

    init();
    });
