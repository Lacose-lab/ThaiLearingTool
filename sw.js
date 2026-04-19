const CACHE = 'kru-noi-v2';
const PRECACHE = [
  '/ThaiLearingTool/',
  '/ThaiLearingTool/index.html',
  '/ThaiLearingTool/icon.svg',
  '/ThaiLearingTool/manifest.json',
  '/ThaiLearingTool/src/css/styles.css',
  '/ThaiLearingTool/src/js/app.js',
  '/ThaiLearingTool/src/js/home.js',
  '/ThaiLearingTool/src/js/flashcards.js',
  '/ThaiLearingTool/src/js/quiz.js',
  '/ThaiLearingTool/src/js/typing.js',
  '/ThaiLearingTool/src/js/tutor.js',
  '/ThaiLearingTool/src/js/settings.js',
  '/ThaiLearingTool/src/js/storage.js',
  '/ThaiLearingTool/src/js/srs.js',
  '/ThaiLearingTool/src/js/tts.js',
  '/ThaiLearingTool/src/js/romanize.js',
  '/ThaiLearingTool/src/js/sheets.js',
  '/ThaiLearingTool/src/data/vocab.json',
];

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
      icon: '/ThaiLearingTool/icon.svg',
      badge: '/ThaiLearingTool/icon.svg',
      tag: 'kru-noi-daily',
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
      const existing = cs.find(c => c.url.includes('/ThaiLearingTool/'));
      if (existing) return existing.focus();
      return clients.openWindow('/ThaiLearingTool/');
    })
  );
});
