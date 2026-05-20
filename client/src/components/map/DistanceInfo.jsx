"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 DISTANCE INFO (FINAL COMPLETE)
 * ✔ 거리 정보 표시 컴포넌트
 * ✔ meter / km 자동 포맷
 * ✔ NaN / undefined 100% 방어
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function formatDistance(meter) {
  const m = toNumber(meter, 0);

  if (m <= 0) return "0m";
  if (m < 1000) return `${Math.round(m)}m`;

  return `${(m / 1000).toFixed(1)}km`;
}

function DistanceInfo({ meter, km, style = {} }) {
  let display = "";

  if (meter !== undefined && meter !== null) {
    display = formatDistance(meter);
  } else if (km !== undefined && km !== null) {
    const k = toNumber(km, 0);
    display = k <= 0 ? "0km" : `${k.toFixed(2)}km`;
  }

  if (!display) return null;

  return (
    <div style={{ ...styles.wrapper, ...style }}>
      📍 {display}
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  wrapper: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 6,
    background: "rgba(0,0,0,0.7)",
    border: "1px solid #333",
    color: "#d4af37",
    fontSize: 12,
  },
};

export default DistanceInfo;