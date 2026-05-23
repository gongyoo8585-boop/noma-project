"use strict";

/**
 * =====================================================
 * 🔥 DISTANCE UTIL (FINAL COMPLETE)
 * ✔ 프론트 거리 계산 유틸
 * ✔ haversine 기반
 * ✔ meter / km / text 지원
 * ✔ NaN / undefined 100% 방어
 * ✔ PREMIUM 우선 + 거리순 정렬
 * ✔ 마사지 3개 / 노래방 3개 그룹 정렬 지원
 * =====================================================
 */

const EARTH_RADIUS_M = 6371000;

/* =========================
UTIL
========================= */
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isValid(lat, lng) {
  const la = Number(lat);
  const ln = Number(lng);

  return (
    Number.isFinite(la) &&
    Number.isFinite(ln) &&
    la >= -90 &&
    la <= 90 &&
    ln >= -180 &&
    ln <= 180
  );
}

function toRad(v) {
  return (toNumber(v) * Math.PI) / 180;
}

/* =========================
DISTANCE
========================= */
export function getDistanceMeter(lat1, lng1, lat2, lng2) {
  if (!isValid(lat1, lng1)) return null;
  if (!isValid(lat2, lng2)) return null;

  const dLat = toRad(lat2) - toRad(lat1);
  const dLng = toRad(lng2) - toRad(lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const m = getDistanceMeter(lat1, lng1, lat2, lng2);
  if (m === null) return null;
  return m / 1000;
}

/* =========================
FORMAT
========================= */
export function formatDistance(meter) {
  const m = toNumber(meter, 0);

  if (m <= 0) return "0m";
  if (m < 1000) return `${Math.round(m)}m`;

  return `${(m / 1000).toFixed(1)}km`;
}

/* =========================
SHOP HELPER
========================= */
export function getShopDistance(shop, baseLat, baseLng) {
  if (!shop) return null;

  const lat = toNumber(
    shop?.lat ??
      shop?.latitude ??
      shop?.location?.lat ??
      shop?.coords?.lat,
    NaN
  );

  const lng = toNumber(
    shop?.lng ??
      shop?.longitude ??
      shop?.location?.lng ??
      shop?.coords?.lng,
    NaN
  );

  const meter = getDistanceMeter(baseLat, baseLng, lat, lng);
  const km = meter === null ? null : meter / 1000;

  return {
    meter: meter === null ? null : Math.round(meter),
    km: km === null ? null : Number(km.toFixed(2)),
    text: meter === null ? "" : formatDistance(meter),
  };
}

export function isPremiumShop(shop) {
  return (
    shop?.premium === true ||
    shop?.isPremium === true ||
    shop?.premiumActive === true
  );
}

export function getShopCategory(shop) {
  const raw = String(
    shop?.category ||
      shop?.type ||
      shop?.shopType ||
      shop?.serviceType ||
      shop?.mainCategory ||
      ""
  ).toLowerCase();

  if (
    raw.includes("karaoke") ||
    raw.includes("노래") ||
    raw.includes("가라오케") ||
    raw.includes("코인")
  ) {
    return "karaoke";
  }

  return "massage";
}

/* =========================
SORT
========================= */
export function sortByDistance(list = [], baseLat, baseLng) {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      const d = getShopDistance(item, baseLat, baseLng);

      return {
        ...item,
        distanceMeter: d?.meter ?? null,
        distanceKm: d?.km ?? null,
        distanceText: d?.text ?? "",
      };
    })
    .sort((a, b) => {
      const da = a.distanceMeter ?? Number.MAX_SAFE_INTEGER;
      const db = b.distanceMeter ?? Number.MAX_SAFE_INTEGER;

      return da - db;
    });
}

export function sortByPremiumAndDistance(list = [], baseLat, baseLng) {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      const d = getShopDistance(item, baseLat, baseLng);
      const premium = isPremiumShop(item);

      return {
        ...item,
        premium,
        isPremium: premium,
        distanceMeter: d?.meter ?? null,
        distanceKm: d?.km ?? null,
        distanceText: d?.text ?? "",
      };
    })
    .sort((a, b) => {
      const premiumA = isPremiumShop(a) ? 1 : 0;
      const premiumB = isPremiumShop(b) ? 1 : 0;

      if (premiumA !== premiumB) {
        return premiumB - premiumA;
      }

      const da = a.distanceMeter ?? Number.MAX_SAFE_INTEGER;
      const db = b.distanceMeter ?? Number.MAX_SAFE_INTEGER;

      return da - db;
    });
}

/* =========================
FILTER
========================= */
export function filterByRadius(
  list = [],
  baseLat,
  baseLng,
  radius = 5000
) {
  const r = toNumber(radius, 5000);

  return sortByDistance(list, baseLat, baseLng).filter(
    (item) =>
      item.distanceMeter !== null &&
      item.distanceMeter <= r
  );
}

/* =========================
CATEGORY GROUP SORT
========================= */
export function groupPremiumNearbyShops(
  list = [],
  baseLat,
  baseLng,
  limit = 3
) {
  if (!Array.isArray(list)) {
    return {
      massage: [],
      karaoke: [],
      all: [],
    };
  }

  const massage = [];
  const karaoke = [];

  list.forEach((item) => {
    const category = getShopCategory(item);

    if (category === "karaoke") {
      karaoke.push(item);
      return;
    }

    massage.push(item);
  });

  const massageList = sortByPremiumAndDistance(
    massage,
    baseLat,
    baseLng
  ).slice(0, limit);

  const karaokeList = sortByPremiumAndDistance(
    karaoke,
    baseLat,
    baseLng
  ).slice(0, limit);

  return {
    massage: massageList,
    karaoke: karaokeList,
    all: [...massageList, ...karaokeList],
  };
}