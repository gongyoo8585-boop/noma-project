"use strict";

import { useEffect, useState } from "react";

/**
 * =====================================================
 * 🔥 USE DEBOUNCE (FINAL COMPLETE)
 * ✔ 값 변경 지연 처리 (debounce)
 * ✔ 입력 / 검색 최적화용
 * ✔ delay 안전 처리
 * ✔ NaN / undefined 100% 방어
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 300) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function useDebounce(value, delay = 300) {
  const safeDelay = toNumber(delay, 300);

  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, safeDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, safeDelay]);

  return debouncedValue;
}

export default useDebounce;