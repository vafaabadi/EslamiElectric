runWhenLocaleReady(function () {
    var CRYPTO_HINT_KEY = 'cryptoCheckoutSuccess';
    var MAX_CRYPTO_FETCH_ATTEMPTS = 15;
    var CRYPTO_FETCH_DELAY_MS = 1500;

    var translations = {
      en: {
        pageTitle: 'Payment Successful - Eslami Electric',
        successTitle: 'Payment successful',
        successThanks: 'Thank you for your order.',
        guestOrderLabel: 'Order number:',
        guestOrderHint: 'Save this link to track your order (we\'ll also email you a receipt):',
        myOrders: 'My Orders',
        trackOrder: 'Track this order',
        backHome: 'Back to Home',
        viewBasket: 'View Basket'
      },
      fa: {
        pageTitle: 'پرداخت موفق - الکتریکی اسلامی',
        successTitle: 'پرداخت با موفقیت انجام شد',
        successThanks: 'از خرید شما سپاسگزاریم.',
        guestOrderLabel: 'شماره سفارش:',
        guestOrderHint: 'این لینک را برای پیگیری سفارش ذخیره کنید (رسید هم به ایمیل شما ارسال می‌شود):',
        myOrders: 'سفارشات من',
        trackOrder: 'پیگیری این سفارش',
        backHome: 'بازگشت به خانه',
        viewBasket: 'سبد خرید'
      }
    };
    var currentLang = localStorage.getItem('lang') || 'en';

    function localePathPrefix() {
      var p = window.location.pathname || '';
      if (p.indexOf('/fa/') === 0) return '/fa/';
      if (p.indexOf('/en/') === 0) return '/en/';
      return currentLang === 'fa' ? '/fa/' : '/en/';
    }

    function buildTrackUrl(token) {
      return window.location.origin + localePathPrefix() + 'order?token=' + encodeURIComponent(token);
    }

    function readCryptoHint(paymentId) {
      try {
        var raw = sessionStorage.getItem(CRYPTO_HINT_KEY);
        if (!raw) return null;
        var hint = JSON.parse(raw);
        if (!hint || String(hint.paymentId) !== String(paymentId)) return null;
        return hint;
      } catch (e) {
        return null;
      }
    }

    function clearCryptoHint() {
      try {
        sessionStorage.removeItem(CRYPTO_HINT_KEY);
      } catch (e) {}
    }

    function applyPageLanguage() {
      var t = translations[currentLang];
      document.title = t.pageTitle;
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
      document.getElementById('success-title').textContent = t.successTitle;
      document.getElementById('success-thanks').textContent = t.successThanks;
      document.getElementById('guest-order-label').textContent = t.guestOrderLabel;
      document.getElementById('guest-order-hint').textContent = t.guestOrderHint;
      document.getElementById('link-my-orders').textContent = t.myOrders;
      document.getElementById('link-track-order').textContent = t.trackOrder;
      document.getElementById('link-home').textContent = t.backHome;
      document.getElementById('link-basket').textContent = t.viewBasket;
      if (typeof applyFooterI18n === 'function') applyFooterI18n();
    }

    function showGuestOrderInfo(order, hint) {
      var guestToken =
        (order && (order.guest_access_token || order.guestAccessToken)) ||
        (hint && hint.guestAccessToken) ||
        '';
      var orderNumber =
        (order && (order.order_number || order.id)) || (hint && hint.orderNumber) || '';
      if (!guestToken && !orderNumber) return;

      var guestInfo = document.getElementById('guest-order-info');
      var orderIdDisplay = document.getElementById('order-id-display');
      var guestHint = document.getElementById('guest-order-hint');
      var guestLink = document.getElementById('guest-order-link');
      var linkMyOrders = document.getElementById('link-my-orders');
      var linkTrack = document.getElementById('link-track-order');

      if (guestInfo) guestInfo.classList.remove('hidden');
      if (orderIdDisplay) orderIdDisplay.textContent = orderNumber;

      if (guestToken) {
        var trackUrl = buildTrackUrl(guestToken);
        if (guestHint) guestHint.classList.remove('hidden');
        if (guestLink) {
          guestLink.href = trackUrl;
          guestLink.textContent = trackUrl;
          guestLink.classList.remove('hidden');
        }
        if (linkMyOrders) linkMyOrders.classList.add('hidden');
        if (linkTrack) {
          linkTrack.href = trackUrl;
          linkTrack.classList.remove('hidden');
        }
      } else {
        // Logged-in checkout: show order number only (no guest tracking link).
        if (guestHint) guestHint.classList.add('hidden');
        if (guestLink) {
          guestLink.removeAttribute('href');
          guestLink.textContent = '';
          guestLink.classList.add('hidden');
        }
        if (linkMyOrders) linkMyOrders.classList.remove('hidden');
        if (linkTrack) linkTrack.classList.add('hidden');
      }
    }

    function fetchOrderBySession(sessionId) {
      return fetch('/api/orders/confirm-by-session/' + encodeURIComponent(sessionId), { method: 'POST' })
        .then(function (r) {
          return r.json().catch(function () {
            return {};
          });
        })
        .then(function () {
          return fetch('/api/orders/by-session/' + encodeURIComponent(sessionId));
        })
        .then(function (r) {
          return r.ok ? r.json() : null;
        });
    }

    function fetchOrderByCrypto(paymentId, attempt) {
      attempt = attempt || 0;
      return fetch('/api/orders/confirm-by-crypto/' + encodeURIComponent(paymentId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}'
      })
        .then(function (r) {
          return r.json().catch(function () {
            return {};
          });
        })
        .then(function () {
          return fetch('/api/orders/by-crypto-payment/' + encodeURIComponent(paymentId));
        })
        .then(function (r) {
          if (r.ok) return r.json();
          if (r.status === 404 && attempt < MAX_CRYPTO_FETCH_ATTEMPTS) {
            return new Promise(function (resolve) {
              setTimeout(function () {
                resolve(fetchOrderByCrypto(paymentId, attempt + 1));
              }, CRYPTO_FETCH_DELAY_MS);
            });
          }
          return null;
        });
    }

    (function () {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        const cryptoPaymentId = params.get('crypto_payment_id');
        if ((sessionId || cryptoPaymentId) && typeof localStorage !== 'undefined') {
          localStorage.removeItem('basket');
        }
        if ((sessionId || cryptoPaymentId) && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('pendingCheckoutOrderId');
          sessionStorage.removeItem('pendingCheckoutOrderLabel');
        }
        if (sessionId) {
          fetchOrderBySession(sessionId)
            .then(function (order) {
              showGuestOrderInfo(order);
            })
            .catch(function () {});
        } else if (cryptoPaymentId) {
          var hint = readCryptoHint(cryptoPaymentId);
          if (hint) showGuestOrderInfo(null, hint);
          fetchOrderByCrypto(cryptoPaymentId)
            .then(function (order) {
              showGuestOrderInfo(order, hint);
              if (order) clearCryptoHint();
            })
            .catch(function () {
              if (hint) showGuestOrderInfo(null, hint);
            });
        }
      } catch (e) {}
    })();

    applyPageLanguage();
  });
