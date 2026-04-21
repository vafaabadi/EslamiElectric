'use strict';

/**
 * Server-side SEO: titles, descriptions, canonical, hreflang, OG/Twitter, JSON-LD.
 * Locale routes use `locale` en|fa; direct .html serves default en.
 */

function escapeHtmlAttr(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/** Normalize PATH_TO_HTML segment to SEO key (home = ''). */
function normalizeRouteKey(seg) {
  if (seg == null || seg === '') return '';
  const s = String(seg).replace(/\.html$/i, '');
  if (s === 'index') return '';
  return s;
}

/** Routes that should not be indexed (account/checkout/auth flows). */
const NOINDEX_ROUTES = new Set([
  'basket',
  'orders',
  'profile',
  'order',
  'checkout-success',
  'auth-callback',
  'reset-password',
  'update-password',
  'claim-account',
  'login',
  'account',
  'forgot-password'
]);

/** Per-route EN/FA title + meta description (unique where it matters for SEO). */
const SEO_ROUTES = {
  '': {
    en: {
      title: 'Eslami Electric | Electrical Shop in Zahedan — Cables, Lighting & Supplies',
      description:
        'Electrical shop and online store in Zahedan, Sistan and Baluchestan: cables, lighting, sockets, switches, and building supplies. Eslami Electric serves homes and businesses with local support and secure ordering.'
    },
    fa: {
      title: 'الکتریکی اسلامی | فروشگاه لوازم برق و روشنایی در زاهدان',
      description:
        'فروشگاه لوازم برق و روشنایی در زاهدان، سیستان و بلوچستان: کابل، چراغ، کلید و پریز و تجهیزات ساختمانی. الکتریکی اسلامی — خدمات محلی و سفارش آنلاین.'
    }
  },
  products: {
    en: {
      title: 'Electrical Products & Shop Online | Zahedan — Eslami Electric',
      description:
        'Browse our Zahedan electrical store catalog: cables, lamps, bulbs, extension cords, and building supplies. Fair prices and delivery options across Sistan and Baluchestan.'
    },
    fa: {
      title: 'محصولات برق و روشنایی | فروش آنلاین — الکتریکی اسلامی زاهدان',
      description:
        'کاتالوگ لوازم برق در زاهدان: کابل، لامپ، چراغ، سیم و لوازم ساختمانی. الکتریکی اسلامی — قیمت مناسب و ارسال در استان.'
    }
  },
  basket: {
    en: { title: 'Basket | Eslami Electric', description: 'Your shopping basket at Eslami Electric.' },
    fa: { title: 'سبد خرید | الکتریکی اسلامی', description: 'سبد خرید شما در الکتریکی اسلامی.' }
  },
  login: {
    en: {
      title: 'Log In | Eslami Electric',
      description: 'Sign in to your Eslami Electric account to track orders and checkout faster.'
    },
    fa: {
      title: 'ورود | الکتریکی اسلامی',
      description: 'ورود به حساب الکتریکی اسلامی برای پیگیری سفارش و پرداخت سریع‌تر.'
    }
  },
  account: {
    en: {
      title: 'Create Account | Eslami Electric',
      description: 'Create an Eslami Electric account to shop electrical supplies and manage your profile in Zahedan.'
    },
    fa: {
      title: 'ایجاد حساب | الکتریکی اسلامی',
      description: 'ثبت‌نام در الکتریکی اسلامی برای خرید لوازم برق و مدیریت پروفایل در زاهدان.'
    }
  },
  orders: {
    en: { title: 'My Orders | Eslami Electric', description: 'View your order history at Eslami Electric.' },
    fa: { title: 'سفارشات من | الکتریکی اسلامی', description: 'تاریخچه سفارش‌های شما در الکتریکی اسلامی.' }
  },
  order: {
    en: {
      title: 'Track Order | Eslami Electric',
      description: 'Track your order status with Eslami Electric using your email and order ID.'
    },
    fa: {
      title: 'پیگیری سفارش | الکتریکی اسلامی',
      description: 'پیگیری وضعیت سفارش با ایمیل و شماره سفارش در الکتریکی اسلامی.'
    }
  },
  'checkout-success': {
    en: { title: 'Payment Successful | Eslami Electric', description: 'Thank you — your payment was received.' },
    fa: { title: 'پرداخت موفق | الکتریکی اسلامی', description: 'با تشکر — پرداخت شما ثبت شد.' }
  },
  'forgot-password': {
    en: {
      title: 'Forgot Password | Eslami Electric',
      description: 'Reset your Eslami Electric account password. We will email you a secure link.'
    },
    fa: {
      title: 'فراموشی رمز | الکتریکی اسلامی',
      description: 'بازیابی رمز حساب الکتریکی اسلامی — لینک امن به ایمیل شما ارسال می‌شود.'
    }
  },
  'reset-password': {
    en: { title: 'Reset Password | Eslami Electric', description: 'Choose a new password for your account.' },
    fa: { title: 'تنظیم رمز جدید | الکتریکی اسلامی', description: 'انتخاب رمز جدید برای حساب کاربری.' }
  },
  'update-password': {
    en: { title: 'Update Password | Eslami Electric', description: 'Update your account password.' },
    fa: { title: 'به‌روزرسانی رمز | الکتریکی اسلامی', description: 'به‌روزرسانی رمز عبور حساب.' }
  },
  'auth-callback': {
    en: { title: 'Confirming… | Eslami Electric', description: 'Confirming your sign-in.' },
    fa: { title: 'در حال تأیید… | الکتریکی اسلامی', description: 'در حال تأیید ورود شما.' }
  },
  'claim-account': {
    en: { title: 'Claim Account | Eslami Electric', description: 'Link your account to complete registration.' },
    fa: { title: 'تکمیل حساب | الکتریکی اسلامی', description: 'اتصال حساب برای تکمیل ثبت‌نام.' }
  },
  profile: {
    en: { title: 'My Profile | Eslami Electric', description: 'Manage your Eslami Electric profile and contact details.' },
    fa: { title: 'پروفایل من | الکتریکی اسلامی', description: 'مدیریت پروفایل و اطلاعات تماس در الکتریکی اسلامی.' }
  }
};

function getSeoCopy(routeKey, locale) {
  const key = routeKey === '' ? '' : routeKey;
  const row = SEO_ROUTES[key];
  const loc = locale === 'fa' ? 'fa' : 'en';
  if (row && row[loc]) return row[loc];
  if (row && row.en) return row.en;
  return {
    title: 'Eslami Electric',
    description:
      loc === 'fa'
        ? 'فروشگاه لوازم برق و روشنایی در زاهدان — الکتریکی اسلامی'
        : 'Electrical shop in Zahedan, Iran — Eslami Electric: cables, lighting, and supplies.'
  };
}

function buildCanonicalPath(locale, routeKey) {
  const k = normalizeRouteKey(routeKey);
  if (k === '') return '/' + locale + '/';
  return '/' + locale + '/' + k;
}

function absoluteUrl(baseUrl, pathname) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const path = pathname.startsWith('/') ? pathname : '/' + pathname;
  return base + path;
}

/** Normalize categories payload from categories.json (or API shape). */
function normalizeCategoriesData(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const arr = raw.categories;
  return Array.isArray(arr) ? arr : [];
}

/** Build /{locale}/products?category=&product= URL (no trailing slash on path). */
function productDeepLink(baseUrl, locale, categoryId, productId) {
  const base = absoluteUrl(baseUrl, buildCanonicalPath(locale, 'products'));
  const q = new URLSearchParams();
  q.set('category', String(categoryId));
  q.set('product', String(productId));
  return base + '?' + q.toString();
}

function buildBreadcrumbJsonLd(baseUrl, locale, canonicalUrl) {
  const homeName = locale === 'fa' ? 'خانه' : 'Home';
  const productsName = locale === 'fa' ? 'محصولات' : 'Products';
  const homeUrl = absoluteUrl(baseUrl, buildCanonicalPath(locale, ''));
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: homeName,
        item: homeUrl
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: productsName,
        item: canonicalUrl
      }
    ]
  };
}

const MAX_PRODUCTS_IN_JSONLD = 120;

function buildItemListJsonLd(baseUrl, locale, categories) {
  const loc = locale === 'fa' ? 'fa' : 'en';
  const items = [];
  let position = 1;
  outer: for (const cat of categories) {
    const catId = cat && cat.id != null ? String(cat.id) : '';
    const prods = Array.isArray(cat && cat.products) ? cat.products : [];
    for (const p of prods) {
      if (!p || p.id == null) continue;
      if (items.length >= MAX_PRODUCTS_IN_JSONLD) break outer;
      const name = loc === 'fa' && p.name_fa ? String(p.name_fa) : String(p.name || p.id);
      const desc =
        loc === 'fa' && p.description_fa
          ? String(p.description_fa)
          : String(p.description || '').trim() || name;
      const imgPath = p.image_url ? String(p.image_url) : '/icons/icon-512.png';
      const imgAbs = absoluteUrl(baseUrl, imgPath.startsWith('/') ? imgPath : '/' + imgPath);
      const offerUrl = productDeepLink(baseUrl, locale, catId, p.id);
      const price = p.price != null ? Number(p.price) : null;
      const productObj = {
        '@type': 'Product',
        name,
        description: desc,
        image: imgAbs,
        sku: String(p.id),
        brand: { '@type': 'Brand', name: 'Eslami Electric' },
        offers: {
          '@type': 'Offer',
          url: offerUrl,
          priceCurrency: 'USD',
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'Eslami Electric' }
        }
      };
      if (price != null && !Number.isNaN(price)) {
        productObj.offers.price = String(price);
      }
      items.push({
        '@type': 'ListItem',
        position: position++,
        url: offerUrl,
        item: productObj
      });
    }
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: loc === 'fa' ? 'محصولات الکتریکی اسلامی' : 'Eslami Electric product catalog',
    numberOfItems: items.length,
    itemListElement: items
  };
}

function stripPreviousSeo(html) {
  return html.replace(/<!--SERVER_SEO:start-->[\s\S]*?<!--SERVER_SEO:end-->\s*/g, '');
}

function stripMetaDescription(html) {
  return html
    .replace(/<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>\s*/gi, '')
    .replace(/<meta\s+content=["'][^"']*["']\s+name=["']description["']\s*\/?>\s*/gi, '');
}

/**
 * Inject / refresh full SEO block, title, html[lang/dir], and JSON-LD.
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} opts.locale
 * @param {string} opts.routeKey
 * @param {object} [opts.categories] — optional categories.json root (adds Product ItemList on products page)
 * @param {string} [opts.requestPathAndQuery] — e.g. req.url; when products page has ?category=&product=, sets canonical to that full URL
 */
function injectSeoBundle(html, { baseUrl, locale, routeKey, categories: categoriesRaw, requestPathAndQuery }) {
  if (!html || typeof html !== 'string') return html;
  const loc = locale === 'fa' ? 'fa' : 'en';
  const rk = normalizeRouteKey(routeKey);
  const copy = getSeoCopy(rk, loc);
  const canonicalPath = buildCanonicalPath(loc, rk);
  let canonicalUrl = absoluteUrl(baseUrl, canonicalPath);
  /** When both category+product are present, hreflang must use the same deep links or Google may ignore your canonical. */
  let productDetailIds = null;
  if (rk === 'products' && requestPathAndQuery && typeof requestPathAndQuery === 'string') {
    try {
      const q = requestPathAndQuery.indexOf('?');
      const search = q >= 0 ? requestPathAndQuery.slice(q) : '';
      if (search) {
        const sp = new URLSearchParams(search.slice(1));
        const cId = sp.get('category');
        const pId = sp.get('product');
        if (cId && pId) {
          canonicalUrl = productDeepLink(baseUrl, loc, cId, pId);
          productDetailIds = { cId, pId };
        }
      }
    } catch (_) {
      /* keep default canonical */
    }
  }
  const categories = normalizeCategoriesData(categoriesRaw);

  const pathEn = buildCanonicalPath('en', rk);
  const pathFa = buildCanonicalPath('fa', rk);
  let urlEn = absoluteUrl(baseUrl, pathEn);
  let urlFa = absoluteUrl(baseUrl, pathFa);
  let xDefault = urlEn;
  if (productDetailIds) {
    urlEn = productDeepLink(baseUrl, 'en', productDetailIds.cId, productDetailIds.pId);
    urlFa = productDeepLink(baseUrl, 'fa', productDetailIds.cId, productDetailIds.pId);
    xDefault = urlEn;
  }

  const noindex = NOINDEX_ROUTES.has(rk);
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  const ogLocale = loc === 'fa' ? 'fa_IR' : 'en_US';
  const ogLocaleAlt = loc === 'fa' ? 'en_US' : 'fa_IR';

  const ogImage = absoluteUrl(baseUrl, '/icons/icon-512.png');

  const titleEsc = escapeHtmlAttr(copy.title);
  const descEsc = escapeHtmlAttr(copy.description);

  /** One stable @id for LocalBusiness (referenced by WebSite.publisher). */
  const storeId = absoluteUrl(baseUrl, '/en/') + '#store';

  const orgJson = {
    '@context': 'https://schema.org',
    '@type': ['ElectronicsStore', 'LocalBusiness'],
    '@id': storeId,
    name: 'Eslami Electric',
    alternateName: 'الکتریکی اسلامی',
    url: absoluteUrl(baseUrl, '/en/'),
    logo: ogImage,
    image: ogImage,
    description:
      loc === 'fa'
        ? 'فروشگاه لوازم برق و روشنایی در زاهدان؛ کابل، روشنایی، کلید و پریز و تجهیزات ساختمانی. خدمات محلی و سفارش آنلاین.'
        : 'Electrical shop in Zahedan, Iran: cables, lighting, sockets, switches, and building supplies. Local service and online ordering for Sistan and Baluchestan.',
    telephone: '+989123456789',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Azadi Avenue',
      addressLocality: 'Zahedan',
      addressRegion: 'Sistan and Baluchestan',
      addressCountry: 'IR'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 29.4963,
      longitude: 60.8629
    },
    hasMap:
      'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent('Eslami Electric Zahedan Iran'),
    sameAs: [
      'https://www.instagram.com/EslamiElectricOfficial/',
      'https://t.me/EslamiElectric'
    ],
    areaServed: [
      { '@type': 'City', name: 'Zahedan' },
      { '@type': 'AdministrativeArea', name: 'Sistan and Baluchestan' }
    ],
    priceRange: '$$'
  };

  const webSiteJson = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl(baseUrl, '/en/') + '#website',
    name: 'Eslami Electric',
    url: absoluteUrl(baseUrl, '/en/'),
    inLanguage: ['en', 'fa'],
    publisher: { '@id': storeId }
  };

  const jsonLd = rk === '' ? [orgJson, webSiteJson] : [orgJson];
  if (rk === 'products' && categories.length > 0) {
    jsonLd.push(buildBreadcrumbJsonLd(baseUrl, loc, canonicalUrl));
    // Full ItemList on every product deep link dilutes the single-URL signal; keep catalog list only on the main products view.
    if (!productDetailIds) {
      jsonLd.push(buildItemListJsonLd(baseUrl, loc, categories));
    }
  }

  const block =
    '<!--SERVER_SEO:start-->\n' +
    '  <meta name="description" content="' +
    descEsc +
    '">\n' +
    '  <meta name="robots" content="' +
    escapeHtmlAttr(robotsContent) +
    '">\n' +
    '  <link rel="canonical" href="' +
    escapeHtmlAttr(canonicalUrl) +
    '">\n' +
    '  <link rel="alternate" hreflang="en" href="' +
    escapeHtmlAttr(urlEn) +
    '">\n' +
    '  <link rel="alternate" hreflang="fa" href="' +
    escapeHtmlAttr(urlFa) +
    '">\n' +
    '  <link rel="alternate" hreflang="x-default" href="' +
    escapeHtmlAttr(xDefault) +
    '">\n' +
    '  <meta property="og:type" content="website">\n' +
    '  <meta property="og:site_name" content="Eslami Electric">\n' +
    '  <meta property="og:title" content="' +
    titleEsc +
    '">\n' +
    '  <meta property="og:description" content="' +
    descEsc +
    '">\n' +
    '  <meta property="og:url" content="' +
    escapeHtmlAttr(canonicalUrl) +
    '">\n' +
    '  <meta property="og:locale" content="' +
    ogLocale +
    '">\n' +
    '  <meta property="og:locale:alternate" content="' +
    ogLocaleAlt +
    '">\n' +
    '  <meta property="og:image" content="' +
    escapeHtmlAttr(ogImage) +
    '">\n' +
    '  <meta property="og:image:width" content="512">\n' +
    '  <meta property="og:image:height" content="512">\n' +
    '  <meta property="og:image:alt" content="' +
    escapeHtmlAttr(loc === 'fa' ? 'الکتریکی اسلامی — لوگو' : 'Eslami Electric logo') +
    '">\n' +
    '  <meta name="geo.region" content="IR-13">\n' +
    '  <meta name="geo.placename" content="' +
    escapeHtmlAttr(loc === 'fa' ? 'زاهدان' : 'Zahedan') +
    '">\n' +
    '  <meta name="twitter:card" content="summary_large_image">\n' +
    '  <meta name="twitter:title" content="' +
    titleEsc +
    '">\n' +
    '  <meta name="twitter:description" content="' +
    descEsc +
    '">\n' +
    '  <meta name="twitter:image" content="' +
    escapeHtmlAttr(ogImage) +
    '">\n' +
    jsonLd
      .map(
        (o) =>
          '  <script type="application/ld+json">' + JSON.stringify(o).replace(/</g, '\\u003c') + '</script>\n'
      )
      .join('') +
    '  <!--SERVER_SEO:end-->\n';

  let out = stripPreviousSeo(html);
  out = stripMetaDescription(out);
  out = out.replace(/<title>[^<]*<\/title>/i, '<title>' + copy.title + '</title>');
  out = out.replace(
    /<html(?:\s[^>]*)?>/i,
    '<html lang="' + loc + '" dir="' + (loc === 'fa' ? 'rtl' : 'ltr') + '">'
  );
  /** Place SEO early (after charset) so crawlers see title/description without waiting for end of <head>. */
  if (/<meta\s+charset\s*=\s*["']?utf-8["']?\s*\/?>/i.test(out)) {
    out = out.replace(
      /(<meta\s+charset\s*=\s*["']?utf-8["']?\s*\/?>)/i,
      '$1\n' + block
    );
  } else {
    out = out.replace(/<\/head>/i, block + '</head>');
  }
  return out;
}

/** Sitemap: indexable locale URLs + product deep links (?category=&product=). */
function buildSitemapXml(baseUrl, categoriesRaw) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const lastmod = new Date().toISOString().slice(0, 10);
  const indexableKeys = Object.keys(SEO_ROUTES).filter((k) => !NOINDEX_ROUTES.has(k));
  const urls = [];
  const pushUrl = (locStr, priority, changefreq) => {
    urls.push(
      '  <url>\n    <loc>' +
        escapeXml(locStr) +
        '</loc>\n    <lastmod>' +
        lastmod +
        '</lastmod>\n    <changefreq>' +
        changefreq +
        '</changefreq>\n    <priority>' +
        priority +
        '</priority>\n  </url>'
    );
  };
  for (const key of indexableKeys) {
    for (const locale of ['en', 'fa']) {
      const path = buildCanonicalPath(locale, key);
      pushUrl(base + path, key === '' ? '1.0' : '0.8', 'weekly');
    }
  }
  const categories = normalizeCategoriesData(categoriesRaw);
  for (const cat of categories) {
    const catId = cat && cat.id != null ? String(cat.id) : '';
    const prods = Array.isArray(cat && cat.products) ? cat.products : [];
    for (const p of prods) {
      if (!p || p.id == null) continue;
      for (const locale of ['en', 'fa']) {
        pushUrl(productDeepLink(base, locale, catId, p.id), '0.64', 'monthly');
      }
    }
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n'
  );
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildRobotsTxt(baseUrl) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  return (
    'User-agent: *\n' +
    'Allow: /\n' +
    'Disallow: /api/\n' +
    '\n' +
    'Sitemap: ' +
    base +
    '/sitemap.xml\n'
  );
}

module.exports = {
  injectSeoBundle,
  buildSitemapXml,
  buildRobotsTxt,
  normalizeRouteKey,
  escapeHtmlAttr
};
