"use strict";

/**
 * =====================================================
 * 🔥 KAKAO MAP SERVICE (FINAL COMPLETE)
 * 카카오 지도/로컬 API 공통 서비스
 *
 * 기능:
 * - 주소 → 좌표 변환
 * - 좌표 → 주소 변환
 * - 키워드 장소 검색
 * - 주변 장소 검색
 * - 카테고리 검색
 * - 거리 계산
 * - 캐시
 * - 안전한 에러 처리
 * =====================================================
 */

const axios = require("axios");

/* =====================================================
🔥 ENV
===================================================== */
const KAKAO_ADMIN_KEY = process.env.KAKAO_ADMIN_KEY || "";
const KAKAO_REST_KEY = process.env.KAKAO_REST_API_KEY || "";
const KAKAO_KEY = KAKAO_ADMIN_KEY || KAKAO_REST_KEY;

const BASE_URL = "https://dapi.kakao.com";
const DEFAULT_TIMEOUT = Number(process.env.KAKAO_API_TIMEOUT || 7000);

/* =====================================================
🔥 CACHE
===================================================== */
const CACHE = new Map();
const DEFAULT_TTL = 1000 * 60 * 10;

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

function requireKakaoKey() {
  if (!KAKAO_KEY) {
    throw new Error("KAKAO_KEY_REQUIRED");
  }
}

function normalizeAddressDocument(doc = {}) {
  const address = doc.address || {};
  const roadAddress = doc.road_address || {};

  return {
    lat: safeNum(doc.y),
    lng: safeNum(doc.x),
    address: safeStr(doc.address_name || address.address_name),
    roadAddress: safeStr(roadAddress.address_name || doc.road_address_name),
    region: safeStr(address.region_1depth_name || roadAddress.region_1depth_name),
    city: safeStr(address.region_2depth_name || roadAddress.region_2depth_name),
    district: safeStr(address.region_3depth_name || roadAddress.region_3depth_name),
    raw: doc,
  };
}

function normalizeKeywordDocument(doc = {}) {
  return {
    id: safeStr(doc.id),
    name: safeStr(doc.place_name),
    address: safeStr(doc.address_name),
    roadAddress: safeStr(doc.road_address_name),
    lat: safeNum(doc.y),
    lng: safeNum(doc.x),
    phone: safeStr(doc.phone),
    category: safeStr(doc.category_name),
    categoryGroupCode: safeStr(doc.category_group_code),
    categoryGroupName: safeStr(doc.category_group_name),
    placeUrl: safeStr(doc.place_url),
    distance: safeNum(doc.distance),
    raw: doc,
  };
}

/* =====================================================
🔥 KAKAO REQUEST
===================================================== */
async function kakaoRequest(endpoint, params = {}, options = {}) {
  requireKakaoKey();

  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      params,
      timeout: options.timeout || DEFAULT_TIMEOUT,
      headers: {
        Authorization: `KakaoAK ${KAKAO_KEY.replace(/^KakaoAK\s+/i, "")}`,
      },
    });

    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "KAKAO_API_ERROR";

    console.error("[KAKAO MAP SERVICE ERROR]", {
      endpoint,
      status,
      message,
    });

    const err = new Error(message);
    err.status = status || 500;
    err.code = "KAKAO_API_ERROR";
    throw err;
  }
}

/* =====================================================
🔥 1. 주소 → 좌표
===================================================== */
async function addressToCoord(address, options = {}) {
  const query = safeStr(address);

  if (!query) {
    throw new Error("ADDRESS_REQUIRED");
  }

  const key = cacheKey("address", query);
  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const data = await kakaoRequest("/v2/local/search/address.json", {
    query,
    page: options.page || 1,
    size: options.size || 10,
    analyze_type: options.analyzeType || "similar",
  });

  const documents = Array.isArray(data.documents) ? data.documents : [];

  if (documents.length === 0) {
    throw new Error("ADDRESS_NOT_FOUND");
  }

  const result = normalizeAddressDocument(documents[0]);

  cacheSet(key, result, options.ttl || DEFAULT_TTL);

  return result;
}

/* =====================================================
🔥 2. 주소 검색 전체 목록
===================================================== */
async function searchAddress(address, options = {}) {
  const query = safeStr(address);

  if (!query) {
    throw new Error("ADDRESS_REQUIRED");
  }

  const key = cacheKey("searchAddress", `${query}:${options.page || 1}:${options.size || 10}`);
  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const data = await kakaoRequest("/v2/local/search/address.json", {
    query,
    page: options.page || 1,
    size: Math.min(safeNum(options.size, 10), 30),
    analyze_type: options.analyzeType || "similar",
  });

  const result = {
    meta: data.meta || {},
    documents: (data.documents || []).map(normalizeAddressDocument),
  };

  cacheSet(key, result, options.ttl || DEFAULT_TTL);

  return result;
}

/* =====================================================
🔥 3. 좌표 → 주소
===================================================== */
async function coordToAddress(lat, lng, options = {}) {
  if (!hasValidCoord(lat, lng)) {
    throw new Error("INVALID_COORD");
  }

  const y = safeNum(lat);
  const x = safeNum(lng);

  const key = cacheKey("coord", `${y},${x}`);
  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const data = await kakaoRequest("/v2/local/geo/coord2address.json", {
    x,
    y,
    input_coord: options.inputCoord || "WGS84",
  });

  const doc = data.documents?.[0];

  if (!doc) {
    throw new Error("ADDRESS_NOT_FOUND");
  }

  const address = doc.address || {};
  const roadAddress = doc.road_address || {};

  const result = {
    lat: y,
    lng: x,
    address: safeStr(address.address_name),
    roadAddress: safeStr(roadAddress.address_name),
    region: safeStr(address.region_1depth_name || roadAddress.region_1depth_name),
    city: safeStr(address.region_2depth_name || roadAddress.region_2depth_name),
    district: safeStr(address.region_3depth_name || roadAddress.region_3depth_name),
    raw: doc,
  };

  cacheSet(key, result, options.ttl || DEFAULT_TTL);

  return result;
}

/* =====================================================
🔥 4. 좌표 → 행정구역
===================================================== */
async function coordToRegion(lat, lng, options = {}) {
  if (!hasValidCoord(lat, lng)) {
    throw new Error("INVALID_COORD");
  }

  const y = safeNum(lat);
  const x = safeNum(lng);

  const key = cacheKey("region", `${y},${x}`);
  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const data = await kakaoRequest("/v2/local/geo/coord2regioncode.json", {
    x,
    y,
    input_coord: options.inputCoord || "WGS84",
  });

  const documents = Array.isArray(data.documents) ? data.documents : [];

  const result = documents.map((doc) => ({
    regionType: safeStr(doc.region_type),
    addressName: safeStr(doc.address_name),
    region1: safeStr(doc.region_1depth_name),
    region2: safeStr(doc.region_2depth_name),
    region3: safeStr(doc.region_3depth_name),
    code: safeStr(doc.code),
    x: safeNum(doc.x),
    y: safeNum(doc.y),
    raw: doc,
  }));

  cacheSet(key, result, options.ttl || DEFAULT_TTL);

  return result;
}

/* =====================================================
🔥 5. 키워드 장소 검색
===================================================== */
async function searchKeyword(keyword, options = {}) {
  const query = safeStr(keyword);

  if (!query) {
    throw new Error("KEYWORD_REQUIRED");
  }

  const page = safeNum(options.page, 1);
  const size = Math.min(safeNum(options.size, 10), 15);

  const key = cacheKey(
    "keyword",
    `${query}:${page}:${size}:${options.x || ""}:${options.y || ""}:${options.radius || ""}`
  );

  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const params = {
    query,
    page,
    size,
    sort: options.sort || "accuracy",
  };

  if (hasValidCoord(options.y, options.x)) {
    params.x = options.x;
    params.y = options.y;
  }

  if (options.radius) {
    params.radius = Math.min(safeNum(options.radius, 2000), 20000);
  }

  const data = await kakaoRequest("/v2/local/search/keyword.json", params);

  const result = (data.documents || []).map(normalizeKeywordDocument);

  cacheSet(key, result, options.ttl || DEFAULT_TTL);

  return result;
}

/* =====================================================
🔥 6. 주변 검색
===================================================== */
async function searchNearby(lat, lng, radius = 2000, keyword = "마사지", options = {}) {
  if (!hasValidCoord(lat, lng)) {
    throw new Error("INVALID_COORD");
  }

  return searchKeyword(keyword || "마사지", {
    ...options,
    x: safeNum(lng),
    y: safeNum(lat),
    radius: Math.min(safeNum(radius, 2000), 20000),
    sort: options.sort || "distance",
  });
}

/* =====================================================
🔥 7. 카테고리 검색
===================================================== */
async function searchCategory(categoryGroupCode, lat, lng, options = {}) {
  const code = safeStr(categoryGroupCode);

  if (!code) {
    throw new Error("CATEGORY_REQUIRED");
  }

  if (!hasValidCoord(lat, lng)) {
    throw new Error("INVALID_COORD");
  }

  const key = cacheKey(
    "category",
    `${code}:${lat},${lng}:${options.radius || 2000}:${options.page || 1}`
  );

  const cached = cacheGet(key);

  if (cached && !options.force) {
    return cached;
  }

  const data = await kakaoRequest("/v2/local/search/category.json", {
    category_group_code: code,
    x: safeNum(lng),
    y: safeNum(lat),
    radius: Math.min(safeNum(options.radius, 2000), 20000),
    page: options.page || 1,
    size: Math.min(safeNum(options.size, 10), 15),
    sort: options.sort || "distance",
  });

  const result = (data.documents || []).map(normalizeKeywordDocument);

  cacheSet(key, result, options.ttl || DEFAULT_TTL);

  return result;
}

/* =====================================================
🔥 8. 거리 계산
===================================================== */
function calcDistance(lat1, lng1, lat2, lng2) {
  if (!hasValidCoord(lat1, lng1) || !hasValidCoord(lat2, lng2)) {
    return 999999;
  }

  const toRad = (value) => (safeNum(value) * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((R * c).toFixed(3));
}

/* =====================================================
🔥 9. 거리 붙이기
===================================================== */
function attachDistance(items = [], lat, lng) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const obj = item && item.toObject ? item.toObject() : { ...item };

      return {
        ...obj,
        distanceKm: calcDistance(lat, lng, obj.lat, obj.lng),
      };
    })
    .sort((a, b) => safeNum(a.distanceKm, 999999) - safeNum(b.distanceKm, 999999));
}

/* =====================================================
🔥 10. 주소 여러 개 변환
===================================================== */
async function bulkAddressToCoord(addresses = [], options = {}) {
  if (!Array.isArray(addresses)) {
    throw new Error("ADDRESSES_MUST_BE_ARRAY");
  }

  const results = [];

  for (const address of addresses) {
    try {
      results.push({
        ok: true,
        address,
        result: await addressToCoord(address, options),
      });
    } catch (error) {
      results.push({
        ok: false,
        address,
        error: error.message,
      });
    }
  }

  return results;
}

/* =====================================================
🔥 11. 좌표 여러 개 주소 변환
===================================================== */
async function bulkCoordToAddress(coords = [], options = {}) {
  if (!Array.isArray(coords)) {
    throw new Error("COORDS_MUST_BE_ARRAY");
  }

  const results = [];

  for (const coord of coords) {
    try {
      results.push({
        ok: true,
        coord,
        result: await coordToAddress(coord.lat, coord.lng, options),
      });
    } catch (error) {
      results.push({
        ok: false,
        coord,
        error: error.message,
      });
    }
  }

  return results;
}

/* =====================================================
🔥 12. 캐시 상태
===================================================== */
function getCacheStatus() {
  return {
    size: CACHE.size,
    ttl: DEFAULT_TTL,
  };
}

/* =====================================================
🔥 13. 캐시 삭제
===================================================== */
function clearCache() {
  CACHE.clear();
  return { cleared: true };
}

/* =====================================================
🔥 14. 헬스 체크
===================================================== */
function health() {
  return {
    ok: true,
    service: "kakaoMap.service",
    keySet: !!KAKAO_KEY,
    cache: getCacheStatus(),
    time: Date.now(),
  };
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  addressToCoord,
  searchAddress,
  coordToAddress,
  coordToRegion,
  searchKeyword,
  searchNearby,
  searchCategory,

  calcDistance,
  attachDistance,

  bulkAddressToCoord,
  bulkCoordToAddress,

  hasValidCoord,
  getCacheStatus,
  clearCache,
  health,
};