const CACHE_NAME = 'davidios-apps-v5';
const APP_SHELL = [
    './',
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    './apps.json',
    './favicon.svg'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    const requestURL = new URL(event.request.url);
    const isAppShellAsset = requestURL.pathname.endsWith('/') ||
        requestURL.pathname.endsWith('/index.html') ||
        requestURL.pathname.endsWith('/styles.css') ||
        requestURL.pathname.endsWith('/script.js') ||
        requestURL.pathname.endsWith('/manifest.json') ||
        requestURL.pathname.endsWith('/apps.json');

    if (isAppShellAsset) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    const clonedResponse = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return networkResponse;
                })
                .catch(() => caches.match(event.request).then((cachedResponse) => cachedResponse || caches.match('./index.html')))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((networkResponse) => {
                    const clonedResponse = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponse);
                    });
                    return networkResponse;
                })
                .catch(() => caches.match('./index.html'));
        })
    );
});
