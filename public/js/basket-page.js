runWhenLocaleReady(function () {
    const wrapLtr =
      typeof window.wrapLtrPrice === 'function'
        ? window.wrapLtrPrice
        : typeof window.ltrNumSpan === 'function'
          ? window.ltrNumSpan
          : function (s) { return s; };
    const BASKET_KEY = 'basket';
    const PENDING_ORDER_KEY = 'pendingCheckoutOrderId';
    const PENDING_ORDER_LABEL_KEY = 'pendingCheckoutOrderLabel';

    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        pageTitle: 'Your Basket',
        emptyMessage: 'Your basket is empty.',
        continueShopping: 'Continue shopping',
        totalLabel: 'Total',
        quantity: 'Qty',
        priceEach: 'each',
        remove: 'Remove',
        navHome: 'Home',
        navProducts: 'Products',
        navBasket: 'Basket',
        navLogin: 'Login',
        navOrders: 'My Orders',
        navProfile: 'My Profile',
        createAccount: 'Sign Up',
        navLogout: 'Logout',
        proceedToCheckout: 'Proceed to checkout',
        payWithCard: 'Pay with card',
        payWithCrypto: 'Pay with crypto',
        paymentMethodTitle: 'Payment method',
        cryptoCheckoutTitle: 'Pay with crypto',
        cryptoCheckoutHint: 'Send crypto to the address below or open the payment page. We will confirm automatically.',
        cryptoTotalUsd: 'Total',
        cryptoPayApprox: 'Send exactly',
        cryptoPayHint: 'Send the exact crypto amount shown to the address below.',
        cryptoAddressLabel: 'Pay to address',
        cryptoSendHint: 'Send crypto to the address above.',
        cryptoScanHint: 'Complete your crypto payment.',
        cryptoWaiting: 'Waiting for payment…',
        cryptoProcessing: 'Payment processing…',
        cryptoPaid: 'Payment confirmed! Redirecting…',
        cryptoFailed: 'Payment failed or expired. Try again or pay by card.',
        cryptoStatusError: 'Could not check payment status.',
        cryptoOpenInvoice: 'Open payment page',
        cryptoCancel: 'Cancel crypto payment',
        cryptoNetworkTitle: 'Payment network',
        cryptoNetworkWarning: 'Send on {network} network only. Sending on another network may lose your funds.',
        cryptoNetworkBadge: 'Network: {network}',
        checkoutError: 'Could not start checkout. Please try again.',
        cryptoMisrouteError:
          'Crypto checkout uses NOWPayments, not card payment. Hard-refresh this page (Ctrl+F5) and try again.',
        cardPaymentUnavailable:
          'Card payment is temporarily unavailable. Try crypto or try again later.',
        guestSectionTitle: 'Shipping & contact details (guest checkout)',
        guestName: 'Full name',
        guestEmail: 'Email',
        guestPhone: 'Phone',
        guestAddress: 'Address',
        guestCity: 'City',
        guestPostal: 'Postal code',
        guestNamePlaceholder: 'e.g. John Smith',
        guestEmailPlaceholder: 'you@example.com',
        guestStreetPlaceholder: 'Street, building, floor',
        guestDetailsRequired: 'Please fill in name, email and address for guest checkout.',
        guestNameRequired: 'Please enter your name.',
        guestEmailRequired: 'Please enter your email.',
        fulfillmentTitle: 'Delivery or collection',
        fulfillmentHint: 'Choose how you would like to receive your order.',
        deliveryOption: 'Delivery',
        collectionOption: 'Collection (pickup)',
        fulfillmentCollectionNote: 'We will contact you when your order is ready for pickup.',
        guestSectionTitleDelivery: 'Shipping & contact (guest checkout)',
        guestSectionTitleCollection: 'Contact details (guest checkout)',
        guestEmailHintDelivery: "We'll send your order confirmation and tracking link to this address.",
        guestEmailHintCollection: 'We will email your receipt and contact you when your order is ready for pickup.',
        guestDetailsRequiredDelivery: 'Please enter name, email and a delivery address.',
        guestDetailsRequiredCollection: 'Please enter name and email.',
        guestEmailInvalid: 'Enter a valid email address (for example name@example.com).',
        guestNameInvalid: 'Enter your full name (at least 2 characters).',
        deliveryAddressMissing: 'Please enter your delivery address.',
        deliveryAddressTooShort:
          'That address is too short. Enter your full street address (building, street, area) — at least a few characters.',
        regSectionTitle: 'Delivery address',
        regSectionHint: 'Required when you choose delivery.',
        regDeliveryRequired: 'Please enter your delivery address for delivery orders.',
        labelRegAddress: 'Address',
        labelRegCity: 'City',
        labelRegPostal: 'Postal code',
        additionalInfoHeader: 'Additional info',
        additionalInfoPlaceholder: 'e.g. gate code, delivery instructions, preferred time window',
        additionalInfoHint: 'Optional. Helps us deliver your order.',
        phoneHintGuest: 'e.g. +44 20 7946 0123 · +98 21 8877 6655 · +971 4 555 1234',
        phoneErrorEmpty: 'Enter your phone number.',
        phoneErrorCountry: 'Your number must include a country code (e.g. +44, +98). Pick the flag, then type or paste the full number in this field, starting with + or 00.',
        phoneErrorFormat: 'The number length does not match international format. Check the country code and digits.',
        phoneErrorInvalid: 'This number is not valid for the selected country. Change the country or correct the digits.',
        editPendingBanner: 'You are editing unpaid order {order}. Proceed to checkout to pay with your changes.',
        profileCheckoutWhy:
          'We need your first name, surname, mobile number, and email on My Profile before you can pay.',
        profileMissingHeading: 'Please complete:',
        profileMissingFields: {
          firstName: 'First name',
          surname: 'Surname',
          mobile: 'Mobile number',
          email: 'Email',
          contactEmail: 'Contact email (Telegram sign-in)',
          companyName: 'Company name',
          companyContactNumber: 'Company contact number'
        },
        profileCheckoutGate:
          'Complete your profile before paying — open My Profile and save your details.',
        profileCheckoutLink: 'Open My Profile',
        ariaDecreaseQty: 'Decrease quantity',
        ariaIncreaseQty: 'Increase quantity',
        ariaQuantityInput: 'Quantity'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        pageTitle: 'سبد خرید شما',
        emptyMessage: 'سبد خرید شما خالی است.',
        continueShopping: 'ادامهٔ خرید',
        totalLabel: 'مجموع',
        quantity: 'تعداد',
        priceEach: 'به‌ازای هر واحد',
        remove: 'حذف',
        navHome: 'خانه',
        navProducts: 'محصولات',
        navBasket: 'سبد خرید',
        navLogin: 'ورود',
        navOrders: 'سفارشات من',
        navProfile: 'پروفایل من',
        createAccount: 'ایجاد حساب کاربری',
        navLogout: 'خروج',
        proceedToCheckout: 'ادامه به پرداخت',
        payWithCard: 'پرداخت با کارت',
        payWithCrypto: 'پرداخت با رمزارز',
        paymentMethodTitle: 'روش پرداخت',
        cryptoCheckoutTitle: 'پرداخت با رمزارز',
        cryptoCheckoutHint: 'رمزارز را به آدرس زیر ارسال کنید یا صفحه پرداخت را باز کنید. تأیید به‌صورت خودکار انجام می‌شود.',
        cryptoTotalUsd: 'مجموع',
        cryptoPayApprox: 'ارسال دقیق',
        cryptoPayHint: 'مبلغ دقیق رمزارز را به آدرس زیر ارسال کنید.',
        cryptoAddressLabel: 'آدرس پرداخت',
        cryptoSendHint: 'رمزارز را به آدرس بالا ارسال کنید.',
        cryptoScanHint: 'پرداخت رمزارز را تکمیل کنید.',
        cryptoWaiting: 'در انتظار پرداخت…',
        cryptoProcessing: 'در حال پردازش پرداخت…',
        cryptoPaid: 'پرداخت تأیید شد! در حال انتقال…',
        cryptoFailed: 'پرداخت ناموفق یا منقضی شد. دوباره تلاش کنید یا با کارت بپردازید.',
        cryptoStatusError: 'بررسی وضعیت پرداخت ممکن نشد.',
        cryptoOpenInvoice: 'باز کردن صفحه پرداخت',
        cryptoCancel: 'لغو پرداخت رمزارز',
        cryptoNetworkTitle: 'شبکه پرداخت',
        cryptoNetworkWarning: 'فقط روی شبکه {network} ارسال کنید. ارسال روی شبکه دیگر ممکن است وجوه شما را از بین ببرد.',
        cryptoNetworkBadge: 'شبکه: {network}',
        checkoutError: 'شروع پرداخت ممکن نشد. دوباره تلاش کنید.',
        cryptoMisrouteError:
          'پرداخت رمزارز از NOWPayments است، نه کارت. صفحه را سخت‌رفرش کنید (Ctrl+F5) و دوباره تلاش کنید.',
        cardPaymentUnavailable:
          'پرداخت با کارت موقتاً در دسترس نیست. با رمزارز پرداخت کنید یا بعداً تلاش کنید.',
        guestSectionTitle: 'اطلاعات تماس و آدرس (خرید مهمان)',
        guestName: 'نام کامل',
        guestEmail: 'ایمیل',
        guestPhone: 'تلفن',
        guestAddress: 'آدرس',
        guestCity: 'شهر',
        guestPostal: 'کد پستی',
        guestNamePlaceholder: 'مثلاً رضا احمدی',
        guestEmailPlaceholder: 'نمونه@example.com',
        guestStreetPlaceholder: 'خیابان، پلاک، طبقه',
        guestDetailsRequired: 'برای خرید مهمان نام، ایمیل و آدرس را وارد کنید.',
        guestNameRequired: 'لطفاً نام خود را وارد کنید.',
        guestEmailRequired: 'لطفاً ایمیل را وارد کنید.',
        fulfillmentTitle: 'ارسال یا تحویل حضوری',
        fulfillmentHint: 'نحوه دریافت سفارش را انتخاب کنید.',
        deliveryOption: 'ارسال به آدرس',
        collectionOption: 'تحویل حضوری (مراجعه به فروشگاه)',
        fulfillmentCollectionNote: 'پس از آماده شدن سفارش با شما تماس می‌گیریم.',
        guestSectionTitleDelivery: 'اطلاعات تماس و آدرس (خرید مهمان)',
        guestSectionTitleCollection: 'اطلاعات تماس (خرید مهمان)',
        guestEmailHintDelivery: 'تأیید سفارش و لینک پیگیری به این ایمیل ارسال می‌شود.',
        guestEmailHintCollection: 'رسید و اطلاع تحویل به این ایمیل ارسال می‌شود.',
        guestDetailsRequiredDelivery: 'نام، ایمیل و آدرس ارسال را وارد کنید.',
        guestDetailsRequiredCollection: 'نام و ایمیل را وارد کنید.',
        guestEmailInvalid: 'ایمیل معتبر وارد کنید (مثلاً name@example.com).',
        guestNameInvalid: 'نام کامل را وارد کنید (حداقل ۲ نویسه).',
        deliveryAddressMissing: 'لطفاً آدرس ارسال را وارد کنید.',
        deliveryAddressTooShort:
          'آدرس واردشده خیلی کوتاه است. آدرس کامل خیابان، پلاک و محل را وارد کنید (حداقل چند نویسه).',
        regSectionTitle: 'آدرس ارسال',
        regSectionHint: 'در صورت انتخاب ارسال الزامی است.',
        regDeliveryRequired: 'برای ارسال، آدرس تحویل را وارد کنید.',
        labelRegAddress: 'آدرس',
        labelRegCity: 'شهر',
        labelRegPostal: 'کد پستی',
        additionalInfoHeader: 'اطلاعات تکمیلی',
        additionalInfoPlaceholder: 'مثلاً کد درب، توضیح تحویل، بازه زمانی ترجیحی',
        additionalInfoHint: 'اختیاری. به ارسال سفارش کمک می‌کند.',
        phoneHintGuest: 'مثال: +98 21 8877 6655 · +44 20 7946 0123 · +971 4 555 1234',
        phoneErrorEmpty: 'شماره تلفن را وارد کنید.',
        phoneErrorCountry: 'شماره باید با کد کشور شروع شود (مثلاً +98 یا +44). کشور را انتخاب کنید، سپس شماره کامل را در همین فیلد با + یا ۰۰ وارد یا جای‌گذاری کنید.',
        phoneErrorFormat: 'طول شماره با فرمت بین‌المللی هم‌خوانی ندارد.',
        phoneErrorInvalid: 'این شماره برای کشور انتخاب‌شده معتبر نیست.',
        editPendingBanner: 'در حال ویرایش سفارش پرداخت‌نشده {order} هستید. برای پرداخت با تغییرات، ادامه به پرداخت را بزنید.',
        profileCheckoutWhy:
          'قبل از پرداخت باید نام، نام خانوادگی، موبایل و ایمیل را در «پروفایل من» تکمیل کنید.',
        profileMissingHeading: 'لطفاً این موارد را تکمیل کنید:',
        profileMissingFields: {
          firstName: 'نام',
          surname: 'نام خانوادگی',
          mobile: 'شماره موبایل',
          email: 'ایمیل',
          contactEmail: 'ایمیل تماس (تلگرام)',
          companyName: 'نام شرکت',
          companyContactNumber: 'تلفن تماس شرکت'
        },
        profileCheckoutGate:
          'قبل از پرداخت پروفایل را تکمیل کنید — «پروفایل من» را باز کنید و ذخیره کنید.',
        profileCheckoutLink: 'باز کردن پروفایل',
        ariaDecreaseQty: 'کم کردن تعداد',
        ariaIncreaseQty: 'افزایش تعداد',
        ariaQuantityInput: 'تعداد'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';
    var checkoutProfileBlocked = false;
    var cryptoPayCurrencies = [];
    var cryptoDefaultPayCurrency = 'usdc';
    /** Same pattern as server `validationPatterns.email` (guest checkout). */
    var GUEST_EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    function getBasket() {
      try {
        const raw = localStorage.getItem(BASKET_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }

    function setBasket(items) {
      localStorage.setItem(BASKET_KEY, JSON.stringify(items));
      if (!items || items.length === 0) {
        sessionStorage.removeItem(PENDING_ORDER_KEY);
        sessionStorage.removeItem(PENDING_ORDER_LABEL_KEY);
      }
      if (typeof window.syncBasketActivity === 'function') window.syncBasketActivity(items);
      renderBasket();
    }

    function updateEditPendingBanner() {
      const el = document.getElementById('edit-pending-banner');
      if (!el) return;
      const label = sessionStorage.getItem(PENDING_ORDER_LABEL_KEY);
      const id = sessionStorage.getItem(PENDING_ORDER_KEY);
      if (!id || !label) {
        el.classList.add('hidden');
        el.textContent = '';
        return;
      }
      const t = translations[currentLang];
      const msg = (t.editPendingBanner || '').replace(/\{order\}/g, label);
      el.textContent = msg;
      el.classList.remove('hidden');
    }

    async function loadPendingOrderDraftIfAny() {
      const params = new URLSearchParams(window.location.search);
      let oid = (params.get('editOrder') || '').trim();
      if (!oid) {
        const stored = sessionStorage.getItem('pendingEditOrderId');
        if (stored) {
          oid = stored.trim();
          sessionStorage.removeItem('pendingEditOrderId');
        }
      }
      if (!oid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(oid)) return;
      const token = localStorage.getItem('token');
      if (!token) {
        sessionStorage.setItem('pendingEditOrderId', oid);
        window.location.href = 'login.html';
        return;
      }
      try {
        const r = await fetch('/api/orders/' + encodeURIComponent(oid) + '/basket-draft', {
          headers: { Authorization: 'Bearer ' + token }
        });
        const d = await r.json().catch(function () { return {}; });
        if (!r.ok || !Array.isArray(d.basket)) return;
        localStorage.setItem(BASKET_KEY, JSON.stringify(d.basket));
        sessionStorage.setItem(PENDING_ORDER_KEY, d.orderId);
        sessionStorage.setItem(PENDING_ORDER_LABEL_KEY, d.orderNumber || d.orderId || '');
        var del = document.querySelector('input[name="fulfillment"][value="delivery"]');
        var col = document.querySelector('input[name="fulfillment"][value="collection"]');
        if (d.fulfillmentType === 'collection' && col) {
          col.checked = true;
          if (del) del.checked = false;
        } else if (del) {
          del.checked = true;
          if (col) col.checked = false;
        }
        if (d.shippingAddress && d.fulfillmentType === 'delivery') {
          var sa = d.shippingAddress;
          var ra = document.getElementById('reg-address');
          var rc = document.getElementById('reg-city');
          var rp = document.getElementById('reg-postal');
          var rai = document.getElementById('reg-additional-info');
          if (ra) ra.value = (sa.line1 || sa.address || '').trim() || '';
          if (rc) rc.value = (sa.city || '').trim() || '';
          if (rp) rp.value = (sa.postal_code || sa.postalCode || '').trim() || '';
          if (rai && sa.additional_info) rai.value = String(sa.additional_info).trim();
        }
        try {
          history.replaceState({}, '', window.location.pathname);
        } catch (e) { /* ignore */ }
      } catch (e) {
        console.error(e);
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    /** Persian / Arabic-Indic / ASCII → Western digits only (for parsing quantity). */
    function parseDigitsToWestern(str) {
      if (str == null) return '';
      var s = String(str).trim().replace(/\s/g, '');
      var out = '';
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 0x06f0 && c <= 0x06f9) out += String.fromCharCode(c - 0x06f0 + 48);
        else if (c >= 0x0660 && c <= 0x0669) out += String.fromCharCode(c - 0x0660 + 48);
        else if (c >= 48 && c <= 57) out += String.fromCharCode(c);
      }
      return out;
    }

    /** Display quantity in basket row: Persian digits + grouping for fa, Western for en. Storage stays a number. */
    function formatQtyDisplay(qty, lang) {
      var n = Math.floor(Number(qty) || 0);
      if (n < 1) n = 1;
      if (n > 9999) n = 9999;
      if (lang === 'fa' && typeof formatPersianIntegerRtl === 'function') {
        return formatPersianIntegerRtl(n);
      }
      return String(n);
    }

    function clampQtyFromInput(raw) {
      var w = parseDigitsToWestern(raw);
      var n = parseInt(w, 10);
      if (!Number.isFinite(n) || n < 1) return 1;
      return Math.min(n, 9999);
    }

    function profileMissingListHtml(missingKeys, tr) {
      if (!Array.isArray(missingKeys) || missingKeys.length === 0) return '';
      var labels = tr.profileMissingFields || {};
      var items = missingKeys.map(function (key) {
        return '<li>' + escapeHtml(labels[key] || key) + '</li>';
      }).join('');
      return (
        '<p class="font-medium mb-1.5">' + escapeHtml(tr.profileMissingHeading || '') + '</p>' +
        '<ul class="list-disc list-inside space-y-0.5 mb-3 text-start">' + items + '</ul>'
      );
    }

    function profileMissingPlainText(missingKeys, tr) {
      if (!Array.isArray(missingKeys) || missingKeys.length === 0) return '';
      var labels = tr.profileMissingFields || {};
      var parts = missingKeys.map(function (k) {
        return labels[k] || k;
      });
      return (tr.profileMissingHeading || '') + ' ' + parts.join(', ') + '.';
    }

    function updateCheckoutButtonState() {
      const btnCheckout = document.getElementById('btn-checkout');
      if (!btnCheckout) return;
      const basket = getBasket();
      const empty = basket.length === 0;
      const token = localStorage.getItem('token');
      const block = !!(token && checkoutProfileBlocked);
      btnCheckout.disabled = empty || block;
      const tr = translations[currentLang];
      if (block && tr) {
        btnCheckout.setAttribute('title', tr.profileCheckoutWhy || tr.profileCheckoutGate || '');
      } else {
        btnCheckout.removeAttribute('title');
      }
    }

    function showCheckoutValidationError(errEl, btnCheckout, message, focusEl) {
      errEl.textContent = message;
      errEl.classList.remove('hidden');
      const btnText = document.getElementById('btn-checkout-text');
      const btnLoading = document.getElementById('btn-checkout-loading');
      if (btnText) btnText.classList.remove('hidden');
      if (btnLoading) btnLoading.classList.add('hidden');
      updateCheckoutButtonState();
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(btnCheckout, true);
      }
      if (typeof window.scrollFeedbackIntoView === 'function') {
        window.scrollFeedbackIntoView(errEl);
      }
      if (focusEl && typeof window.focusFieldNoScroll === 'function') {
        window.focusFieldNoScroll(focusEl);
      }
    }

    /** Profile completion banner only matters when there is something to pay for. */
    function syncProfileGateFromState() {
      const gateEl = document.getElementById('profile-checkout-gate');
      if (!gateEl) return;
      if (checkoutProfileBlocked && getBasket().length > 0) {
        gateEl.classList.remove('hidden');
      } else {
        gateEl.classList.add('hidden');
      }
    }

    async function loadCheckoutProfileGate() {
      const gateEl = document.getElementById('profile-checkout-gate');
      const token = localStorage.getItem('token');
      try {
        if (!token) {
          checkoutProfileBlocked = false;
          if (gateEl) {
            gateEl.innerHTML = '';
          }
          updateCheckoutButtonState();
          return;
        }
        const r = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } });
        const d = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          checkoutProfileBlocked = false;
          if (gateEl) {
            gateEl.innerHTML = '';
          }
          updateCheckoutButtonState();
          return;
        }
        var req = d.checkoutProfileRequired === true;
        var complete = d.checkoutProfileComplete !== false;
        checkoutProfileBlocked = !!(req && !complete);
        var tr = translations[currentLang];
        if (checkoutProfileBlocked && gateEl) {
          var missing = Array.isArray(d.checkoutProfileMissing) ? d.checkoutProfileMissing : [];
          var intro =
            '<p class="mb-2">' + escapeHtml(tr.profileCheckoutWhy || tr.profileCheckoutGate || '') + '</p>';
          var listPart = profileMissingListHtml(missing, tr);
          if (!listPart) {
            listPart = '<p class="mb-2">' + escapeHtml(tr.profileCheckoutGate || '') + '</p>';
          }
          gateEl.innerHTML =
            intro +
            listPart +
            '<a href="profile.html" class="inline-flex font-semibold text-amber-900 underline hover:text-amber-800">' +
            escapeHtml(tr.profileCheckoutLink || 'Profile') + '</a>';
        } else if (gateEl) {
          gateEl.innerHTML = '';
        }
        updateCheckoutButtonState();
      } catch (e) {
        checkoutProfileBlocked = false;
        if (gateEl) {
          gateEl.innerHTML = '';
        }
        updateCheckoutButtonState();
      } finally {
        syncProfileGateFromState();
      }
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      const tokenForNav = localStorage.getItem('token');
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('page-title').textContent = t.pageTitle;
      document.getElementById('empty-message').textContent = t.emptyMessage;
      document.getElementById('empty-link').textContent = t.continueShopping;
      const continueShoppingFilled = document.getElementById('continue-shopping-link');
      if (continueShoppingFilled) continueShoppingFilled.textContent = t.continueShopping;
      document.getElementById('total-label').textContent = t.totalLabel;
      document.getElementById('nav-home').textContent = t.navHome;
      document.getElementById('nav-products').textContent = t.navProducts;
      const navBasketMobileLabel = document.getElementById('nav-basket-mobile-label');
      if (navBasketMobileLabel) navBasketMobileLabel.textContent = t.navBasket;
      const navBasketLabel = document.getElementById('nav-basket-label');
      if (navBasketLabel) navBasketLabel.textContent = t.navBasket;
      document.getElementById('nav-login').textContent = t.navLogin;
      document.getElementById('go-account').textContent = t.createAccount;
      document.getElementById('nav-logout').textContent = t.navLogout;
      const navOrdersEl = document.getElementById('nav-orders');
      if (navOrdersEl && t.navOrders) navOrdersEl.textContent = t.navOrders;
      const navProfileEl = document.getElementById('nav-profile');
      if (navProfileEl && t.navProfile) navProfileEl.textContent = t.navProfile;
      document.getElementById('btn-checkout-text').textContent = t.proceedToCheckout;
      var pmt = document.getElementById('payment-method-title');
      if (pmt) pmt.textContent = t.paymentMethodTitle;
      var lpc = document.getElementById('label-pay-card');
      if (lpc) lpc.textContent = t.payWithCard;
      var lpk = document.getElementById('label-pay-crypto');
      if (lpk) lpk.textContent = t.payWithCrypto;
      var cct = document.getElementById('crypto-checkout-title');
      if (cct) cct.textContent = t.cryptoCheckoutTitle;
      var cch = document.getElementById('crypto-checkout-hint');
      if (cch) cch.textContent = t.cryptoCheckoutHint;
      var cow = document.getElementById('crypto-open-invoice');
      if (cow) cow.textContent = t.cryptoOpenInvoice;
      var ccx = document.getElementById('crypto-cancel');
      if (ccx) ccx.textContent = t.cryptoCancel;
      if (cryptoPayCurrencies.length) renderCryptoNetworkOptions();
      const ft = document.getElementById('fulfillment-title');
      if (ft) ft.textContent = t.fulfillmentTitle;
      const fh = document.getElementById('fulfillment-hint');
      if (fh) fh.textContent = t.fulfillmentHint;
      const ld = document.getElementById('label-delivery-option');
      if (ld) ld.textContent = t.deliveryOption;
      const lc = document.getElementById('label-collection-option');
      if (lc) lc.textContent = t.collectionOption;
      const fcn = document.getElementById('fulfillment-collection-note');
      if (fcn) fcn.textContent = t.fulfillmentCollectionNote;
      const rst = document.getElementById('reg-section-title');
      if (rst) rst.textContent = t.regSectionTitle;
      const rsh = document.getElementById('reg-section-hint');
      if (rsh) rsh.textContent = t.regSectionHint;
      const lra = document.getElementById('label-reg-address');
      if (lra) lra.textContent = t.labelRegAddress;
      const lrc = document.getElementById('label-reg-city');
      if (lrc) lrc.textContent = t.labelRegCity;
      const lrp = document.getElementById('label-reg-postal');
      if (lrp) lrp.textContent = t.labelRegPostal;
      const lgh = document.getElementById('label-guest-additional-header');
      if (lgh) lgh.textContent = t.additionalInfoHeader;
      const lrh = document.getElementById('label-reg-additional-header');
      if (lrh) lrh.textContent = t.additionalInfoHeader;
      const gai = document.getElementById('guest-additional-info');
      if (gai) gai.placeholder = t.additionalInfoPlaceholder || '';
      const rai = document.getElementById('reg-additional-info');
      if (rai) rai.placeholder = t.additionalInfoPlaceholder || '';
      const gaiHint = document.getElementById('guest-additional-hint');
      if (gaiHint) gaiHint.textContent = t.additionalInfoHint || '';
      const raiHint = document.getElementById('reg-additional-hint');
      if (raiHint) raiHint.textContent = t.additionalInfoHint || '';

      const guestSection = document.getElementById('guest-checkout-section');
      if (guestSection) {
        guestSection.classList.toggle('hidden', !!tokenForNav);
        const lblName = document.getElementById('label-guest-name');
        const lblEmail = document.getElementById('label-guest-email');
        const lblPhone = document.getElementById('label-guest-phone');
        const lblAddress = document.getElementById('label-guest-address');
        const lblCity = document.getElementById('label-guest-city');
        const lblPostal = document.getElementById('label-guest-postal');
        if (lblName) lblName.textContent = t.guestName || 'Full name';
        if (lblEmail) lblEmail.textContent = t.guestEmail || 'Email';
        if (lblPhone) lblPhone.textContent = t.guestPhone || 'Phone';
        if (lblAddress) lblAddress.textContent = t.guestAddress || 'Address';
        if (lblCity) lblCity.textContent = t.guestCity || 'City';
        if (lblPostal) lblPostal.textContent = t.guestPostal || 'Postal code';
        const guestPhoneInput = document.getElementById('guest-phone');
        if (guestPhoneInput) guestPhoneInput.placeholder = t.phoneHintGuest || '';
        const guestNameInput = document.getElementById('guest-name');
        if (guestNameInput) guestNameInput.placeholder = t.guestNamePlaceholder || '';
        const guestEmailInput = document.getElementById('guest-email');
        if (guestEmailInput) guestEmailInput.placeholder = t.guestEmailPlaceholder || '';
        const guestAddrInput = document.getElementById('guest-address');
        if (guestAddrInput) guestAddrInput.placeholder = t.guestStreetPlaceholder || '';
      }

      const regAddrInput = document.getElementById('reg-address');
      if (regAddrInput) regAddrInput.placeholder = t.guestStreetPlaceholder || '';

      document.getElementById('lang-en').className = currentLang === 'en'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      document.getElementById('lang-fa').className = currentLang === 'fa'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';

      if (typeof applyFooterI18n === 'function') applyFooterI18n();

      document.getElementById('nav-login').classList.toggle('hidden', !!tokenForNav);
      document.getElementById('nav-logout').classList.toggle('hidden', !tokenForNav);
      document.getElementById('go-account').classList.toggle('hidden', !!tokenForNav);
      const navOrders = document.getElementById('nav-orders');
      if (navOrders) navOrders.classList.toggle('hidden', !tokenForNav);
      if (navProfileEl) navProfileEl.classList.toggle('hidden', !tokenForNav);

      updateEditPendingBanner();
      renderBasket();
    }

    function getFulfillment() {
      const r = document.querySelector('input[name="fulfillment"]:checked');
      return r && r.value === 'collection' ? 'collection' : 'delivery';
    }

    function getPaymentMethod() {
      const r = document.querySelector('input[name="payment-method"]:checked');
      return r && r.value === 'crypto' ? 'crypto' : 'stripe';
    }

    function syncPaymentMethodUI() {
      document.querySelectorAll('input[name="payment-method"]').forEach(function (inp) {
        const lab = inp.closest('label');
        if (!lab) return;
        if (inp.checked) {
          lab.className =
            'flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 border-amber-500 bg-amber-50/80';
        } else {
          lab.className =
            'flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 border-slate-200 hover:border-slate-300';
        }
      });
      syncCryptoNetworkUI();
    }

    function getSelectedPayCurrency() {
      const picked = document.querySelector('input[name="crypto-network"]:checked');
      if (picked && picked.value) return picked.value;
      return cryptoDefaultPayCurrency || 'usdc';
    }

    function renderCryptoNetworkOptions() {
      const section = document.getElementById('crypto-network-section');
      const wrap = document.getElementById('crypto-network-options');
      if (!section || !wrap) return;
      wrap.innerHTML = '';
      if (!cryptoPayCurrencies.length) {
        section.classList.add('hidden');
        return;
      }
      const t = translations[currentLang];
      const titleEl = document.getElementById('crypto-network-title');
      if (titleEl) titleEl.textContent = t.cryptoNetworkTitle || 'Payment network';
      cryptoPayCurrencies.forEach(function (opt, idx) {
        const ticker = opt.payCurrency || opt.pay_currency || '';
        const label = opt.label || opt.networkLabel || ticker;
        const lab = document.createElement('label');
        lab.className =
          'flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 border-slate-200 hover:border-slate-300 w-full sm:max-w-xs';
        const inp = document.createElement('input');
        inp.type = 'radio';
        inp.name = 'crypto-network';
        inp.value = ticker;
        inp.className = 'w-4 h-4 text-amber-600';
        if (ticker === cryptoDefaultPayCurrency || idx === 0) {
          inp.checked = true;
          lab.className =
            'flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 border-amber-500 bg-amber-50/80 w-full sm:max-w-xs';
        }
        inp.addEventListener('change', syncCryptoNetworkOptionStyles);
        const span = document.createElement('span');
        span.textContent = label;
        lab.appendChild(inp);
        lab.appendChild(span);
        wrap.appendChild(lab);
      });
      syncCryptoNetworkOptionStyles();
    }

    function syncCryptoNetworkOptionStyles() {
      document.querySelectorAll('input[name="crypto-network"]').forEach(function (inp) {
        const lab = inp.closest('label');
        if (!lab) return;
        if (inp.checked) {
          lab.className =
            'flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 border-amber-500 bg-amber-50/80 w-full sm:max-w-xs';
        } else {
          lab.className =
            'flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-2 border-slate-200 hover:border-slate-300 w-full sm:max-w-xs';
        }
      });
    }

    function syncCryptoNetworkUI() {
      const section = document.getElementById('crypto-network-section');
      if (!section) return;
      const cryptoSelected = getPaymentMethod() === 'crypto';
      const showSelector = cryptoSelected && cryptoPayCurrencies.length > 1;
      section.classList.toggle('hidden', !showSelector);
    }

    async function loadCryptoPayCurrencies() {
      try {
        const r = await fetch('/api/crypto-pay-currencies');
        if (!r.ok) return;
        const d = await r.json().catch(function () { return {}; });
        if (!Array.isArray(d.currencies) || !d.currencies.length) return;
        cryptoPayCurrencies = d.currencies;
        cryptoDefaultPayCurrency = d.defaultPayCurrency || d.currencies[0].payCurrency || 'usdc';
        renderCryptoNetworkOptions();
        syncCryptoNetworkUI();
      } catch (e) {
        /* crypto optional */
      }
    }

    function extractApiError(data, status, rawText, fallback) {
      if (data && typeof data === 'object') {
        if (data.error) return String(data.error);
        if (data.npMessage) return String(data.npMessage);
        if (data.message) return String(data.message);
        if (data.code === 'CURRENCY_NOT_AVAILABLE' && data.payCurrency) {
          return String(data.payCurrency).toUpperCase() + ' is not available for checkout.';
        }
      }
      const snippet = rawText != null ? String(rawText).trim().slice(0, 240) : '';
      if (/^error code: 502$/i.test(snippet) || /^error code: 503$/i.test(snippet)) {
        return 'Payment server temporarily unavailable. Wait a moment and try again.';
      }
      if (snippet && !/^<!DOCTYPE/i.test(snippet) && !/^<html/i.test(snippet) && !/^error code:/i.test(snippet)) {
        return snippet;
      }
      if (status) return fallback + ' (HTTP ' + status + ')';
      return fallback;
    }

    function sanitizeCheckoutError(message, paymentMethod, tr) {
      const msg = message != null ? String(message).trim() : '';
      if (!msg) return tr.checkoutError;
      if (paymentMethod === 'crypto' && (/sk_(test|live)_/i.test(msg) || /stripe/i.test(msg))) {
        return tr.cryptoMisrouteError || tr.checkoutError;
      }
      if (/sk_(test|live)_/i.test(msg) || /expired api key/i.test(msg)) {
        return tr.cardPaymentUnavailable || tr.checkoutError;
      }
      if (paymentMethod === 'crypto' && /not enabled in your NOWPayments account/i.test(msg)) {
        return msg;
      }
      if (paymentMethod === 'crypto' && !/^NOWPayments/i.test(msg) && !/not enabled in your NOWPayments account/i.test(msg)) {
        return 'NOWPayments: ' + msg;
      }
      return msg;
    }

    function syncFulfillmentUI() {
      const t = translations[currentLang];
      const fulfillment = getFulfillment();
      const token = localStorage.getItem('token');
      const note = document.getElementById('fulfillment-collection-note');
      if (note) {
        note.textContent = t.fulfillmentCollectionNote;
        note.classList.toggle('hidden', fulfillment !== 'collection');
      }
      const guestAddr = document.getElementById('guest-address-block');
      if (guestAddr) guestAddr.classList.toggle('hidden', fulfillment !== 'delivery');

      const regSection = document.getElementById('registered-checkout-section');
      if (regSection) {
        regSection.classList.toggle('hidden', !token || fulfillment !== 'delivery');
      }

      const guestTitle = document.getElementById('guest-section-title');
      if (guestTitle && t.guestSectionTitleDelivery) {
        guestTitle.textContent = fulfillment === 'collection' ? t.guestSectionTitleCollection : t.guestSectionTitleDelivery;
      }
      const emailHint = document.getElementById('guest-email-hint');
      if (emailHint) {
        emailHint.textContent = fulfillment === 'collection' ? t.guestEmailHintCollection : t.guestEmailHintDelivery;
      }

      document.querySelectorAll('input[name="fulfillment"]').forEach(function (inp) {
        const lab = inp.closest('label');
        if (!lab) return;
        if (inp.checked) {
          lab.className = 'flex items-center gap-3 sm:flex-1 cursor-pointer border-2 rounded-xl p-4 border-amber-500 bg-amber-50/80';
        } else {
          lab.className = 'flex items-center gap-3 sm:flex-1 cursor-pointer border-2 rounded-xl p-4 border-slate-200 hover:border-slate-300';
        }
      });
    }

    async function loadProfileForCheckout() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } });
        if (!res.ok) return;
        const p = await res.json();
        const ra = document.getElementById('reg-address');
        if (ra && p.address && String(p.address).trim() && !ra.value.trim()) ra.value = p.address;
      } catch (e) { /* ignore */ }
    }

    function renderBasket() {
      const basket = getBasket();
      const t = translations[currentLang];
      const emptyEl = document.getElementById('basket-empty');
      const contentEl = document.getElementById('basket-content');
      const listEl = document.getElementById('basket-list');
      const totalEl = document.getElementById('basket-total');

      if (basket.length === 0) {
        emptyEl.classList.remove('hidden');
        contentEl.classList.add('hidden');
        updateCheckoutButtonState();
        syncProfileGateFromState();
        return;
      }

      emptyEl.classList.add('hidden');
      contentEl.classList.remove('hidden');
      listEl.innerHTML = '';

      let total = 0;

      basket.forEach((item, index) => {
        const name = currentLang === 'fa' && item.name_fa ? item.name_fa : item.name;
        const price = Number(item.price) || 0;
        const qty = item.quantity || 1;
        const lineTotal = price * qty;
        total += lineTotal;
        const qtyDisplay = formatQtyDisplay(qty, currentLang);

        const li = document.createElement('li');
        li.className = 'bg-white rounded-xl shadow p-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4';
        li.innerHTML = `
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <div class="basket-item-thumb w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
              <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(name)}" class="block">
            </div>
            <div class="flex-grow min-w-0">
              <h3 class="font-semibold text-slate-800 text-sm sm:text-base break-words">${escapeHtml(name)}</h3>
              <p class="text-slate-500 text-xs sm:text-sm">${wrapLtr(formatPriceUSD(price))} ${escapeHtml(t.priceEach || 'each')}</p>
            </div>
          </div>
          <div class="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <div class="flex items-center border border-slate-300 rounded overflow-hidden">
              <button type="button" class="btn-basket-minus min-w-[44px] min-h-[44px] w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium touch-manipulation" data-index="${index}" aria-label="${escapeHtml(t.ariaDecreaseQty || 'Decrease quantity')}">−</button>
              <input type="text" inputmode="numeric" autocomplete="off" dir="ltr" lang="${currentLang === 'fa' ? 'fa' : 'en'}" class="basket-qty-input w-14 sm:w-16 text-center text-sm font-medium border-x border-slate-300 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset" value="${escapeHtml(qtyDisplay)}" data-index="${index}" aria-label="${escapeHtml(t.ariaQuantityInput || t.quantity || 'Quantity')}">
              <button type="button" class="btn-basket-plus min-w-[44px] min-h-[44px] w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium touch-manipulation" data-index="${index}" aria-label="${escapeHtml(t.ariaIncreaseQty || 'Increase quantity')}">+</button>
            </div>
            <span class="font-semibold text-slate-900 basket-line-total">${wrapLtr(formatPriceUSD(lineTotal))}</span>
            <button type="button" class="btn-remove min-h-[44px] px-3 py-2 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 rounded touch-manipulation" data-index="${index}">${t.remove}</button>
          </div>
        `;
        listEl.appendChild(li);
      });

      totalEl.innerHTML = wrapLtr(formatPriceUSD(total));

      updateCheckoutButtonState();

      listEl.querySelectorAll('.btn-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          const newBasket = getBasket().filter((_, i) => i !== idx);
          setBasket(newBasket);
        });
      });

      listEl.querySelectorAll('.btn-basket-plus').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          const basket = getBasket();
          if (basket[idx]) {
            basket[idx].quantity = (basket[idx].quantity || 1) + 1;
            setBasket(basket);
          }
        });
      });

      listEl.querySelectorAll('.btn-basket-minus').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          const basket = getBasket();
          if (!basket[idx]) return;
          const current = basket[idx].quantity || 1;
          if (current <= 1) {
            setBasket(basket.filter((_, i) => i !== idx));
          } else {
            basket[idx].quantity = current - 1;
            setBasket(basket);
          }
        });
      });

      listEl.querySelectorAll('.basket-qty-input').forEach(input => {
        input.addEventListener('change', () => {
          const idx = parseInt(input.getAttribute('data-index'), 10);
          const basket = getBasket();
          if (!basket[idx]) return;
          const qty = clampQtyFromInput(input.value);
          basket[idx].quantity = qty;
          setBasket(basket);
        });
      });

      syncFulfillmentUI();
      loadProfileForCheckout();
      syncProfileGateFromState();
    }

    document.querySelectorAll('input[name="fulfillment"]').forEach(function (el) {
      el.addEventListener('change', syncFulfillmentUI);
    });

    document.querySelectorAll('input[name="payment-method"]').forEach(function (el) {
      el.addEventListener('change', syncPaymentMethodUI);
    });

    document.getElementById('lang-en').addEventListener('click', () => {
      currentLang = 'en';
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localePref', 'user');
      applyPageLanguage();
      void loadCheckoutProfileGate();
    });
    document.getElementById('lang-fa').addEventListener('click', () => {
      currentLang = 'fa';
      localStorage.setItem('lang', 'fa');
      localStorage.setItem('localePref', 'user');
      applyPageLanguage();
      void loadCheckoutProfileGate();
    });
    document.getElementById('nav-logout').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.reload();
    });

    document.getElementById('btn-checkout').addEventListener('click', async () => {
      const basket = getBasket();
      if (!basket.length) return;

      const btnCheckout = document.getElementById('btn-checkout');
      const btnText = document.getElementById('btn-checkout-text');
      const btnLoading = document.getElementById('btn-checkout-loading');
      const errEl = document.getElementById('checkout-error');
      const t = translations[currentLang];

      errEl.classList.add('hidden');
      errEl.textContent = '';
      if (typeof window.setPrimaryButtonError === 'function') {
        window.setPrimaryButtonError(btnCheckout, false);
      }
      btnCheckout.disabled = true;
      btnText.classList.add('hidden');
      btnLoading.classList.remove('hidden');

      const lineItems = basket.map((item) => {
        const name = currentLang === 'fa' && item.name_fa ? item.name_fa : item.name;
        const row = {
          name: name || 'Item',
          price: Number(item.price) || 0,
          quantity: item.quantity || 1
        };
        if (item.id) row.productId = item.id;
        return row;
      });

      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const fulfillment = getFulfillment();
        const body = { lineItems, fulfillmentType: fulfillment };
        if (!token) {
          const guestNameEl = document.getElementById('guest-name');
          const guestEmailEl = document.getElementById('guest-email');
          const guestPhoneEl = document.getElementById('guest-phone');
          const guestName = guestNameEl && guestNameEl.value.trim();
          const guestEmail = guestEmailEl && guestEmailEl.value.trim();
          const guestPhone = guestPhoneEl && guestPhoneEl.value.trim();
          const guestAddress = document.getElementById('guest-address') && document.getElementById('guest-address').value.trim();
          const guestCity = document.getElementById('guest-city') && document.getElementById('guest-city').value.trim();
          const guestPostal = document.getElementById('guest-postal') && document.getElementById('guest-postal').value.trim();
          const guestAddrEl = document.getElementById('guest-address');
          var guestErrMsgs = [];
          var guestFirstFocus = null;
          function guestAddIssue(msg, el) {
            if (!msg) return;
            if (guestErrMsgs.indexOf(msg) === -1) guestErrMsgs.push(msg);
            if (el && !guestFirstFocus) guestFirstFocus = el;
          }
          if (!guestName) {
            guestAddIssue(t.guestNameRequired || t.guestDetailsRequired, guestNameEl || undefined);
          } else if (guestName.length < 2) {
            guestAddIssue(t.guestNameInvalid || t.guestDetailsRequired, guestNameEl || undefined);
          }
          if (!guestEmail) {
            guestAddIssue(t.guestEmailRequired || t.guestDetailsRequired, guestEmailEl || undefined);
          } else if (!GUEST_EMAIL_RE.test(guestEmail.toLowerCase())) {
            guestAddIssue(t.guestEmailInvalid || t.guestDetailsRequired, guestEmailEl || undefined);
          }
          if (guestPhoneEl && guestPhone) {
            var phoneDetail = getIntlPhoneValidationDetail(guestPhoneEl, { optionalEmpty: true });
            if (!phoneDetail.ok) {
              var phoneKey = intlPhoneMessageKey(phoneDetail.code);
              guestAddIssue(t[phoneKey] || t.phoneErrorInvalid, guestPhoneEl);
            }
          }
          if (fulfillment === 'delivery') {
            if (!guestAddress) {
              guestAddIssue(t.deliveryAddressMissing || t.guestDetailsRequiredDelivery, guestAddrEl || undefined);
            } else if (guestAddress.length < 5) {
              guestAddIssue(t.deliveryAddressTooShort || t.guestDetailsRequiredDelivery, guestAddrEl || undefined);
            }
          }
          if (guestErrMsgs.length) {
            showCheckoutValidationError(
              errEl,
              btnCheckout,
              guestErrMsgs.join('\n'),
              guestFirstFocus || undefined
            );
            return;
          }
          body.guestEmail = guestEmail;
          body.guestName = guestName;
          body.guestPhone = getIntlPhoneE164(guestPhoneEl) || undefined;
          if (fulfillment === 'delivery') {
            const guestExtra = document.getElementById('guest-additional-info') && document.getElementById('guest-additional-info').value.trim();
            body.shippingAddress = {
              line1: guestAddress,
              city: guestCity || undefined,
              postal_code: guestPostal || undefined
            };
            if (guestExtra) body.shippingAddress.additional_info = guestExtra;
          }
        } else if (fulfillment === 'delivery') {
          const regAddrEl = document.getElementById('reg-address');
          const regAddress = regAddrEl && regAddrEl.value.trim();
          const regCity = document.getElementById('reg-city') && document.getElementById('reg-city').value.trim();
          const regPostal = document.getElementById('reg-postal') && document.getElementById('reg-postal').value.trim();
          const regExtra = document.getElementById('reg-additional-info') && document.getElementById('reg-additional-info').value.trim();
          if (!regAddress) {
            showCheckoutValidationError(
              errEl,
              btnCheckout,
              t.deliveryAddressMissing || t.regDeliveryRequired || t.checkoutError,
              regAddrEl || undefined
            );
            return;
          }
          if (regAddress.length < 5) {
            showCheckoutValidationError(
              errEl,
              btnCheckout,
              t.deliveryAddressTooShort || t.regDeliveryRequired || t.checkoutError,
              regAddrEl || undefined
            );
            return;
          }
          body.shippingAddress = {
            line1: regAddress,
            city: regCity || undefined,
            postal_code: regPostal || undefined
          };
          if (regExtra) body.shippingAddress.additional_info = regExtra;
        }
        body.locale = currentLang === 'fa' ? 'fa' : 'en';
        var pendingOid = sessionStorage.getItem(PENDING_ORDER_KEY);
        if (token && pendingOid) {
          body.pendingOrderId = pendingOid;
        }

        syncPaymentMethodUI();
        var paymentMethod = getPaymentMethod();
        body.paymentMethod = paymentMethod;

        if (paymentMethod === 'crypto') {
          body.payCurrency = getSelectedPayCurrency();
          const cryptoRes = await fetch('/api/create-crypto-payment', {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          const cryptoRaw = await cryptoRes.text().catch(function () { return ''; });
          let cryptoData = {};
          try {
            cryptoData = cryptoRaw ? JSON.parse(cryptoRaw) : {};
          } catch (_) {
            cryptoData = {};
          }
          if (!cryptoRes.ok) {
            if (cryptoRes.status === 401 && cryptoData.code === 'SESSION_EXPIRED') {
              localStorage.removeItem('token');
              window.location.href = 'login.html';
              return;
            }
            if (cryptoRes.status === 403 && cryptoData.code === 'PROFILE_INCOMPLETE') {
              void loadCheckoutProfileGate();
            }
            var cryptoErr = sanitizeCheckoutError(
              extractApiError(cryptoData, cryptoRes.status, cryptoRaw, t.checkoutError),
              'crypto',
              t
            );
            if (cryptoRes.status === 403 && cryptoData.code === 'PROFILE_INCOMPLETE' && Array.isArray(cryptoData.missing) && cryptoData.missing.length) {
              var cryptoExtra = profileMissingPlainText(cryptoData.missing, t);
              if (cryptoExtra) cryptoErr = cryptoErr + ' ' + cryptoExtra;
            }
            showCheckoutValidationError(errEl, btnCheckout, cryptoErr);
            return;
          }
          if (window.EslamiCryptoCheckout && cryptoData.paymentId && (cryptoData.payAddress || cryptoData.invoiceUrl || cryptoData.gatewayUrl)) {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            updateCheckoutButtonState();
            window.EslamiCryptoCheckout.startCryptoCheckout(cryptoData, t, {
              onPaid: function (paymentId) {
                localStorage.removeItem('basket');
                sessionStorage.removeItem(PENDING_ORDER_KEY);
                sessionStorage.removeItem(PENDING_ORDER_LABEL_KEY);
                try {
                  sessionStorage.setItem(
                    'cryptoCheckoutSuccess',
                    JSON.stringify({
                      paymentId: paymentId,
                      orderNumber: cryptoData.orderNumber || '',
                      guestAccessToken: cryptoData.guestAccessToken || ''
                    })
                  );
                } catch (e) {}
                fetch('/api/orders/confirm-by-crypto/' + encodeURIComponent(paymentId), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: '{}'
                }).catch(function () {});
                var dest = cryptoData.successUrl || (window.location.pathname.replace(/\/basket\/?$/, '/checkout-success') + '?crypto_payment_id=' + encodeURIComponent(paymentId));
                window.location.href = dest;
              },
              onFailed: function () {
                updateCheckoutButtonState();
              }
            });
            return;
          }
          var cryptoUiErr = 'Payment was created but checkout could not open.';
          if (!window.EslamiCryptoCheckout) cryptoUiErr += ' Reload the page (Ctrl+F5) and try again.';
          else if (!cryptoData.paymentId) cryptoUiErr += ' No payment id was returned.';
          else cryptoUiErr += ' No pay address was returned.';
          showCheckoutValidationError(errEl, btnCheckout, sanitizeCheckoutError(cryptoUiErr, 'crypto', t));
          return;
        }

        const res = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 401 && data.code === 'SESSION_EXPIRED') {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
          }
          if (res.status === 403 && data.code === 'PROFILE_INCOMPLETE') {
            void loadCheckoutProfileGate();
          }
          var errMsg = sanitizeCheckoutError(data.error || t.checkoutError, 'stripe', t);
          if (res.status === 403 && data.code === 'PROFILE_INCOMPLETE' && Array.isArray(data.missing) && data.missing.length) {
            var extra = profileMissingPlainText(data.missing, t);
            if (extra) errMsg = errMsg + ' ' + extra;
          }
          showCheckoutValidationError(errEl, btnCheckout, errMsg);
          return;
        }
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        showCheckoutValidationError(errEl, btnCheckout, t.checkoutError);
      } catch (e) {
        var netErr = e && e.message ? String(e.message) : t.checkoutError;
        showCheckoutValidationError(
          errEl,
          btnCheckout,
          getPaymentMethod() === 'crypto' ? sanitizeCheckoutError(netErr, 'crypto', t) : t.checkoutError
        );
      }
      btnText.classList.remove('hidden');
      btnLoading.classList.add('hidden');
      updateCheckoutButtonState();
    });

    (async function boot() {
      await loadPendingOrderDraftIfAny();
      await loadCheckoutProfileGate();
      await loadCryptoPayCurrencies();
      applyPageLanguage();
      syncPaymentMethodUI();
      if (window.EslamiCryptoCheckout && typeof window.EslamiCryptoCheckout.bindCancel === 'function') {
        window.EslamiCryptoCheckout.bindCancel(function () {
          updateCheckoutButtonState();
        });
      }
      try {
        await initIntlPhoneInputs('#guest-phone');
        var gp = document.getElementById('guest-phone');
        if (gp) gp.placeholder = translations[currentLang].phoneHintGuest || '';
      } catch (e) {
        console.error(e);
      }
    })();

    window.addEventListener('appcurrencychange', function() {
      renderBasket();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        void loadCheckoutProfileGate();
      }
    });
    });
