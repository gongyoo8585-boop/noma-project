"use strict";

/**
 * =====================================================
 * 🔥 KAKAO DISTANCE SERVICE (ULTRA FINAL)
 * =====================================================
 */

const haversine = require("./haversine.service");

const DISTANCE_CORRECTION = 1.08;

/* =========================
UTIL
========================= */
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* =========================
CORE DISTANCE
========================= */
function getDistanceMeter(lat1, lng1, lat2, lng2) {
  const base = haversine.getDistanceMeter(lat1, lng1, lat2, lng2);
  if (base === null) return null;

  return base * DISTANCE_CORRECTION;
}

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const m = getDistanceMeter(lat1, lng1, lat2, lng2);
  if (m === null) return null;

  return m / 1000;
}

function getDistanceText(lat1, lng1, lat2, lng2) {
  const m = getDistanceMeter(lat1, lng1, lat2, lng2);
  if (m === null) return "";

  return haversine.formatDistance(m);
}

/* =========================
SHOP 지원
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

  const lat = getShopLat(obj);
  const lng = getShopLng(obj);

  const meter = getDistanceMeter(baseLat, baseLng, lat, lng);

  obj.distanceMeter = meter === null ? null : Math.round(meter);
  obj.distanceKm =
    meter === null ? null : Number((meter / 1000).toFixed(2));
  obj.distanceText =
    meter === null ? "" : haversine.formatDistance(meter);

  return obj;
}

/* =========================
정렬 (🔥 NaN 방어 추가)
========================= */
function sortByDistance(list = [], baseLat, baseLng) {
  if (!Array.isArray(list)) return [];

  return list
    .map((shop) => attachDistance(shop, baseLat, baseLng))
    .sort((a, b) => {
      const da = Number.isFinite(a.distanceMeter)
        ? a.distanceMeter
        : Number.MAX_SAFE_INTEGER;

      const db = Number.isFinite(b.distanceMeter)
        ? b.distanceMeter
        : Number.MAX_SAFE_INTEGER;

      return da - db;
    });
}

/* =========================
반경 필터
========================= */
function filterByRadius(list = [], baseLat, baseLng, radius = 5000) {
  const r = toNumber(radius, 5000);

  return sortByDistance(list, baseLat, baseLng).filter((shop) => {
    if (!Number.isFinite(shop.distanceMeter)) return false;
    return shop.distanceMeter <= r;
  });
}

/* =========================
NEAREST
========================= */
function getNearest(list = [], baseLat, baseLng, limit = 10) {
  return sortByDistance(list, baseLat, baseLng).slice(
    0,
    toNumber(limit, 10)
  );
}

/* =========================
EXPORT
========================= */
module.exports = {
  DISTANCE_CORRECTION,

  getDistanceMeter,
  getDistanceKm,
  getDistanceText,

  attachDistance,
  sortByDistance,
  filterByRadius,
  getNearest,
};