"use strict";

/**
 * =====================================================
 * 🔥 MAP CONTROLLER (FINAL UPGRADE - PRODUCTION)
 * ✔ 기존 기능 100% 유지
 * ✔ 좌표 검증 강화
 * ✔ API 안정성 강화
 * ✔ 에러 처리 개선
 * ✔ 빈 결과 대응
 * ✔ 확장 기능 추가
 * =====================================================
 */

const kakaoService = require("../services/kakaoMap.service");

/* ===================================================== */
const ok = (res, data = {}) =>
  res.json({ ok: true, ...data });

const fail = (res, msg = "ERROR", code = 400) =>
  res.status(code).json({ ok: false, msg });

const safeAsync = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    console.error("MAP ERROR:", err.message);
    fail(res, err.message || "SERVER_ERROR", 500);
  }
};

/* =====================================================
🔥 공통 유틸
===================================================== */
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* =====================================================
🔥 1. 주소 → 좌표
===================================================== */
exports.geocode = safeAsync(async (req, res) => {
  const { address } = req.query;

  if (!address) return fail(res, "ADDRESS_REQUIRED");

  const result = await kakaoService.addressToCoord(address);

  if (!result) return fail(res, "NOT_FOUND", 404);

  ok(res, { result });
});

/* =====================================================
🔥 2. 좌표 → 주소
===================================================== */
exports.reverse = safeAsync(async (req, res) => {
  const lat = toNum(req.query.lat);
  const lng = toNum(req.query.lng);

  if (!lat || !lng) return fail(res, "COORD_INVALID");

  const result = await kakaoService.coordToAddress(lat, lng);

  if (!result) return fail(res, "NOT_FOUND", 404);

  ok(res, { result });
});

/* =====================================================
🔥 3. 키워드 검색
===================================================== */
exports.search = safeAsync(async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) return fail(res, "KEYWORD_REQUIRED");

  const list = await kakaoService.searchKeyword(keyword);

  ok(res, {
    total: list?.length || 0,
    list: list || [],
  });
});

/* =====================================================
🔥 4. 주변 검색
===================================================== */
exports.nearby = safeAsync(async (req, res) => {
  const lat = toNum(req.query.lat);
  const lng = toNum(req.query.lng);

  if (!lat || !lng) return fail(res, "COORD_INVALID");

  const list = await kakaoService.searchNearby(lat, lng);

  ok(res, {
    total: list?.length || 0,
    list: list || [],
  });
});

/* =====================================================
🔥 5. 거리 계산
===================================================== */
exports.distance = safeAsync(async (req, res) => {
  const lat1 = toNum(req.query.lat1);
  const lng1 = toNum(req.query.lng1);
  const lat2 = toNum(req.query.lat2);
  const lng2 = toNum(req.query.lng2);

  if (!lat1 || !lng1 || !lat2 || !lng2) {
    return fail(res, "INVALID_COORD");
  }

  const distance = kakaoService.calcDistance(
    lat1,
    lng1,
    lat2,
    lng2
  );

  if (!Number.isFinite(distance)) {
    return fail(res, "DISTANCE_ERROR");
  }

  ok(res, { distance });
});

/* =====================================================
🔥 6. 자동완성
===================================================== */
exports.autocomplete = safeAsync(async (req, res) => {
  const { q } = req.query;

  if (!q) return fail(res, "QUERY_REQUIRED");

  const list = await kakaoService.searchKeyword(q, { size: 5 });

  ok(res, { list: list || [] });
});

/* =====================================================
🔥 7. 통합 검색
===================================================== */
exports.searchAll = safeAsync(async (req, res) => {
  const { q } = req.query;

  if (!q) return fail(res, "QUERY_REQUIRED");

  const list = await kakaoService.searchKeyword(q);

  ok(res, {
    total: list?.length || 0,
    list: list || [],
  });
});

/* =====================================================
🔥 8. 헬스 체크
===================================================== */
exports.health = (req, res) => {
  ok(res, {
    status: "ok",
    service: "kakao-map",
    time: new Date(),
  });
};

/* =====================================================
🔥 9. 디버그
===================================================== */
exports.debug = (req, res) => {
  ok(res, {
    query: req.query,
    ip: req.ip,
    headers: req.headers["user-agent"],
    time: Date.now(),
  });
};

/* =====================================================
🔥 10. 거리 + 매장 추천 (신규)
GET /map/recommend?lat=...&lng=...
===================================================== */
exports.recommend = safeAsync(async (req, res) => {
  const lat = toNum(req.query.lat);
  const lng = toNum(req.query.lng);

  if (!lat || !lng) return fail(res, "COORD_INVALID");

  const list = await kakaoService.searchNearby(lat, lng);

  const enriched = (list || []).map((item) => ({
    ...item,
    distance: kakaoService.calcDistance(
      lat,
      lng,
      item.y,
      item.x
    ),
  }));

  enriched.sort((a, b) => a.distance - b.distance);

  ok(res, {
    total: enriched.length,
    list: enriched.slice(0, 10),
  });
});