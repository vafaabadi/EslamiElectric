runWhenLocaleReady(function () {
    const LAST_AUTH_KEY = 'lastAuthProvider';

    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        formTitle: 'Log In',
        welcomeSub: 'Welcome to Eslami Electric',
        hintTelegram:
          'Telegram is popular in your region — Google and email/password work everywhere too.',
        hintGoogle:
          'Google sign-in is widely used in your region — Telegram and email/password work everywhere too.',
        hintSoloSocial:
          'Use Google or sign in with email and password below. Telegram only appears when the site has Telegram sign-in configured — resetting your password does not remove it.',
        continueGoogle: 'Continue with Google',
        telegramLabel: 'Log in with Telegram',
        orDivider: 'or',
        labelEmail: 'Email *',
        labelPassword: 'Password *',
        forgotPassword: 'Forgot password?',
        submitBtn: 'Log In with email',
        noAccountLabel: "Don't have an account?",
        signUpLink: 'Sign Up',
        loginSuccess: 'Login successful! Redirecting...',
        loginError: 'Invalid email or password.',
        loginInvalidCredsHint: 'If you just activated your account, your password might not match. Use `Forgot password?` to set a new one.',
        loginFailed: 'Login failed. Please try again.',
        oauthNotConfigured: 'Google sign-in is not configured on this site.',
        oauthNoServerConfig:
          'Open this page from your app server (e.g. http://localhost:3000/login.html), not as a saved file. The server injects Supabase settings.',
        oauthMissingEnvKeys:
          'Server is missing Supabase keys. Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file, then restart node server.js.',
        oauthFailed: 'Could not start Google sign-in. Enable Google in Supabase Auth providers.',
        telegramFailed: 'Telegram sign-in failed. Please try again.',
        telegramWrongDomain:
          'Telegram login only works on the exact domain you set in BotFather with /setdomain (e.g. https://HOST/login.html). Google sign-in works on this page.',
        telegramLocalhost:
          'Telegram login cannot run on localhost — open your live site on the domain registered in BotFather, or use Google here.'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        formTitle: 'ورود',
        welcomeSub: 'به الکتریکی اسلامی خوش آمدید',
        hintTelegram:
          'در منطقه شما تلگرام رایج‌تر است — گوگل و ایمیل/رمز عبور هم در همه جا در دسترس است.',
        hintGoogle:
          'ورود با گوگل برای بسیاری راحت‌تر است — تلگرام و ایمیل/رمز عبور هم در همه جا در دسترس است.',
        hintSoloSocial:
          'با گوگل یا ایمیل و رمز عبور وارد شوید. تلگرام فقط وقتی نمایش داده می‌شود که برای سایت فعال باشد — بازنشانی رمز آن را حذف نمی‌کند.',
        continueGoogle: 'ادامه با گوگل',
        telegramLabel: 'ورود با تلگرام',
        orDivider: 'یا',
        labelEmail: 'ایمیل *',
        labelPassword: 'رمز عبور *',
        forgotPassword: 'رمز عبور را فراموش کرده‌اید؟',
        submitBtn: 'ورود با ایمیل',
        noAccountLabel: 'حساب کاربری ندارید؟',
        signUpLink: 'ایجاد حساب',
        loginSuccess: 'ورود موفق! در حال انتقال...',
        loginError: 'ایمیل یا رمز عبور اشتباه است.',
        loginInvalidCredsHint: 'اگر اخیراً حساب را فعال کرده‌اید، ممکن است رمز عبور شما متفاوت باشد. از `رمز عبور را فراموش کرده‌اید؟` برای تعیین رمز جدید استفاده کنید.',
        loginFailed: 'ورود ناموفق. لطفاً دوباره تلاش کنید.',
        oauthNotConfigured: 'ورود با گوگل برای این سایت پیکربندی نشده است.',
        oauthNoServerConfig:
          'این صفحه را از سرور برنامه باز کنید (مثلاً http://localhost:3000/login.html)، نه به‌صورت فایل ذخیره‌شده. سرور تنظیمات Supabase را تزریق می‌کند.',
        oauthMissingEnvKeys:
          'کلیدهای Supabase در سرور نیست. در فایل .env مقدار SUPABASE_URL و SUPABASE_ANON_KEY را بگذارید و سرور را دوباره اجرا کنید.',
        oauthFailed: 'شروع ورود با گوگل ناموفق بود. گوگل را در تنظیمات احراز هویت Supabase فعال کنید.',
        telegramFailed: 'ورود با تلگرام ناموفق بود. لطفاً دوباره تلاش کنید.',
        telegramWrongDomain:
          'ورود با تلگرام فقط روی همان دامنه‌ای که در BotFather با /setdomain ثبت کرده‌اید کار می‌کند (مثلاً https://HOST/login.html). اینجا می‌توانید از گوگل استفاده کنید.',
        telegramLocalhost:
          'ورود با تلگرام روی localhost کار نمی‌کند — سایت را روی دامنهٔ ثبت‌شده در BotFather باز کنید یا اینجا از گوگل استفاده کنید.'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';
    window.__loginGeoIran = undefined;

    const loginForm = document.getElementById('login-form');
    const loginMessage = document.getElementById('login-message');
    const submitBtn = document.getElementById('submit-btn');

    function loginScrollToMessage() {
      if (typeof window.scrollFeedbackIntoView === 'function') {
        window.scrollFeedbackIntoView(loginMessage);
      }
    }

    function loginEmailError(text) {
      loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-red-600';
      loginMessage.textContent = text;
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, true);
      }
      loginScrollToMessage();
    }

    function readServerPublicConfig() {
      const el = document.getElementById('server-public-config');
      if (!el || !el.textContent) return null;
      try {
        return JSON.parse(el.textContent);
      } catch (e) {
        return null;
      }
    }

    function homePageHref() {
      const p = window.location.pathname || '';
      if (p.indexOf('/fa/') === 0) return '/fa/';
      if (p.indexOf('/en/') === 0) return '/en/';
      return localStorage.getItem('lang') === 'fa' ? '/fa/' : '/en/';
    }

    function applySocialButtonOrder() {
      const last = localStorage.getItem(LAST_AUTH_KEY);
      const gWrap = document.getElementById('wrap-google');
      const tWrap = document.getElementById('wrap-telegram');
      if (!gWrap || !tWrap) return;
      let telegramFirst = false;
      if (last === 'telegram') telegramFirst = true;
      else if (last === 'google') telegramFirst = false;
      else if (window.__loginGeoIran === true) telegramFirst = true;
      else telegramFirst = false;
      gWrap.classList.remove('order-1', 'order-2');
      tWrap.classList.remove('order-1', 'order-2');
      if (telegramFirst) {
        tWrap.classList.add('order-1');
        gWrap.classList.add('order-2');
      } else {
        gWrap.classList.add('order-1');
        tWrap.classList.add('order-2');
      }
    }

    function updateSoftHintText() {
      const hintEl = document.getElementById('auth-soft-hint');
      if (!hintEl) return;
      const t = translations[currentLang];
      if (window.__loginGeoIran !== true && window.__loginGeoIran !== false) {
        hintEl.classList.add('hidden');
        return;
      }
      const cfg = readServerPublicConfig();
      var tgOn = !!(cfg && cfg.telegramLoginEnabled);
      hintEl.classList.remove('hidden');
      if (!tgOn) {
        hintEl.textContent = t.hintSoloSocial || t.hintGoogle;
        return;
      }
      if (window.__loginGeoIran === true) {
        hintEl.textContent = t.hintTelegram;
      } else {
        hintEl.textContent = t.hintGoogle;
      }
    }

    async function loadLoginGeoHint() {
      try {
        const r = await fetch('/api/locale-hint');
        const d = await r.json();
        window.__loginGeoIran = !!d.inIran;
      } catch (e) {
        window.__loginGeoIran = false;
      }
      updateSoftHintText();
      applySocialButtonOrder();
    }

    function telegramWidgetHostnameMatchesPage(cfg) {
      var h = (location.hostname || '').toLowerCase();
      function stripWww(x) {
        return x.indexOf('www.') === 0 ? x.slice(4) : x;
      }
      var hs = stripWww(h);
      var hosts = cfg && cfg.telegramLoginWidgetHostnames;
      if (Array.isArray(hosts) && hosts.length > 0) {
        return hosts.some(function (exp) {
          return stripWww(String(exp).toLowerCase()) === hs;
        });
      }
      var expected = cfg && cfg.telegramLoginWidgetHostname ? String(cfg.telegramLoginWidgetHostname).toLowerCase() : '';
      if (!expected) return true;
      return hs === stripWww(expected);
    }

    function mountTelegramWidget() {
      const config = readServerPublicConfig();
      const host = document.getElementById('telegram-widget-host');
      const tWrap = document.getElementById('wrap-telegram');
      const hintEl = document.getElementById('telegram-domain-hint');
      if (!host || !tWrap) return;
      host.innerHTML = '';
      if (hintEl) {
        hintEl.classList.add('hidden');
        hintEl.textContent = '';
      }
      if (!config || !config.telegramLoginEnabled || !config.telegramBotUsername) {
        tWrap.classList.add('hidden');
        return;
      }
      var h = location.hostname || '';
      var t = translations[currentLang];
      if (h === 'localhost' || h === '127.0.0.1') {
        tWrap.classList.remove('hidden');
        if (hintEl) {
          hintEl.textContent = t.telegramLocalhost;
          hintEl.classList.remove('hidden');
        }
        return;
      }
      if (!telegramWidgetHostnameMatchesPage(config)) {
        tWrap.classList.remove('hidden');
        if (hintEl) {
          var list = Array.isArray(config.telegramLoginWidgetHostnames) ? config.telegramLoginWidgetHostnames : [];
          var reg = (list.length ? list.join(', ') : (config.telegramLoginWidgetHostname || 'your-domain.com')).replace(
            /</g,
            ''
          );
          hintEl.textContent = t.telegramWrongDomain.replace('HOST', reg);
          hintEl.classList.remove('hidden');
        }
        return;
      }
      tWrap.classList.remove('hidden');
      window.onTelegramAuth = async function (user) {
        loginMessage.textContent = '';
        loginMessage.className = 'text-sm min-h-[1.25rem] text-center';
        const t = translations[currentLang];
        try {
          const res = await fetch('/api/auth/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
          });
          const data = await res.json().catch(function () {
            return {};
          });
          if (!res.ok) {
            loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-red-600';
            loginMessage.textContent = data.error || t.telegramFailed;
            loginScrollToMessage();
            return;
          }
          localStorage.setItem(LAST_AUTH_KEY, 'telegram');
          applySocialButtonOrder();
          if (data.token) localStorage.setItem('token', data.token);
          loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-emerald-600';
          loginMessage.textContent = t.loginSuccess;
          setTimeout(function () {
            window.location.href = homePageHref();
          }, 600);
        } catch (e) {
          loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-red-600';
          loginMessage.textContent = t.telegramFailed;
          loginScrollToMessage();
        }
      };
      const s = document.createElement('script');
      s.src = 'https://telegram.org/js/telegram-widget.js?22';
      s.async = true;
      s.setAttribute('data-telegram-login', config.telegramBotUsername);
      s.setAttribute('data-size', 'large');
      s.setAttribute('data-radius', '8');
      s.setAttribute('data-request-access', 'write');
      s.setAttribute('data-onauth', 'onTelegramAuth(user)');
      host.appendChild(s);
    }

    function getOAuthConfigErrorMessage() {
      const t = translations[currentLang];
      const el = document.getElementById('server-public-config');
      if (!el) {
        return t.oauthNoServerConfig;
      }
      const raw = (el.textContent || '').trim();
      if (!raw) {
        return t.oauthNoServerConfig;
      }
      try {
        const c = JSON.parse(raw);
        if (!c.supabaseUrl || !c.supabaseAnonKey) {
          return t.oauthMissingEnvKeys;
        }
      } catch (e) {
        return t.oauthNoServerConfig;
      }
      return t.oauthNotConfigured;
    }

    async function startGoogleOAuth() {
      const t = translations[currentLang];
      const config = readServerPublicConfig();
      loginMessage.textContent = '';
      loginMessage.className = 'text-sm min-h-[1.25rem] text-center';
      if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
        loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-red-600';
        loginMessage.textContent = getOAuthConfigErrorMessage();
        loginScrollToMessage();
        return;
      }
      try {
        localStorage.setItem(LAST_AUTH_KEY, 'google');
        applySocialButtonOrder();
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
          loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-red-600';
          loginMessage.textContent = t.oauthFailed;
          loginScrollToMessage();
          return;
        }
        const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, storage: window.localStorage }
        });
        if (supabase.auth && typeof supabase.auth.initialize === 'function') {
          try {
            await supabase.auth.initialize();
          } catch (initErr) {
            console.warn('auth.initialize:', initErr);
          }
        }
        // PKCE stores the code verifier in localStorage for THIS origin only. redirectTo must use
        // window.location.origin (not config.baseUrl), or www vs apex / env mismatch breaks exchange.
        var path = window.location.pathname || '';
        var loc = '';
        if (path.indexOf('/fa/') === 0) loc = '/fa/';
        else if (path.indexOf('/en/') === 0) loc = '/en/';
        var origin = (window.location && window.location.origin ? window.location.origin : '').replace(/\/$/, '');
        if (!origin) {
          loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-red-600';
          loginMessage.textContent = t.oauthFailed;
          loginScrollToMessage();
          return;
        }
        var redirectTo = origin + (loc ? loc + 'auth-callback.html' : '/auth-callback.html');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectTo,
            queryParams: { prompt: 'select_account' }
          }
        });
        if (error) {
          loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-red-600';
          loginMessage.textContent = error.message || t.oauthFailed;
          loginScrollToMessage();
        }
      } catch (e) {
        console.error('startGoogleOAuth:', e);
        loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-red-600';
        loginMessage.textContent = t.oauthFailed;
        loginScrollToMessage();
      }
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('form-title').textContent = t.formTitle;
      document.getElementById('welcome-sub').textContent = t.welcomeSub;
      document.getElementById('btn-google-label').textContent = t.continueGoogle;
      document.getElementById('divider-or').textContent = t.orDivider;
      document.getElementById('label-email').textContent = t.labelEmail;
      document.getElementById('label-password').textContent = t.labelPassword;
      document.getElementById('link-forgot').textContent = t.forgotPassword;
      document.getElementById('submit-btn').textContent = t.submitBtn;
      document.getElementById('no-account-label').textContent = t.noAccountLabel;
      var linkSignupMain = document.getElementById('link-signup-main');
      if (linkSignupMain) linkSignupMain.textContent = t.signUpLink;
      document.getElementById('nav-signup').textContent = currentLang === 'fa' ? 'ایجاد حساب کاربری' : 'Sign Up';
      const token = localStorage.getItem('token');
      const navSignup = document.getElementById('nav-signup');
      if (navSignup) navSignup.classList.toggle('hidden', !!token);
      const noAccountBlock = document.getElementById('no-account-block');
      if (noAccountBlock) noAccountBlock.classList.toggle('hidden', !!token);

      document.getElementById('lang-en').className = currentLang === 'en'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      document.getElementById('lang-fa').className = currentLang === 'fa'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';

      if (typeof applyFooterI18n === 'function') applyFooterI18n();
      updateSoftHintText();
      mountTelegramWidget();
    }

    document.getElementById('btn-google').addEventListener('click', function () {
      startGoogleOAuth();
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginMessage.textContent = '';
      loginMessage.className = 'text-sm min-h-[1.25rem] text-center';
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(submitBtn, false);
      }
      const t = translations[currentLang];

      const email = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        loginEmailError(t.loginError);
        return;
      }

      localStorage.setItem(LAST_AUTH_KEY, 'email');
      applySocialButtonOrder();

      try {
        submitBtn.disabled = true;
        const loginRes = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await loginRes.json().catch(() => ({}));
        if (!loginRes.ok) {
          const msg = (data && data.error) ? String(data.error) : t.loginFailed;
          if (loginRes.status === 401 && msg.toLowerCase().includes('invalid')) {
            loginEmailError(msg + ' ' + t.loginInvalidCredsHint);
          } else {
            loginEmailError(msg);
          }
          return;
        }
        if (data.token) localStorage.setItem('token', data.token);
        if (typeof window.setPrimaryButtonError === 'function') {
          window.setPrimaryButtonError(submitBtn, false);
        }
        loginMessage.className = 'text-sm min-h-[1.25rem] text-center text-emerald-600';
        loginMessage.textContent = t.loginSuccess;
        loginScrollToMessage();
        setTimeout(() => { window.location.href = homePageHref(); }, 800);
      } catch (err) {
        loginEmailError(t.loginFailed);
      } finally {
        submitBtn.disabled = false;
      }
    });

    document.getElementById('lang-en').addEventListener('click', () => {
      currentLang = 'en';
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localePref', 'user');
      applyPageLanguage();
      applySocialButtonOrder();
    });
    document.getElementById('lang-fa').addEventListener('click', () => {
      currentLang = 'fa';
      localStorage.setItem('lang', 'fa');
      localStorage.setItem('localePref', 'user');
      applyPageLanguage();
      applySocialButtonOrder();
    });

    applyPageLanguage();
    loadLoginGeoHint();
    });
