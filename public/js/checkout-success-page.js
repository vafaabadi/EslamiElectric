runWhenLocaleReady(function () {
    var translations = {
      en: {
        pageTitle: 'Payment Successful - Eslami Electric',
        successTitle: 'Payment successful',
        successThanks: 'Thank you for your order.',
        guestOrderLabel: 'Order number:',
        guestOrderHint: 'Save this link to track your order (we’ll also email you a receipt):',
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

    (function () {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('session_id');
        if (sessionId && typeof localStorage !== 'undefined') {
          localStorage.removeItem('basket');
        }
        if (sessionId && typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('pendingCheckoutOrderId');
          sessionStorage.removeItem('pendingCheckoutOrderLabel');
        }
        if (sessionId) {
          fetch('/api/orders/confirm-by-session/' + encodeURIComponent(sessionId), { method: 'POST' })
            .then(function (r) { return r.json(); })
            .then(function () { return fetch('/api/orders/by-session/' + encodeURIComponent(sessionId)); })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (order) {
              if (order && order.guest_access_token) {
                var guestInfo = document.getElementById('guest-order-info');
                var orderIdDisplay = document.getElementById('order-id-display');
                var guestLink = document.getElementById('guest-order-link');
                var linkMyOrders = document.getElementById('link-my-orders');
                var linkTrack = document.getElementById('link-track-order');
                if (guestInfo) guestInfo.classList.remove('hidden');
                if (orderIdDisplay) orderIdDisplay.textContent = order.order_number || order.id;
                var trackUrl = window.location.origin + '/order.html?token=' + encodeURIComponent(order.guest_access_token);
                if (guestLink) { guestLink.href = trackUrl; guestLink.textContent = trackUrl; }
                if (linkMyOrders) linkMyOrders.classList.add('hidden');
                if (linkTrack) { linkTrack.href = trackUrl; linkTrack.classList.remove('hidden'); }
              }
            })
            .catch(function () {});
        }
      } catch (e) {}
    })();

    applyPageLanguage();
    });
