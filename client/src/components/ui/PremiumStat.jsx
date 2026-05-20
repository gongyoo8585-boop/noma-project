"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 PREMIUM STAT (FINAL COMPLETE)
 * ✔ 숫자 강조 통계 UI
 * ✔ title + value + subText 지원
 * ✔ NaN / undefined 방어
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function PremiumStat({
  title = "",
  value = 0,
  subText = "",
  style = {},
}) {
  const safeValue = toNumber(value, 0);

  return (
    <div style={{ ...styles.wrapper, ...style }}>
      <div style={styles.title}>{title}</div>

      <div style={styles.value}>
        {safeValue.toLocaleString()}
      </div>

      {subText ? (
        <div style={styles.sub}>{subText}</div>
      ) : null}
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  wrapper: {
    background: "linear-gradient(145deg, #0d0d0d, #1a1a1a)",
    border: "1px solid rgba(212,175,55,0.25)",
    borderRadius: 12,
    padding: 14,
    color: "#d4af37",
    boxShadow:
      "0 4px 16px rgba(0,0,0,0.6), inset 0 0 8px rgba(212,175,55,0.05)",
  },
  title: {
    fontSize: 12,
    color: "#888",
  },
  value: {
    marginTop: 6,
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: "#aaa",
  },
};

export default PremiumStat;