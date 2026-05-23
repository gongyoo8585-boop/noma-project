"use strict";

/**
 * =====================================================
 * 🔥 MAP ROUTES (ULTRA FINAL)
 * ✔ map.controller 연결
 * ✔ REST API 구성
 * ✔ 확장 기능 강화
 * ✔ 캐싱 / 성능 개선
 * ✔ 보안 / rate limit 강화
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

const express = require("express");
const router = express.Router();

/* =====================================================
🔥 CONTROLLER
===================================================== */
const ctrl = require("../controllers/map.controller");

/* =====================================================
🔥 UTIL (안전 실행)
===================================================== */
const safe = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error("MAP ROUTE ERROR:", err);
    res.status(500).json({
      ok: false,
      msg: err.message || "SERVER_ERROR",
    });
  });

/* =====================================================
🔥 SIMPLE CACHE (성능 향상)
===================================================== */
const CACHE = new Map();
const CACHE_TTL = 1000 * 10; // 10초

const getCache = (key) => {
  const item = CACHE.get(key);
  if (!item) return null;
  if (Date.now() - item.time > CACHE_TTL) {
    CACHE.delete(key);
    return null;
  }
  return item.value;
};

const setCache = (key, value) => {
  CACHE.set(key, { value, time: Date.now() });
};

/* =====================================================
🔥 BASIC
===================================================== */

/* 헬스 */
router.get("/health", ctrl.health);

/* 디버그 */
router.get("/debug", ctrl.debug);

/* =====================================================
🔥 GEO
===================================================== */

/* 주소 → 좌표 */
router.get("/geocode", safe(async (req, res) => {
  const key = "geocode:" + JSON.stringify(req.query);
  const cached = getCache(key);
  if (cached) return res.json({ ok: true, cached: true, ...cached });

  const result = await ctrl.geocode(req, res);
  setCache(key, result);
}));

/* 좌표 → 주소 */
router.get("/reverse", safe(async (req, res) => {
  const key = "reverse:" + JSON.stringify(req.query);
  const cached = getCache(key);
  if (cached) return res.json({ ok: true, cached: true, ...cached });

  const result = await ctrl.reverse(req, res);
  setCache(key, result);
}));

/* 거리 계산 */
router.get("/distance", safe(ctrl.distance));

/* =====================================================
🔥 SEARCH
===================================================== */

/* 키워드 검색 */
router.get("/search", safe(async (req, res) => {
  const key = "search:" + JSON.stringify(req.query);
  const cached = getCache(key);
  if (cached) return res.json({ ok: true, cached: true, ...cached });

  const result = await ctrl.search(req, res);
  setCache(key, result);
}));

/* 자동완성 */
router.get("/autocomplete", safe(ctrl.autocomplete));

/* 통합 검색 */
router.get("/all", safe(ctrl.searchAll));

/* 주변 검색 */
router.get("/nearby", safe(ctrl.nearby));

/* =====================================================
🔥 ADVANCED (확장 기능)
===================================================== */

/* 지도 중심 기반 검색 */
router.get("/center", safe(async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({
      ok: false,
      msg: "COORD_REQUIRED",
    });
  }

  return ctrl.nearby(req, res);
}));

/* 좌표 배열 거리 계산 */
router.post("/distance/bulk", safe(async (req, res) => {
  const { points = [] } = req.body;

  if (!Array.isArray(points)) {
    return res.status(400).json({
      ok: false,
      msg: "INVALID_POINTS",
    });
  }

  const { calcDistance } = require("../services/kakaoMap.service");

  const result = points.map((p) => {
    if (!p.lat1 || !p.lng1 || !p.lat2 || !p.lng2) return null;

    return {
      ...p,
      distance: calcDistance(
        Number(p.lat1),
        Number(p.lng1),
        Number(p.lat2),
        Number(p.lng2)
      ),
    };
  });

  res.json({
    ok: true,
    result,
  });
}));

/* =====================================================
🔥 신규 기능
===================================================== */

/* 지도 히트맵 데이터 */
router.get("/heatmap", safe(ctrl.heatmap));

/* 인기 장소 */
router.get("/popular", safe(ctrl.popular));

/* 경로 추천 */
router.get("/route", safe(ctrl.route));

/* =====================================================
🔥 RATE LIMIT (강화)
===================================================== */
const RATE = new Map();

router.use((req, res, next) => {
  const now = Date.now();
  const list = RATE.get(req.ip) || [];

  const filtered = list.filter((t) => now - t < 1000);
  filtered.push(now);

  RATE.set(req.ip, filtered);

  if (filtered.length > 120) {
    return res.status(429).json({
      ok: false,
      msg: "RATE_LIMIT",
    });
  }

  next();
});

/* =====================================================
🔥 FALLBACK
===================================================== */
router.use((req, res) => {
  res.status(404).json({
    ok: false,
    msg: "MAP_ROUTE_NOT_FOUND",
  });
});

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = router;