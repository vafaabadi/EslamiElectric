runWhenLocaleReady(function () {
    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        formTitle: 'Reset Password',
        labelNewPassword: 'New Password *',
        labelConfirmPassword: 'Confirm New Password *',
        submitBtn: 'Set New Password',
        backToLogin: 'Back to Log In',
        successMessage: 'Password has been reset. Redirecting to login...',
        errorPasswordShort: 'Password must be at least 8 characters',
        errorPasswordMismatch: 'Passwords do not match',
        errorInvalidTokenBefore: 'Invalid or expired reset link.',
        errorInvalidTokenLink: 'Request a new one',
        errorFailed: 'Failed to reset password. Please try again.'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        formTitle: 'بازنشانی رمز عبور',
        labelNewPassword: 'رمز عبور جدید *',
        labelConfirmPassword: 'تکرار رمز عبور جدید *',
        submitBtn: 'تنظیم رمز عبور جدید',
        backToLogin: 'بازگشت به ورود',
        successMessage: 'رمز عبور بازنشانی شد. در حال انتقال به صفحه ورود...',
        errorPasswordShort: 'رمز عبور باید حداقل ۸ کاراکتر باشد',
        errorPasswordMismatch: 'رمز عبور و تکرار آن یکسان نیستند',
        errorInvalidTokenBefore: 'لینک بازنشانی نامعتبر یا منقضی است.',
        errorInvalidTokenLink: 'لینک جدید درخواست کنید',
        errorFailed: 'بازنشانی رمز عبور ناموفق بود. لطفاً دوباره تلاش کنید.'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    const resetForm = document.getElementById('reset-form');
    const resetMessage = document.getElementById('reset-message');
    const invalidTokenMsg = document.getElementById('invalid-token-msg');
    const submitBtn = document.getElementById('submit-btn');

    function resetFeedback(isError, text) {
      resetMessage.className = isError ? 'text-sm mt-2 text-red-600' : 'text-sm mt-2 text-emerald-600';
      resetMessage.textContent = text;
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, !!isError);
      }
      if (typeof window.scrollFeedbackIntoView === 'function') {
        window.scrollFeedbackIntoView(resetMessage);
      }
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('form-title').textContent = t.formTitle;
      document.getElementById('label-new-password').textContent = t.labelNewPassword;
      document.getElementById('label-confirm-password').textContent = t.labelConfirmPassword;
      document.getElementById('submit-btn').textContent = t.submitBtn;
      document.getElementById('back-login-label').textContent = t.backToLogin;
      document.getElementById('nav-login').textContent = currentLang === 'fa' ? 'ورود' : 'Log In';

      document.getElementById('invalid-msg-text').textContent = t.errorInvalidTokenBefore + ' ';
      document.getElementById('invalid-msg-link').textContent = t.errorInvalidTokenLink;
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

    if (!token) {
      resetForm.classList.add('hidden');
      invalidTokenMsg.classList.remove('hidden');
      invalidTokenMsg.querySelector('a').href = 'forgot-password.html';
    }

    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      resetMessage.textContent = '';
      resetMessage.className = 'text-sm mt-2';
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, false);
      }
      const t = translations[currentLang];

      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (newPassword.length < 8) {
        resetFeedback(true, t.errorPasswordShort);
        return;
      }
      if (newPassword !== confirmPassword) {
        resetFeedback(true, t.errorPasswordMismatch);
        return;
      }

      try {
        submitBtn.disabled = true;
        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword, confirmPassword })
        });

        const data = await res.json();

        if (!res.ok) {
          resetFeedback(true, data.error || t.errorFailed);
          return;
        }

        resetFeedback(false, t.successMessage);
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1500);
      } catch (err) {
        resetFeedback(true, t.errorFailed);
      } finally {
        submitBtn.disabled = false;
      }
    });

    applyPageLanguage();
    });
