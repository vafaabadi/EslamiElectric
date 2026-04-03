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
  'claim-account'
]);

/** Per-route EN/FA title + meta description (unique where it matters for SEO). */
const SEO_ROUTES = {
  '': {
    en: {
      title: 'Eslami Electric | Electrical Supplies & Lighting in Zahedan, Iran',
      description:
        'Buy cables, lighting, sockets, and electrical supplies at Eslami Electric in Zahedan, Sistan and Baluchestan. Local service and secure online ordering for homes and businesses.'
    },
    fa: {
      title: 'الکتریکی اسلامی | لوازم برق و روشنایی در زاهدان',
      description:
        'خرید کابل، روشنایی، کلید و پریز و تجهیزات برق از الکتریکی اسلامی در زاهدان، سیستان و بلوچستان. خدمات محلی و سفارش آنلاین.'
    }
  },
  products: {
    en: {
      title: 'Products | Cables, Lighting & Electrical — Eslami Electric',
      description:
        'Browse electrical products: cables, lamps, bulbs, and building supplies. Eslami Electric, Zahedan — quality brands and fair prices.'
    },
    fa: {
      title: 'محصولات | کابل، روشنایی و لوازم برق — الکتریکی اسلامی',
      description:
        'مشاهده محصولات برقی: کابل، چراغ، لامپ و لوازم ساختمانی. الکتریکی اسلامی، زاهدان — کیفیت و قیمت مناسب.'
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
        ? 'لوازم برق و روشنایی — الکتریکی اسلامی، زاهدان'
        : 'Electrical supplies and lighting — Eslami Electric, Zahedan, Iran.'
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
 */
function injectSeoBundle(html, { baseUrl, locale, routeKey }) {
  if (!html || typeof html !== 'string') return html;
  const loc = locale === 'fa' ? 'fa' : 'en';
  const rk = normalizeRouteKey(routeKey);
  const copy = getSeoCopy(rk, loc);
  const canonicalPath = buildCanonicalPath(loc, rk);
  const canonicalUrl = absoluteUrl(baseUrl, canonicalPath);

  const pathEn = buildCanonicalPath('en', rk);
  const pathFa = buildCanonicalPath('fa', rk);
  const urlEn = absoluteUrl(baseUrl, pathEn);
  const urlFa = absoluteUrl(baseUrl, pathFa);
  const xDefault = urlEn;

  const noindex = NOINDEX_ROUTES.has(rk);
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  const ogLocale = loc === 'fa' ? 'fa_IR' : 'en_US';
  const ogLocaleAlt = loc === 'fa' ? 'en_US' : 'fa_IR';

  const ogImage = absoluteUrl(baseUrl, '/icons/icon-512.png');

  const titleEsc = escapeHtmlAttr(copy.title);
  const descEsc = escapeHtmlAttr(copy.description);

  const orgJson = {
    '@context': 'https://schema.org',
    '@type': 'ElectronicsStore',
    name: 'Eslami Electric',
    alternateName: 'الکتریکی اسلامی',
    url: absoluteUrl(baseUrl, '/en/'),
    logo: ogImage,
    image: ogImage,
    description:
      loc === 'fa'
        ? 'فروشگاه لوازم برق و روشنایی در زاهدان، ایران'
        : 'Electrical supplies and lighting store in Zahedan, Iran.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Zahedan',
      addressRegion: 'Sistan and Baluchestan',
      addressCountry: 'IR'
    },
    areaServed: { '@type': 'City', name: 'Zahedan' },
    priceRange: '$$'
  };

  const webSiteJson = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Eslami Electric',
    url: absoluteUrl(baseUrl, '/en/'),
    inLanguage: ['en', 'fa'],
    publisher: { '@type': 'Organization', name: 'Eslami Electric', logo: { '@type': 'ImageObject', url: ogImage } }
  };

  const jsonLd = rk === '' ? [orgJson, webSiteJson] : [orgJson];

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

/** Sitemap: indexable locale URLs only (matches NOINDEX_ROUTES exclusion). */
function buildSitemapXml(baseUrl) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const indexableKeys = Object.keys(SEO_ROUTES).filter((k) => !NOINDEX_ROUTES.has(k));
  const urls = [];
  for (const key of indexableKeys) {
    for (const locale of ['en', 'fa']) {
      const path = buildCanonicalPath(locale, key);
      urls.push(
        '  <url>\n    <loc>' +
          escapeXml(base + path) +
          '</loc>\n    <changefreq>weekly</changefreq>\n    <priority>' +
          (key === '' ? '1.0' : '0.8') +
          '</priority>\n  </url>'
      );
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
