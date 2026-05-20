"use strict";

/**
 * =====================================================
 * 🔥 HAVERSINE DISTANCE SERVICE (FINAL COMPLETE)
 * ✔ 위도/경도 거리 계산
 * ✔ km / meter 지원
 * ✔ NaN / null / undefined 100% 방어
 * ✔ 카카오 수준 거리 계산 기반
 * ✔ 외부 의존성 없음
 * ✔ 단일 파일 완성형
 * =====================================================
 */

const EARTH_RADIUS_KM = 6371;
const EARTH_RADIUS_METER = 6371000;

/* =========================
UTIL
========================= */
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isValidCoordinate(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  return (
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180
  );
}

function toRad(value) {
  return (toNumber(value) * Math.PI) / 180;
}

/* =========================
DISTANCE
========================= */
function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (!isValidCoordinate(lat1, lng1)) return null;
  if (!isValidCoordinate(lat2, lng2)) return null;

  const dLat = toRad(lat2) - toRad(lat1);
  const dLng = toRad(lng2) - toRad(lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

function getDistanceMeter(lat1, lng1, lat2, lng2) {
  if (!isValidCoordinate(lat1, lng1)) return null;
  if (!isValidCoordinate(lat2, lng2)) return null;

  const dLat = toRad(lat2) - toRad(lat1);
  const dLng = toRad(lng2) - toRad(lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METER * c;
}

/* =========================
FORMAT
========================= */
function formatDistance(meter) {
  const m = toNumber(meter, 0);

  if (m <= 0) return "0m";
  if (m < 1000) return `${Math.round(m)}m`;

  return `${(m / 1000).toFixed(1)}km`;
}

/* =========================
SHOP DISTANCE
========================= */
function getShopLat(shop) {
  return toNumber(shop?.lat ?? shop?.location?.lat, NaN);
}

function getShopLng(shop) {
  return toNumber(shop?.lng ?? shop?.location?.lng, NaN);
}

function attachDistance(shop, baseLat, baseLng) {
  if (!shop) return shop;

  const obj = shop.toObject ? shop.toObject() : { ...shop };

  const shopLat = getShopLat(obj);
  const shopLng = getShopLng(obj);

  const meter = getDistanceMeter(baseLat, baseLng, shopLat, shopLng);
  const km = meter === null ? null : meter / 1000;

  obj.distanceMeter = meter === null ? null : Math.round(meter);
  obj.distanceKm = km === null ? null : Number(km.toFixed(2));
  obj.distanceText = meter === null ? "" : formatDistance(meter);

  return obj;
}

function sortByDistance(list = [], baseLat, baseLng) {
  if (!Array.isArray(list)) return [];

  return list
    .map((shop) => attachDistance(shop, baseLat, baseLng))
    .sort((a, b) => {
      const da =
        a.distanceMeter === null || a.distanceMeter === undefined
          ? Number.MAX_SAFE_INTEGER
          : a.distanceMeter;

      const db =
        b.distanceMeter === null || b.distanceMeter === undefined
          ? Number.MAX_SAFE_INTEGER
          : b.distanceMeter;

      return da - db;
    });
}

function filterByRadius(list = [], baseLat, baseLng, radiusMeter = 5000) {
  if (!Array.isArray(list)) return [];

  const radius = toNumber(radiusMeter, 5000);

  return sortByDistance(list, baseLat, baseLng).filter((shop) => {
    if (shop.distanceMeter === null || shop.distanceMeter === undefined) {
      return false;
    }

    return shop.distanceMeter <= radius;
  });
}

/* =========================
EXPORT
========================= */
module.exports = {
  EARTH_RADIUS_KM,
  EARTH_RADIUS_METER,

  toNumber,
  isValidCoordinate,

  getDistanceKm,
  getDistanceMeter,
  formatDistance,

  attachDistance,
  sortByDistance,
  filterByRadius,
};