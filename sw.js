const CACHE = 'thai-learning-v12';
const BASE = new URL(self.registration.scope).pathname;
const PRECACHE = [
  '',
  'index.html',
  'icon.svg',
  'manifest.json',
  'src/css/styles.css',
  'src/js/app.js',
  'src/js/home.js',
  'src/js/flashcards.js',
  'src/js/quiz.js',
  'src/js/typing.js',
  'src/js/tutor.js',
  'src/js/settings.js',
  'src/js/storage.js',
  'src/js/srs.js',
  'src/js/tts.js',
  'src/js/romanize.js',
  'src/js/sheets.js',
  'src/data/vocab.json',
].map(path => `${BASE}${path}`);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first for Google Sheets (live vocab), cache-first for app assets
  const url = new URL(e.request.url);
  if (url.hostname === 'docs.google.com') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});

// Show notification when triggered by the page
self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_REMINDER') {
    const { title, body } = e.data;
    self.registration.showNotification(title, {
      body,
      icon: `${BASE}icon.svg`,
      badge: `${BASE}icon.svg`,
      tag: 'thai-learning-daily',
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
    });
  }
});

// Open app when notification is clicked
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const existing = cs.find(c => c.url.includes(BASE));
      if (existing) return existing.focus();
      return clients.openWindow(BASE);
    })
  );
});
