runWhenLocaleReady(function () {
    /** Always use window.* — bare PROFILE_DELETE_ACCOUNT_ENABLED throws ReferenceError if undeclared (breaks whole page). */
    function profileDeleteEnabled() {
      return typeof window !== 'undefined' && window.PROFILE_DELETE_ACCOUNT_ENABLED === true;
    }
    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        pageTitle: 'My Profile',
        navHome: 'Home',
        navProducts: 'Products',
        navBasket: 'Basket',
        navOrders: 'My Orders',
        navProfile: 'My Profile',
        navLogin: 'Login',
        createAccount: 'Sign Up',
        navLogout: 'Logout',
        redirectMessage: 'Please log in to view your profile.',
        logIn: 'Log In',
        loadingProfile: 'Loading profile…',
        accountType: 'Account type',
        person: 'Person',
        company: 'Company',
        labelFirstname: 'First name *',
        labelSurname: 'Surname *',
        labelDob: 'Date of birth',
        labelEmail: 'Account email',
        emailHint: 'Sign-in email cannot be changed here.',
        telegramEmailExplain:
          'You signed in with Telegram. The address above is only an account id (not a mailbox). Use the section below to add your real email and a password — or keep using Telegram to sign in.',
        linkEmailTitle: 'Set your email & password',
        linkEmailIntro:
          'Optional: set an email and password for signing in on the login page (in addition to Telegram). If you see “already in use”, that address belongs to another account — use Contact email above for your order instead, then Save changes.',
        labelLinkEmail: 'Your email',
        labelLinkPassword: 'Password',
        labelLinkPassword2: 'Confirm password',
        linkEmailSubmit: 'Save email & password',
        linkEmailSuccess: 'Your email and password are saved. You can sign in with email or Telegram.',
        linkEmailError: 'Could not save. Check the details and try again.',
        linkEmailMismatch: 'Passwords do not match.',
        linkEmailShort: 'Password must be at least 8 characters.',
        labelContactEmail: 'Contact email *',
        contactEmailHint:
          'Required for order confirmations and receipts. Use an address you check regularly.',
        contactEmailHintTelegram:
          'Required for checkout while you sign in with Telegram. Use the same address as your order — this field is only for contact and receipts; it does not replace your Telegram login. If you cannot use “Set email & password” because that email is already registered, fill this and Save changes.',
        labelMobile: 'Mobile *',
        labelLandline: 'Landline',
        labelBank: 'Bank account details',
        labelAddress: 'Address *',
        companySectionTitle: 'Company details',
        labelCompanyName: 'Company name *',
        labelCompanyNumber: 'Company number *',
        labelCompanyContact: 'Company contact number',
        labelCompanyPrincipal: 'Principal contact',
        saveChanges: 'Save changes',
        saved: 'Profile updated.',
        loadError: 'Could not load profile. Please try again.',
        saveError: 'Could not save changes.',
        errorContactEmail: 'Please enter your contact email.',
        errorMobile: 'Invalid mobile number.',
        errorLandline: 'Invalid landline number.',
        phoneHintMobile: 'e.g. +44 7123 456789 · +98 912 345 6789 · +1 202 555 0123',
        phoneHintLandline: 'e.g. +44 20 7123 4567 · +98 21 1234 5678',
        phoneHintCompany: 'e.g. +971 4 123 4567 · +44 20 7123 4567',
        phoneErrorEmpty: 'Enter your mobile number.',
        phoneErrorCountry: 'Your number must include a country code (e.g. +44, +98). Pick the flag, then type or paste the full number in this field, starting with + or 00.',
        phoneErrorFormat: 'The number length does not match international format. Check the country code and the digits that follow.',
        phoneErrorInvalid: 'This number is not valid for the selected country. Change the country or correct the digits.',
        dangerTitle: 'Delete account',
        dangerBody:
          'This removes your sign-in immediately and strips personal details from your orders in our system. We keep amounts for our records. Your profile is permanently deleted after one year. This cannot be undone.',
        labelDeletePassword: 'Password (required to confirm deletion)',
        deletePasswordRequired:
          'Enter your password (at least 8 characters) to confirm deletion. If you only use Google or Telegram, add a password in “Set your email & password” above first.',
        labelDeleteConfirm: 'Type the phrase below to confirm',
        deletePhraseHint: 'Type exactly: DELETE MY ACCOUNT',
        btnDeleteAccount: 'Delete my account permanently',
        deleteWrongPhrase: 'Type the confirmation phrase exactly as shown.',
        deleteSuccess: 'Your account has been closed. Redirecting…',
        deleteError: 'Could not delete account. Try again or contact support.',
        accountInactive: 'This account is no longer active. Please sign in again or create a new account.'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        pageTitle: 'پروفایل من',
        navHome: 'خانه',
        navProducts: 'محصولات',
        navBasket: 'سبد خرید',
        navOrders: 'سفارشات من',
        navProfile: 'پروفایل من',
        navLogin: 'ورود',
        createAccount: 'ایجاد حساب کاربری',
        navLogout: 'خروج',
        redirectMessage: 'برای مشاهده پروفایل وارد شوید.',
        logIn: 'ورود',
        loadingProfile: 'در حال بارگذاری…',
        accountType: 'نوع حساب',
        person: 'شخصی',
        company: 'شرکت',
        labelFirstname: 'نام *',
        labelSurname: 'نام خانوادگی *',
        labelDob: 'تاریخ تولد',
        labelEmail: 'ایمیل حساب',
        emailHint: 'ایمیل ورود از اینجا قابل تغییر نیست.',
        telegramEmailExplain:
          'با تلگرام وارد شده‌اید. آدرس بالا فقط شناسهٔ حساب است (صندوق ایمیل نیست). در بخش زیر ایمیل واقعی و رمز عبور بگذارید — یا فقط با تلگرام وارد شوید.',
        linkEmailTitle: 'تنظیم ایمیل و رمز عبور',
        linkEmailIntro:
          'اختیاری: ایمیل و رمز برای ورود در صفحهٔ ورود (علاوه بر تلگرام). اگر «قبلاً ثبت شده» دیدید، آن ایمیل متعلق به حساب دیگری است — برای سفارش از «ایمیل تماس» بالا استفاده کنید، سپس ذخیرهٔ تغییرات.',
        labelLinkEmail: 'ایمیل شما',
        labelLinkPassword: 'رمز عبور',
        labelLinkPassword2: 'تکرار رمز عبور',
        linkEmailSubmit: 'ذخیره ایمیل و رمز',
        linkEmailSuccess: 'ایمیل و رمز ذخیره شد. می‌توانید با ایمیل یا تلگرام وارد شوید.',
        linkEmailError: 'ذخیره نشد. اطلاعات را بررسی کنید.',
        linkEmailMismatch: 'رمزها یکسان نیستند.',
        linkEmailShort: 'رمز باید حداقل ۸ کاراکتر باشد.',
        labelContactEmail: 'ایمیل تماس *',
        contactEmailHint:
          'برای تأیید سفارش و رسید الزامی است. لطفاً آدرسی را بزنید که واقعاً می‌خوانید.',
        contactEmailHintTelegram:
          'برای تکمیل خرید با ورود تلگرامی الزامی است. می‌توانید همان ایمیل سفارش را بزنید — فقط برای تماس و رسید است و جایگزین ورود با تلگرام نیست. اگر «ایمیل و رمز» به‌خاطر ثبت قبلی نشد، همین را پر کنید و ذخیره کنید.',
        labelMobile: 'موبایل *',
        labelLandline: 'تلفن ثابت',
        labelBank: 'جزئیات حساب بانکی',
        labelAddress: 'آدرس *',
        companySectionTitle: 'جزئیات شرکت',
        labelCompanyName: 'نام شرکت *',
        labelCompanyNumber: 'شماره ثبت شرکت *',
        labelCompanyContact: 'تلفن تماس شرکت',
        labelCompanyPrincipal: 'شخص تماس اصلی',
        saveChanges: 'ذخیره تغییرات',
        saved: 'پروفایل به‌روز شد.',
        loadError: 'بارگذاری پروفایل ناموفق بود.',
        saveError: 'ذخیره تغییرات ناموفق بود.',
        errorContactEmail: 'لطفاً ایمیل تماس را وارد کنید.',
        errorMobile: 'شماره موبایل نامعتبر است.',
        errorLandline: 'شماره تلفن ثابت نامعتبر است.',
        phoneHintMobile: 'مثال: +98 912 345 6789 · +44 7123 456789 · +1 202 555 0123',
        phoneHintLandline: 'مثال: +98 21 1234 5678 · +44 20 7123 4567',
        phoneHintCompany: 'مثال: +971 4 123 4567 · +44 20 7123 4567',
        phoneErrorEmpty: 'شماره موبایل را وارد کنید.',
        phoneErrorCountry: 'شماره باید با کد کشور شروع شود (مثلاً +98 یا +44). کشور را انتخاب کنید، سپس شماره کامل را در همین فیلد با + یا ۰۰ وارد یا جای‌گذاری کنید.',
        phoneErrorFormat: 'طول شماره با فرمت بین‌المللی هم‌خوانی ندارد. کد کشور و ارقام بعد از آن را بررسی کنید.',
        phoneErrorInvalid: 'این شماره برای کشور انتخاب‌شده معتبر نیست. کشور را عوض کنید یا ارقام را اصلاح کنید.',
        dangerTitle: 'حذف حساب کاربری',
        dangerBody:
          'ورود شما بلافاصله غیرفعال می‌شود و جزئیات شخصی روی سفارش‌ها از سیستم ما حذف می‌شود. مبالغ برای سوابق نگه داشته می‌شود. پروفایل پس از یک سال به‌طور دائم حذف می‌شود. این عمل برگشت‌ناپذیر است.',
        labelDeletePassword: 'رمز عبور (در صورت ورود با ایمیل/رمز الزامی است)',
        labelDeleteConfirm: 'عبارت تأیید را دقیقاً وارد کنید',
        deletePhraseHint: 'دقیقاً بنویسید: DELETE MY ACCOUNT',
        btnDeleteAccount: 'حذف دائمی حساب من',
        deleteWrongPhrase: 'عبارت تأیید را دقیقاً مطابق نمونه وارد کنید.',
        deleteSuccess: 'حساب شما بسته شد. در حال انتقال…',
        deleteError: 'حذف حساب انجام نشد. دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
        accountInactive: 'این حساب دیگر فعال نیست. دوباره وارد شوید یا حساب جدید بسازید.'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';
    let cachedMe = null;

    function phoneErrMsg(detail, tr) {
      if (!detail || detail.ok) return '';
      var k = intlPhoneMessageKey(detail.code);
      return tr[k] || tr.phoneErrorInvalid;
    }

    function applyPhonePlaceholders() {
      var tr = translations[currentLang];
      var m = document.getElementById('mobile');
      var l = document.getElementById('landline');
      var c = document.getElementById('companyContactNumber');
      if (m) m.placeholder = tr.phoneHintMobile || '';
      if (l) l.placeholder = tr.phoneHintLandline || '';
      if (c) c.placeholder = tr.phoneHintCompany || '';
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      const token = localStorage.getItem('token');
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('page-title').textContent = t.pageTitle;
      document.getElementById('nav-home').textContent = t.navHome;
      document.getElementById('nav-products').textContent = t.navProducts;
      const navBasketMobileLabel = document.getElementById('nav-basket-mobile-label');
      if (navBasketMobileLabel) navBasketMobileLabel.textContent = t.navBasket;
      const navBasketLabel = document.getElementById('nav-basket-label');
      if (navBasketLabel) navBasketLabel.textContent = t.navBasket;
      document.getElementById('nav-orders').textContent = t.navOrders;
      document.getElementById('nav-profile').textContent = t.navProfile;
      document.getElementById('nav-login').textContent = t.navLogin;
      document.getElementById('go-account').textContent = t.createAccount;
      document.getElementById('nav-logout').textContent = t.navLogout;
      document.getElementById('redirect-message').textContent = t.redirectMessage;
      document.getElementById('redirect-link').textContent = t.logIn;
      document.getElementById('loading-text').textContent = t.loadingProfile;
      document.getElementById('label-type').textContent = t.accountType;
      document.getElementById('label-firstname').textContent = t.labelFirstname;
      document.getElementById('label-surname').textContent = t.labelSurname;
      document.getElementById('label-dob').textContent = t.labelDob;
      document.getElementById('label-email').textContent = t.labelEmail;
      document.getElementById('email-hint').textContent = t.emailHint;
      document.getElementById('telegram-email-explain').textContent = t.telegramEmailExplain;
      document.getElementById('label-contact-email').textContent = t.labelContactEmail;
      if (cachedMe && cachedMe.canLinkEmail) {
        document.getElementById('contact-email-hint').textContent = t.contactEmailHintTelegram;
      } else {
        document.getElementById('contact-email-hint').textContent = t.contactEmailHint;
      }
      var lte = document.getElementById('link-email-title');
      var lti = document.getElementById('link-email-intro');
      if (lte) lte.textContent = t.linkEmailTitle;
      if (lti) lti.textContent = t.linkEmailIntro;
      var lle = document.getElementById('label-link-email');
      var llp = document.getElementById('label-link-password');
      var ll2 = document.getElementById('label-link-password2');
      if (lle) lle.textContent = t.labelLinkEmail;
      if (llp) llp.textContent = t.labelLinkPassword;
      if (ll2) ll2.textContent = t.labelLinkPassword2;
      var blep = document.getElementById('btn-link-email-password');
      if (blep) blep.textContent = t.linkEmailSubmit;
      document.getElementById('label-mobile').textContent = t.labelMobile;
      document.getElementById('label-landline').textContent = t.labelLandline;
      document.getElementById('label-bank').textContent = t.labelBank;
      document.getElementById('label-address').textContent = t.labelAddress;
      document.getElementById('company-section-title').textContent = t.companySectionTitle;
      document.getElementById('label-company-name').textContent = t.labelCompanyName;
      document.getElementById('label-company-number').textContent = t.labelCompanyNumber;
      document.getElementById('label-company-contact').textContent = t.labelCompanyContact;
      document.getElementById('label-company-principal').textContent = t.labelCompanyPrincipal;
      document.getElementById('submit-btn').textContent = t.saveChanges;
      if (profileDeleteEnabled()) {
        var dt = document.getElementById('danger-title');
        if (dt) dt.textContent = t.dangerTitle;
        var dtx = document.getElementById('danger-text');
        if (dtx) dtx.textContent = t.dangerBody;
        var ldp = document.getElementById('label-delete-password');
        if (ldp) ldp.textContent = t.labelDeletePassword;
        var ldc = document.getElementById('label-delete-confirm');
        if (ldc) ldc.textContent = t.labelDeleteConfirm + ' — ' + t.deletePhraseHint;
        var bda = document.getElementById('btn-delete-account');
        if (bda) bda.textContent = t.btnDeleteAccount;
      }

      if (cachedMe) {
        const typeDisplay = document.getElementById('account-type-display');
        if (typeDisplay) typeDisplay.textContent = cachedMe.type === 'company' ? t.company : t.person;
      }

      document.getElementById('nav-login').classList.toggle('hidden', !!token);
      document.getElementById('go-account').classList.toggle('hidden', !!token);
      document.getElementById('nav-logout').classList.toggle('hidden', !token);

      document.getElementById('lang-en').className = currentLang === 'en'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900 text-left sm:text-center'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors text-left sm:text-center';
      document.getElementById('lang-fa').className = currentLang === 'fa'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900 text-left sm:text-center'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors text-left sm:text-center';
      if (typeof applyFooterI18n === 'function') applyFooterI18n();
      applyPhonePlaceholders();
    }

    function fillForm(me) {
      cachedMe = me;
      const typeDisplay = document.getElementById('account-type-display');
      const t = translations[currentLang];
      typeDisplay.textContent = me.type === 'company' ? t.company : t.person;
      document.getElementById('firstName').value = me.firstName || '';
      document.getElementById('surname').value = me.surname || '';
      document.getElementById('dob').value = me.dob ? String(me.dob).slice(0, 10) : '';
      document.getElementById('email').value = me.email || '';
      var tgExplain = document.getElementById('telegram-email-explain');
      if (tgExplain) {
        if (me.canLinkEmail) {
          tgExplain.classList.remove('hidden');
        } else {
          tgExplain.classList.add('hidden');
        }
      }
      var linkSetup = document.getElementById('link-email-setup');
      var contactEl = document.getElementById('contactEmail');
      if (me.canLinkEmail) {
        if (linkSetup) linkSetup.classList.remove('hidden');
        document.getElementById('label-contact-email').textContent = t.labelContactEmail;
        var ceh = document.getElementById('contact-email-hint');
        if (ceh) ceh.textContent = t.contactEmailHintTelegram;
        document.getElementById('linkRealEmail').value = '';
        document.getElementById('linkPassword').value = '';
        document.getElementById('linkPassword2').value = '';
        var lem = document.getElementById('link-email-message');
        if (lem) {
          lem.textContent = '';
          lem.className = 'text-sm min-h-[1.25rem]';
        }
      } else {
        if (linkSetup) linkSetup.classList.add('hidden');
        document.getElementById('label-contact-email').textContent = t.labelContactEmail;
        var ceh2 = document.getElementById('contact-email-hint');
        if (ceh2) ceh2.textContent = t.contactEmailHint;
      }
      if (contactEl) contactEl.required = true;
      document.getElementById('contactEmail').value = me.contactEmail || '';
      setIntlPhoneNumber(document.getElementById('mobile'), me.mobile || '');
      setIntlPhoneNumber(document.getElementById('landline'), me.landline || '');
      document.getElementById('bankDetails').value = me.bankDetails || '';
      document.getElementById('address').value = me.address || '';

      const companyEl = document.getElementById('company-fields');
      if (me.type === 'company') {
        companyEl.classList.remove('hidden');
        document.getElementById('companyName').value = me.companyName || '';
        document.getElementById('companyNumber').value = me.companyNumber || '';
        setIntlPhoneNumber(document.getElementById('companyContactNumber'), me.companyContactNumber || '');
        document.getElementById('companyPrincipalContact').value = me.companyPrincipalContact || '';
        document.getElementById('companyName').required = true;
        document.getElementById('companyNumber').required = true;
      } else {
        companyEl.classList.add('hidden');
        document.getElementById('companyName').required = false;
        document.getElementById('companyNumber').required = false;
      }
    }

    function buildPayload() {
      const meType = document.getElementById('company-fields').classList.contains('hidden') ? 'person' : 'company';
      const payload = {
        firstName: document.getElementById('firstName').value.trim(),
        surname: document.getElementById('surname').value.trim(),
        dob: document.getElementById('dob').value || null,
        contactEmail: (function () {
          var v = document.getElementById('contactEmail').value.trim();
          return v || null;
        })(),
        mobile: getIntlPhoneE164(document.getElementById('mobile')),
        landline: (function () {
          var v = getIntlPhoneE164(document.getElementById('landline'));
          return v || null;
        })(),
        bankDetails: document.getElementById('bankDetails').value.trim() || null,
        address: document.getElementById('address').value.trim()
      };
      if (meType === 'company') {
        payload.companyName = document.getElementById('companyName').value.trim();
        payload.companyNumber = document.getElementById('companyNumber').value.trim();
        var ccEl = document.getElementById('companyContactNumber');
        var cc = ccEl && ccEl.value && ccEl.value.trim() ? getIntlPhoneE164(ccEl) : '';
        payload.companyContactNumber = cc || null;
        const pc = document.getElementById('companyPrincipalContact').value.trim();
        payload.companyPrincipalContact = pc || null;
      }
      return payload;
    }

    async function loadProfile() {
      const token = localStorage.getItem('token');
      if (!token) {
        document.getElementById('profile-loading').classList.add('hidden');
        document.getElementById('profile-redirect').classList.remove('hidden');
        return;
      }

      try {
        const ctrl = new AbortController();
        const meTimeout = setTimeout(function () {
          try {
            ctrl.abort();
          } catch (e) {}
        }, 20000);
        let res;
        try {
          res = await fetch('/api/me', {
            headers: { Authorization: 'Bearer ' + token },
            signal: ctrl.signal
          });
        } finally {
          clearTimeout(meTimeout);
        }
        if (res.status === 401) {
          localStorage.removeItem('token');
          document.getElementById('profile-loading').classList.add('hidden');
          document.getElementById('profile-redirect').classList.remove('hidden');
          return;
        }
        if (res.status === 403) {
          localStorage.removeItem('token');
          document.getElementById('profile-loading').classList.add('hidden');
          document.getElementById('profile-redirect').classList.remove('hidden');
          document.getElementById('redirect-message').textContent = translations[currentLang].accountInactive;
          return;
        }
        if (!res.ok) throw new Error('load');
        const me = await res.json();
        document.getElementById('profile-loading').classList.add('hidden');
        document.getElementById('profile-form').classList.remove('hidden');
        if (profileDeleteEnabled()) {
          document.getElementById('danger-zone').classList.remove('hidden');
        }
        fillForm(me);
        if (profileDeleteEnabled()) {
          var delPw = document.getElementById('delete-password');
          var delCf = document.getElementById('delete-confirm');
          if (delPw) {
            delPw.value = '';
            delPw.required = true;
          }
          if (delCf) delCf.value = '';
          var pwWrap = document.getElementById('delete-password-wrap');
          if (pwWrap && me.hasPassword === false) {
            pwWrap.classList.add('opacity-80');
          } else if (pwWrap) {
            pwWrap.classList.remove('opacity-80');
          }
        }
      } catch (e) {
        document.getElementById('profile-loading').classList.add('hidden');
        document.getElementById('profile-redirect').classList.remove('hidden');
        document.getElementById('redirect-message').textContent = translations[currentLang].loadError;
      }
    }

    function profileSaveError(msg, text, focusEl) {
      msg.textContent = text;
      msg.className = 'text-sm mt-2 text-red-600';
      var submitBtn = document.getElementById('submit-btn');
      if (typeof window.setPrimaryButtonError === 'function' && submitBtn) {
        window.setPrimaryButtonError(submitBtn, true);
      }
      if (typeof window.scrollFeedbackIntoView === 'function') {
        window.scrollFeedbackIntoView(msg);
      }
      if (focusEl && typeof window.focusFieldNoScroll === 'function') {
        window.focusFieldNoScroll(focusEl);
      }
    }

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('profile-message');
      const submitBtn = document.getElementById('submit-btn');
      const t = translations[currentLang];
      const token = localStorage.getItem('token');
      if (!token) return;
      msg.textContent = '';
      msg.className = 'text-sm mt-2 text-slate-500';
      if (typeof window.setPrimaryButtonError === 'function' && submitBtn) {
        window.setPrimaryButtonError(submitBtn, false);
      }
      var mobileEl = document.getElementById('mobile');
      var mobileDetail = getIntlPhoneValidationDetail(mobileEl);
      if (!mobileDetail.ok) {
        profileSaveError(msg, phoneErrMsg(mobileDetail, t), mobileEl || undefined);
        return;
      }
      var landEl = document.getElementById('landline');
      var landDetail = getIntlPhoneValidationDetail(landEl, { optionalEmpty: true });
      if (!landDetail.ok) {
        profileSaveError(msg, phoneErrMsg(landDetail, t) || t.errorLandline, landEl || undefined);
        return;
      }
      var contactEmailEl = document.getElementById('contactEmail');
      var contactEmailVal = contactEmailEl && contactEmailEl.value.trim();
      if (!contactEmailVal) {
        profileSaveError(msg, t.errorContactEmail, contactEmailEl || undefined);
        return;
      }
      var meType = document.getElementById('company-fields').classList.contains('hidden') ? 'person' : 'company';
      if (meType === 'company') {
        var ccEl = document.getElementById('companyContactNumber');
        if (ccEl && ccEl.value.trim()) {
          var ccDetail = getIntlPhoneValidationDetail(ccEl);
          if (!ccDetail.ok) {
            profileSaveError(msg, phoneErrMsg(ccDetail, t), ccEl);
            return;
          }
        }
      }
      const payload = buildPayload();
      try {
        const res = await fetch('/api/me', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          localStorage.removeItem('token');
          window.location.reload();
          return;
        }
        if (!res.ok) {
          const errText = (data && data.error) ? String(data.error) : t.saveError;
          profileSaveError(msg, errText);
          return;
        }
        msg.textContent = t.saved;
        msg.className = 'text-sm mt-2 text-emerald-600';
        if (typeof window.setPrimaryButtonError === 'function' && submitBtn) {
          window.setPrimaryButtonError(submitBtn, false);
        }
        if (typeof window.scrollFeedbackIntoView === 'function') {
          window.scrollFeedbackIntoView(msg);
        }
        fillForm(data);
      } catch (err) {
        profileSaveError(msg, t.saveError);
      }
    });

    document.getElementById('nav-logout').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
    });

    document.getElementById('lang-en').addEventListener('click', () => {
      currentLang = 'en';
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localePref', 'user');
      applyPageLanguage();
    });
    document.getElementById('lang-fa').addEventListener('click', () => {
      currentLang = 'fa';
      localStorage.setItem('lang', 'fa');
      localStorage.setItem('localePref', 'user');
      applyPageLanguage();
    });

    document.getElementById('btn-link-email-password').addEventListener('click', async function () {
      const t = translations[currentLang];
      const msgEl = document.getElementById('link-email-message');
      const token = localStorage.getItem('token');
      if (!token) return;
      msgEl.textContent = '';
      msgEl.className = 'text-sm min-h-[1.25rem] text-slate-600';
      const email = document.getElementById('linkRealEmail').value.trim().toLowerCase();
      const p1 = document.getElementById('linkPassword').value;
      const p2 = document.getElementById('linkPassword2').value;
      if (!email) {
        msgEl.textContent = t.linkEmailError;
        msgEl.className = 'text-sm min-h-[1.25rem] text-red-600';
        if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
        return;
      }
      if (p1.length < 8) {
        msgEl.textContent = t.linkEmailShort;
        msgEl.className = 'text-sm min-h-[1.25rem] text-red-600';
        if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
        return;
      }
      if (p1 !== p2) {
        msgEl.textContent = t.linkEmailMismatch;
        msgEl.className = 'text-sm min-h-[1.25rem] text-red-600';
        if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
        return;
      }
      try {
        const res = await fetch('/api/auth/link-email-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({ email: email, password: p1 })
        });
        const data = await res.json().catch(function () {
          return {};
        });
        if (!res.ok) {
          msgEl.textContent = (data && data.error) ? String(data.error) : t.linkEmailError;
          msgEl.className = 'text-sm min-h-[1.25rem] text-red-600';
          if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
          return;
        }
        msgEl.textContent = t.linkEmailSuccess;
        msgEl.className = 'text-sm min-h-[1.25rem] text-emerald-600';
        if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
        document.getElementById('linkPassword').value = '';
        document.getElementById('linkPassword2').value = '';
        const meRes = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } });
        if (meRes.ok) {
          fillForm(await meRes.json());
        }
      } catch (e) {
        msgEl.textContent = t.linkEmailError;
        msgEl.className = 'text-sm min-h-[1.25rem] text-red-600';
        if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
      }
    });

    if (profileDeleteEnabled()) {
      document.getElementById('btn-delete-account').addEventListener('click', async function () {
        const t = translations[currentLang];
        const token = localStorage.getItem('token');
        const msgEl = document.getElementById('delete-message');
        const phrase = (document.getElementById('delete-confirm') && document.getElementById('delete-confirm').value.trim()) || '';
        const pw = (document.getElementById('delete-password') && document.getElementById('delete-password').value) || '';
        if (phrase !== 'DELETE MY ACCOUNT') {
          msgEl.textContent = t.deleteWrongPhrase;
          msgEl.className = 'text-sm text-red-600';
          if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
          return;
        }
        if (!pw) {
          msgEl.textContent = t.deletePasswordRequired;
          msgEl.className = 'text-sm text-red-600';
          if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
          return;
        }
        if (!cachedMe || !cachedMe.hasPassword) {
          if (pw.length < 8) {
            msgEl.textContent = t.deletePasswordRequired;
            msgEl.className = 'text-sm text-red-600';
            if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
            return;
          }
        }
        msgEl.textContent = '';
        msgEl.className = 'text-sm min-h-[1.25rem] text-slate-500';
        try {
          const res = await fetch('/api/account/request-deletion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ password: pw, confirmPhrase: phrase })
          });
          const data = await res.json().catch(function () {
            return {};
          });
          if (!res.ok) {
            msgEl.textContent = (data && data.error) ? String(data.error) : t.deleteError;
            msgEl.className = 'text-sm text-red-600';
            if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
            return;
          }
          msgEl.textContent = t.deleteSuccess;
          msgEl.className = 'text-sm text-emerald-600';
          localStorage.removeItem('token');
          localStorage.removeItem('basket');
          setTimeout(function () {
            window.location.href = 'login.html';
          }, 1600);
        } catch (e) {
          msgEl.textContent = t.deleteError;
          msgEl.className = 'text-sm text-red-600';
          if (typeof window.scrollFeedbackIntoView === 'function') window.scrollFeedbackIntoView(msgEl);
        }
      });
    }

    applyPageLanguage();
    /** Load profile immediately; do not block on intl-tel (it awaits /api/locale-hint — if that hangs, profile never loaded). */
    void loadProfile();
    void (async function () {
      try {
        await initIntlPhoneInputs('#mobile, #landline, #companyContactNumber');
        applyPhonePlaceholders();
        if (cachedMe) {
          setIntlPhoneNumber(document.getElementById('mobile'), cachedMe.mobile || '');
          setIntlPhoneNumber(document.getElementById('landline'), cachedMe.landline || '');
          if (cachedMe.type === 'company') {
            setIntlPhoneNumber(document.getElementById('companyContactNumber'), cachedMe.companyContactNumber || '');
          }
        }
      } catch (e) {
        console.error(e);
      }
    })();
    });
