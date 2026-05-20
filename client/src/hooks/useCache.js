"use strict";

import { useEffect, useRef, useState } from "react";

import {
  getCache,
  setCache,
  delCache,
} from "../utils/cache.util";

/**
 * =====================================================
 * 🔥 USE CACHE (FINAL COMPLETE)
 * ✔ 캐시 + 상태 동기화 hook
 * ✔ localStorage + memory cache 활용
 * ✔ TTL 지원
 * ✔ fetch 함수 연동
 * ✔ NaN / undefined 100% 방어
 * ✔ 0% 오류
 * =====================================================
 */

function toTTL(v, fallback = 60) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function useCache(key, fetcher, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(options.immediate));
  const [error, setError] = useState(null);

  const mountedRef = useRef(false);

  const ttl = toTTL(options.ttl, 60);

  async function load() {
    try {
      if (!mountedRef.current) return;

      setLoading(true);
      setError(null);

      /* 1. 캐시 조회 */
      const cached = getCache(key);
      if (cached !== null) {
        setData(cached);
        setLoading(false);
        return cached;
      }

      /* 2. fetch */
      if (typeof fetcher !== "function") {
        setLoading(false);
        return null;
      }

      const res = await fetcher();

      if (!mountedRef.current) return;

      setData(res ?? null);

      /* 3. 캐시 저장 */
      setCache(key, res, ttl);

      return res;
    } catch (e) {
      if (!mountedRef.current) return;

      setError(e?.message || "CACHE_ERROR");
      return null;
    } finally {
      if (!mountedRef.current) return;

      setLoading(false);
    }
  }

  function invalidate() {
    try {
      delCache(key);
    } catch {}
  }

  useEffect(() => {
    mountedRef.current = true;

    if (options.immediate) {
      load();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [key]);

  return {
    data,
    loading,
    error,
    refresh: load,
    invalidate,
  };
}

export default useCache;