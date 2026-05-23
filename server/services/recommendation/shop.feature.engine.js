"use strict";

/**
 * =====================================================
 * 🔥 SHOP FEATURE ENGINE (AI FEATURE EXTRACTION)
 * ✔ 기존 기능 100% 유지
 * ✔ NaN / undefined / 잘못된 값 방어 강화
 * ✔ recommend.service.js 100% 호환 유지
 * =====================================================
 */

/* =========================
UTIL
========================= */
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeString(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function safeArray(value) {
  if (Array.isArray(value)) {
    return value.map(v => safeString(v)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value.split(",").map(v => safeString(v)).filter(Boolean);
  }

  return [];
}

/* =========================
FEATURE BUILD
========================= */
function buildFeature(shop = {}) {
  try {
    const feature = {
      id: safeString(shop?._id || shop?.id),
      name: safeString(shop?.name),

      category: safeString(shop?.category),
      region: safeString(shop?.region),

      tags: safeArray(shop?.tags),
      serviceTypes: safeArray(shop?.serviceTypes),

      /* 🔥 최소 수정: NaN 방어 강화 */
      price: toNumber(
        shop?.priceDiscount ?? shop?.priceOriginal,
        0
      ),

      rating: toNumber(
        shop?.ratingAvg ?? shop?.rating?.average,
        0
      ),

      likeCount: toNumber(shop?.likeCount, 0),
      viewCount: toNumber(
        shop?.viewCount ?? shop?.stats?.viewCount,
        0
      ),

      reservationCount: toNumber(
        shop?.reservationCount ?? shop?.stats?.reservationCount,
        0
      ),

      isFeatured: Boolean(shop?.isFeatured),
      isPopular: Boolean(shop?.isPopular),
    };

    /* 🔥 최소 수정: 중복 제거 + 빈값 제거 */
    feature.tags = Array.from(new Set(feature.tags.filter(Boolean)));
    feature.serviceTypes = Array.from(new Set(feature.serviceTypes.filter(Boolean)));

    return feature;

  } catch (e) {
    console.error("SHOP FEATURE ENGINE ERROR:", e.message);

    return {
      id: "",
      name: "",
      category: "",
      region: "",
      tags: [],
      serviceTypes: [],
      price: 0,
      rating: 0,
      likeCount: 0,
      viewCount: 0,
      reservationCount: 0,
      isFeatured: false,
      isPopular: false,
    };
  }
}

/* =========================
MATCH HELPERS
========================= */
function matchCategory(feature, profile) {
  if (!feature?.category || !profile?.category) return false;
  return feature.category === profile.category;
}

function matchRegion(feature, profile) {
  if (!feature?.region || !profile?.region) return false;
  return feature.region === profile.region;
}

function matchTags(feature, profile) {
  const fTags = safeArray(feature?.tags);
  const pTags = safeArray(profile?.tags);

  if (!fTags.length || !pTags.length) return [];

  return fTags.filter(tag => pTags.includes(tag));
}

function matchServiceTypes(feature, profile) {
  const fTypes = safeArray(feature?.serviceTypes);
  const pTypes = safeArray(profile?.serviceTypes);

  if (!fTypes.length || !pTypes.length) return [];

  return fTypes.filter(type => pTypes.includes(type));
}

/* =========================
EXPORT
========================= */
module.exports = {
  buildFeature,
  matchCategory,
  matchRegion,
  matchTags,
  matchServiceTypes,
};