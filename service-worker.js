// 맛하루 방문보고 - Service Worker
// 캐시 버전: 배포할 때마다 끝 숫자를 올리면 옛 캐시가 자동 정리됩니다.
const CACHE = 'matharu-v2026-06-10';

// 오프라인 대비로 미리 받아둘 정적 파일
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png'
];

// 설치: 정적 파일 캐시 + 즉시 활성화
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {}))
  );
});

// 활성화: 옛 버전 캐시 삭제
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 요청 처리
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Firebase / 구글 API / 외부 CDN: 항상 네트워크 (캐시하지 않음 → 데이터 최신 유지)
  const noCacheHosts = ['firebaseio.com', 'googleapis.com', 'google.com', 'gstatic.com', 'cloudflare.com', 'accounts.google.com'];
  if (noCacheHosts.some((h) => url.hostname.includes(h))) return;

  // HTML 문서: network-first (항상 최신 화면 우선, 오프라인이면 캐시)
  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req)
        .then((res) => { const cl = res.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); return res; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // 그 외(아이콘 등 정적자원): cache-first
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((res) => {
      const cl = res.clone(); caches.open(CACHE).then((c) => c.put(req, cl)); return res;
    }))
  );
});
