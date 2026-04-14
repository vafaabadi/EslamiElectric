runWhenLocaleReady(function () {
    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        formTitle: 'Forgot Password',
        formDescription: "Enter your email and we'll send you a link to reset your password.",
        labelEmail: 'Email *',
        submitBtn: 'Send Reset Link',
        backToLogin: 'Back to Log In',
        successMessage: "If an account exists for this email, we've sent a reset link. Check your inbox and spam.",
        errorFailed: 'Something went wrong. Please try again.',
        errorNoConfig: 'Password reset is not configured. Contact support.'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        formTitle: 'فراموشی رمز عبور',
        formDescription: 'ایمیل خود را وارد کنید تا لینک بازنشانی رمز عبور برای شما ارسال شود.',
        labelEmail: 'ایمیل *',
        submitBtn: 'ارسال لینک بازنشانی',
        backToLogin: 'بازگشت به ورود',
        successMessage: 'اگر حسابی با این ایمیل وجود داشته باشد، لینک بازنشانی ارسال شده است. صندوق ورودی و هرزنامه را بررسی کنید.',
        errorFailed: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
        errorNoConfig: 'بازنشانی رمز عبور پیکربندی نشده است.'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';

    const forgotForm = document.getElementById('forgot-form');
    const forgotMessage = document.getElementById('forgot-message');
    const submitBtn = document.getElementById('submit-btn');

    function forgotFeedback(isError, text) {
      forgotMessage.className = isError ? 'text-sm mt-2 text-red-600' : 'text-sm mt-2 text-emerald-600';
      forgotMessage.textContent = text;
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, !!isError);
      }
      if (typeof window.scrollFeedbackIntoView === 'function') {
        window.scrollFeedbackIntoView(forgotMessage);
      }
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('form-title').textContent = t.formTitle;
      document.getElementById('form-description').textContent = t.formDescription;
      document.getElementById('label-email').textContent = t.labelEmail;
      document.getElementById('submit-btn').textContent = t.submitBtn;
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

    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      forgotMessage.textContent = '';
      forgotMessage.className = 'text-sm mt-2';
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, false);
      }
      const t = translations[currentLang];
      const email = document.getElementById('email').value.trim();
      if (!email) return;

      try {
        submitBtn.disabled = true;
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json().catch(function () {
          return {};
        });
        if (res.status === 503) {
          forgotFeedback(true, t.errorNoConfig);
          return;
        }
        if (!res.ok) {
          forgotFeedback(true, (data && data.error) || t.errorFailed);
          return;
        }

        forgotFeedback(false, t.successMessage);
      } catch (err) {
        forgotFeedback(true, t.errorFailed);
      } finally {
        submitBtn.disabled = false;
      }
    });

    applyPageLanguage();
    });
