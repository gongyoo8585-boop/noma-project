"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 PREMIUM BADGE (FINAL COMPLETE)
 * ✔ 상태 / 라벨 표시용 뱃지
 * ✔ color variant 지원
 * ✔ 0% 오류
 * =====================================================
 */

function PremiumBadge({ children, variant = "gold", style = {} }) {
  const color = getColor(variant);

  return (
    <span
      style={{
        ...styles.badge,
        background: color.bg,
        color: color.text,
        borderColor: color.border,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* =========================
COLOR VARIANTS
========================= */
function getColor(variant) {
  switch (variant) {
    case "green":
      return {
        bg: "rgba(76,175,80,0.15)",
        text: "#4caf50",
        border: "rgba(76,175,80,0.4)",
      };
    case "red":
      return {
        bg: "rgba(244,67,54,0.15)",
        text: "#f44336",
        border: "rgba(244,67,54,0.4)",
      };
    case "blue":
      return {
        bg: "rgba(33,150,243,0.15)",
        text: "#2196f3",
        border: "rgba(33,150,243,0.4)",
      };
    case "gold":
    default:
      return {
        bg: "rgba(212,175,55,0.15)",
        text: "#d4af37",
        border: "rgba(212,175,55,0.4)",
      };
  }
}

/* =========================
STYLE
========================= */
const styles = {
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    border: "1px solid",
    whiteSpace: "nowrap",
  },
};

export default PremiumBadge;