/* D2 Calculator — service worker.
 *
 * CACHE_VERSION comes from the "?v=" on the registration URL, which index.html
 * sets from its APP_VERSION constant. So bumping APP_VERSION in index.html is
 * the ONE place to bump on every deploy. A new version means a new cache name;
 * every older cache is deleted when the new worker activates.
 *
 * Strategy:
 *   - Page navigations: network first (so a fresh deploy shows up as soon as
 *     you're online), cached index.html as the offline fallback.
 *   - Everything else (icons, manifest): cache first, fill from network.
 */
const CACHE_VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'd2-calculator-' + CACHE_VERSION;
const PRECACHE = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }))
  );
});
