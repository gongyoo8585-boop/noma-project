"use strict";

/**
 * =====================================================
 * 🔥 USER PROFILE ENGINE (AI RECOMMEND PROFILE)
 * ✔ 기존 기능 100% 유지
 * ✔ 숫자 파싱 안정성 강화 (NaN 방어)
 * ✔ 중복 제거 안정성 강화
 * ✔ recommend.service.js 100% 호환 유지
 * =====================================================
 */

/* =========================
UTIL
========================= */
function safeString(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function safeArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((v) => safeString(v))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => safeString(v))
      .filter(Boolean);
  }

  return [];
}

/* 🔥 최소 추가: 숫자 안전 변환 */
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickFirst(...values) {
  for (const value of values) {
    const v = safeString(value);
    if (v) return v;
  }
  return "";
}

/* =========================
PROFILE BUILD
========================= */
function buildProfile(user = null, query = {}) {
  try {
    const profile = {
      userId: pickFirst(
        user?._id,
        user?.id,
        user?.userId,
        query?.userId
      ),

      category: pickFirst(
        query?.category,
        user?.preferredCategory,
        user?.category,
        user?.profile?.category
      ),

      region: pickFirst(
        query?.region,
        user?.region,
        user?.profile?.region,
        user?.addressRegion
      ),

      tags: [
        ...safeArray(user?.tags),
        ...safeArray(user?.preferredTags),
        ...safeArray(user?.profile?.tags),
        ...safeArray(query?.tags),
      ],

      serviceTypes: [
        ...safeArray(user?.serviceTypes),
        ...safeArray(user?.preferredServiceTypes),
        ...safeArray(query?.serviceTypes),
      ],

      /* 🔥 최소 수정: NaN 방어 */
      priceMin: safeNumber(query?.minPrice ?? user?.priceMin, 0),
      priceMax: safeNumber(query?.maxPrice ?? user?.priceMax, 0),

      isLoggedIn: Boolean(user && (user._id || user.id || user.userId)),
    };

    /* 🔥 최소 수정: Set 안정화 (빈값 제거 유지) */
    profile.tags = Array.from(new Set(profile.tags.filter(Boolean)));
    profile.serviceTypes = Array.from(new Set(profile.serviceTypes.filter(Boolean)));

    return profile;
  } catch (e) {
    console.error("USER PROFILE ENGINE ERROR:", e.message);

    return {
      userId: "",
      category: safeString(query?.category),
      region: safeString(query?.region),
      tags: safeArray(query?.tags),
      serviceTypes: safeArray(query?.serviceTypes),
      priceMin: safeNumber(query?.minPrice, 0),
      priceMax: safeNumber(query?.maxPrice, 0),
      isLoggedIn: false,
    };
  }
}

/* =========================
MATCH HELPERS
========================= */
function matchCategory(profile, shop) {
  if (!profile?.category || !shop?.category) return false;
  return profile.category === shop.category;
}

function matchRegion(profile, shop) {
  if (!profile?.region || !shop?.region) return false;
  return profile.region === shop.region;
}

function matchTags(profile, shop) {
  const profileTags = safeArray(profile?.tags);
  const shopTags = safeArray(shop?.tags);

  if (profileTags.length === 0 || shopTags.length === 0) return [];

  return shopTags.filter((tag) => profileTags.includes(tag));
}

function matchServiceTypes(profile, shop) {
  const profileTypes = safeArray(profile?.serviceTypes);
  const shopTypes = safeArray(shop?.serviceTypes);

  if (profileTypes.length === 0 || shopTypes.length === 0) return [];

  return shopTypes.filter((type) => profileTypes.includes(type));
}

/* =========================
EXPORT
========================= */
module.exports = {
  buildProfile,
  safeString,
  safeArray,
  matchCategory,
  matchRegion,
  matchTags,
  matchServiceTypes,
};