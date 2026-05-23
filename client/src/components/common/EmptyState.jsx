"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 COMMON EMPTY STATE COMPONENT (ULTRA FINAL COMPLETE)
 * ✔ 기존 기능 100% 유지
 * ✔ fullPage 유지
 * ✔ action 버튼 유지
 * ✔ 긴 메시지 대응 유지
 * ✔ action 중복 클릭 방어 최소 추가
 * ✔ 노라 네온 골드 / 핑크 UI 적용
 * =====================================================
 */

function EmptyState({
  message = "데이터가 없습니다.",
  subMessage = "",
  actionText = "",
  onAction = null,
  fullPage = false,
}) {
  const safeMessage =
    message || "데이터가 없습니다.";

  const safeSub = subMessage || "";

  return (
    <div
      style={
        fullPage
          ? styles.fullPage
          : styles.wrap
      }
    >
      <div style={styles.box}>
        <div style={styles.icon}>
          📭
        </div>

        <div style={styles.message}>
          {safeMessage}
        </div>

        {safeSub && (
          <div style={styles.sub}>
            {safeSub}
          </div>
        )}

        {actionText &&
          typeof onAction ===
            "function" && (
            <button
              onClick={(e) => {
                try {
                  /* 🔥 최소 추가:
                  중복 클릭 방어 */
                  e.currentTarget.disabled = true;

                  Promise.resolve(
                    onAction()
                  )
                    .catch((err) => {
                      console.error(
                        "EmptyState action error:",
                        err
                      );
                    })
                    .finally(() => {
                      e.currentTarget.disabled = false;
                    });
                } catch (e) {
                  console.error(
                    "EmptyState action error:",
                    e
                  );

                  e.currentTarget.disabled = false;
                }
              }}
              style={styles.btn}
              type="button"
            >
              {actionText}
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
      "radial-gradient(circle at 50% 45%, rgba(255, 212, 0, 0.1), transparent 30%), radial-gradient(circle at 50% 58%, rgba(255, 0, 110, 0.09), transparent 32%), #050505",
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
      "linear-gradient(180deg, rgba(10, 10, 10, 0.98), rgba(2, 2, 2, 0.98))",
    border: "1px solid #FFD400",
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: "100%",
    textAlign: "center",
    boxSizing: "border-box",
    boxShadow:
      "0 0 14px rgba(255, 212, 0, 0.58), inset 0 0 18px rgba(255, 212, 0, 0.08), 0 0 26px rgba(255, 0, 110, 0.12)",
  },

  icon: {
    fontSize: 36,
    marginBottom: 10,
    filter:
      "drop-shadow(0 0 8px rgba(255, 212, 0, 0.75)) drop-shadow(0 0 14px rgba(255, 0, 110, 0.35))",
  },

  message: {
    color: "#FFD400",
    fontSize: 16,
    fontWeight: 800,
    marginBottom: 8,
    wordBreak: "break-word",
    lineHeight: 1.5,
    textShadow:
      "0 0 6px rgba(255, 212, 0, 0.9), 0 0 14px rgba(255, 212, 0, 0.55)",
  },

  sub: {
    color: "#d7d7d7",
    fontSize: 13,
    marginBottom: 12,
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

export default EmptyState;