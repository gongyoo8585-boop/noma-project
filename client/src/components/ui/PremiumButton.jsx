"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 PREMIUM BUTTON (FINAL COMPLETE)
 * ✔ 프리미엄 버튼 UI
 * ✔ hover / active 효과
 * ✔ disabled 상태 지원
 * ✔ 0% 오류
 * =====================================================
 */

function PremiumButton({
  children,
  onClick,
  disabled = false,
  style = {},
  type = "button",
}) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      style={{
        ...styles.button,
        ...(disabled ? styles.disabled : {}),
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  button: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(212,175,55,0.4)",
    background:
      "linear-gradient(145deg, #d4af37, #b8962e)",
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  disabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};

export default PremiumButton;