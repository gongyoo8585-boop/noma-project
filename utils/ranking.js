/**
 * utils/ranking.js
 * --------------------------------------------------
 * 🔥 완성형 (확장 + 오류 수정 + 추천엔진)
 * --------------------------------------------------
 */

/* =========================
   공통 유틸
========================= */
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  const n = toNumber(value, min);
  if (min > max) [min, max] = [max, min];
  return Math.min(Math.max(n, min), max);
}

function safeString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function cloneShop(shop) {
  return { ...shop };
}

/* =========================
   정규화
========================= */
function normalizeShop(shop = {}) {
  return {
    ...shop,
    name: safeString(shop.name),

    ratingAvg: toNumber(shop.ratingAvg),
    reviewCount: toNumber(shop.reviewCount),
    likeCount: toNumber(shop.likeCount),
    viewCount: toNumber(shop.viewCount),
    clickCount: toNumber(shop.clickCount),
    reservationCount: toNumber(shop.reservationCount),
    adScore: toNumber(shop.adScore),
    priority: toNumber(shop.priority),
    discountRate: toNumber(shop.discountRate),

    distanceKm:
      shop.distanceKm == null ? null : toNumber(shop.distanceKm, null),

    premium: !!shop.premium,
    bestBadge: !!shop.bestBadge,
    approved: shop.approved !== false,
    visible: shop.visible !== false,
    isDeleted: !!shop.isDeleted,
    isHot: !!shop.isHot,
    isReservable: shop.isReservable !== false
  };
}

/* =========================
   점수 계산 (수정)
========================= */
function calcShopScore(shop = {}, options = {}) {
  const s = normalizeShop(shop);

  let score =
    s.ratingAvg * 25 +
    s.reviewCount * 2 +
    s.likeCount * 3 +
    s.viewCount * 0.03 +
    s.clickCount * 0.2 +
    s.reservationCount * 4 +
    s.adScore +
    s.priority * 5;

  if (s.premium) score += 20;
  if (s.bestBadge) score += 25;
  if (s.isHot) score += 12;
  if (s.isReservable) score += 8;

  if (typeof s.distanceKm === "number") {
    score -= s.distanceKm * 1.2;
  }

  if (!s.approved || !s.visible || s.isDeleted) {
    score -= 100000;
  }

  /* 🔥 추가: 최소값 제한 */
  return clamp(score, -100000, 999999);
}

/* =========================
   랭킹 메타
========================= */
function applyRankingMeta(shops = [], options = {}) {
  const list = shops.map((shop) => {
    const item = cloneShop(shop);
    item.score = calcShopScore(item, options);
    return item;
  });

  const sorted = [...list].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return toNumber(b.likeCount) - toNumber(a.likeCount);
  });

  return sorted.map((shop, i) => ({
    ...shop,
    rank: i + 1
  }));
}

/* =========================
   정렬 (수정)
========================= */
function sortShops(shops = [], sort = "default") {
  const list = shops.map((s) => normalizeShop(s));

  const copy = [...list];

  switch (sort) {
    case "distance":
      return copy.sort(
        (a, b) =>
          toNumber(a.distanceKm, 9999) -
          toNumber(b.distanceKm, 9999)
      );

    case "rating":
      return copy.sort((a, b) => b.ratingAvg - a.ratingAvg);

    case "like":
      return copy.sort((a, b) => b.likeCount - a.likeCount);

    default:
      return applyRankingMeta(copy);
  }
}

/* =========================
   🔥 추가 기능 10개
========================= */

// 1️⃣ score 정규화
function normalizeScore(score, max = 1000) {
  return clamp((score / max) * 100, 0, 100);
}

// 2️⃣ 트렌딩 점수
function calcTrending(shop) {
  return (
    toNumber(shop.likeCount) * 2 +
    toNumber(shop.viewCount) * 0.1 +
    toNumber(shop.reviewCount) * 3
  );
}

// 3️⃣ 최근 인기
function getTrendingShops(shops = []) {
  return [...shops]
    .map((s) => ({
      ...s,
      trending: calcTrending(s)
    }))
    .sort((a, b) => b.trending - a.trending);
}

// 4️⃣ 랜덤 추천
function getRandomShops(shops = [], limit = 5) {
  return [...shops].sort(() => Math.random() - 0.5).slice(0, limit);
}

// 5️⃣ 복합 필터
function filterAdvanced(shops = [], { region, service } = {}) {
  return shops.filter((s) => {
    if (region && s.region !== region) return false;

    if (
      service &&
      (!Array.isArray(s.serviceTypes) ||
        !s.serviceTypes.includes(service))
    ) {
      return false;
    }

    return true;
  });
}

// 6️⃣ 페이지네이션
function paginate(items = [], page = 1, size = 10) {
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}

// 7️⃣ 점수 디버그
function getScoreBreakdown(shop) {
  return {
    rating: shop.ratingAvg,
    like: shop.likeCount,
    view: shop.viewCount,
    reservation: shop.reservationCount
  };
}

// 8️⃣ boost 적용
function applyBoost(shop, boost = 0) {
  return {
    ...shop,
    score: calcShopScore(shop) + boost
  };
}

// 9️⃣ 다양성 랭킹
function diversify(shops = []) {
  const seen = new Set();
  return shops.filter((s) => {
    if (seen.has(s.region)) return false;
    seen.add(s.region);
    return true;
  });
}

// 🔟 추천 리스트
function recommendShops(shops = []) {
  return getTrendingShops(shops)
    .filter((s) => s.isReservable)
    .slice(0, 10);
}

/* =========================
   exports
========================= */
module.exports = {
  toNumber,
  clamp,
  safeString,
  normalizeShop,
  calcShopScore,
  applyRankingMeta,
  sortShops,

  normalizeScore,
  calcTrending,
  getTrendingShops,
  getRandomShops,
  filterAdvanced,
  paginate,
  getScoreBreakdown,
  applyBoost,
  diversify,
  recommendShops
};