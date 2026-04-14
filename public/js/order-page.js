runWhenLocaleReady(function () {
      var translations = {
        en: {
          pageTitle: 'Track Order - Eslami Electric',
          siteTitle: 'Eslami Electric',
          siteSubtitle: 'Quality electrical supplies',
          navHome: 'Home',
          navProducts: 'Products',
          navBasket: 'Basket',
          navOrders: 'My Orders',
          navTrack: 'Track order',
          mainTitle: 'Track your order',
          finderIntro: 'Enter the email address and order ID from your confirmation to view status.',
          labelEmail: 'Email',
          labelOrderId: 'Order number',
          phEmail: 'you@example.com',
          phOrder: 'e.g. ORD-A3X9K2',
          finderSubmit: 'View order',
          finderBothRequired: 'Please enter both email and order number.',
          loadingOrder: 'Loading order…',
          notFound: 'Order not found. Check your email and order number.',
          orderPrefix: 'Order',
          fulfillment: 'Fulfillment',
          delivery: 'Delivery',
          collection: 'Collection (pickup)',
          additionalInfo: 'Additional info',
          statusPaid: 'Paid',
          statusPending: 'Pending payment',
          statusCancelled: 'Cancelled',
          placedPrefix: 'Placed ',
          dateLabelFa: 'تاریخ: ',
          totalPrefix: 'Total: ',
          totalPrefixFa: 'جمع: ',
          trackingLabel: 'Tracking:',
          trackingLabelFa: 'پیگیری:',
          questions: 'Questions? Contact us with your order ID.',
          resumePayment: 'Complete payment',
          cancelOrder: 'Cancel order',
          cancelConfirm: 'Cancel this unpaid order? You will not be charged. This cannot be undone.',
          cancelErr: 'Could not cancel the order. Please try again.',
          resumeErr: 'Could not open checkout.',
          itemFallback: 'Item',
          continueShopping: 'Continue shopping'
        },
        fa: {
          pageTitle: 'پیگیری سفارش - الکتریکی اسلامی',
          siteTitle: 'الکتریکی اسلامی',
          siteSubtitle: 'تجهیزات برقی با کیفیت',
          navHome: 'خانه',
          navProducts: 'محصولات',
          navBasket: 'سبد خرید',
          navOrders: 'سفارشات من',
          navTrack: 'پیگیری سفارش',
          mainTitle: 'پیگیری سفارش شما',
          finderIntro: 'ایمیل و شماره سفارش را از ایمیل تأیید وارد کنید.',
          labelEmail: 'ایمیل',
          labelOrderId: 'شماره سفارش',
          phEmail: 'you@example.com',
          phOrder: 'مثال ORD-A3X9K2',
          finderSubmit: 'مشاهده سفارش',
          finderBothRequired: 'ایمیل و شماره سفارش را وارد کنید.',
          loadingOrder: 'در حال بارگذاری سفارش…',
          notFound: 'سفارش یافت نشد. ایمیل و شماره را بررسی کنید.',
          orderPrefix: 'سفارش',
          fulfillment: 'نحوه دریافت',
          delivery: 'ارسال به آدرس',
          collection: 'تحویل حضوری',
          additionalInfo: 'اطلاعات تکمیلی',
          statusPaid: 'پرداخت‌شده',
          statusPending: 'در انتظار پرداخت',
          statusCancelled: 'لغو شده',
          placedPrefix: 'ثبت: ',
          dateLabelFa: 'تاریخ: ',
          totalPrefix: 'Total: ',
          totalPrefixFa: 'جمع: ',
          trackingLabel: 'پیگیری:',
          trackingLabelFa: 'پیگیری:',
          questions: 'سوال دارید؟ با شماره سفارش با ما تماس بگیرید.',
          resumePayment: 'تکمیل پرداخت',
          cancelOrder: 'لغو سفارش',
          cancelConfirm: 'این سفارش پرداخت‌نشده لغو شود؟ هزینه‌ای از شما کسر نمی‌شود و این عمل قابل بازگشت نیست.',
          cancelErr: 'لغو سفارش انجام نشد. دوباره تلاش کنید.',
          resumeErr: 'باز کردن صفحه پرداخت ممکن نشد.',
          itemFallback: 'کالا',
          continueShopping: 'ادامهٔ خرید'
        }
      };
      var currentLang = localStorage.getItem('lang') || 'en';
      var cachedOrder = null;
      var params = new URLSearchParams(window.location.search);
      var token = params.get('token');

      function applyPageLanguage() {
        var t = translations[currentLang];
        document.title = t.pageTitle;
        document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
        document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';
        document.getElementById('site-title').textContent = t.siteTitle;
        document.getElementById('site-subtitle').textContent = t.siteSubtitle;
        document.getElementById('nav-home').textContent = t.navHome;
        document.getElementById('nav-products').textContent = t.navProducts;
        var navBasketLabel = document.getElementById('nav-basket-label');
        if (navBasketLabel) navBasketLabel.textContent = t.navBasket;
        document.getElementById('nav-orders').textContent = t.navOrders;
        document.getElementById('nav-track').textContent = t.navTrack;
        document.getElementById('page-title').textContent = t.mainTitle;
        document.getElementById('finder-intro').textContent = t.finderIntro;
        document.getElementById('label-finder-email').textContent = t.labelEmail;
        document.getElementById('label-finder-order').textContent = t.labelOrderId;
        document.getElementById('finder-email').placeholder = t.phEmail;
        document.getElementById('finder-order-id').placeholder = t.phOrder;
        document.getElementById('finder-submit').textContent = t.finderSubmit;
        document.getElementById('order-loading-text').textContent = t.loadingOrder;
        document.getElementById('order-not-found-text').textContent = t.notFound;
        document.getElementById('detail-order-prefix').textContent = t.orderPrefix;
        document.getElementById('detail-questions').textContent = t.questions;
        document.getElementById('btn-cancel-order').textContent = t.cancelOrder;
        var continueShop = document.getElementById('link-continue-shopping');
        if (continueShop) continueShop.textContent = t.continueShopping;
        document.getElementById('lang-en').className = currentLang === 'en'
          ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900 text-left sm:text-center'
          : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors text-left sm:text-center';
        document.getElementById('lang-fa').className = currentLang === 'fa'
          ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900 text-left sm:text-center'
          : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors text-left sm:text-center';
        if (typeof applyFooterI18n === 'function') applyFooterI18n();
      }

      document.getElementById('lang-en').addEventListener('click', function() {
        currentLang = 'en';
        localStorage.setItem('lang', 'en');
        localStorage.setItem('localePref', 'user');
        applyPageLanguage();
        if (cachedOrder) renderOrder(cachedOrder);
      });
      document.getElementById('lang-fa').addEventListener('click', function() {
        currentLang = 'fa';
        localStorage.setItem('lang', 'fa');
        localStorage.setItem('localePref', 'user');
        applyPageLanguage();
        if (cachedOrder) renderOrder(cachedOrder);
      });

      function showSection(id) {
        ['finder-section', 'order-loading', 'order-not-found', 'order-detail'].forEach(function(s) {
          var el = document.getElementById(s);
          if (el) el.classList.add('hidden');
        });
        var el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
      }

      function formatDate(iso) {
        if (!iso) return '';
        try {
          var d = new Date(iso);
          if (isNaN(d.getTime())) return iso;
          var lg = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'en';
          return lg === 'fa' ? d.toLocaleDateString('fa-IR') : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
        } catch (e) { return iso; }
      }

      function formatAmount(cents, currency) {
        if (cents == null) return '';
        var cur = (currency || '').toLowerCase();
        if (cur === 'usd' && typeof formatStripeUsdCents === 'function') {
          return formatStripeUsdCents(cents);
        }
        var n = Number(cents) / 100;
        return (cur === 'usd' ? '$' : '') + n.toFixed(2);
      }

      function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, function (c) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
        });
      }

      function setResumeError(msg) {
        var el = document.getElementById('detail-resume-error');
        if (!el) return;
        if (msg) {
          el.textContent = msg;
          el.classList.remove('hidden');
        } else {
          el.textContent = '';
          el.classList.add('hidden');
        }
      }

      function setCancelError(msg) {
        var el = document.getElementById('detail-cancel-error');
        if (!el) return;
        if (msg) {
          el.textContent = msg;
          el.classList.remove('hidden');
        } else {
          el.textContent = '';
          el.classList.add('hidden');
        }
      }

      function normalizeOrderStatus(s) {
        return String(s == null ? '' : s).toLowerCase().trim();
      }

      function renderOrder(order) {
        cachedOrder = order;
        var orderLang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'en';
        var t = translations[orderLang];
        var ffText = order.fulfillment_type === 'collection' ? t.collection : t.delivery;
        var ffEl = document.getElementById('detail-fulfillment');
        if (ffEl) ffEl.textContent = t.fulfillment + ': ' + ffText;

        var addLabel = t.additionalInfo;
        var ship = order.shipping_address;
        var extraTxt = ship && typeof ship === 'object' && ship.additional_info ? String(ship.additional_info).trim() : '';
        var addEl = document.getElementById('detail-additional-info');
        if (addEl) {
          if (extraTxt) {
            addEl.textContent = addLabel + ': ' + extraTxt;
            addEl.classList.remove('hidden');
          } else {
            addEl.textContent = '';
            addEl.classList.add('hidden');
          }
        }

        document.getElementById('detail-order-prefix').textContent = t.orderPrefix;
        document.getElementById('detail-order-id').textContent = order.order_number || order.id;
        var st = order.status || 'paid';
        var stDisp = st;
        if (st === 'paid') stDisp = t.statusPaid;
        else if (st === 'pending') stDisp = t.statusPending;
        else if (st === 'cancelled' || st === 'canceled') stDisp = t.statusCancelled;
        document.getElementById('detail-status').textContent = stDisp;
        var stEl = document.getElementById('detail-status');
        stEl.className =
          'px-2 py-1 rounded text-sm font-medium ' +
          (st === 'pending' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800');
        var resumeWrap = document.getElementById('detail-resume-wrap');
        var resumeBtn = document.getElementById('btn-resume-payment');
        if (resumeWrap && resumeBtn) {
          if (st === 'pending' && token && token.length >= 10) {
            resumeWrap.classList.remove('hidden');
            resumeBtn.textContent = t.resumePayment;
          } else {
            resumeWrap.classList.add('hidden');
          }
        }
        document.getElementById('detail-date').textContent =
          (orderLang === 'fa' ? t.dateLabelFa : t.placedPrefix) + formatDate(order.created_at);
        var itemsEl = document.getElementById('detail-items');
        itemsEl.innerHTML = '';
        var items = order.line_items || [];
        var loc = window.orderLineItemsLocale;
        var finishItems = function(byId) {
          var wrapLtr =
            typeof window.wrapLtrPrice === 'function'
              ? window.wrapLtrPrice
              : typeof window.ltrNumSpan === 'function'
                ? window.ltrNumSpan
                : function (s) { return String(s); };
          items.forEach(function(item) {
            var qty = item.quantity || 1;
            var name =
              loc && typeof loc.lineItemDisplayName === 'function'
                ? loc.lineItemDisplayName(item, orderLang, byId || {})
                : item.name || t.itemFallback;
            var lineAmt = '';
            if (item.amount_total != null) {
              lineAmt = typeof formatStripeUsdCents === 'function'
                ? formatStripeUsdCents(item.amount_total)
                : ('$' + (Number(item.amount_total) / 100).toFixed(2));
            } else {
              var sub = (Number(item.unit_amount || 0) / 100) * qty;
              lineAmt = typeof formatPriceUSD === 'function' ? formatPriceUSD(sub) : ('$' + sub.toFixed(2));
            }
            var li = document.createElement('p');
            li.className = 'text-slate-700';
            li.innerHTML =
              escapeHtml(name) +
              ' ×' +
              wrapLtr(escapeHtml(String(qty))) +
              ' — ' +
              wrapLtr(lineAmt);
            itemsEl.appendChild(li);
          });
          document.getElementById('detail-total').innerHTML =
            (orderLang === 'fa' ? 'جمع: ' : 'Total: ') +
            wrapLtr(formatAmount(order.amount_total, order.currency));
        };
        if (loc && typeof loc.ensureProductCatalog === 'function') {
          loc.ensureProductCatalog().then(finishItems).catch(function() { finishItems({}); });
        } else {
          finishItems({});
        }
        if (order.tracking_number && order.tracking_number.trim()) {
          document.getElementById('detail-tracking').classList.remove('hidden');
          document.getElementById('detail-tracking-label').textContent =
            orderLang === 'fa' ? t.trackingLabelFa : t.trackingLabel;
          document.getElementById('detail-tracking-number').textContent = order.tracking_number;
        } else {
          document.getElementById('detail-tracking').classList.add('hidden');
        }
        showSection('order-detail');
      }

      function loadByToken(t) {
        showSection('order-loading');
        fetch('/api/orders/guest/' + encodeURIComponent(t))
          .then(function(r) {
            if (!r.ok) throw new Error('Not found');
            return r.json();
          })
          .then(renderOrder)
          .catch(function() {
            showSection('order-not-found');
          });
      }

      document.getElementById('btn-resume-payment').addEventListener('click', function() {
        if (!token || token.length < 10) return;
        var btn = this;
        var lg = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'en';
        var genericErr = translations[lg].resumeErr;
        setResumeError('');
        btn.disabled = true;
        fetch('/api/orders/guest-resume-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token, locale: lg === 'fa' ? 'fa' : 'en' })
        })
          .then(function(r) {
            return r.json().then(function(d) {
              return { ok: r.ok, data: d };
            });
          })
          .then(function(_ref) {
            var ok = _ref.ok;
            var data = _ref.data;
            if (ok && data && data.url) {
              window.location.href = data.url;
              return;
            }
            setResumeError((data && data.error) ? data.error : genericErr);
          })
          .catch(function() {
            setResumeError(genericErr);
          })
          .finally(function() {
            btn.disabled = false;
          });
      });

      document.getElementById('btn-cancel-order').addEventListener('click', function() {
        if (!token || token.length < 10) return;
        var btn = this;
        var lg = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'en';
        var confirmMsg = translations[lg].cancelConfirm;
        var genericErr = translations[lg].cancelErr;
        if (!confirm(confirmMsg)) return;
        setCancelError('');
        setResumeError('');
        btn.disabled = true;
        fetch('/api/orders/guest-cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token })
        })
          .then(function(r) {
            return r.json().then(function(d) {
              return { ok: r.ok, data: d };
            });
          })
          .then(function(_ref) {
            var ok = _ref.ok;
            var data = _ref.data;
            if (ok && data && data.ok) {
              loadByToken(token);
              return;
            }
            setCancelError((data && data.error) ? data.error : genericErr);
          })
          .catch(function() {
            setCancelError(genericErr);
          })
          .finally(function() {
            btn.disabled = false;
          });
      });

      applyPageLanguage();

      if (token && token.length >= 10) {
        document.getElementById('finder-section').classList.add('hidden');
        loadByToken(token);
      } else {
      document.getElementById('finder-form').addEventListener('submit', function(e) {
        e.preventDefault();
        var email = document.getElementById('finder-email').value.trim();
        var orderId = document.getElementById('finder-order-id').value.trim();
        var errEl = document.getElementById('finder-error');
        if (!email || !orderId) {
          errEl.textContent = translations[currentLang].finderBothRequired;
          errEl.classList.remove('hidden');
          return;
        }
        errEl.classList.add('hidden');
        showSection('order-loading');
        fetch('/api/orders/guest-lookup?email=' + encodeURIComponent(email) + '&order_id=' + encodeURIComponent(orderId))
          .then(function(r) {
            if (!r.ok) throw new Error('Not found');
            return r.json();
          })
          .then(renderOrder)
          .catch(function() {
            showSection('order-not-found');
          });
      });
      }

      window.addEventListener('appcurrencychange', function() {
        if (cachedOrder) renderOrder(cachedOrder);
      });
    });
