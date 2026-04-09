const CACHE_NAME = 'umana-apps-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());