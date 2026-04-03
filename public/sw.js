/* eslint-disable no-restricted-globals */
/* global self, caches, fetch */
/**
 * Eslami Electric — offline cache (Zahedan / spotty connections).
 * Bump CACHE_VERSION when you change precache URLs or need a full refresh.
 */
var CACHE_VERSION = 'eslami-v9';
var PRECACHE = [
  '/',
  '/offline.html',
  '/site.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/css/tailwind.css',
  '/css/mobile.css',
  '/js/auth-nav-sync.js',
  '/css/intl-phone.css',
  '/js/locale-bootstrap.js',
  '/js/price-format.js',
  '/js/locale-init.js',
  '/js/site-footer-i18n.js',
  '/js/mobile-nav.js',
  '/js/intl-phone.js',
  '/js/register-sw.js',
  '/js/order-line-items.js',
  '/products.html',
  '/basket.html',
  '/order.html',
  '/login.html'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then(function (cache) {
        return Promise.allSettled(
          PRECACHE.map(function (url) {
            return cache.add(new Request(url, { cache: 'reload' })).catch(function () {
              return null;
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_VERSION) return caches.delete(key);
          return Promise.resolve();
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isApiRequest(url) {
  return url.pathname.indexOf('/api/') === 0;
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  var url = new URL(req.url);

  if (req.method !== 'GET') {
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(fetch(req));
    return;
  }

  if (!isSameOrigin(url)) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          if (res.ok || res.type === 'opaque') {
            caches.open(CACHE_VERSION).then(function (c) {
              c.put(req, copy);
            });
          }
          return res;
        })
        .catch(function () {
          return caches.match(req);
        })
    );
    return;
  }

  var isDocument =
    req.mode === 'navigate' || (typeof event.request.destination === 'string' && event.request.destination === 'document');

  if (isDocument) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          if (res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE_VERSION).then(function (c) {
              c.put(req, copy);
            });
          }
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match('/offline.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) {
        fetch(req)
          .then(function (res) {
            if (res.status === 200) {
              caches.open(CACHE_VERSION).then(function (c) {
                c.put(req, res);
              });
            }
          })
          .catch(function () {});
        return cached;
      }
      return fetch(req).then(function (res) {
        if (res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) {
            c.put(req, copy);
          });
        }
        return res;
      });
    })
  );
});
