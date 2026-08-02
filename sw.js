// 小含有点甜 · 工作台 —— Service Worker（离线缓存）
// 策略：预缓存应用外壳；运行时缓存优先使用缓存，失败回退网络。
const CACHE = 'workbench-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './css/styles.css',
  './js/core.js',
  './js/data.js',
  './js/tasks.js',
  './js/finance.js',
  './js/exercise.js',
  './js/lessonplan.js',
  './js/news.js',
  './js/research.js',
  './js/sync.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 应用外壳类请求：缓存优先
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          // 仅缓存同源静态资源与开放接口
          try {
            const url = new URL(req.url);
            if (url.origin === location.origin || url.protocol.startsWith('http')) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
          } catch (_) {}
          return res;
        })
        .catch(() => cached || new Response('离线且未缓存', { status: 503 }));
    })
  );
});
