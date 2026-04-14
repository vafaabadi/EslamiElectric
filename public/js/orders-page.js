runWhenLocaleReady(function () {
    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Quality electrical supplies',
        pageTitle: 'My Orders',
        navHome: 'Home',
        navProducts: 'Products',
        navBasket: 'Basket',
        navOrders: 'My Orders',
        navLogin: 'Login',
        createAccount: 'Sign Up',
        navLogout: 'Logout',
        loginRequiredMessage: 'Log in to view your orders.',
        logIn: 'Log In',
        loadingOrders: 'Loading orders…',
        noOrdersYet: 'You have no orders yet.',
        continueShopping: 'Continue shopping',
        orderDate: 'Date',
        orderTotal: 'Total',
        orderStatus: 'Status',
        statusPaid: 'Paid',
        statusPending: 'Pending payment',
        statusCancelled: 'Cancelled',
        paymentRequiredHint: 'This order is waiting for payment.',
        resumePayment: 'Complete payment',
        resumeEmailHint:
          'Completing payment uses the email saved on My Profile. Update it there before paying if you need a different address.',
        editOrderBeforePayment: 'Edit before payment',
        resumeError: 'Could not open checkout. Please try again.',
        cancelOrder: 'Cancel order',
        cancelConfirm: 'Cancel this unpaid order? You will not be charged. This cannot be undone.',
        cancelError: 'Could not cancel the order. Please try again.',
        profileIncompleteCheckout:
          'Payment is blocked until your profile is complete. Open My Profile from the menu, save your details, then try again.',
        profileMissingHeading: 'Still needed:',
        profileMissingFields: {
          firstName: 'First name',
          surname: 'Surname',
          mobile: 'Mobile number',
          email: 'Email',
          contactEmail: 'Contact email (Telegram sign-in)',
          companyName: 'Company name',
          companyContactNumber: 'Company contact number'
        },
        viewDetails: 'Details',
        items: 'Items',
        fulfillment: 'Fulfillment',
        fulfillmentDelivery: 'Delivery',
        fulfillmentCollection: 'Collection (pickup)',
        additionalInfo: 'Additional info'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        pageTitle: 'سفارشات من',
        navHome: 'خانه',
        navProducts: 'محصولات',
        navBasket: 'سبد خرید',
        navOrders: 'سفارشات من',
        navProfile: 'پروفایل من',
        navLogin: 'ورود',
        createAccount: 'ایجاد حساب کاربری',
        navLogout: 'خروج',
        loginRequiredMessage: 'برای مشاهده سفارشات وارد شوید.',
        logIn: 'ورود',
        loadingOrders: 'در حال بارگذاری سفارشات…',
        noOrdersYet: 'هنوز سفارشی ندارید.',
        continueShopping: 'ادامهٔ خرید',
        orderDate: 'تاریخ',
        orderTotal: 'مجموع',
        orderStatus: 'وضعیت',
        statusPaid: 'پرداخت شده',
        statusPending: 'در انتظار پرداخت',
        statusCancelled: 'لغو شده',
        paymentRequiredHint: 'این سفارش هنوز پرداخت نشده است.',
        resumePayment: 'تکمیل پرداخت',
        resumeEmailHint:
          'برای پرداخت از همان ایمیلی استفاده می‌شود که در «پروفایل من» ذخیره شده است. اگر باید عوض شود، ابتدا آنجا را به‌روز کنید.',
        editOrderBeforePayment: 'ویرایش قبل از پرداخت',
        resumeError: 'باز کردن درگاه پرداخت ممکن نشد. دوباره تلاش کنید.',
        cancelOrder: 'لغو سفارش',
        cancelConfirm: 'این سفارش پرداخت‌نشده لغو شود؟ هزینه‌ای از شما کسر نمی‌شود و این عمل قابل بازگشت نیست.',
        cancelError: 'لغو سفارش انجام نشد. دوباره تلاش کنید.',
        profileIncompleteCheckout:
          'تا تکمیل پروفایل، پرداخت ممکن نیست. از منو «پروفایل من» را باز کنید، ذخیره کنید و دوباره تلاش کنید.',
        profileMissingHeading: 'موارد لازم:',
        profileMissingFields: {
          firstName: 'نام',
          surname: 'نام خانوادگی',
          mobile: 'شماره موبایل',
          email: 'ایمیل',
          contactEmail: 'ایمیل تماس (تلگرام)',
          companyName: 'نام شرکت',
          companyContactNumber: 'تلفن تماس شرکت'
        },
        viewDetails: 'جزئیات',
        items: 'اقلام',
        fulfillment: 'نحوه دریافت',
        fulfillmentDelivery: 'ارسال به آدرس',
        fulfillmentCollection: 'تحویل حضوری',
        additionalInfo: 'اطلاعات تکمیلی'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';
    let lastOrdersSnapshot = null;

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    /** DB / API may vary casing; keep UI in sync with server resume logic. */
    function normalizeOrderStatus(s) {
      return String(s == null ? '' : s).toLowerCase().trim();
    }
    function isPendingOrder(order) {
      return normalizeOrderStatus(order && order.status) === 'pending';
    }

    function formatDate(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return currentLang === 'fa' ? d.toLocaleDateString('fa-IR') : d.toLocaleDateString();
    }

    function formatAmount(cents, currency) {
      const cur = (currency || '').toLowerCase();
      if (cur === 'usd' && typeof formatStripeUsdCents === 'function') {
        return formatStripeUsdCents(cents);
      }
      const n = (cents / 100).toFixed(2);
      return cur === 'usd' ? '$' + n : n + ' ' + (currency || '').toUpperCase();
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
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
      document.getElementById('nav-login').textContent = t.navLogin;
      document.getElementById('go-account').textContent = t.createAccount;
      document.getElementById('nav-logout').textContent = t.navLogout;
      document.getElementById('login-required-message').textContent = t.loginRequiredMessage;
      document.getElementById('login-required-link').textContent = t.logIn;
      document.getElementById('orders-empty-message').textContent = t.noOrdersYet;
      document.getElementById('orders-empty-link').textContent = t.continueShopping;
      document.getElementById('lang-en').className = currentLang === 'en'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      document.getElementById('lang-fa').className = currentLang === 'fa'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      if (typeof applyFooterI18n === 'function') applyFooterI18n();
      const token = localStorage.getItem('token');
      document.getElementById('nav-login').classList.toggle('hidden', !!token);
      document.getElementById('nav-logout').classList.toggle('hidden', !token);
      document.getElementById('go-account').classList.toggle('hidden', !!token);
      document.getElementById('nav-profile').classList.toggle('hidden', !token);

      if (lastOrdersSnapshot && document.getElementById('orders-list') && !document.getElementById('orders-list').classList.contains('hidden')) {
        void renderOrders(lastOrdersSnapshot);
      }
    }

    function showSection(id) {
      const hintEl = document.getElementById('orders-resume-email-hint');
      if (hintEl && id !== 'orders-list') hintEl.classList.add('hidden');
      ['orders-login-required', 'orders-loading', 'orders-empty', 'orders-list'].forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
      });
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('hidden');
        if (id === 'orders-list') el.style.display = '';
      }
    }

    async function renderOrders(orders) {
      const wrapLtr =
        typeof window.wrapLtrPrice === 'function'
          ? window.wrapLtrPrice
          : typeof window.ltrNumSpan === 'function'
            ? window.ltrNumSpan
            : function (s) { return s; };
      const listEl = document.getElementById('orders-list');
      listEl.innerHTML = '';
      const t = translations[currentLang];
      const byId =
        window.orderLineItemsLocale && typeof window.orderLineItemsLocale.ensureProductCatalog === 'function'
          ? await window.orderLineItemsLocale.ensureProductCatalog()
          : {};
      const lineName = (item) =>
        window.orderLineItemsLocale && typeof window.orderLineItemsLocale.lineItemDisplayName === 'function'
          ? window.orderLineItemsLocale.lineItemDisplayName(item, currentLang, byId)
          : item && item.name != null
            ? String(item.name)
            : currentLang === 'fa'
              ? 'کالا'
              : 'Item';
      const statusLabel = (s) => {
        const n = normalizeOrderStatus(s);
        if (n === 'paid') return t.statusPaid;
        if (n === 'pending') return t.statusPending;
        if (n === 'cancelled' || n === 'canceled') return t.statusCancelled;
        return s || '—';
      };

      orders.forEach((order) => {
        const li = document.createElement('li');
        li.className = 'bg-white rounded-xl shadow-md overflow-hidden';
        const lineItems = order.line_items || [];
        const itemsSummary = lineItems.length
          ? lineItems.map(i => escapeHtml(lineName(i)) + (i.quantity > 1 ? ' × ' + i.quantity : '')).join(', ')
          : '—';
        const orderNum = order.order_number || order.id;
        const ship = order.shipping_address;
        const extraInfo = ship && typeof ship === 'object' && ship.additional_info
          ? String(ship.additional_info).trim()
          : '';
        const extraInfoShort = extraInfo.length > 220 ? extraInfo.slice(0, 220) + '…' : extraInfo;
        const ns = normalizeOrderStatus(order.status);
        const statusBadgeClass =
          ns === 'pending'
            ? 'bg-amber-100 text-amber-900'
            : ns === 'cancelled' || ns === 'canceled'
              ? 'bg-slate-200 text-slate-800'
              : 'bg-emerald-100 text-emerald-800';
        li.innerHTML = `
          <div class="p-4 flex flex-wrap items-center justify-between gap-4 cursor-pointer order-header" data-order-id="${escapeHtml(order.id)}">
            <div class="flex-1 min-w-0">
              <p class="font-mono text-slate-700 text-sm">${escapeHtml(orderNum)}</p>
              <p class="text-slate-500 text-sm">${t.orderDate}: ${formatDate(order.created_at)}</p>
              <p class="font-semibold text-slate-800 mt-0.5">${wrapLtr(formatAmount(order.amount_total, order.currency))}</p>
              <p class="text-slate-600 text-sm mt-1 truncate" title="${itemsSummary}">${itemsSummary}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 rounded text-xs font-medium ${statusBadgeClass}">${statusLabel(order.status)}</span>
              <span class="order-toggle text-slate-400" aria-hidden="true">▼</span>
            </div>
          </div>
          ${isPendingOrder(order) ? `
          <div class="resume-row relative z-10 px-4 py-3 border-t-2 border-amber-400 bg-amber-50">
            <p class="text-sm font-medium text-amber-950 mb-2">${escapeHtml(t.paymentRequiredHint)}</p>
            <div class="flex flex-col sm:flex-row gap-2 sm:items-center sm:flex-wrap">
              <a href="basket.html?editOrder=${encodeURIComponent(order.id)}" class="edit-pending-order-link w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg border-2 border-sky-500 bg-white text-sky-900 font-semibold text-sm hover:bg-sky-50 text-center inline-flex items-center justify-center">${escapeHtml(t.editOrderBeforePayment)}</a>
              <button type="button" class="resume-pay-btn w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg bg-amber-500 text-slate-900 font-semibold text-sm hover:bg-amber-400 shadow-sm" data-order-id="${escapeHtml(order.id)}">${escapeHtml(t.resumePayment)}</button>
              <button type="button" class="cancel-order-btn w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-lg border-2 border-slate-400 bg-white text-slate-800 font-semibold text-sm hover:bg-slate-50" data-order-id="${escapeHtml(order.id)}">${escapeHtml(t.cancelOrder)}</button>
            </div>
            <p class="resume-checkout-error hidden mt-2 text-sm text-red-600" role="alert"></p>
            <p class="cancel-checkout-error hidden mt-1 text-sm text-red-600" role="alert"></p>
          </div>
          ` : ''}
          <div class="order-details hidden border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <p class="text-sm text-slate-700 mb-2"><span class="font-medium text-slate-600">${escapeHtml(t.fulfillment)}:</span> ${order.fulfillment_type === 'collection' ? escapeHtml(t.fulfillmentCollection) : escapeHtml(t.fulfillmentDelivery)}</p>
            ${extraInfoShort ? `<p class="text-sm text-slate-700 mb-2 whitespace-pre-wrap"><span class="font-medium text-slate-600">${escapeHtml(t.additionalInfo)}:</span> ${escapeHtml(extraInfoShort)}</p>` : ''}
            <p class="text-sm font-medium text-slate-600 mb-2">${t.items}</p>
            <ul class="space-y-1 text-sm text-slate-700"></ul>
          </div>
        `;
        const detailsEl = li.querySelector('.order-details');
        const itemsListEl = li.querySelector('.order-details ul');
        if (lineItems.length) {
          lineItems.forEach((item) => {
            const qty = item.quantity || 1;
            const amt = item.amount_total != null ? formatAmount(item.amount_total, order.currency) : '';
            const row = document.createElement('li');
            row.innerHTML =
              escapeHtml(lineName(item)) +
              ' ×<span dir="ltr" class="tabular-nums">' +
              escapeHtml(String(qty)) +
              '</span>' +
              (amt ? ' — <span dir="ltr" class="tabular-nums">' + amt + '</span>' : '');
            itemsListEl.appendChild(row);
          });
        } else {
          itemsListEl.innerHTML = '<li class="text-slate-500">—</li>';
        }
        li.querySelector('.order-header').addEventListener('click', () => {
          detailsEl.classList.toggle('hidden');
          const toggle = li.querySelector('.order-toggle');
          if (toggle) toggle.textContent = detailsEl.classList.contains('hidden') ? '▼' : '▲';
        });
        listEl.appendChild(li);
      });
      const hintAfter = document.getElementById('orders-resume-email-hint');
      if (hintAfter) {
        const hasPending = orders.some(isPendingOrder);
        if (hasPending) {
          hintAfter.textContent = t.resumeEmailHint;
          hintAfter.classList.remove('hidden');
        } else {
          hintAfter.classList.add('hidden');
        }
      }
    }

    (function bindEditOrderLinkStopPropagation() {
      const list = document.getElementById('orders-list');
      if (!list || list.dataset.editLinkBound) return;
      list.dataset.editLinkBound = '1';
      list.addEventListener(
        'click',
        function (ev) {
          if (ev.target.closest('.edit-pending-order-link')) ev.stopPropagation();
        },
        true
      );
    })();

    (function bindResumeCheckoutOnce() {
      const list = document.getElementById('orders-list');
      if (!list || list.dataset.resumeBound) return;
      list.dataset.resumeBound = '1';
      list.addEventListener('click', function (ev) {
        const btn = ev.target.closest('.resume-pay-btn');
        if (!btn) return;
        ev.stopPropagation();
        ev.preventDefault();
        const oid = btn.getAttribute('data-order-id');
        const authToken = localStorage.getItem('token');
        if (!oid || !authToken) return;
        const tr = translations[currentLang];
        const resumeRow = btn.closest('.resume-row');
        const errEl = resumeRow && resumeRow.querySelector('.resume-checkout-error');
        function setErr(msg) {
          if (!errEl) return;
          if (msg) {
            errEl.textContent = msg;
            errEl.classList.remove('hidden');
            if (typeof window.scrollFeedbackIntoView === 'function') {
              window.scrollFeedbackIntoView(errEl);
            }
          } else {
            errEl.textContent = '';
            errEl.classList.add('hidden');
          }
        }
        setErr('');
        btn.disabled = true;
        fetch('/api/orders/' + encodeURIComponent(oid) + '/resume-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken },
          body: JSON.stringify({ locale: currentLang === 'fa' ? 'fa' : 'en' })
        })
          .then(function (r) {
            return r.json().then(function (d) {
              return { ok: r.ok, data: d };
            });
          })
          .then(function ({ ok, data }) {
            if (ok && data && data.url) {
              window.location.href = data.url;
              return;
            }
            var msg = (data && data.error) ? String(data.error) : tr.resumeError;
            if (data && data.code === 'PROFILE_INCOMPLETE') {
              msg = tr.profileIncompleteCheckout || msg;
              if (tr.profileMissingFields && Array.isArray(data.missing) && data.missing.length) {
                var labels = tr.profileMissingFields;
                var parts = data.missing.map(function (k) {
                  return labels[k] || k;
                });
                msg = msg + ' ' + (tr.profileMissingHeading || '') + ' ' + parts.join(', ') + '.';
              }
            }
            setErr(msg);
          })
          .catch(function () {
            setErr(translations[currentLang].resumeError);
          })
          .finally(function () {
            btn.disabled = false;
          });
      });
    })();

    (function bindCancelOrderOnce() {
      const list = document.getElementById('orders-list');
      if (!list || list.dataset.cancelBound) return;
      list.dataset.cancelBound = '1';
      list.addEventListener('click', function (ev) {
        const btn = ev.target.closest('.cancel-order-btn');
        if (!btn) return;
        ev.stopPropagation();
        ev.preventDefault();
        const oid = btn.getAttribute('data-order-id');
        const authToken = localStorage.getItem('token');
        if (!oid || !authToken) return;
        const tr = translations[currentLang];
        if (!confirm(tr.cancelConfirm)) return;
        const resumeRow = btn.closest('.resume-row');
        const errEl = resumeRow && resumeRow.querySelector('.cancel-checkout-error');
        function setCancelErr(msg) {
          if (!errEl) return;
          if (msg) {
            errEl.textContent = msg;
            errEl.classList.remove('hidden');
            if (typeof window.scrollFeedbackIntoView === 'function') {
              window.scrollFeedbackIntoView(errEl);
            }
          } else {
            errEl.textContent = '';
            errEl.classList.add('hidden');
          }
        }
        setCancelErr('');
        const resumeErr = resumeRow && resumeRow.querySelector('.resume-checkout-error');
        if (resumeErr) {
          resumeErr.textContent = '';
          resumeErr.classList.add('hidden');
        }
        btn.disabled = true;
        fetch('/api/orders/' + encodeURIComponent(oid) + '/cancel', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + authToken }
        })
          .then(function (r) {
            return r.json().then(function (d) {
              return { ok: r.ok, data: d };
            });
          })
          .then(function ({ ok, data }) {
            if (ok && data && data.ok) {
              loadOrders();
              return;
            }
            var msg = (data && data.error) ? String(data.error) : tr.cancelError;
            setCancelErr(msg);
          })
          .catch(function () {
            setCancelErr(translations[currentLang].cancelError);
          })
          .finally(function () {
            btn.disabled = false;
          });
      });
    })();

    async function loadOrders() {
      const token = localStorage.getItem('token');
      showSection('orders-loading');
      document.getElementById('orders-loading').querySelector('p').textContent = translations[currentLang].loadingOrders;

      if (!token) {
        showSection('orders-login-required');
        applyPageLanguage();
        return;
      }

      try {
        const res = await fetch('/api/orders', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (res.status === 401) {
          showSection('orders-login-required');
          applyPageLanguage();
          return;
        }
        if (!res.ok) throw new Error('Failed to load orders');
        let orders = await res.json();
        applyPageLanguage();
        if (!orders || orders.length === 0) {
          lastOrdersSnapshot = [];
          showSection('orders-empty');
          return;
        }
        var pending = orders.filter(isPendingOrder);
        if (pending.length > 0) {
          var updated = false;
          await Promise.all(pending.map(function (o) {
            return fetch('/api/orders/confirm-by-session/' + encodeURIComponent(o.stripe_session_id), { method: 'POST' })
              .then(function (r) { return r.json(); })
              .then(function (data) { if (data && data.updated) updated = true; })
              .catch(function () {});
          }));
          if (updated) {
            var res2 = await fetch('/api/orders', { headers: { Authorization: 'Bearer ' + token } });
            if (res2.ok) orders = await res2.json();
          }
        }
        showSection('orders-list');
        lastOrdersSnapshot = orders;
        await renderOrders(orders);
      } catch (e) {
        showSection('orders-login-required');
        document.getElementById('login-required-message').textContent = 'Could not load orders. Please try again.';
        applyPageLanguage();
      }
    }

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
    document.getElementById('nav-logout').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.reload();
    });

    window.addEventListener('appcurrencychange', function() {
      if (lastOrdersSnapshot && lastOrdersSnapshot.length) void renderOrders(lastOrdersSnapshot);
    });

    applyPageLanguage();
    loadOrders();
    });
