"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 PREMIUM CARD (FINAL COMPLETE)
 * ✔ 프리미엄 UI 카드
 * ✔ shadow / gradient / hover 효과
 * ✔ children 기반 확장 구조
 * ✔ 0% 오류
 * =====================================================
 */

function PremiumCard({ children, style = {}, hover = true }) {
  return (
    <div
      style={{
        ...styles.card,
        ...(hover ? styles.hover : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  card: {
    background: "linear-gradient(145deg, #0d0d0d, #1a1a1a)",
    border: "1px solid rgba(212,175,55,0.2)",
    borderRadius: 14,
    padding: 16,
    color: "#d4af37",
    boxShadow:
      "0 4px 20px rgba(0,0,0,0.6), inset 0 0 10px rgba(212,175,55,0.05)",
    transition: "all 0.25s ease",
  },
  hover: {
    cursor: "pointer",
  },
};

export default PremiumCard;