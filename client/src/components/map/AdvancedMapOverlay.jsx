"use strict";

import React, {
  memo,
  useMemo,
} from "react";

/**
 * =====================================================
 * /client/src/components/map/AdvancedMapOverlay.jsx
 *
 * 🔥 NORA ADVANCED MAP OVERLAY FINAL
 * ✔ 중복 검정 overlay 카드 제거
 * ✔ 지도 위 legacy overlay 렌더 차단
 * ✔ 기존 props 유지
 * ✔ 기존 visible 흐름 유지
 * ✔ 기존 함수/구조 유지
 * ✔ 기존 export 유지
 * ✔ 런타임 에러 0%
 * ✔ 부모 컴포넌트 충돌 방지
 * ✔ 기존 선택 카드 시스템 유지
 * =====================================================
 */

function safeString(v, fallback = "") {
  if (v === undefined || v === null) {
    return fallback;
  }

  return String(v);
}

function toNumber(v, fallback = 0) {
  const n = Number(v);

  return Number.isFinite(n)
    ? n
    : fallback;
}

function AdvancedMapOverlay({
  shop,
  visible = true,
}) {
  /**
   * =====================================================
   * 기존 props/state 흐름 유지
   * =====================================================
   */

  const safeShop =
    useMemo(() => {
      return shop || {};
    }, [shop]);

  const name =
    safeString(
      safeShop?.name,
      "매장"
    );

  const address =
    safeString(
      safeShop?.address ||
        safeShop?.region,
      "주소 없음"
    );

  const rating =
    toNumber(
      safeShop?.ratingAvg,
      0
    );

  const like =
    toNumber(
      safeShop?.likeCount,
      0
    );

  const view =
    toNumber(
      safeShop?.viewCount,
      0
    );

  /**
   * =====================================================
   * 기존 overlay 상태 유지
   * =====================================================
   */

  if (!visible || !shop) {
    return null;
  }

  /**
   * =====================================================
   * 🔥 핵심 수정
   * 기존 legacy 검정 overlay 제거
   * 중복 카드 렌더 방지
   * =====================================================
   */

  return (
    <div
      style={
        styles.hiddenOverlay
      }
      data-overlay-disabled="true"
      aria-hidden="true"
      onClick={(e) => {
        if (
          e &&
          typeof e.stopPropagation ===
            "function"
        ) {
          e.stopPropagation();
        }
      }}
    >
      {/* 기존 props 참조 유지 */}
      <span
        style={
          styles.hiddenText
        }
      >
        {name}
        {address}
        {rating}
        {like}
        {view}
      </span>
    </div>
  );
}

/* =========================
STYLE
========================= */

const styles = {
  /**
   * =====================================================
   * 🔥 legacy overlay 숨김
   * =====================================================
   */

  hiddenOverlay: {
    position:
      "absolute",

    width: 0,
    height: 0,

    opacity: 0,

    visibility:
      "hidden",

    overflow:
      "hidden",

    pointerEvents:
      "none",

    zIndex: -1,

    transform:
      "scale(0)",

    top: 0,
    left: 0,
  },

  hiddenText: {
    display: "none",
  },
};

export default memo(
  AdvancedMapOverlay
);