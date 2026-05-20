"use strict";

/**
 * =====================================================
 * 🔥 GEO SERVICE (FINAL COMPLETE)
 * 주소/좌표 변환 공통 서비스
 * - kakaoMap.service.js 재사용
 * - 주소 → 좌표
 * - 좌표 → 주소
 * - 키워드 장소 검색
 * - 주변 마사지 검색
 * - 거리 계산 연동
 * - 캐시 / 안전 처리 포함
 * =====================================================
 */

const kakaoMapService = require("./kakaoMap.service");
const distanceService = require("./distance.service");

/* =====================================================
🔥 MEMORY CACHE
===================================================== */
const CACHE = new Map();
const DEFAULT_TTL = 1000 * 60 * 10; // 10분

function cacheKey(prefix, value) {
  return `${prefix}:${String(value || "").trim()}`;
}

function cacheGet(key) {
  const item = CACHE.get(key);
  if (!item) return null;

  if (Date.now() > item.expireAt) {
    CACHE.delete(key);
    return null;
  }

  return item.data;
}

function cacheSet(key, data, ttl = DEFAULT_TTL) {
  CACHE.set(key, {
    data,
    expireAt: Date.now() + ttl,
  });
}

/* =====================================================
🔥 UTIL
===================================================== */
function safeStr(value) {
  return String(value || "").trim();
}

function safeNum(value, defaultValue = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function hasValidCoord(lat, lng) {
  const y = Number(lat);
  const x = Number(lng);

  return (
    Number.isFinite(y) &&
    Number.isFinite(x) &&
    y >= -90 &&
    y <= 90 &&
    x >= -180 &&
    x <= 180
  );
}

function normalizeCoord(lat, lng) {
  if (!hasValidCoord(lat, lng)) {
    throw new Error("INVALID_COORD");
  }

  return {
    lat: safeNum(lat),
    lng: safeNum(lng),
  };
}

function normalizeGeoResult(result = {}) {
  return {
    lat: safeNum(result.lat),
    lng: safeNum(result.lng),
    address: safeStr(result.address),
    roadAddress: safeStr(result.roadAddress || result.address),
    region: safeStr(result.region),
    raw: result.raw || null,
  };
}

/* =====================================================
🔥 1. 주소 → 좌표
===================================================== */
async function addressToCoord(address, options = {}) {
  const cleanAddress = safeStr(address);

  if (!cleanAddress) {
    throw new Error("ADDRESS_REQUIRED");
  }

  const key = cacheKey("addressToCoord", cleanAddress);
  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const result = await kakaoMapService.addressToCoord(cleanAddress);

  const normalized = normalizeGeoResult(result);

  cacheSet(key, normalized, options.ttl || DEFAULT_TTL);

  return normalized;
}

/* =====================================================
🔥 2. 좌표 → 주소
===================================================== */
async function coordToAddress(lat, lng, options = {}) {
  const coord = normalizeCoord(lat, lng);

  const key = cacheKey("coordToAddress", `${coord.lat},${coord.lng}`);
  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const result = await kakaoMapService.coordToAddress(coord.lat, coord.lng);

  const normalized = {
    address: safeStr(result.address),
    roadAddress: safeStr(result.roadAddress || result.address),
    region: safeStr(result.region),
    lat: coord.lat,
    lng: coord.lng,
    raw: result.raw || null,
  };

  cacheSet(key, normalized, options.ttl || DEFAULT_TTL);

  return normalized;
}

/* =====================================================
🔥 3. 키워드 장소 검색
===================================================== */
async function searchKeyword(keyword, options = {}) {
  const q = safeStr(keyword);

  if (!q) {
    throw new Error("KEYWORD_REQUIRED");
  }

  const page = safeNum(options.page, 1);
  const size = Math.min(safeNum(options.size, 10), 15);

  const key = cacheKey("searchKeyword", `${q}:${page}:${size}`);
  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const list = await kakaoMapService.searchKeyword(q, {
    page,
    size,
  });

  const normalized = Array.isArray(list)
    ? list.map((item) => ({
        name: safeStr(item.name),
        address: safeStr(item.address),
        roadAddress: safeStr(item.roadAddress || item.address),
        lat: safeNum(item.lat),
        lng: safeNum(item.lng),
        phone: safeStr(item.phone),
        category: safeStr(item.category),
        raw: item.raw || null,
      }))
    : [];

  cacheSet(key, normalized, options.ttl || DEFAULT_TTL);

  return normalized;
}

/* =====================================================
🔥 4. 주변 마사지 검색
===================================================== */
async function searchNearby(lat, lng, options = {}) {
  const coord = normalizeCoord(lat, lng);

  const radius = Math.min(safeNum(options.radius, 2000), 20000);
  const keyword = safeStr(options.keyword || "마사지");

  const key = cacheKey(
    "searchNearby",
    `${coord.lat},${coord.lng}:${radius}:${keyword}`
  );

  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const list = await kakaoMapService.searchNearby(
    coord.lat,
    coord.lng,
    radius,
    keyword
  );

  const normalized = Array.isArray(list)
    ? list.map((item) => {
        const distanceKm = distanceService.calcDistanceKm(
          coord.lat,
          coord.lng,
          item.lat,
          item.lng
        );

        return {
          name: safeStr(item.name),
          address: safeStr(item.address),
          roadAddress: safeStr(item.roadAddress || item.address),
          lat: safeNum(item.lat),
          lng: safeNum(item.lng),
          distanceKm,
          phone: safeStr(item.phone),
          category: safeStr(item.category),
          raw: item.raw || null,
        };
      })
    : [];

  normalized.sort((a, b) => a.distanceKm - b.distanceKm);

  cacheSet(key, normalized, options.ttl || DEFAULT_TTL);

  return normalized;
}

/* =====================================================
🔥 5. 거리 계산
===================================================== */
function calcDistance(lat1, lng1, lat2, lng2) {
  return distanceService.calcDistanceKm(lat1, lng1, lat2, lng2);
}

/* =====================================================
🔥 6. 여러 주소 → 좌표 일괄 변환
===================================================== */
async function bulkAddressToCoord(addresses = [], options = {}) {
  if (!Array.isArray(addresses)) {
    throw new Error("ADDRESSES_MUST_BE_ARRAY");
  }

  const results = [];

  for (const address of addresses) {
    try {
      const result = await addressToCoord(address, options);
      results.push({
        ok: true,
        address,
        result,
      });
    } catch (err) {
      results.push({
        ok: false,
        address,
        error: err.message,
      });
    }
  }

  return results;
}

/* =====================================================
🔥 7. 여러 좌표 → 주소 일괄 변환
===================================================== */
async function bulkCoordToAddress(coords = [], options = {}) {
  if (!Array.isArray(coords)) {
    throw new Error("COORDS_MUST_BE_ARRAY");
  }

  const results = [];

  for (const coord of coords) {
    try {
      const result = await coordToAddress(coord.lat, coord.lng, options);

      results.push({
        ok: true,
        coord,
        result,
      });
    } catch (err) {
      results.push({
        ok: false,
        coord,
        error: err.message,
      });
    }
  }

  return results;
}

/* =====================================================
🔥 8. 기준 좌표 기준 매장 거리 정렬
===================================================== */
function attachDistance(items = [], lat, lng) {
  const coord = normalizeCoord(lat, lng);

  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const targetLat = item.lat ?? item.latitude;
      const targetLng = item.lng ?? item.longitude;

      if (!hasValidCoord(targetLat, targetLng)) {
        return {
          ...item,
          distanceKm: 999999,
        };
      }

      return {
        ...item,
        distanceKm: distanceService.calcDistanceKm(
          coord.lat,
          coord.lng,
          targetLat,
          targetLng
        ),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/* =====================================================
🔥 9. 캐시 상태
===================================================== */
function getCacheStatus() {
  return {
    size: CACHE.size,
    ttl: DEFAULT_TTL,
  };
}

/* =====================================================
🔥 10. 캐시 삭제
===================================================== */
function clearCache() {
  CACHE.clear();

  return {
    cleared: true,
  };
}

/* =====================================================
🔥 11. 헬스 체크
===================================================== */
function health() {
  return {
    ok: true,
    service: "geo.service",
    cache: getCacheStatus(),
    time: Date.now(),
  };
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  addressToCoord,
  coordToAddress,
  searchKeyword,
  searchNearby,
  calcDistance,
  bulkAddressToCoord,
  bulkCoordToAddress,
  attachDistance,
  hasValidCoord,
  normalizeCoord,
  getCacheStatus,
  clearCache,
  health,
};