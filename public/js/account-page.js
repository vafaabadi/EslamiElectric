runWhenLocaleReady(function () {
    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        formTitle: 'Create an Account',
        labelType: 'Account Type',
        optionPerson: 'Person',
        optionCompany: 'Company',
        labelFirstname: 'First Name *',
        labelSurname: 'Surname *',
        labelDob: 'Date of Birth',
        labelMobile: 'Mobile *',
        labelLandline: 'Landline',
        labelEmail: 'Email *',
        labelPassword: 'Password *',
        labelConfirmPassword: 'Confirm Password *',
        labelBank: 'Bank Account Details',
        labelAddress: 'Address *',
        companySectionTitle: 'Company Details',
        labelCompanyName: 'Company Name *',
        labelCompanyNumber: 'Company Number *',
        labelCompanyContact: 'Company Contact Number',
        labelCompanyPrincipal: 'Principal Contact',
        submitBtn: 'Sign Up',
        navHome: 'Home',
        navLogin: 'Log In',
        accountSuccess: 'Account created successfully!',
        accountError: 'Failed to create user account. Please try again.',
        accountEmailTaken: 'Email already registered. Please log in.',
        accountMissingFields: 'Please fill in all required fields.',
        requiredFirstName: 'Please enter your first name.',
        requiredSurname: 'Please enter your surname.',
        requiredMobile: 'Please enter your mobile number.',
        requiredEmail: 'Please enter your email.',
        requiredAddress: 'Please enter your address.',
        requiredCompanyName: 'Please enter the company name.',
        requiredCompanyNumber: 'Please enter the company number.',
        errorFirstName: 'First name must be 2-50 letters (English or Persian)',
        errorSurname: 'Surname must be 2-50 letters (English or Persian)',
        errorDob: 'Invalid date format (YYYY-MM-DD)',
        errorMobile: 'Invalid mobile number format',
        errorLandline: 'Invalid landline format',
        phoneHintMobile: 'e.g. +44 7123 456789 · +98 912 345 6789 · +1 202 555 0123',
        phoneHintLandline: 'e.g. +44 20 7123 4567 · +98 21 1234 5678',
        phoneHintCompany: 'e.g. +971 4 123 4567 · +44 20 7123 4567',
        phoneErrorEmpty: 'Enter your mobile number.',
        phoneErrorCountry: 'Your number must include a country code (e.g. +44, +98). Pick the flag, then type or paste the full number in this field, starting with + or 00.',
        phoneErrorFormat: 'The number length does not match international format. Check the country code and the digits that follow.',
        phoneErrorInvalid: 'This number is not valid for the selected country. Change the country or correct the digits.',
        errorEmail: 'Invalid email format',
        errorAddress: 'Address must be 10-200 characters',
        errorPasswordShort: 'Password must be at least 8 characters',
        errorPasswordMismatch: 'Passwords do not match'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        formTitle: 'ایجاد حساب کاربری',
        labelType: 'نوع حساب',
        optionPerson: 'شخصی',
        optionCompany: 'شرکتی',
        labelFirstname: 'نام *',
        labelSurname: 'نام خانوادگی *',
        labelDob: 'تاریخ تولد',
        labelMobile: 'موبایل *',
        labelLandline: 'تلفن ثابت',
        labelEmail: 'ایمیل *',
        labelPassword: 'رمز عبور *',
        labelConfirmPassword: 'تکرار رمز عبور *',
        labelBank: 'اطلاعات حساب بانکی',
        labelAddress: 'آدرس *',
        companySectionTitle: 'اطلاعات شرکت',
        labelCompanyName: 'نام شرکت *',
        labelCompanyNumber: 'شماره ثبت شرکت *',
        labelCompanyContact: 'شماره تماس شرکت',
        labelCompanyPrincipal: 'نام مسئول اصلی',
        submitBtn: 'ایجاد حساب',
        navHome: 'خانه',
        navLogin: 'ورود',
        accountSuccess: 'حساب کاربری با موفقیت ایجاد شد!',
        accountError: 'خطا در ایجاد حساب کاربری. لطفاً دوباره تلاش کنید.',
        accountEmailTaken: 'این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید.',
        accountMissingFields: 'لطفاً تمام فیلدهای الزامی را پر کنید.',
        requiredFirstName: 'لطفاً نام را وارد کنید.',
        requiredSurname: 'لطفاً نام خانوادگی را وارد کنید.',
        requiredMobile: 'لطفاً شماره موبایل را وارد کنید.',
        requiredEmail: 'لطفاً ایمیل را وارد کنید.',
        requiredAddress: 'لطفاً آدرس را وارد کنید.',
        requiredCompanyName: 'لطفاً نام شرکت را وارد کنید.',
        requiredCompanyNumber: 'لطفاً شماره ثبت شرکت را وارد کنید.',
        errorFirstName: 'نام باید ۲ تا ۵۰ حرف باشد (انگلیسی یا فارسی)',
        errorSurname: 'نام خانوادگی باید ۲ تا ۵۰ حرف باشد (انگلیسی یا فارسی)',
        errorDob: 'فرمت تاریخ نامعتبر است (YYYY-MM-DD)',
        errorMobile: 'فرمت شماره موبایل نامعتبر است',
        errorLandline: 'فرمت شماره تلفن ثابت نامعتبر است',
        phoneHintMobile: 'مثال: +98 912 345 6789 · +44 7123 456789 · +1 202 555 0123',
        phoneHintLandline: 'مثال: +98 21 1234 5678 · +44 20 7123 4567',
        phoneHintCompany: 'مثال: +971 4 123 4567 · +44 20 7123 4567',
        phoneErrorEmpty: 'شماره موبایل را وارد کنید.',
        phoneErrorCountry: 'شماره باید با کد کشور شروع شود (مثلاً +98 یا +44). کشور را انتخاب کنید، سپس شماره کامل را در همین فیلد با + یا ۰۰ وارد یا جای‌گذاری کنید.',
        phoneErrorFormat: 'طول شماره با فرمت بین‌المللی هم‌خوانی ندارد. کد کشور و ارقام بعد از آن را بررسی کنید.',
        phoneErrorInvalid: 'این شماره برای کشور انتخاب‌شده معتبر نیست. کشور را عوض کنید یا ارقام را اصلاح کنید.',
        errorEmail: 'فرمت ایمیل نامعتبر است',
        errorAddress: 'آدرس باید ۱۰ تا ۲۰۰ کاراکتر باشد',
        errorPasswordShort: 'رمز عبور باید حداقل ۸ کاراکتر باشد',
        errorPasswordMismatch: 'رمز عبور و تکرار آن یکسان نیستند'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';

    const validationPatterns = {
      name: /^[\u0600-\u06FFa-zA-Z\s]{2,50}$/,
      dob: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
      email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      address: /^[\u0600-\u06FFa-zA-Z0-9\s.,()/-]{10,200}$/
    };

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

    const accountForm = document.getElementById('account-form');
    const accountType = document.getElementById('account-type');
    const companyFields = document.getElementById('company-fields');
    const accountMessage = document.getElementById('account-message');
    const accountSubmitBtn = document.getElementById('submit-btn');

    function accountFormError(text, focusEl) {
      accountMessage.className = 'text-sm mt-2 text-red-600 whitespace-pre-line';
      accountMessage.textContent = text;
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(accountSubmitBtn, true);
      }
      if (typeof window.scrollFeedbackIntoView === 'function') {
        window.scrollFeedbackIntoView(accountMessage);
      }
      if (focusEl && typeof window.focusFieldNoScroll === 'function') {
        window.focusFieldNoScroll(focusEl);
      }
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('form-title').textContent = t.formTitle;
      document.getElementById('label-type').textContent = t.labelType;
      document.getElementById('option-person').textContent = t.optionPerson;
      document.getElementById('option-company').textContent = t.optionCompany;
      document.getElementById('label-firstname').textContent = t.labelFirstname;
      document.getElementById('label-surname').textContent = t.labelSurname;
      document.getElementById('label-dob').textContent = t.labelDob;
      document.getElementById('label-mobile').textContent = t.labelMobile;
      document.getElementById('label-landline').textContent = t.labelLandline;
      document.getElementById('label-email').textContent = t.labelEmail;
      document.getElementById('label-password').textContent = t.labelPassword;
      document.getElementById('label-confirm-password').textContent = t.labelConfirmPassword;
      document.getElementById('label-bank').textContent = t.labelBank;
      document.getElementById('label-address').textContent = t.labelAddress;
      document.getElementById('company-section-title').textContent = t.companySectionTitle;
      document.getElementById('label-company-name').textContent = t.labelCompanyName;
      document.getElementById('label-company-number').textContent = t.labelCompanyNumber;
      document.getElementById('label-company-contact').textContent = t.labelCompanyContact;
      document.getElementById('label-company-principal').textContent = t.labelCompanyPrincipal;
      accountSubmitBtn.textContent = t.submitBtn;
      document.getElementById('nav-home').textContent = t.navHome;
      document.getElementById('nav-login').textContent = t.navLogin;

      document.getElementById('lang-en').className = currentLang === 'en'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      document.getElementById('lang-fa').className = currentLang === 'fa'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      if (typeof applyFooterI18n === 'function') applyFooterI18n();
      applyPhonePlaceholders();
    }

    function updateAccountTypeVisibility() {
      if (accountType.value === 'company') {
        companyFields.classList.remove('hidden');
      } else {
        companyFields.classList.add('hidden');
      }
    }

    accountType.addEventListener('change', updateAccountTypeVisibility);

    accountForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      accountMessage.textContent = '';
      accountMessage.className = 'text-sm mt-2 text-slate-500 whitespace-pre-line';
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(accountSubmitBtn, false);
      }
      const t = translations[currentLang];

      const type = accountType.value;
      const body = {
        type,
        firstName: document.getElementById('firstName').value.trim(),
        surname: document.getElementById('surname').value.trim(),
        dob: document.getElementById('dob').value,
        mobile: getIntlPhoneE164(document.getElementById('mobile')),
        landline: (function () {
          var el = document.getElementById('landline');
          var v = getIntlPhoneE164(el);
          return v || '';
        })(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        bankDetails: document.getElementById('bankDetails').value.trim(),
        address: document.getElementById('address').value.trim(),
        companyName: document.getElementById('companyName').value.trim(),
        companyNumber: document.getElementById('companyNumber').value.trim(),
        companyContactNumber: (function () {
          var el = document.getElementById('companyContactNumber');
          return el && el.value && el.value.trim() ? getIntlPhoneE164(el) : '';
        })(),
        companyPrincipalContact: document.getElementById('companyPrincipalContact').value.trim()
      };

      var firstNameEl = document.getElementById('firstName');
      var surnameEl = document.getElementById('surname');
      var dobEl = document.getElementById('dob');
      var mobileEl = document.getElementById('mobile');
      var landlineEl = document.getElementById('landline');
      var emailEl = document.getElementById('email');
      var addressEl = document.getElementById('address');
      var companyNameEl = document.getElementById('companyName');
      var companyNumberEl = document.getElementById('companyNumber');
      var passwordEl = document.getElementById('password');
      var confirmPwEl = document.getElementById('confirmPassword');

      var accErrs = [];
      var accFirstFocus = null;
      function accAddIssue(msg, el) {
        if (!msg) return;
        if (accErrs.indexOf(msg) === -1) accErrs.push(msg);
        if (el && !accFirstFocus) accFirstFocus = el;
      }

      if (!body.firstName) {
        accAddIssue(t.requiredFirstName || t.accountMissingFields, firstNameEl);
      } else if (!validationPatterns.name.test(body.firstName)) {
        accAddIssue(t.errorFirstName, firstNameEl);
      }

      if (!body.surname) {
        accAddIssue(t.requiredSurname || t.accountMissingFields, surnameEl);
      } else if (!validationPatterns.name.test(body.surname)) {
        accAddIssue(t.errorSurname, surnameEl);
      }

      if (body.dob && !validationPatterns.dob.test(body.dob)) {
        accAddIssue(t.errorDob, dobEl);
      }

      var mobileDetail = getIntlPhoneValidationDetail(mobileEl);
      if (!mobileDetail.ok) {
        accAddIssue(phoneErrMsg(mobileDetail, t) || t.requiredMobile || t.errorMobile, mobileEl);
      }

      var landDetail = getIntlPhoneValidationDetail(landlineEl, { optionalEmpty: true });
      if (!landDetail.ok) {
        accAddIssue(phoneErrMsg(landDetail, t) || t.errorLandline, landlineEl);
      }

      if (type === 'company') {
        var ccEl = document.getElementById('companyContactNumber');
        if (ccEl && ccEl.value.trim()) {
          var ccDetail = getIntlPhoneValidationDetail(ccEl);
          if (!ccDetail.ok) {
            accAddIssue(phoneErrMsg(ccDetail, t), ccEl);
          }
        }
      }

      if (!body.email) {
        accAddIssue(t.requiredEmail || t.accountMissingFields, emailEl);
      } else if (!validationPatterns.email.test(body.email)) {
        accAddIssue(t.errorEmail, emailEl);
      }

      if (!body.address) {
        accAddIssue(t.requiredAddress || t.accountMissingFields, addressEl);
      } else if (!validationPatterns.address.test(body.address)) {
        accAddIssue(t.errorAddress, addressEl);
      }

      if (type === 'company') {
        if (!body.companyName) {
          accAddIssue(t.requiredCompanyName || t.accountMissingFields, companyNameEl);
        }
        if (!body.companyNumber) {
          accAddIssue(t.requiredCompanyNumber || t.accountMissingFields, companyNumberEl);
        }
      }

      if (!body.password || body.password.length < 8) {
        accAddIssue(t.errorPasswordShort, passwordEl);
      }
      if (body.password !== body.confirmPassword) {
        accAddIssue(t.errorPasswordMismatch, confirmPwEl);
      }

      if (accErrs.length) {
        accountFormError(accErrs.join('\n'), accFirstFocus || undefined);
        return;
      }

      try {
        accountSubmitBtn.disabled = true;
        function readServerPublicConfig() {
          const el = document.getElementById('server-public-config');
          if (!el || !el.textContent) return null;
          try { return JSON.parse(el.textContent); } catch (e) { return null; }
        }
        const config = readServerPublicConfig();
        if (!config || !config.supabaseUrl || !config.supabaseAnonKey) {
          accountFormError(t.accountError);
          return;
        }
        // Implicit flow so confirmation emails redirect with #access_token=… — works in any browser/mail app.
        // Default PKCE puts ?code= on the callback and requires the same browser’s code_verifier (often missing).
        const supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            flowType: 'implicit',
            detectSessionInUrl: true,
            persistSession: true,
            storage: window.localStorage
          }
        });
        const email = body.email.trim().toLowerCase();

        // Prevent duplicate registrations for the same email (Supabase will reject anyway,
        // but this gives a deterministic friendly message).
        try {
          const checkRes = await fetch('/api/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const checkData = await checkRes.json().catch(function() { return {}; });
          if (checkRes.ok && checkData && checkData.exists) {
            accountFormError(t.accountEmailTaken);
            return;
          }
        } catch (e) {
          // If check fails, continue with signUp and let Supabase return its error.
        }
        var path = window.location.pathname || '';
        var loc = '';
        if (path.indexOf('/fa/') === 0) loc = '/fa/';
        else if (path.indexOf('/en/') === 0) loc = '/en/';
        var origin = (window.location && window.location.origin ? window.location.origin : config.baseUrl || '').replace(/\/$/, '');
        const redirectTo = origin + (loc ? loc + 'auth-callback.html' : '/auth-callback.html');
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: body.password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              first_name: body.firstName,
              surname: body.surname,
              type: type,
              dob: body.dob || null,
              mobile: body.mobile,
              landline: body.landline || null,
              address: body.address,
              bank_details: body.bankDetails || null,
              company_name: type === 'company' ? body.companyName : null,
              company_number: type === 'company' ? body.companyNumber : null,
              company_contact_number: type === 'company' ? body.companyContactNumber : null,
              company_principal_contact: type === 'company' ? body.companyPrincipalContact : null
            }
          }
        });
        if (signUpError) {
          var errMsg = signUpError.message || t.accountError;
          const msg = signUpError.message ? String(signUpError.message).toLowerCase() : '';
          if (msg.indexOf('already registered') !== -1 || msg.indexOf('user already registered') !== -1) {
            errMsg = t.accountEmailTaken;
          }
          accountFormError(errMsg);
          return;
        }

        // Fire signup notifications (Telegram + welcome email) immediately after signUp request.
        // We intentionally do not send passwords anywhere.
        try {
          fetch('/api/notify/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              firstName: body.firstName,
              surname: body.surname,
              dob: body.dob || null,
              mobile: body.mobile,
              landline: body.landline || null,
              email: body.email,
              bankDetails: body.bankDetails || '',
              address: body.address,
              companyName: body.companyName || null,
              companyNumber: body.companyNumber || null,
              companyContactNumber: body.companyContactNumber || null,
              companyPrincipalContact: body.companyPrincipalContact || null
            })
          }).catch(function() { /* ignore */ });
        } catch (e) { /* ignore */ }

        var hasAppToken = false;
        if (authData.session) {
          const tokenRes = await fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: authData.session.access_token })
          });
          const tokenData = await tokenRes.json().catch(function() { return {}; });
          if (tokenRes.ok && tokenData.token) {
            localStorage.setItem('token', tokenData.token);
            hasAppToken = true;
          }
        }
        accountForm.reset();
        accountType.value = 'person';
        updateAccountTypeVisibility();
        accountMessage.className = 'text-sm mt-2 text-emerald-600 whitespace-pre-line';
        accountMessage.textContent = authData.user && !authData.session
          ? (currentLang === 'fa' ? 'حساب ایجاد شد. لطفاً ایمیل خود را برای تأیید بررسی کنید.' : "Account created. Please check your email to confirm your account.")
          : t.accountSuccess;
        if (typeof window.setPrimaryButtonError === 'function') {
          window.setPrimaryButtonError(accountSubmitBtn, false);
        }
        if (typeof window.scrollFeedbackIntoView === 'function') {
          window.scrollFeedbackIntoView(accountMessage);
        }
        if (hasAppToken) {
          setTimeout(function() { window.location.href = 'index.html'; }, 1200);
        }
      } catch (err) {
        accountFormError(t.accountError);
      } finally {
        accountSubmitBtn.disabled = false;
      }
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

    applyPageLanguage();
    updateAccountTypeVisibility();
    (async function () {
      try {
        await initIntlPhoneInputs('#mobile, #landline, #companyContactNumber');
        applyPhonePlaceholders();
      } catch (err) {
        console.error(err);
      }
    })();
    });
