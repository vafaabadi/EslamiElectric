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
        siteSubtitle: 'Quality electrical supplies',
        pageTitle: 'Products',
        loading: 'Loading categories...',
        errorLoad: 'Failed to load categories.',
        noProducts: 'No products in this category.',
        noCategories: 'No categories available. Start the server with: node server.js',
        navHome: 'Home',
        navProducts: 'Products',
        navBasket: 'Basket',
        navOrders: 'My Orders',
        navProfile: 'My Profile',
        navLogin: 'Login',
        navLogout: 'Logout',
        createAccount: 'Sign Up',
        wattage: 'W',
        addToBasket: 'Add',
        quantity: 'Qty',
        sortLabel: 'Sort by',
        sortDefault: 'Default',
        sortPriceAsc: 'Price: low to high',
        sortPriceDesc: 'Price: high to low',
        sortNameAsc: 'Name: A–Z'
      },
      fa: {
        siteTitle: 'الکتریکی اسلامی',
        siteSubtitle: 'تجهیزات برقی با کیفیت',
        pageTitle: 'محصولات',
        loading: 'در حال بارگذاری دسته‌بندی‌ها...',
        errorLoad: 'بارگذاری دسته‌بندی‌ها ناموفق بود.',
        noProducts: 'محصولی در این دسته‌بندی وجود ندارد.',
        noCategories: 'دسته‌بندی موجود نیست. سرور را با node server.js اجرا کنید.',
        navHome: 'خانه',
        navProducts: 'محصولات',
        navBasket: 'سبد خرید',
        navOrders: 'سفارشات من',
        navProfile: 'پروفایل من',
        navLogin: 'ورود',
        navLogout: 'خروج',
        createAccount: 'ایجاد حساب کاربری',
        wattage: 'وات',
        addToBasket: 'افزودن',
        quantity: 'تعداد',
        sortLabel: 'مرتب‌سازی',
        sortDefault: 'پیش‌فرض',
        sortPriceAsc: 'قیمت: کم به زیاد',
        sortPriceDesc: 'قیمت: زیاد به کم',
        sortNameAsc: 'نام: الفبایی'
      }
    };

    const SORT_MODES = ['default', 'price_asc', 'price_desc', 'name_asc'];
    const storedSort = localStorage.getItem('productsSort');
    let sortMode = SORT_MODES.includes(storedSort) ? storedSort : 'default';

    let currentLang = localStorage.getItem('lang') || 'en';
    let categoriesData = [];
    let selectedCategoryId = null;

    const categoryTabs = document.getElementById('category-tabs');
    const productsGrid = document.getElementById('products-grid');
    const loading = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const noCategoriesEl = document.getElementById('no-categories');
    const noProducts = document.getElementById('no-products');

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

    function addToBasket(product, categoryId, quantity) {
      const basket = getBasket();
      const existing = basket.find(item => item.id === product.id);
      if (existing) existing.quantity += quantity;
      else basket.push({ id: product.id, categoryId: categoryId || null, name: product.name, name_fa: product.name_fa, image_url: product.image_url, price: product.price, quantity });
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

    function getCategoryName(cat) {
      return currentLang === 'fa' && cat.name_fa ? cat.name_fa : cat.name;
    }

    function getProductDisplayName(p) {
      return currentLang === 'fa' && p.name_fa ? p.name_fa : (p.name || '');
    }

    function sortProductsList(products, mode, lang) {
      const arr = products.slice();
      if (mode === 'price_asc') {
        arr.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      } else if (mode === 'price_desc') {
        arr.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      } else if (mode === 'name_asc') {
        const loc = lang === 'fa' ? 'fa' : 'en';
        arr.sort((a, b) => {
          const na = lang === 'fa' && a.name_fa ? a.name_fa : (a.name || '');
          const nb = lang === 'fa' && b.name_fa ? b.name_fa : (b.name || '');
          return na.localeCompare(nb, loc, { sensitivity: 'base' });
        });
      }
      return arr;
    }

    function updateSortSelectLabels() {
      const t = translations[currentLang];
      const label = document.getElementById('label-product-sort');
      const sel = document.getElementById('product-sort');
      if (label) label.textContent = t.sortLabel || 'Sort by';
      if (!sel) return;
      const map = {
        default: t.sortDefault,
        price_asc: t.sortPriceAsc,
        price_desc: t.sortPriceDesc,
        name_asc: t.sortNameAsc
      };
      Array.from(sel.options).forEach(function (opt) {
        if (map[opt.value] != null) opt.textContent = map[opt.value];
      });
      if (SORT_MODES.includes(sortMode)) sel.value = sortMode;
    }

    function initSortSelect() {
      const sel = document.getElementById('product-sort');
      if (!sel || sel.dataset.ready === '1') return;
      sel.dataset.ready = '1';
      SORT_MODES.forEach(function (val) {
        const opt = document.createElement('option');
        opt.value = val;
        sel.appendChild(opt);
      });
      sel.value = SORT_MODES.includes(sortMode) ? sortMode : 'default';
      updateSortSelectLabels();
      sel.addEventListener('change', function () {
        sortMode = sel.value;
        localStorage.setItem('productsSort', sortMode);
        if (selectedCategoryId) renderProducts(selectedCategoryId);
      });
    }

    function applyPageLanguage() {
      const t = translations[currentLang];
      document.documentElement.lang = currentLang === 'fa' ? 'fa' : 'en';
      document.body.dir = currentLang === 'fa' ? 'rtl' : 'ltr';

      document.getElementById('site-title').textContent = t.siteTitle;
      document.getElementById('site-subtitle').textContent = t.siteSubtitle;
      document.getElementById('page-title').textContent = t.pageTitle;
      loading.textContent = t.loading;
      document.getElementById('nav-home').textContent = t.navHome;
      document.getElementById('nav-products').textContent = t.navProducts;
      document.getElementById('nav-basket-label').textContent = t.navBasket;
      const navBasketMobileLabel = document.getElementById('nav-basket-mobile-label');
      if (navBasketMobileLabel) navBasketMobileLabel.textContent = t.navBasket;
      updateBasketCount();
      document.getElementById('nav-orders').textContent = t.navOrders;
      const navProfileEl = document.getElementById('nav-profile');
      if (navProfileEl) navProfileEl.textContent = t.navProfile;
      document.getElementById('nav-login').textContent = t.navLogin;
      document.getElementById('nav-logout').textContent = t.navLogout;
      document.getElementById('go-account').textContent = t.createAccount;

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

      if (typeof applyFooterI18n === 'function') applyFooterI18n();
      initSortSelect();
      updateSortSelectLabels();
      renderCategoryTabs();
      if (selectedCategoryId) {
        renderProducts(selectedCategoryId);
      }
    }

    function renderCategoryTabs() {
      categoryTabs.innerHTML = '';
      categoriesData.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors ' +
          (cat.id === selectedCategoryId
            ? 'bg-amber-500 text-slate-900'
            : 'bg-white text-slate-700 hover:bg-slate-200 shadow');
        btn.textContent = getCategoryName(cat);
        btn.dataset.categoryId = cat.id;
        btn.addEventListener('click', () => selectCategory(cat.id));
        categoryTabs.appendChild(btn);
      });
    }

    function selectCategory(categoryId) {
      selectedCategoryId = categoryId;
      renderCategoryTabs();
      renderProducts(categoryId);
    }

    function renderProducts(categoryId) {
      const cat = categoriesData.find(c => c.id === categoryId);
      if (!cat) return;

      const t = translations[currentLang];
      const sortBar = document.getElementById('sort-bar');
      const sortSel = document.getElementById('product-sort');
      productsGrid.innerHTML = '';
      productsGrid.classList.remove('hidden');
      noProducts.classList.add('hidden');

      if (!cat.products || cat.products.length === 0) {
        if (sortBar) sortBar.classList.add('hidden');
        noProducts.textContent = t.noProducts;
        noProducts.classList.remove('hidden');
        return;
      }

      if (sortBar) sortBar.classList.remove('hidden');
      if (sortSel && SORT_MODES.includes(sortMode)) sortSel.value = sortMode;

      const catId = cat.id || '';
      const productsToShow = sortProductsList(cat.products, sortMode, currentLang);
      productsToShow.forEach((p, idx) => {
        const name = getProductDisplayName(p);
        const wattageHtml = p.wattage != null
          ? `<p class="text-slate-500 text-sm mt-1">${escapeHtml(String(p.wattage))} ${escapeHtml(t.wattage)}</p>`
          : '';
        const productId = p.id ? escapeHtml(p.id) : '';
        const catIdEscaped = escapeHtml(catId);
        const imgLoading = idx === 0 ? 'eager' : 'lazy';
        const fetchPriority = idx === 0 ? ' fetchpriority="high"' : '';
        productsGrid.insertAdjacentHTML('beforeend', `
          <article class="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow" data-product-id="${productId}" data-category-id="${catIdEscaped}">
            <div class="product-card-media aspect-[4/3] bg-slate-200 overflow-hidden">
              <img src="${escapeHtml(p.image_url)}" alt="${escapeHtml(name)}" class="product-card-img h-full w-full object-cover" width="400" height="300" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" decoding="async" loading="${imgLoading}"${fetchPriority}>
            </div>
            <div class="p-4">
              <h3 class="text-lg font-semibold text-slate-800 mt-1">${escapeHtml(name)}</h3>
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

    productsGrid.addEventListener('click', (e) => {
      const article = e.target.closest('article[data-product-id]');
      if (!article) return;
      const productId = article.getAttribute('data-product-id');
      const categoryId = article.getAttribute('data-category-id') || null;
      const cat = categoriesData.find(c => c.id === categoryId);
      const product = cat && cat.products ? cat.products.find(p => (p.id || '') === productId) : null;
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
        addToBasket(product, categoryId, qty);
        qtyInput.value = '1';
      }
    });

    productsGrid.addEventListener('change', (e) => {
      const input = e.target.closest('.qty-input');
      if (input) input.value = clampQty(input.value);
    });

    function scrollToProduct(productId) {
      const el = document.querySelector('[data-product-id="' + productId.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) + '"]');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-amber-400', 'ring-offset-2');
        setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400', 'ring-offset-2'), 2500);
      }
    }

    function getUrlParams() {
      const params = new URLSearchParams(window.location.search);
      return { category: params.get('category'), product: params.get('product') };
    }

    async function loadCategories() {
      try {
        var data = window.__categoriesPreload;
        if (!data) {
          var res = await fetch('/api/categories');
          if (!res.ok) throw new Error('Request failed: ' + res.status);
          data = await res.json();
        }
        loading.classList.add('hidden');
        errorEl.classList.add('hidden');
        noCategoriesEl.classList.add('hidden');

        categoriesData = Array.isArray(data) ? data : (data && data.categories) ? data.categories : [];

        if (categoriesData.length === 0) {
          noCategoriesEl.textContent = translations[currentLang].noCategories;
          noCategoriesEl.classList.remove('hidden');
          return;
        }

        const { category: urlCategory, product: urlProduct } = getUrlParams();
        const categoryExists = urlCategory && categoriesData.some(c => c.id === urlCategory);
        selectedCategoryId = categoryExists ? urlCategory : categoriesData[0].id;

        applyPageLanguage();
        if (urlProduct) requestAnimationFrame(() => scrollToProduct(urlProduct));
      } catch (err) {
        loading.classList.add('hidden');
        noCategoriesEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        errorEl.textContent = translations[currentLang].errorLoad + ' Run: node server.js';
        if (typeof console !== 'undefined' && console.error) console.error('Products load error', err);
      }
    }

    loadCategories();

    var langEn = document.getElementById('lang-en');
    if (langEn) langEn.addEventListener('click', function() { currentLang = 'en'; localStorage.setItem('lang', 'en'); localStorage.setItem('localePref', 'user'); applyPageLanguage(); });
    var langFa = document.getElementById('lang-fa');
    if (langFa) langFa.addEventListener('click', function() { currentLang = 'fa'; localStorage.setItem('lang', 'fa'); localStorage.setItem('localePref', 'user'); applyPageLanguage(); });
    var navLogoutEl = document.getElementById('nav-logout');
    if (navLogoutEl) navLogoutEl.addEventListener('click', function() { localStorage.removeItem('token'); window.location.reload(); });

    window.addEventListener('appcurrencychange', function() {
      if (selectedCategoryId) renderProducts(selectedCategoryId);
    });
    });
