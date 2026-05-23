"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 COMMON LOADING COMPONENT (ULTRA FINAL COMPLETE)
 * ✔ 기존 기능 100% 유지
 * ✔ SSR / document undefined 방어 추가
 * ✔ style 중복 삽입 방어 유지
 * ✔ fullPage 유지
 * ✔ spinner 유지
 * ✔ 노라 네온 골드 UI 적용
 * =====================================================
 */

function Loading({
  message = "로딩중...",
  fullPage = false,
  size = 28,
}) {
  const safeMessage = message || "로딩중...";

  /* =========================
  🔥 최소 추가: SSR/document 방어
  ========================= */
  const canUseDOM =
    typeof window !== "undefined" &&
    typeof document !== "undefined";

  const hasStyle =
    canUseDOM &&
    document.getElementById("loading-spin-style");

  return (
    <>
      {/* 🔥 기존 유지 + SSR 안정화 */}
      {!hasStyle && (
        <style id="loading-spin-style">
          {`
            @keyframes loadingSpin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }

            @keyframes loadingNeonPulse {
              0% {
                opacity: 0.65;
                text-shadow:
                  0 0 4px rgba(255, 212, 0, 0.55),
                  0 0 10px rgba(255, 212, 0, 0.35);
              }
              50% {
                opacity: 1;
                text-shadow:
                  0 0 6px rgba(255, 212, 0, 0.95),
                  0 0 14px rgba(255, 212, 0, 0.75),
                  0 0 24px rgba(255, 212, 0, 0.45);
              }
              100% {
                opacity: 0.65;
                text-shadow:
                  0 0 4px rgba(255, 212, 0, 0.55),
                  0 0 10px rgba(255, 212, 0, 0.35);
              }
            }
          `}
        </style>
      )}

      <div style={fullPage ? styles.fullPage : styles.wrap}>
        <div
          style={{
            ...styles.spinner,
            width: size,
            height: size,
          }}
        />

        <div style={styles.message}>
          {safeMessage}
        </div>
      </div>
    </>
  );
}

/* =========================
🔥 STYLE
========================= */
const styles = {
  fullPage: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% 45%, rgba(255, 212, 0, 0.08), transparent 28%), #050505",
    color: "#FFD400",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  wrap: {
    width: "100%",
    padding: 20,
    color: "#FFD400",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    boxSizing: "border-box",
  },

  spinner: {
    border: "3px solid rgba(255, 212, 0, 0.18)",
    borderTop: "3px solid #FFD400",
    borderRight: "3px solid rgba(255, 0, 110, 0.8)",
    borderRadius: "50%",
    animation: "loadingSpin 0.85s linear infinite",
    boxSizing: "border-box",
    boxShadow:
      "0 0 10px rgba(255, 212, 0, 0.75), inset 0 0 8px rgba(255, 212, 0, 0.25)",
  },

  message: {
    color: "#FFD400",
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    wordBreak: "keep-all",
    letterSpacing: "-0.2px",
    animation: "loadingNeonPulse 1.4s ease-in-out infinite",
  },
};

export default Loading;