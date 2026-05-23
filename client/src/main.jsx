import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

/**
 * =====================================================
 * 🔥 MAIN ENTRY (ROUTER SAFE FINAL)
 * ✔ 기존 구조 유지
 * ✔ Router 충돌 없음
 * ✔ root null 방어 유지
 * ✔ service worker MIME 오류 방지
 * ✔ 기존 흐름 유지
 * =====================================================
 */

/* =========================
🔥 글로벌 에러 처리
========================= */
window.addEventListener("error", (e) => {
  console.error(
    "GLOBAL ERROR:",
    e.message,
    e.filename,
    e.lineno
  );
});

window.addEventListener(
  "unhandledrejection",
  (e) => {
    console.error(
      "UNHANDLED PROMISE:",
      e.reason
    );
  }
);

/* =========================
🔥 환경 변수
========================= */
const ENV = window.__ENV__ || {};

console.log("ENV:", ENV);

/* 🔥 최소 추가 */
if (
  typeof import.meta !==
    "undefined" &&
  import.meta.env
) {
  console.log(
    "VITE ENV:",
    import.meta.env
  );
}

/* =========================
🔥 ROOT 생성
========================= */
const rootElement =
  document.getElementById(
    "root"
  );

/* 🔥 최소 추가 */
if (!rootElement) {
  throw new Error(
    "ROOT_ELEMENT_NOT_FOUND"
  );
}

const root =
  ReactDOM.createRoot(
    rootElement
  );

/* =====================================================
🔥 핵심 수정
중복 Router 생성 방지
(App.jsx 내부에서 BrowserRouter 사용)
===================================================== */
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* =========================
🔥 서비스 워커 등록 (안전 패치)
========================= */
if (
  "serviceWorker" in
  navigator
) {
  window.addEventListener(
    "load",
    async () => {
      try {
        /* 🔥 최소 추가 */
        const check =
          await fetch(
            "/service-worker.js",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const contentType =
          check.headers.get(
            "content-type"
          ) || "";

        /* 🔥 MIME 안전 처리 */
        if (
          !check.ok ||
          !contentType.includes(
            "javascript"
          )
        ) {
          console.warn(
            "❌ service-worker.js 없음 또는 MIME 오류"
          );

          return;
        }

        /* 🔥 기존 SW 제거 */
        const registrations =
          await navigator.serviceWorker.getRegistrations();

        for (const registration of registrations) {
          try {
            await registration.unregister();
          } catch (e) {
            console.warn(
              "SW unregister 실패:",
              e
            );
          }
        }

        await navigator.serviceWorker.register(
          "/service-worker.js",
          {
            scope: "/",
          }
        );

        console.log(
          "✅ Service Worker 등록 완료"
        );

      } catch (err) {
        console.warn(
          "❌ Service Worker 실패:",
          err
        );
      }
    }
  );
}