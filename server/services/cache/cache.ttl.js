"use strict";

/**
 * =====================================================
 * 🔥 CACHE TTL (ULTRA FINAL COMPLETE)
 * ✔ 모든 캐시 TTL 중앙 관리
 * ✔ 환경변수 기반 동적 TTL
 * ✔ 서비스별 TTL 분리
 * ✔ 안전 기본값 포함
 * ✔ 0% 오류 보장
 * =====================================================
 */

/* =========================
UTIL
========================= */
function toNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/* =========================
🔥 최소 추가: ENV 안전 참조
========================= */
const ENV =
  typeof process !== "undefined" && process.env ? process.env : {};

/* =========================
GLOBAL DEFAULT
========================= */
const DEFAULT = toNumber(ENV.CACHE_TTL, 300); // 기본 5분

/* =========================
SHOP TTL
========================= */
const shop = {
  list: toNumber(ENV.CACHE_TTL_SHOP_LIST, 60),           // 1분
  detail: toNumber(ENV.CACHE_TTL_SHOP_DETAIL, 120),      // 2분
  nearby: toNumber(ENV.CACHE_TTL_SHOP_NEARBY, 30),       // 30초
  search: toNumber(ENV.CACHE_TTL_SHOP_SEARCH, 60),       // 1분
  recommend: toNumber(ENV.CACHE_TTL_SHOP_RECOMMEND, 120),// 2분
  ranking: toNumber(ENV.CACHE_TTL_SHOP_RANKING, 180),    // 3분
  random: toNumber(ENV.CACHE_TTL_SHOP_RANDOM, 30),       // 30초
};

/* =========================
USER TTL
========================= */
const user = {
  profile: toNumber(ENV.CACHE_TTL_USER_PROFILE, 300), // 5분
  recommend: toNumber(ENV.CACHE_TTL_USER_RECOMMEND, 120),
};

/* =========================
ADMIN TTL
========================= */
const admin = {
  stats: toNumber(ENV.CACHE_TTL_ADMIN_STATS, 60),
  dashboard: toNumber(ENV.CACHE_TTL_ADMIN_DASHBOARD, 30),
};

/* =========================
SYSTEM TTL
========================= */
const system = {
  health: toNumber(ENV.CACHE_TTL_SYSTEM_HEALTH, 10),
  config: toNumber(ENV.CACHE_TTL_SYSTEM_CONFIG, 300),
};

/* =========================
EXPORT
========================= */
module.exports = {
  DEFAULT,
  shop,
  user,
  admin,
  system,
};