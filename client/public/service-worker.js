"use strict";

/**
 * =====================================================
 * 🔥 SERVICE WORKER (ULTRA SAFE MINIMAL)
 * ✔ MIME 오류 방지
 * ✔ register 에러 방지
 * ✔ 기존 구조 영향 없음
 * ✔ 캐시 충돌 최소화
 * ✔ fetch 안전 처리
 * =====================================================
 */

const CACHE_NAME = "noma-cache-v1";

/* =========================
INSTALL
========================= */
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([]);
    })
  );
});

/* =========================
ACTIVATE
========================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

          return null;
        })
      );
    })
  );

  self.clients.claim();
});

/* =========================
FETCH
========================= */
self.addEventListener("fetch", (event) => {
  if (!event.request) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});