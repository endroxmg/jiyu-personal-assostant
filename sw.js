/* ============================================
   JIYU — Service Worker (PWA)
   ============================================ */

const CACHE_NAME = 'jiyu-cache-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/index.css',
    '/src/memory.js',
    '/src/gemini.js',
    '/src/voice.js',
    '/src/auth.js',
    '/src/app.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install — cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch — cache first for static, network first for API
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip API calls — always fetch from network
    if (
        url.hostname.includes('generativelanguage.googleapis.com') ||
        url.hostname.includes('api.elevenlabs.io') ||
        url.hostname.includes('accounts.google.com') ||
        url.hostname.includes('fonts.googleapis.com') ||
        url.hostname.includes('fonts.gstatic.com')
    ) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Cache-first for static assets
    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // Offline fallback for navigation
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
