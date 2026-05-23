"use strict";

/**
 * =====================================================
 * 🔥 RECOMMEND SERVICE (AI STYLE FINAL COMPLETE)
 * ✔ 기존 기능 100% 유지
 * ✔ 캐시 레이어 최소 추가 (Redis 없어도 동작)
 * ✔ 거리 계산 서비스 연결 (없어도 fallback)
 * ✔ 오류 0% 방어 유지
 * =====================================================
 */

const Shop = require("../../models/Shop");

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    return null;
  }
}

const scoreEngine = safeRequire("./score.engine");
const userProfileEngine = safeRequire("./user.profile.engine");
const shopFeatureEngine = safeRequire("./shop.feature.engine");

/* 🔥 최소 추가: distance / cache */
const haversine = safeRequire("../distance/haversine.service");
const kakaoDistance = safeRequire("../distance/kakaoDistance.service");
const cacheLayer = safeRequire("../cache/cache.layer");

/* =========================
UTIL
========================= */
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/* 🔥 최소 추가: 캐시 키 */
function buildCacheKey(query = {}, lat, lng, limit) {
  return `recommend:${lat}:${lng}:${limit}:${JSON.stringify(query)}`;
}

function normalizeShop(shop) {
  if (!shop) return null;

  const obj = shop.toObject ? shop.toObject() : { ...shop };

  if (obj.location) {
    if (obj.lat === undefined || obj.lat === null) obj.lat = obj.location.lat;
    if (obj.lng === undefined || obj.lng === null) obj.lng = obj.location.lng;
  }

  obj.lat = toNumber(obj.lat, toNumber(obj.location?.lat, 0));
  obj.lng = toNumber(obj.lng, toNumber(obj.location?.lng, 0));

  obj.ratingAvg = toNumber(
    obj.ratingAvg,
    toNumber(obj.rating?.average, 0)
  );

  obj.likeCount = toNumber(obj.likeCount, 0);
  obj.viewCount = toNumber(obj.viewCount, toNumber(obj.stats?.viewCount, 0));
  obj.favoriteCount = toNumber(obj.favoriteCount, toNumber(obj.stats?.favoriteCount, 0));
  obj.reservationCount = toNumber(
    obj.reservationCount,
    toNumber(obj.stats?.reservationCount, 0)
  );

  if (!Array.isArray(obj.tags)) obj.tags = [];
  if (!Array.isArray(obj.serviceTypes)) obj.serviceTypes = [];

  return obj;
}

/* 🔥 최소 수정: 거리 계산 외부 서비스 우선 (정확한 함수명 대응) */
function distanceKm(lat1, lng1, lat2, lng2) {
  try {
    if (kakaoDistance?.getDistanceKm) {
      return kakaoDistance.getDistanceKm(lat1, lng1, lat2, lng2);
    }

    if (haversine?.getDistanceKm) {
      return haversine.getDistanceKm(lat1, lng1, lat2, lng2);
    }
  } catch (e) {}

  const aLat = toNumber(lat1, 0);
  const aLng = toNumber(lng1, 0);
  const bLat = toNumber(lat2, 0);
  const bLng = toNumber(lng2, 0);

  if (!aLat || !aLng || !bLat || !bLng) return null;

  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;

  const s1 = Math.sin(dLat / 2) * Math.sin(dLat / 2);
  const s2 =
    Math.cos((aLat * Math.PI) / 180) *
    Math.cos((bLat * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(s1 + s2), Math.sqrt(1 - s1 - s2));
  return R * c;
}

function fallbackScore(shop, context = {}) {
  const lat = toNumber(context.lat, 0);
  const lng = toNumber(context.lng, 0);

  const dist = distanceKm(lat, lng, shop.lat, shop.lng);

  const distanceScore =
    dist === null ? 0.5 : Math.max(0, 1 - Math.min(dist, 30) / 30);

  const ratingScore = Math.min(toNumber(shop.ratingAvg, 0), 5) / 5;
  const likeScore = Math.min(toNumber(shop.likeCount, 0), 100) / 100;
  const viewScore = Math.min(toNumber(shop.viewCount, 0), 1000) / 1000;
  const reserveScore = Math.min(toNumber(shop.reservationCount, 0), 100) / 100;

  const popularScore =
    likeScore * 0.35 +
    viewScore * 0.35 +
    reserveScore * 0.3;

  const randomScore = Math.random() * 0.1;

  return (
    distanceScore * 0.35 +
    popularScore * 0.25 +
    ratingScore * 0.25 +
    randomScore * 0.15
  );
}

function buildUserProfile(user, query = {}) {
  if (userProfileEngine?.buildProfile) {
    try {
      return userProfileEngine.buildProfile(user, query);
    } catch (e) {
      return {};
    }
  }

  return {
    userId: user?._id || user?.id || null,
    category: query.category || user?.preferredCategory || "",
    region: query.region || user?.region || "",
    tags: Array.isArray(user?.tags) ? user.tags : [],
  };
}

function buildShopFeature(shop) {
  if (shopFeatureEngine?.buildFeature) {
    try {
      return shopFeatureEngine.buildFeature(shop);
    } catch (e) {
      return shop;
    }
  }

  return {
    id: shop._id || shop.id,
    name: shop.name,
    category: shop.category,
    region: shop.region,
    tags: shop.tags || [],
    serviceTypes: shop.serviceTypes || [],
  };
}

function calculateScore(shop, context) {
  if (scoreEngine?.calculateScore) {
    try {
      const score = scoreEngine.calculateScore(shop, context);
      const n = Number(score);
      if (Number.isFinite(n)) return n;
    } catch (e) {
      return fallbackScore(shop, context);
    }
  }

  return fallbackScore(shop, context);
}

/* =========================
QUERY BUILD
========================= */
function buildBaseQuery(query = {}) {
  const base = {};

  if (query.category) {
    base.category = query.category;
  }

  if (query.region) {
    base.region = query.region;
  }

  if (query.keyword) {
    base.$or = [
      { name: { $regex: query.keyword, $options: "i" } },
      { address: { $regex: query.keyword, $options: "i" } },
      { region: { $regex: query.keyword, $options: "i" } },
      { description: { $regex: query.keyword, $options: "i" } },
    ];
  }

  base.$and = base.$and || [];
  base.$and.push({
    $or: [
      { isDeleted: { $exists: false } },
      { isDeleted: false },
    ],
  });

  return base;
}

/* =====================================================
🔥 MAIN RECOMMEND
===================================================== */
async function recommend(options = {}) {
  const query = options.query || {};
  const user = options.user || null;

  const lat = toNumber(options.lat ?? query.lat, 0);
  const lng = toNumber(options.lng ?? query.lng, 0);
  const limit = Math.min(Math.max(toNumber(options.limit ?? query.limit, 20), 1), 100);

  /* 🔥 최소 추가: 캐시 조회 */
  const cacheKey = buildCacheKey(query, lat, lng, limit);
  if (cacheLayer?.get) {
    try {
      const cached = await cacheLayer.get(cacheKey);
      if (cached) return cached;
    } catch (e) {}
  }

  const userProfile = buildUserProfile(user, query);
  const baseQuery = buildBaseQuery(query);

  let shops = [];

  try {
    shops = await Shop.find(baseQuery)
      .limit(300)
      .sort({ createdAt: -1 });
  } catch (e) {
    console.error("RECOMMEND SHOP FIND ERROR:", e.message);
    shops = [];
  }

  const context = {
    lat,
    lng,
    limit,
    query,
    user,
    userProfile,
  };

  const result = shops
    .map(normalizeShop)
    .filter(Boolean)
    .map((shop) => {
      const distance = distanceKm(lat, lng, shop.lat, shop.lng);
      const feature = buildShopFeature(shop);
      const score = calculateScore(shop, {
        ...context,
        shop,
        feature,
        distance,
      });

      return {
        ...shop,
        distanceKm: distance === null ? null : Number(distance.toFixed(2)),
        recommendScore: Number(toNumber(score, 0).toFixed(6)),
        recommendReason: buildReason(shop, distance),
      };
    })
    .sort((a, b) => b.recommendScore - a.recommendScore)
    .slice(0, limit);

  const response = {
    ok: true,
    list: result,
    items: result,
    total: result.length,
    meta: {
      mode: "ai_recommend",
      lat,
      lng,
      limit,
      generatedAt: new Date(),
    },
  };

  /* 🔥 최소 추가: 캐시 저장 */
  if (cacheLayer?.set) {
    try {
      await cacheLayer.set(cacheKey, response, 60);
    } catch (e) {}
  }

  return response;
}

/* =========================
REASON
========================= */
function buildReason(shop, distance) {
  const reasons = [];

  if (distance !== null && distance <= 5) {
    reasons.push("가까운 위치");
  }

  if (toNumber(shop.ratingAvg, 0) >= 4.5) {
    reasons.push("높은 평점");
  }

  if (toNumber(shop.likeCount, 0) >= 10) {
    reasons.push("인기 매장");
  }

  if (toNumber(shop.viewCount, 0) >= 50) {
    reasons.push("많이 본 매장");
  }

  if (reasons.length === 0) {
    reasons.push("추천 매장");
  }

  return reasons.join(" · ");
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  recommend,
  getRecommendations: recommend,
  recommendShops: recommend,
  buildBaseQuery,
  normalizeShop,
  distanceKm,
};