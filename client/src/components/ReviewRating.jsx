"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 REVIEW RATING (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ NaN / 소수점 안전 처리 추가 (최소 수정)
 * ✔ 나머지 구조 / 로직 변경 없음
 * =====================================================
 */

function ReviewRating({
  value = 0,
  onChange = null,
  size = 20,
  readonly = false,
}) {
  const safeValue = Math.max(0, Math.min(5, Math.floor(Number(value) || 0))); // 🔥 안전 처리 추가

  const handleClick = (num) => {
    if (readonly) return;
    if (onChange) onChange(num);
  };

  return (
    <div style={wrap}>
      {[1, 2, 3, 4, 5].map((num) => (
        <span
          key={num}
          onClick={() => handleClick(num)}
          style={{
            ...star,
            fontSize: size,
            color: num <= safeValue ? "#FFD700" : "#444",
            cursor: readonly ? "default" : "pointer",
          }}
        >
          ★
        </span>
      ))}

      <span style={score}>{safeValue}점</span>
    </div>
  );
}

/* =========================
STYLE
========================= */

const wrap = {
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const star = {
  transition: "0.2s",
};

const score = {
  marginLeft: 6,
  fontSize: 12,
  color: "#aaa",
};

export default ReviewRating;