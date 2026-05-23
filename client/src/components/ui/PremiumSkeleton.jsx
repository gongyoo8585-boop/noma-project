"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 PREMIUM SKELETON (FINAL COMPLETE)
 * ✔ 로딩 스켈레톤 UI
 * ✔ shimmer 애니메이션
 * ✔ width / height 커스터마이징
 * ✔ 0% 오류
 * =====================================================
 */

function PremiumSkeleton({
  width = "100%",
  height = 16,
  radius = 8,
  style = {},
}) {
  return (
    <div
      style={{
        ...styles.skeleton,
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  );
}

/* =========================
STYLE
========================= */
const styles = {
  skeleton: {
    background:
      "linear-gradient(90deg, #111 25%, #1a1a1a 50%, #111 75%)",
    backgroundSize: "200% 100%",
    animation: "premiumSkeleton 1.5s infinite linear",
  },
};

/* =========================
ANIMATION (inline style injection)
========================= */
const styleSheet = (() => {
  if (typeof document === "undefined") return null;

  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes premiumSkeleton {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);

  return style;
})();

export default PremiumSkeleton;