// 버전 관리: 버전을 올릴 때마다 캐시도 자동으로 갱신됨
const CACHE_NAME = "matharu-v1";

// 설치 단계: 핵심 파일들을 캐시에 미리 저장
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll([
          "./",
          "./index.html",
          "./manifest.json"
        ]).catch((err) => {
          // 네트워크 오류 무시 — 앱 설치 진행
          console.warn("캐시 저장 실패 (무시):", err);
        });
      })
      .catch((err) => {
        console.error("캐시 열기 실패:", err);
      })
  );
  self.skipWaiting(); // 즉시 활성화
});

// 활성화 단계: 이전 캐시 버전 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => {
        return Promise.all(
          names.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
  );
  self.clients.claim(); // 즉시 제어 시작
});

// 요청 처리: 캐시 우선, 없으면 네트워크
self.addEventListener("fetch", (event) => {
  // GET 요청만 처리
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) {
          return cached;
        }
        // 캐시 없음 → 네트워크 시도
        return fetch(event.request)
          .then((response) => {
            // Firebase나 외부 API는 캐시 안 함
            if (
              event.request.url.includes("firebaseio.com") ||
              event.request.url.includes("googleapis.com")
            ) {
              return response;
            }
            // 정상 응답이면 캐시에도 저장 (선택사항)
            if (response && response.status === 200) {
              const cloned = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, cloned);
              });
            }
            return response;
          })
          .catch(() => {
            // 네트워크 실패 + 캐시도 없음 → 오프라인 안내 (선택)
            // 현재는 그냥 에러 반환
            return new Response("오프라인입니다", {
              status: 503,
              statusText: "Service Unavailable",
              headers: new Headers({
                "Content-Type": "text/plain"
              })
            });
          });
      })
  );
});

// 백그라운드 동기 (선택): 나중에 추가 가능
// self.addEventListener("sync", (event) => {
//   if (event.tag === "sync-reports") {
//     event.waitUntil(syncReports());
//   }
// });
