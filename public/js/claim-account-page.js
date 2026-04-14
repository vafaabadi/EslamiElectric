runWhenLocaleReady(function () {
    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        formTitle: 'Claim your account',
        formDesc: 'Set a password to attach your order history to an account. You’ll then see your orders in My Orders.',
        accountFor: 'Account for:',
        labelPassword: 'Password *',
        labelConfirm: 'Confirm password *',
        submitBtn: 'Set password & claim account',
        backLogin: 'Back to Log In',
        successMessage: 'Account claimed! Redirecting to My Orders...',
        errorPasswordShort: 'Password must be at least 8 characters',
        errorPasswordMismatch: 'Passwords do not match',
        errorInvalid: 'Invalid or expired link. Use the link from your order email.',
        errorFailed: 'Something went wrong. Please try again.'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        formTitle: 'ادعای حساب کاربری',
        formDesc: 'یک رمز عبور تنظیم کنید تا سفارشات شما به یک حساب متصل شود. پس از آن سفارشات خود را در «سفارشات من» ببینید.',
        accountFor: 'حساب برای:',
        labelPassword: 'رمز عبور *',
        labelConfirm: 'تکرار رمز عبور *',
        submitBtn: 'تنظیم رمز و ادعای حساب',
        backLogin: 'بازگشت به ورود',
        successMessage: 'حساب ادعا شد. در حال انتقال به سفارشات من...',
        errorPasswordShort: 'رمز عبور باید حداقل ۸ کاراکتر باشد',
        errorPasswordMismatch: 'رمز عبور و تکرار آن یکسان نیستند',
        errorInvalid: 'لینک نامعتبر یا منقضی است. از لینک ایمیل سفارش استفاده کنید.',
        errorFailed: 'خطایی رخ داد. لطفاً دوباره تلاش کنید.'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    const claimForm = document.getElementById('claim-form');
    const claimMessage = document.getElementById('claim-message');
    const invalidMsg = document.getElementById('invalid-msg');
    const emailMasked = document.getElementById('email-masked');
    const submitBtn = document.getElementById('submit-btn');

    function claimFeedback(isError, text) {
      claimMessage.className = isError ? 'text-sm mt-2 text-red-600' : 'text-sm mt-2 text-emerald-600';
      claimMessage.textContent = text;
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, !!isError);
      }
      if (typeof window.scrollFeedbackIntoView === 'function') {
        window.scrollFeedbackIntoView(claimMessage);
      }
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
      document.getElementById('site-title').textContent = t.siteTitle || 'Eslami Electric';
      document.getElementById('site-subtitle').textContent = t.siteSubtitle || 'Quality electrical supplies';
      document.getElementById('form-title').textContent = t.formTitle;
      document.getElementById('form-desc').textContent = t.formDesc;
      document.getElementById('label-password').textContent = t.labelPassword;
      document.getElementById('label-confirm').textContent = t.labelConfirm;
      document.getElementById('submit-text').textContent = t.submitBtn;
      document.getElementById('back-login').textContent = t.backLogin;
      document.getElementById('nav-login').textContent = currentLang === 'fa' ? 'ورود' : 'Log In';
      document.getElementById('account-for-label').textContent = t.accountFor;
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
      claimForm.classList.add('hidden');
      invalidMsg.classList.remove('hidden');
      invalidMsg.textContent = translations[currentLang].errorInvalid;
    } else {
      fetch('/api/claim-account/' + encodeURIComponent(token))
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.valid && data.email) {
            emailMasked.textContent = data.email;
          } else {
            claimForm.classList.add('hidden');
            invalidMsg.classList.remove('hidden');
            invalidMsg.textContent = data.error || translations[currentLang].errorInvalid;
          }
        })
        .catch(function () {
          claimForm.classList.add('hidden');
          invalidMsg.classList.remove('hidden');
          invalidMsg.textContent = translations[currentLang].errorInvalid;
        });
    }

    claimForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      claimMessage.textContent = '';
      claimMessage.className = 'text-sm mt-2';
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, false);
      }
      const t = translations[currentLang];
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password.length < 8) {
        claimFeedback(true, t.errorPasswordShort);
        return;
      }
      if (password !== confirmPassword) {
        claimFeedback(true, t.errorPasswordMismatch);
        return;
      }

      submitBtn.disabled = true;
      try {
        const res = await fetch('/api/claim-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password, confirmPassword })
        });
        const data = await res.json().catch(function () { return {}; });

        if (!res.ok) {
          claimFeedback(true, data.error || t.errorFailed);
          return;
        }
        if (data.token) {
          localStorage.setItem('token', data.token);
        }
        claimFeedback(false, t.successMessage);
        setTimeout(function () {
          window.location.href = 'orders.html';
        }, 1500);
      } catch (err) {
        claimFeedback(true, t.errorFailed);
      } finally {
        submitBtn.disabled = false;
      }
    });

    applyPageLanguage();
    });
