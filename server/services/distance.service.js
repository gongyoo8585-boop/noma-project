"use strict";

/**
 * =====================================================
 * 🔥 DISTANCE SERVICE (FINAL COMPLETE)
 * 거리 계산 공통 서비스
 * - Haversine 거리 계산
 * - km / meter 변환
 * - 반경 필터
 * - 가까운 순 정렬
 * - 좌표 검증
 * - 매장/예약/지도 서비스 공통 사용
 * =====================================================
 */

/* =====================================================
🔥 CONSTANTS
===================================================== */
const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_M = 6371000;

/* =====================================================
🔥 UTIL
===================================================== */
function safeNum(value, defaultValue = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function toRad(value) {
  return (safeNum(value) * Math.PI) / 180;
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

/* =====================================================
🔥 1. 거리 계산 KM
===================================================== */
function calcDistanceKm(lat1, lng1, lat2, lng2) {
  if (!hasValidCoord(lat1, lng1) || !hasValidCoord(lat2, lng2)) {
    return 999999;
  }

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((EARTH_RADIUS_KM * c).toFixed(3));
}

/* =====================================================
🔥 2. 거리 계산 METER
===================================================== */
function calcDistanceMeter(lat1, lng1, lat2, lng2) {
  if (!hasValidCoord(lat1, lng1) || !hasValidCoord(lat2, lng2)) {
    return 999999999;
  }

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_M * c);
}

/* =====================================================
🔥 3. 거리 문자열
===================================================== */
function formatDistance(km) {
  const distance = safeNum(km, 999999);

  if (distance >= 999999) return "거리 정보 없음";

  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }

  return `${distance.toFixed(1)}km`;
}

/* =====================================================
🔥 4. 아이템에 거리 붙이기
===================================================== */
function attachDistance(items = [], lat, lng, options = {}) {
  if (!Array.isArray(items)) return [];

  if (!hasValidCoord(lat, lng)) {
    return items.map((item) => ({
      ...item,
      distanceKm: 999999,
      distanceMeter: 999999999,
      distanceText: "거리 정보 없음",
    }));
  }

  const base = normalizeCoord(lat, lng);

  return items.map((item) => {
    const obj = item && item.toObject ? item.toObject() : { ...item };

    const targetLat =
      obj.lat ??
      obj.latitude ??
      obj.y ??
      obj.coord?.lat ??
      obj.location?.lat;

    const targetLng =
      obj.lng ??
      obj.longitude ??
      obj.x ??
      obj.coord?.lng ??
      obj.location?.lng;

    const distanceKm = calcDistanceKm(
      base.lat,
      base.lng,
      targetLat,
      targetLng
    );

    const distanceMeter = calcDistanceMeter(
      base.lat,
      base.lng,
      targetLat,
      targetLng
    );

    return {
      ...obj,
      distanceKm,
      distanceMeter,
      distanceText: formatDistance(distanceKm),
      withinRadius:
        options.radiusKm != null
          ? distanceKm <= safeNum(options.radiusKm)
          : true,
    };
  });
}

/* =====================================================
🔥 5. 가까운 순 정렬
===================================================== */
function sortByDistance(items = []) {
  if (!Array.isArray(items)) return [];

  return [...items].sort(
    (a, b) => safeNum(a.distanceKm, 999999) - safeNum(b.distanceKm, 999999)
  );
}

/* =====================================================
🔥 6. 반경 KM 필터
===================================================== */
function filterByRadiusKm(items = [], radiusKm = 5) {
  if (!Array.isArray(items)) return [];

  const radius = safeNum(radiusKm, 5);

  return items.filter((item) => safeNum(item.distanceKm, 999999) <= radius);
}

/* =====================================================
🔥 7. 반경 METER 필터
===================================================== */
function filterByRadiusMeter(items = [], radiusMeter = 5000) {
  if (!Array.isArray(items)) return [];

  const radius = safeNum(radiusMeter, 5000);

  return items.filter(
    (item) => safeNum(item.distanceMeter, 999999999) <= radius
  );
}

/* =====================================================
🔥 8. 가까운 N개
===================================================== */
function getNearest(items = [], count = 10) {
  if (!Array.isArray(items)) return [];

  return sortByDistance(items).slice(0, Math.max(1, safeNum(count, 10)));
}

/* =====================================================
🔥 9. 두 좌표가 반경 안인지 확인
===================================================== */
function isWithinRadius(lat1, lng1, lat2, lng2, radiusKm = 5) {
  const distanceKm = calcDistanceKm(lat1, lng1, lat2, lng2);
  return distanceKm <= safeNum(radiusKm, 5);
}

/* =====================================================
🔥 10. 중심 좌표 기준 주변 정렬
===================================================== */
function nearby(items = [], lat, lng, options = {}) {
  const radiusKm =
    options.radiusKm != null
      ? safeNum(options.radiusKm, 5)
      : null;

  let result = attachDistance(items, lat, lng, {
    radiusKm,
  });

  if (radiusKm != null) {
    result = filterByRadiusKm(result, radiusKm);
  }

  result = sortByDistance(result);

  if (options.limit) {
    result = result.slice(0, safeNum(options.limit, 20));
  }

  return result;
}

/* =====================================================
🔥 11. 평균 거리
===================================================== */
function averageDistance(items = []) {
  if (!Array.isArray(items) || items.length === 0) return 0;

  const valid = items.filter((v) => safeNum(v.distanceKm, 999999) < 999999);
  if (valid.length === 0) return 0;

  const sum = valid.reduce((acc, cur) => acc + safeNum(cur.distanceKm), 0);

  return Number((sum / valid.length).toFixed(3));
}

/* =====================================================
🔥 12. 거리 통계
===================================================== */
function distanceStats(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
    };
  }

  const distances = items
    .map((v) => safeNum(v.distanceKm, 999999))
    .filter((v) => v < 999999);

  if (distances.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
    };
  }

  const min = Math.min(...distances);
  const max = Math.max(...distances);
  const avg =
    distances.reduce((acc, cur) => acc + cur, 0) / distances.length;

  return {
    count: distances.length,
    min: Number(min.toFixed(3)),
    max: Number(max.toFixed(3)),
    avg: Number(avg.toFixed(3)),
  };
}

/* =====================================================
🔥 13. 좌표 배열 거리 매트릭스
===================================================== */
function distanceMatrix(points = []) {
  if (!Array.isArray(points)) return [];

  return points.map((from, i) => {
    return points.map((to, j) => {
      if (i === j) return 0;

      return calcDistanceKm(
        from.lat,
        from.lng,
        to.lat,
        to.lng
      );
    });
  });
}

/* =====================================================
🔥 14. 헬스 체크
===================================================== */
function health() {
  return {
    ok: true,
    service: "distance.service",
    earthRadiusKm: EARTH_RADIUS_KM,
    time: Date.now(),
  };
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  EARTH_RADIUS_KM,
  EARTH_RADIUS_M,

  safeNum,
  hasValidCoord,
  normalizeCoord,

  calcDistanceKm,
  calcDistanceMeter,
  formatDistance,

  attachDistance,
  sortByDistance,
  filterByRadiusKm,
  filterByRadiusMeter,
  getNearest,
  isWithinRadius,
  nearby,

  averageDistance,
  distanceStats,
  distanceMatrix,

  health,
};