runWhenLocaleReady(function () {
    const wrapLtr =
      typeof window.wrapLtrPrice === 'function'
        ? window.wrapLtrPrice
        : typeof window.ltrNumSpan === 'function'
          ? window.ltrNumSpan
          : function (s) { return s; };
    const translations = {
      en: {
        siteTitle: 'Eslami Electric',
        siteSubtitle: 'Building electrical appliances and lighting',
        loading: 'Loading products...',
        errorLoad: 'Failed to load products.',
        contactTitle: 'Contact Us',
        addressLabel: 'Address',
        addressValue: 'Eslami Electric, Azadi Avenue, Zahedan, Sistan and Baluchestan, Iran',
        mobileLabel: 'Mobile',
        landlineLabel: 'Landline',
        socialLabel: 'Social Media',
        hoursLabel: '🕐 Opening Hours',
        hoursWeekdays: 'Saturday – Thursday: 9:00 AM – 9:00 PM',
        hoursFriday: 'Friday: Closed',
        navProducts: 'Products',
        navBasket: 'Basket',
        navOrders: 'My Orders',
        navProfile: 'My Profile',
        navLogin: 'Login',
        navLogout: 'Logout',
        createAccount: 'Sign Up',
        wattage: 'W',
        searchPlaceholder: 'Search products...',
        addToBasket: 'Add',
        quantity: 'Qty',
        homeMoreHint: 'Showing 6 of {total} products. More are available in the full catalog.',
        viewAllProducts: 'View all products',
        viewAllProductsAria: 'View all products in the catalog',
        homeIntroTitle: 'Electrical shop in Zahedan',
        homeIntroText:
          'Eslami Electric is a local electrical store serving Zahedan and Sistan and Baluchestan with cables, lighting, sockets, and building supplies. Shop online for delivery or browse our catalog — trusted service for homes and businesses.',
        mapHeading: '📍 Find Us',
        mapLinkText: 'Open in Maps →',
        mapAddress: 'Azadi Avenue, Zahedan, Sistan and Baluchestan, Iran',
        mapHours: 'Sat–Thu: 9:00 AM – 9:00 PM'
      },
      fa: {
        siteTitle: 'الکتریکی‌ اسلامی',
        siteSubtitle: 'لوازم برق ساختمان و روشنایی',
        loading: 'در حال بارگذاری محصولات...',
        errorLoad: 'بارگذاری محصولات ناموفق بود.',
        contactTitle: 'تماس با ما',
        addressLabel: 'آدرس',
        addressValue: 'لوازم برق ساختمان و روشنایی اسلامی، بلوار آزادی، زاهدان، ایران',
        mobileLabel: 'موبایل',
        landlineLabel: 'تلفن ثابت',
        socialLabel: 'شبکه‌های اجتماعی',
        hoursLabel: '🕐 ساعت کاری',
        hoursWeekdays: 'شنبه تا پنج‌شنبه: ۹ صبح – ۹ شب',
        hoursFriday: 'جمعه: تعطیل',
        navProducts: 'محصولات',
        navBasket: 'سبد خرید',
        navOrders: 'سفارشات من',
        navProfile: 'پروفایل من',
        navLogin: 'ورود',
        navLogout: 'خروج',
        createAccount: 'ایجاد حساب کاربری',
        wattage: 'وات',
        searchPlaceholder: 'جستجوی محصولات...',
        addToBasket: 'افزودن',
        quantity: 'تعداد',
        homeMoreHint: '۶ مورد از {total} محصول اینجا نمایش داده می‌شود؛ بقیهٔ کالاها را در صفحهٔ محصولات ببینید.',
        viewAllProducts: 'مشاهدهٔ همهٔ محصولات',
        viewAllProductsAria: 'رفتن به صفحهٔ کامل محصولات',
        homeIntroTitle: 'فروشگاه لوازم برق در زاهدان',
        homeIntroText:
          'الکتریکی اسلامی فروشگاه و فروش آنلاین لوازم برق در زاهدان و سیستان و بلوچستان است؛ کابل، روشنایی، کلید و پریز و تجهیزات ساختمانی. خدمات مطمئن برای منازل و کسب‌وکارها.',
        mapHeading: '📍 موقعیت ما',
        mapLinkText: '← مشاهده در نقشه',
        mapAddress: 'بلوار آزادی، زاهدان، سیستان و بلوچستان، ایران',
        mapHours: 'شنبه تا پنج‌شنبه: ۹ صبح – ۹ شب'
      }
    };

    let currentLang = localStorage.getItem('lang') || 'en';
    let productsData = [];
    const HOME_PRODUCT_LIMIT = 6;

    const grid = document.getElementById('product-grid');
    const homeCatalogFooter = document.getElementById('home-catalog-footer');
    const homeMoreHint = document.getElementById('home-more-hint');
    const homeViewAll = document.getElementById('home-view-all');
    const loading = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const searchInput = document.getElementById('product-search');
    const searchDropdown = document.getElementById('search-dropdown');

    const BASKET_KEY = 'basket';

    function getBasket() {
      try {
        const raw = localStorage.getItem(BASKET_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function setBasket(items) {
      localStorage.setItem(BASKET_KEY, JSON.stringify(items));
      updateBasketCount();
    }

    function addToBasket(product, quantity) {
      const basket = getBasket();
      const existing = basket.find(item => item.id === product.id);
      if (existing) existing.quantity += quantity;
      else basket.push({ id: product.id, categoryId: product.categoryId, name: product.name, name_fa: product.name_fa, image_url: product.image_url, price: product.price, quantity });
      setBasket(basket);
    }

    function updateBasketCount() {
      const basket = getBasket();
      const total = basket.reduce((sum, item) => sum + item.quantity, 0);
      ['basket-count', 'basket-count-mobile'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (total > 0) {
          el.textContent = total > 99 ? '99+' : total;
          el.classList.remove('hidden');
        } else el.classList.add('hidden');
      });
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }

    function applyLanguage() {
      const t = translations[currentLang];
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      const homeIntroTitle = document.getElementById('home-intro-title');
      const homeIntroText = document.getElementById('home-intro-text');
      if (homeIntroTitle && t.homeIntroTitle) homeIntroTitle.textContent = t.homeIntroTitle;
      if (homeIntroText && t.homeIntroText) homeIntroText.textContent = t.homeIntroText;
      loading.textContent = t.loading;
      document.getElementById('contact-title').textContent = t.contactTitle;
      document.getElementById('address-label').textContent = t.addressLabel;
      document.getElementById('address-value').textContent = t.addressValue;
      document.getElementById('mobile-label').textContent = t.mobileLabel;
      document.getElementById('landline-label').textContent = t.landlineLabel;
      document.getElementById('social-label').textContent = t.socialLabel;
      const hoursLabelEl = document.getElementById('hours-label');
      const hoursWeekdaysEl = document.getElementById('hours-weekdays');
      const hoursFridayEl = document.getElementById('hours-friday');
      if (hoursLabelEl) hoursLabelEl.textContent = t.hoursLabel;
      if (hoursWeekdaysEl) hoursWeekdaysEl.textContent = t.hoursWeekdays;
      if (hoursFridayEl) hoursFridayEl.textContent = t.hoursFriday;
      document.getElementById('nav-products').textContent = t.navProducts;
      document.getElementById('nav-basket-label').textContent = t.navBasket;
      const navBasketMobile = document.getElementById('nav-basket-mobile');
      const navBasketMobileLabel = document.getElementById('nav-basket-mobile-label');
      if (navBasketMobileLabel) navBasketMobileLabel.textContent = t.navBasket;
      updateBasketCount();
      document.getElementById('nav-orders').textContent = t.navOrders;
      const navProfileEl = document.getElementById('nav-profile');
      if (navProfileEl) navProfileEl.textContent = t.navProfile;
      document.getElementById('nav-login').textContent = t.navLogin;
      document.getElementById('nav-logout').textContent = t.navLogout;
      document.getElementById('go-account').textContent = t.createAccount;
      searchInput.placeholder = t.searchPlaceholder;

      const token = localStorage.getItem('token');
      document.getElementById('nav-login').classList.toggle('hidden', !!token);
      document.getElementById('nav-logout').classList.toggle('hidden', !token);
      document.getElementById('go-account').classList.toggle('hidden', !!token);
      const navOrders = document.getElementById('nav-orders');
      if (navOrders) navOrders.classList.toggle('hidden', !token);
      if (navProfileEl) navProfileEl.classList.toggle('hidden', !token);

      document.getElementById('lang-en').className = currentLang === 'en'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';
      document.getElementById('lang-fa').className = currentLang === 'fa'
        ? 'px-3 py-1.5 rounded text-sm font-medium bg-amber-500 text-slate-900'
        : 'px-3 py-1.5 rounded text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors';

      const mapHeadingEl = document.getElementById('map-heading');
      const mapLinkLabelEl = document.getElementById('map-link-label');
      const mapAddressEl = document.getElementById('map-address');
      const mapHoursEl = document.getElementById('map-hours');
      if (mapHeadingEl && t.mapHeading) mapHeadingEl.textContent = t.mapHeading;
      if (mapLinkLabelEl && t.mapLinkText) mapLinkLabelEl.textContent = t.mapLinkText;
      if (mapAddressEl && t.mapAddress) mapAddressEl.textContent = t.mapAddress;
      if (mapHoursEl && t.mapHours) mapHoursEl.textContent = t.mapHours;

      if (typeof applyFooterI18n === 'function') applyFooterI18n();
      renderProducts();
    }

    function renderProducts() {
      grid.innerHTML = '';
      const t = translations[currentLang];
      const total = productsData.length;
      const gridProducts = total > HOME_PRODUCT_LIMIT ? productsData.slice(0, HOME_PRODUCT_LIMIT) : productsData;

      if (homeCatalogFooter && homeMoreHint && homeViewAll) {
        if (total > HOME_PRODUCT_LIMIT) {
          homeCatalogFooter.classList.remove('hidden');
          homeMoreHint.textContent = (t.homeMoreHint || '').replace('{total}', String(total));
          homeViewAll.textContent = t.viewAllProducts || 'View all products';
          homeViewAll.setAttribute('aria-label', t.viewAllProductsAria || t.viewAllProducts || 'View all products');
        } else {
          homeCatalogFooter.classList.add('hidden');
        }
      }

      gridProducts.forEach((p, idx) => {
        const name = currentLang === 'fa' && p.name_fa ? p.name_fa : p.name;
        const category = currentLang === 'fa' && p.category_fa ? p.category_fa : p.category;
        const wattageHtml = p.wattage != null
          ? `<p class="text-slate-500 text-sm mt-1">${escapeHtml(String(p.wattage))} ${escapeHtml(t.wattage)}</p>`
          : '';
        const pid = escapeHtml(p.id || '');
        const imgLoading = idx === 0 ? 'eager' : 'lazy';
        const fetchPriority = idx === 0 ? ' fetchpriority="high"' : '';
        grid.insertAdjacentHTML('beforeend', `
          <article class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow" data-product-id="${pid}">
            <div class="product-card-media aspect-[4/3] bg-slate-200 overflow-hidden">
              <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(name)}" class="product-card-img h-full w-full object-cover" width="400" height="300" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" decoding="async" loading="${imgLoading}"${fetchPriority}>
            </div>
            <div class="p-4">
              <span class="text-xs font-semibold text-amber-800 uppercase tracking-wider">${escapeHtml(category)}</span>
              <h2 class="text-lg font-semibold text-slate-800 mt-1">${escapeHtml(name)}</h2>
              ${wattageHtml}
              <p class="text-xl font-bold text-slate-900 mt-2">${wrapLtr(formatPriceUSD(Number(p.price)))}</p>
              <div class="mt-3 flex items-center gap-2 flex-wrap">
                <div class="flex items-center border border-slate-300 rounded overflow-hidden">
                  <button type="button" class="btn-qty-minus min-w-[44px] min-h-[44px] w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium touch-manipulation" aria-label="Decrease quantity">−</button>
                  <input type="number" class="qty-input w-14 sm:w-16 text-center text-sm font-medium border-x border-slate-300 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" min="1" max="9999" value="1" aria-label="Quantity">
                  <button type="button" class="btn-qty-plus min-w-[44px] min-h-[44px] w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium touch-manipulation" aria-label="Increase quantity">+</button>
                </div>
                <button type="button" class="btn-add-to-basket min-h-[44px] px-4 py-2 rounded bg-amber-500 text-slate-900 font-medium text-sm hover:bg-amber-400 active:bg-amber-600 transition-colors touch-manipulation">${t.addToBasket}</button>
              </div>
            </div>
          </article>
        `);
      });
    }

    function clampQty(val) {
      const n = parseInt(val, 10);
      if (!Number.isFinite(n) || n < 1) return 1;
      return Math.min(n, 9999);
    }

    grid.addEventListener('click', (e) => {
      const article = e.target.closest('article[data-product-id]');
      if (!article) return;
      const productId = article.getAttribute('data-product-id');
      const product = productsData.find(p => (p.id || '') === productId);
      if (!product) return;

      const qtyInput = article.querySelector('.qty-input');
      let qty = clampQty(qtyInput.value);

      if (e.target.closest('.btn-qty-minus')) {
        e.preventDefault();
        if (qty > 1) { qty--; qtyInput.value = qty; }
      } else if (e.target.closest('.btn-qty-plus')) {
        e.preventDefault();
        qty++; qtyInput.value = Math.min(qty, 9999);
      } else if (e.target.closest('.btn-add-to-basket')) {
        e.preventDefault();
        qty = clampQty(qtyInput.value);
        addToBasket(product, qty);
        qtyInput.value = '1';
      }
    });

    grid.addEventListener('change', (e) => {
      const input = e.target.closest('.qty-input');
      if (input) input.value = clampQty(input.value);
    });

    function getProductDisplayName(p) {
      return (currentLang === 'fa' && p.name_fa) ? p.name_fa : p.name;
    }

    function getProductCategory(p) {
      return (currentLang === 'fa' && p.category_fa) ? p.category_fa : p.category;
    }

    function showSearchSuggestions(query) {
      const q = (query || '').trim().toLowerCase();
      searchDropdown.innerHTML = '';
      searchDropdown.classList.add('hidden');
      searchDropdown.setAttribute('aria-hidden', 'true');
      if (q.length < 1) return;

      const matches = productsData.filter(p => {
        const name = getProductDisplayName(p).toLowerCase();
        const category = getProductCategory(p).toLowerCase();
        const nameEn = (p.name || '').toLowerCase();
        const nameFa = (p.name_fa || '').toLowerCase();
        return name.includes(q) || category.includes(q) || nameEn.includes(q) || nameFa.includes(q);
      }).slice(0, 8);

      if (matches.length === 0) {
        searchDropdown.innerHTML = '<p class="px-3 py-2 text-slate-400 text-sm">No products found</p>';
      } else {
        matches.forEach(p => {
          const name = getProductDisplayName(p);
          const category = getProductCategory(p);
          const item = document.createElement('a');
          const params = new URLSearchParams();
          if (p.categoryId) params.set('category', p.categoryId);
          if (p.id) params.set('product', p.id);
          item.href = 'products.html' + (params.toString() ? '?' + params.toString() : '');
          item.className = 'block px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0';
          item.setAttribute('role', 'option');
          item.innerHTML = '<span class="font-medium">' + escapeHtml(name) + '</span><span class="text-slate-400 text-xs block mt-0.5">' + escapeHtml(category) + '</span>';
          searchDropdown.appendChild(item);
        });
      }
      searchDropdown.classList.remove('hidden');
      searchDropdown.setAttribute('aria-hidden', 'false');
    }

    function hideSearchSuggestions() {
      searchDropdown.classList.add('hidden');
      searchDropdown.innerHTML = '';
      searchDropdown.setAttribute('aria-hidden', 'true');
    }

    searchInput.addEventListener('input', () => showSearchSuggestions(searchInput.value));
    searchInput.addEventListener('focus', () => showSearchSuggestions(searchInput.value));
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchInput.blur();
        hideSearchSuggestions();
      }
    });
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) hideSearchSuggestions();
    });

    async function loadProducts() {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Request failed');
        productsData = await res.json();
        loading.classList.add('hidden');
        grid.classList.remove('pt-10');
        applyLanguage();
      } catch (err) {
        loading.classList.add('hidden');
        grid.classList.remove('pt-10');
        errorEl.textContent = translations[currentLang].errorLoad;
        errorEl.classList.remove('hidden');
      }
    }

    document.getElementById('lang-en').addEventListener('click', () => {
      currentLang = 'en';
      localStorage.setItem('lang', 'en');
      localStorage.setItem('localePref', 'user');
      applyLanguage();
    });

    document.getElementById('lang-fa').addEventListener('click', () => {
      currentLang = 'fa';
      localStorage.setItem('lang', 'fa');
      localStorage.setItem('localePref', 'user');
      applyLanguage();
    });

    window.addEventListener('appcurrencychange', () => {
      if (productsData && productsData.length) renderProducts();
    });

    document.getElementById('nav-logout').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.reload();
    });

    // Sync nav/login/logout immediately from localStorage token,
    // even before /api/products finishes loading.
    applyLanguage();
    loadProducts();

    // Back-to-top button for long/mobile pages
    (function () {
      var btn = document.getElementById('back-to-top');
      if (!btn) return;
      function updateVisibility() {
        if (window.scrollY > 300) {
          btn.classList.remove('hidden');
          btn.classList.add('flex');
        } else {
          btn.classList.add('hidden');
          btn.classList.remove('flex');
        }
      }
      window.addEventListener('scroll', updateVisibility, { passive: true });
      btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      updateVisibility();
    })();
    });
