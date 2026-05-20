"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 CLUSTER MARKER (FINAL COMPLETE)
 * ✔ 지도 클러스터 마커 UI
 * ✔ 개수 표시
 * ✔ 크기 자동 조절
 * ✔ NaN / undefined 100% 방어
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getSize(count) {
  const c = toNumber(count, 0);

  if (c < 10) return 30;
  if (c < 50) return 40;
  if (c < 100) return 50;
  return 60;
}

function ClusterMarker({ count = 0, onClick }) {
  const c = toNumber(count, 0);
  const size = getSize(c);

  return (
    <div
      onClick={onClick}
      style={{
        ...styles.marker,
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
    >
      {c}
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  marker: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "rgba(212,175,55,0.9)",
    color: "#000",
    fontWeight: "bold",
    border: "2px solid #000",
    boxShadow: "0 2px 10px rgba(0,0,0,0.6)",
    cursor: "pointer",
    userSelect: "none",
  },
};

export default ClusterMarker;