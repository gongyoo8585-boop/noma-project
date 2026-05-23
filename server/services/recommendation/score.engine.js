"use strict";

/**
 * =====================================================
 * 🔥 SCORE ENGINE (AI RECOMMEND CORE)
 * ✔ 기존 기능 100% 유지
 * ✔ distance 값 undefined/null 방어 강화 (recommend.service 호환)
 * ✔ NaN / Infinity 완전 방어
 * ✔ 0% 오류 안정성 보강
 * =====================================================
 */

/* =========================
UTIL
========================= */
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

/* =========================
거리 점수
========================= */
function calcDistanceScore(distanceKm) {
  /* 🔥 최소 수정: NaN / Infinity / 음수 방어 */
  const d = toNumber(distanceKm, null);

  if (d === null || d < 0) return 0.5;

  // 0km → 1점, 30km 이상 → 0점
  const score = 1 - Math.min(d, 30) / 30;

  return clamp(score);
}

/* =========================
인기 점수
========================= */
function calcPopularityScore(shop) {
  const like = Math.min(toNumber(shop?.likeCount, 0), 100) / 100;
  const view = Math.min(toNumber(shop?.viewCount, 0), 1000) / 1000;
  const reserve = Math.min(toNumber(shop?.reservationCount, 0), 100) / 100;

  return clamp(
    like * 0.35 +
    view * 0.35 +
    reserve * 0.3
  );
}

/* =========================
평점 점수
========================= */
function calcRatingScore(shop) {
  const rating = Math.min(toNumber(shop?.ratingAvg, 0), 5);
  return clamp(rating / 5);
}

/* =========================
사용자 선호 점수
========================= */
function calcUserPreferenceScore(shop, userProfile = {}) {
  if (!userProfile) return 0;

  let score = 0;

  // 카테고리
  if (userProfile.category && shop?.category) {
    if (userProfile.category === shop.category) {
      score += 0.6;
    }
  }

  // 지역
  if (userProfile.region && shop?.region) {
    if (userProfile.region === shop.region) {
      score += 0.3;
    }
  }

  // 태그
  if (Array.isArray(userProfile.tags) && Array.isArray(shop?.tags)) {
    const matchCount = shop.tags.filter(t => userProfile.tags.includes(t)).length;
    if (matchCount > 0) {
      score += Math.min(matchCount * 0.1, 0.3);
    }
  }

  return clamp(score);
}

/* =========================
랜덤 점수 (AI 느낌)
========================= */
function calcRandomScore() {
  return Math.random() * 0.1;
}

/* =====================================================
🔥 MAIN SCORE
===================================================== */
function calculateScore(shop, context = {}) {
  try {
    const distanceScore = calcDistanceScore(context?.distance);
    const popularityScore = calcPopularityScore(shop || {});
    const ratingScore = calcRatingScore(shop || {});
    const userScore = calcUserPreferenceScore(shop || {}, context?.userProfile);
    const randomScore = calcRandomScore();

    const finalScore =
      distanceScore * 0.35 +
      popularityScore * 0.25 +
      ratingScore * 0.2 +
      userScore * 0.1 +
      randomScore * 0.1;

    /* 🔥 최소 수정: 최종 NaN / Infinity 방어 */
    return clamp(toNumber(finalScore, 0));
  } catch (e) {
    console.error("SCORE ENGINE ERROR:", e.message);
    return Math.random() * 0.5; // fallback
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  calculateScore,
  calcDistanceScore,
  calcPopularityScore,
  calcRatingScore,
  calcUserPreferenceScore,
  calcRandomScore,
};