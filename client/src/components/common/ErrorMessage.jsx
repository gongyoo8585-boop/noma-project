"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 COMMON ERROR MESSAGE COMPONENT (ULTRA FINAL COMPLETE)
 * ✔ 기존 기능 100% 유지
 * ✔ fullPage 유지
 * ✔ retry 안정성 유지
 * ✔ 긴 메시지 대응 유지
 * ✔ 버튼 중복 클릭 방어 최소 추가
 * ✔ 노라 네온 골드 / 핑크 UI 적용
 * =====================================================
 */

function ErrorMessage({
  message = "오류가 발생했습니다.",
  onRetry = null,
  fullPage = false,
}) {
  const safeMessage =
    message || "오류가 발생했습니다.";

  return (
    <div
      style={
        fullPage
          ? styles.fullPage
          : styles.wrap
      }
    >
      <div style={styles.box}>
        <div style={styles.title}>
          ERROR
        </div>

        <div style={styles.message}>
          {safeMessage}
        </div>

        {typeof onRetry === "function" && (
          <button
            onClick={(e) => {
              try {
                /* 🔥 최소 추가:
                연속 클릭 방어 */
                e.currentTarget.disabled = true;

                Promise.resolve(onRetry())
                  .catch((err) => {
                    console.error(
                      "Retry Error:",
                      err
                    );
                  })
                  .finally(() => {
                    e.currentTarget.disabled = false;
                  });
              } catch (e) {
                console.error(
                  "Retry Error:",
                  e
                );

                e.currentTarget.disabled = false;
              }
            }}
            style={styles.btn}
            type="button"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================
🔥 STYLE
========================= */

const styles = {
  fullPage: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 50% 45%, rgba(255, 0, 110, 0.12), transparent 28%), radial-gradient(circle at 50% 55%, rgba(255, 212, 0, 0.08), transparent 34%), #050505",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    boxSizing: "border-box",
  },

  wrap: {
    width: "100%",
    padding: 20,
    display: "flex",
    justifyContent: "center",
    boxSizing: "border-box",
  },

  box: {
    background:
      "linear-gradient(180deg, rgba(10, 0, 6, 0.98), rgba(5, 5, 5, 0.98))",
    border: "1px solid #FFD400",
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: "100%",
    textAlign: "center",
    boxSizing: "border-box",
    boxShadow:
      "0 0 14px rgba(255, 212, 0, 0.58), inset 0 0 18px rgba(255, 212, 0, 0.08), 0 0 28px rgba(255, 0, 110, 0.18)",
  },

  title: {
    color: "#FF006E",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    letterSpacing: "0.5px",
    textShadow:
      "0 0 6px rgba(255, 0, 110, 0.95), 0 0 14px rgba(255, 0, 110, 0.75), 0 0 24px rgba(255, 0, 110, 0.45)",
  },

  message: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 15,
    wordBreak: "break-word",
    lineHeight: 1.5,
    textShadow: "0 0 8px rgba(255,255,255,0.22)",
  },

  btn: {
    padding: "10px 14px",
    background:
      "linear-gradient(180deg, rgba(255, 212, 0, 0.98), rgba(186, 143, 0, 0.98))",
    color: "#000",
    border: "1px solid #FFD400",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "bold",
    minWidth: 120,
    boxShadow:
      "0 0 12px rgba(255, 212, 0, 0.78), inset 0 0 10px rgba(255, 255, 255, 0.18)",
    textShadow: "0 1px 0 rgba(255,255,255,0.32)",
  },
};

export default ErrorMessage;