"use strict";

import React, {
  memo,
  useMemo,
} from "react";

/**
 * =====================================================
 * /client/src/components/map/MapMarker.jsx
 *
 * 🔥 NORA MAP MARKER ULTRA FINAL
 * ✔ 일반 골드 마커 완전 제거
 * ✔ 선택된 핑크 마커만 표시
 * ✔ 현재 디자인과 동일 스타일
 * ✔ 글씨 네온 완전 제거
 * ✔ 테두리만 최소 glow
 * ✔ 핑크 중심 포인트 유지
 * ✔ 블랙 + 핑크 + 골드 프리미엄
 * ✔ hover 안정화
 * ✔ 런타임 안정성 유지
 * ✔ 선택 마커 위 사각형 라벨 제거
 *
 * =====================================================
 */

function MapMarker({
  shop = {},
  selected = false,
  onClick = null,
  zIndex = 10,
}) {
  const safeShop = shop || {};

  /**
   * ======================================
   * 🔥 선택된 마커만 렌더링
   * ======================================
   */

  if (!selected) {
    return null;
  }

  const markerStyle =
    useMemo(() => {
      return {
        ...styles.markerWrap,

        zIndex:
          zIndex + 100,

        transform:
          "translate(-50%, -100%) scale(1)",

        opacity: 1,
      };
    }, [zIndex]);

  const handleClick = (
    e
  ) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (
        typeof onClick ===
        "function"
      ) {
        onClick(
          safeShop
        );
      }
    } catch (err) {
      console.error(
        "MapMarker Error:",
        err
      );
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      style={markerStyle}
      onClick={
        handleClick
      }
      onKeyDown={(
        e
      ) => {
        if (
          e.key ===
            "Enter" ||
          e.key === " "
        ) {
          handleClick(
            e
          );
        }
      }}
    >
      {/* =====================================
          🔥 PINK AURA
      ===================================== */}
      <div
        style={
          styles.outerGlow
        }
      />

      {/* =====================================
          🔥 PIN
      ===================================== */}
      <div
        style={styles.pin}
      >
        <div
          style={
            styles.innerRing
          }
        >
          <div
            style={
              styles.centerDot
            }
          />
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   🔥 STYLE
===================================================== */

const styles = {
  markerWrap: {
    position:
      "relative",

    width: 82,
    height: 82,

    cursor:
      "pointer",

    userSelect:
      "none",

    pointerEvents:
      "auto",

    transition:
      "all 0.22s ease",
  },

  /**
   * ======================================
   * 🔥 OUTER PINK GLOW
   * ======================================
   */

  outerGlow: {
    position:
      "absolute",

    top: "50%",
    left: "50%",

    width: 56,
    height: 56,

    transform:
      "translate(-50%, -50%)",

    borderRadius:
      "50%",

    background:
      `
      radial-gradient(
        circle,
        rgba(255,0,128,0.88) 0%,
        rgba(255,0,128,0.32) 45%,
        rgba(255,0,128,0.08) 72%,
        transparent 100%
      )
    `,

    filter:
      "blur(14px)",

    boxShadow:
      `
      0 0 18px rgba(255,0,128,0.72),
      0 0 40px rgba(255,0,128,0.48),
      0 0 72px rgba(255,0,128,0.20)
    `,

    zIndex: 1,
  },

  /**
   * ======================================
   * 🔥 PIN
   * ======================================
   */

  pin: {
    position:
      "absolute",

    top: "50%",
    left: "50%",

    width: 48,
    height: 48,

    transform:
      "translate(-50%, -50%) rotate(-45deg)",

    borderRadius:
      "50% 50% 50% 0",

    background:
      `
      linear-gradient(
        145deg,
        #ff006a 0%,
        #ff2f92 48%,
        #ff5fb1 100%
      )
    `,

    border:
      "2px solid rgba(255,255,255,0.96)",

    boxShadow:
      `
      0 0 12px rgba(255,0,128,0.62),
      0 0 28px rgba(255,0,128,0.32),
      inset 0 0 12px rgba(255,255,255,0.18)
    `,

    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",

    zIndex: 5,
  },

  /**
   * ======================================
   * 🔥 INNER RING
   * ======================================
   */

  innerRing: {
    width: 22,
    height: 22,

    borderRadius:
      "50%",

    background:
      "rgba(0,0,0,0.28)",

    border:
      "2px solid rgba(255,255,255,0.72)",

    display: "flex",
    alignItems:
      "center",
    justifyContent:
      "center",

    transform:
      "rotate(45deg)",
  },

  /**
   * ======================================
   * 🔥 CENTER DOT
   * ======================================
   */

  centerDot: {
    width: 10,
    height: 10,

    borderRadius:
      "50%",

    background:
      "#ffffff",

    boxShadow:
      `
      0 0 8px rgba(255,255,255,0.52)
    `,
  },
};

export default memo(
  MapMarker
);