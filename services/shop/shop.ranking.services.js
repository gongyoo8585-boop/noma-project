"use strict";

/* =====================================================
🔥 SHOP RANKING SERVICE (NORA PRODUCTION SAFE)
✔ 실제 구조 기준 경로 수정
✔ ../models/Shop 오류 제거
✔ 기존 export 함수명 유지
✔ DB/모델 미연결 시 서버 부팅 실패 방지
✔ DB 연결 완료 전 Shop.find() 차단
✔ refreshHotCache 자동 실행 시 DB 미연결이면 fallback 반환
✔ 기존 랭킹 로직 의미 유지
===================================================== */

const mongoose = require("mongoose");

function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    console.warn("[shop.ranking.service] require fail:", modulePath, error.message);
    return null;
  }
}

const Shop =
  safeRequire("../../models/Shop") ||
  safeRequire("../../models/shop") ||
  safeRequire("../../models/shop.model") ||
  safeRequire("../../models/Shop.model") ||
  safeRequire("../../server/models/Shop") ||
  safeRequire("../../modules/shop/models/Shop");

/* =====================================================
🔥 SAFE UTILS
===================================================== */
function safeNum(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function now() {
  return Date.now();
}

function safeDate(value) {
  try {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : 0;
  } catch (_) {
    return 0;
  }
}

function normalizeLimit(limit, fallback = 20) {
  return Math.max(1, Math.min(300, safeNum(limit, fallback)));
}

function normalizeShop(shop) {
  if (!shop) {
    return {};
  }

  if (typeof shop.toObject === "function") {
    return shop.toObject();
  }

  return shop;
}

function isDBReady() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

const DB_STABLE_DELAY_MS = Math.max(
  1000,
  Number(process.env.RANKING_DB_STABLE_DELAY_MS || 5000)
);
const HOT_CACHE_INTERVAL_MS = Math.max(
  10000,
  Number(process.env.RANKING_HOT_CACHE_INTERVAL_MS || 30000)
);
const HOT_CACHE_INITIAL_DELAY_MS = Math.max(
  DB_STABLE_DELAY_MS,
  Number(process.env.RANKING_HOT_CACHE_INITIAL_DELAY_MS || 15000)
);
const RANKING_QUERY_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.RANKING_QUERY_TIMEOUT_MS || 5000)
);

let lastDbConnectedAt = isDBReady() ? now() : 0;
let refreshHotCacheRunning = false;
let lastRefreshHotCacheAt = 0;

function markDbConnected() {
  lastDbConnectedAt = now();
}

function markDbDisconnected() {
  lastDbConnectedAt = 0;
}

if (!global.__NORA_RANKING_DB_EVENTS__) {
  global.__NORA_RANKING_DB_EVENTS__ = true;

  mongoose.connection.on("connected", markDbConnected);
  mongoose.connection.on("reconnected", markDbConnected);
  mongoose.connection.on("disconnected", markDbDisconnected);
  mongoose.connection.on("error", markDbDisconnected);
}

function isDBStable() {
  if (!isDBReady()) {
    return false;
  }

  if (!lastDbConnectedAt) {
    lastDbConnectedAt = now();
    return false;
  }

  return now() - lastDbConnectedAt >= DB_STABLE_DELAY_MS;
}

function isMongoTransientError(error) {
  const message = String(error && error.message ? error.message : error || "");

  return (
    message.includes("before initial connection is complete") ||
    message.includes("bufferCommands = false") ||
    message.includes("connection") ||
    message.includes("timed out") ||
    message.includes("not connected") ||
    message.includes("disconnected") ||
    message.includes("topology")
  );
}

function fallbackShopList(limit = FALLBACK_SHOPS.length) {
  return FALLBACK_SHOPS.slice(0, normalizeLimit(limit, FALLBACK_SHOPS.length));
}

/* =====================================================
🔥 CACHE SYSTEM
===================================================== */
const CACHE = new Map();
const MAX_CACHE = 500;

function cacheSet(key, data, ttl = 5000) {
  if (CACHE.size > MAX_CACHE) {
    CACHE.clear();
  }

  CACHE.set(key, {
    data,
    expire: now() + ttl,
  });
}

function cacheGet(key) {
  const cached = CACHE.get(key);

  if (!cached) {
    return null;
  }

  if (now() > cached.expire) {
    CACHE.delete(key);
    return null;
  }

  return cached.data;
}

/* =====================================================
🔥 MEMORY FALLBACK
===================================================== */
let HOT_CACHE = [];

const FALLBACK_SHOPS = [
  {
    _id: "local-shop-gimhae-1",
    id: "local-shop-gimhae-1",
    name: "박종기",
    shopName: "박종기",
    title: "박종기",
    region: "경상남도",
    district: "김해시",
    city: "김해시",
    address: "김해시 삼계동 1479-2",
    visible: true,
    approved: true,
    isDeleted: false,
    premium: false,
    ratingAvg: 0,
    likeCount: 0,
    viewCount: 0,
    reservationCount: 0,
    adScore: 0,
    reportCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/* =====================================================
🔥 METRIC SYSTEM
===================================================== */
const METRIC = {
  totalRankCalls: 0,
  cacheHits: 0,
  slowQueries: 0,
  lastExecTime: 0,
  fallbackCalls: 0,
  dbNotReadySkips: 0,
};

/* =====================================================
🔥 SCORE
===================================================== */
function calcBaseScore(shop) {
  const item = normalizeShop(shop);

  return (
    safeNum(item.ratingAvg) * 10 +
    safeNum(item.likeCount) * 2 +
    safeNum(item.viewCount) * 0.1 +
    safeNum(item.reservationCount) * 2 +
    safeNum(item.adScore)
  );
}

function calcAiScore(shop) {
  const item = normalizeShop(shop);

  return (
    safeNum(item.likeCount) * 2 +
    safeNum(item.viewCount) * 0.5 +
    safeNum(item.reservationCount) * 3 +
    safeNum(item.ratingAvg) * 5 -
    safeNum(item.reportCount) * 3
  );
}

function calcTrendScore(shop) {
  const item = normalizeShop(shop);

  return (
    safeNum(item.viewCount) * 1.2 +
    safeNum(item.likeCount) * 2 +
    safeNum(item.clickCount) * 1.5 +
    safeNum(item.shareCount)
  );
}

function calcQualityScore(shop) {
  const item = normalizeShop(shop);

  return (
    safeNum(item.ratingAvg) * 20 -
    safeNum(item.bounceRate) * 30 +
    safeNum(item.conversionRate) * 40 +
    safeNum(item.reviewCount)
  );
}

function calcFreshness(shop) {
  const item = normalizeShop(shop);
  const updated = safeDate(item.updatedAt || item.createdAt);

  if (!updated) {
    return 0;
  }

  const diff = now() - updated;

  return Math.max(0, 20 - diff / 10000000);
}

function calcAdBoost(shop) {
  const item = normalizeShop(shop);
  const currentTime = now();

  const start = safeDate(item.adStartedAt);
  const end = safeDate(item.adEndedAt);

  if (start && end && currentTime >= start && currentTime <= end) {
    return 20 + safeNum(item.adScore);
  }

  return 0;
}

function calcDistanceScore(shop, lat, lng) {
  const item = normalizeShop(shop);

  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 0;
  }

  const shopLat =
    item.lat ??
    item.latitude ??
    (item.location && typeof item.location === "object" ? item.location.lat : null);

  const shopLng =
    item.lng ??
    item.longitude ??
    (item.location && typeof item.location === "object" ? item.location.lng : null);

  if (shopLat === null || shopLat === undefined || shopLng === null || shopLng === undefined) {
    return 0;
  }

  const dx = safeNum(shopLat) - safeNum(lat);
  const dy = safeNum(shopLng) - safeNum(lng);

  const distance = Math.sqrt(dx * dx + dy * dy) * 111;

  return Math.max(0, 50 - distance);
}

function calcPersonalScore(shop, user = {}) {
  const item = normalizeShop(shop);

  if (!user || typeof user !== "object") {
    return 0;
  }

  let score = 0;

  if (Array.isArray(user.favorites) && user.favorites.includes(String(item._id || item.id))) {
    score += 50;
  }

  if (user.recentRegion && user.recentRegion === item.region) {
    score += 10;
  }

  if (
    Array.isArray(user.preferredTags) &&
    Array.isArray(item.tags) &&
    user.preferredTags.some((tag) => item.tags.includes(tag))
  ) {
    score += 20;
  }

  return score;
}

function calcFinalScore(shop) {
  const item = normalizeShop(shop);

  let score =
    calcBaseScore(item) +
    calcAiScore(item) +
    calcTrendScore(item) +
    calcQualityScore(item) +
    calcFreshness(item) +
    calcAdBoost(item);

  if (item.premium || item.isPremium || item.premiumActive) {
    score += 30;
  }

  if (item.bestBadge) {
    score += 20;
  }

  if (safeNum(item.reportCount) > 5) {
    score -= 30;
  }

  return score;
}

/* =====================================================
🔥 QUERY HELPERS
===================================================== */
function normalizeFilter(filter = {}) {
  const query = {
    isDeleted: false,
    visible: true,
    approved: true,
    ...filter,
  };

  return query;
}

async function findShops(query = {}) {
  if (!Shop || typeof Shop.find !== "function") {
    METRIC.fallbackCalls += 1;
    return FALLBACK_SHOPS;
  }

  if (!isDBStable()) {
    METRIC.fallbackCalls += 1;
    METRIC.dbNotReadySkips += 1;
    return FALLBACK_SHOPS;
  }

  try {
    if (!isDBStable()) {
      METRIC.fallbackCalls += 1;
      METRIC.dbNotReadySkips += 1;
      return FALLBACK_SHOPS;
    }

    const items = await Shop.find(query).maxTimeMS(RANKING_QUERY_TIMEOUT_MS).lean();

    if (Array.isArray(items)) {
      return items;
    }

    return [];
  } catch (error) {
    METRIC.fallbackCalls += 1;

    if (isMongoTransientError(error)) {
      METRIC.dbNotReadySkips += 1;
      return FALLBACK_SHOPS;
    }

    console.error("[shop.ranking.service] find shops fail:", error.message);
    return FALLBACK_SHOPS;
  }
}

/* =====================================================
🔥 CORE RANK ENGINE
===================================================== */
async function rankShops({
  user = null,
  lat = null,
  lng = null,
  limit = 20,
  filter = {},
} = {}) {
  const startTime = now();

  METRIC.totalRankCalls += 1;

  const normalizedLimit = normalizeLimit(limit, 20);

  const cacheKey = JSON.stringify({
    user,
    lat,
    lng,
    limit: normalizedLimit,
    filter,
  });

  const cached = cacheGet(cacheKey);

  if (cached) {
    METRIC.cacheHits += 1;
    return cached;
  }

  const query = normalizeFilter(filter);

  const shops = await findShops(query);

  const ranked = shops.map((shop) => {
    const item = normalizeShop(shop);
    const base = calcFinalScore(item);
    const distance = calcDistanceScore(item, lat, lng);
    const personal = calcPersonalScore(item, user);

    const finalScore = base + distance + personal;

    return {
      ...item,
      finalScore,
      scoreBreakdown: {
        base,
        distance,
        personal,
      },
    };
  });

  const result = ranked
    .sort((a, b) => safeNum(b.finalScore) - safeNum(a.finalScore))
    .slice(0, normalizedLimit);

  cacheSet(cacheKey, result);

  const elapsed = now() - startTime;

  METRIC.lastExecTime = elapsed;

  if (elapsed > 500 && isDBStable()) {
    METRIC.slowQueries += 1;
    console.warn("SLOW RANK:", `${elapsed}ms`);
  }

  return result;
}

/* =====================================================
🔥 CATEGORY / REGION
===================================================== */
async function rankByService(serviceType, opts = {}) {
  return rankShops({
    ...opts,
    filter: {
      ...(opts.filter || {}),
      $or: [
        { serviceTypes: serviceType },
        { serviceType },
        { category: serviceType },
        { shopCategory: serviceType },
      ],
    },
  });
}

async function rankByRegion(region, opts = {}) {
  return rankShops({
    ...opts,
    filter: {
      ...(opts.filter || {}),
      $or: [
        { region },
        { sido: region },
        { province: region },
        { address: { $regex: region, $options: "i" } },
      ],
    },
  });
}

/* =====================================================
🔥 TRENDING
===================================================== */
async function getTrending(limit = 20) {
  const shops = await findShops({
    isDeleted: false,
  });

  return shops
    .map((shop) => {
      const item = normalizeShop(shop);

      return {
        ...item,
        trendScore: calcTrendScore(item) + calcFreshness(item),
      };
    })
    .sort((a, b) => safeNum(b.trendScore) - safeNum(a.trendScore))
    .slice(0, normalizeLimit(limit, 20));
}

/* =====================================================
🔥 ADS
===================================================== */
async function getAds(limit = 10) {
  if (!Shop || typeof Shop.find !== "function" || !isDBStable()) {
    METRIC.fallbackCalls += 1;
    if (!isDBStable()) {
      METRIC.dbNotReadySkips += 1;
    }

    return FALLBACK_SHOPS.slice(0, normalizeLimit(limit, 10));
  }

  const currentTime = now();

  try {
    if (!isDBStable()) {
      METRIC.fallbackCalls += 1;
      METRIC.dbNotReadySkips += 1;
      return FALLBACK_SHOPS.slice(0, normalizeLimit(limit, 10));
    }

    const shops = await Shop.find({
      isDeleted: false,
      adStartedAt: {
        $lte: new Date(currentTime),
      },
      adEndedAt: {
        $gte: new Date(currentTime),
      },
    }).maxTimeMS(RANKING_QUERY_TIMEOUT_MS).lean();

    return shops
      .map((shop) => {
        const item = normalizeShop(shop);

        return {
          ...item,
          adScoreFinal: calcAdBoost(item) + calcBaseScore(item) + calcQualityScore(item),
        };
      })
      .sort((a, b) => safeNum(b.adScoreFinal) - safeNum(a.adScoreFinal))
      .slice(0, normalizeLimit(limit, 10));
  } catch (error) {
    if (isMongoTransientError(error)) {
      METRIC.fallbackCalls += 1;
      METRIC.dbNotReadySkips += 1;
      return FALLBACK_SHOPS.slice(0, normalizeLimit(limit, 10));
    }

    console.error("[shop.ranking.service] get ads fail:", error.message);
    return FALLBACK_SHOPS.slice(0, normalizeLimit(limit, 10));
  }
}

/* =====================================================
🔥 HOT CACHE
===================================================== */
async function refreshHotCache() {
  if (refreshHotCacheRunning) {
    return HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS.slice(0, 10);
  }

  if (!isDBStable()) {
    METRIC.dbNotReadySkips += 1;
    HOT_CACHE = FALLBACK_SHOPS.slice(0, 10);
    return HOT_CACHE;
  }

  refreshHotCacheRunning = true;
  lastRefreshHotCacheAt = now();

  try {
    HOT_CACHE = await rankShops({
      limit: 10,
    });

    return HOT_CACHE;
  } catch (error) {
    console.warn("[shop.ranking.service] refresh hot cache fail:", error.message);
    HOT_CACHE = FALLBACK_SHOPS.slice(0, 10);
    return HOT_CACHE;
  } finally {
    refreshHotCacheRunning = false;
  }
}

function scheduleRefreshHotCache() {
  if (!isDBStable()) {
    METRIC.dbNotReadySkips += 1;
    HOT_CACHE = HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS.slice(0, 10);
    return HOT_CACHE;
  }

  if (refreshHotCacheRunning) {
    return HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS.slice(0, 10);
  }

  if (now() - lastRefreshHotCacheAt < DB_STABLE_DELAY_MS) {
    return HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS.slice(0, 10);
  }

  return refreshHotCache().catch((error) => {
    if (!isMongoTransientError(error)) {
      console.warn("[shop.ranking.service] hot cache schedule fail:", error.message);
    }

    HOT_CACHE = HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS.slice(0, 10);
    return HOT_CACHE;
  });
}

if (!global.__NORA_RANKING_HOT_CACHE__) {
  global.__NORA_RANKING_HOT_CACHE__ = true;

  const hotCacheInitialTimer = setTimeout(scheduleRefreshHotCache, HOT_CACHE_INITIAL_DELAY_MS);

  if (hotCacheInitialTimer && typeof hotCacheInitialTimer.unref === "function") {
    hotCacheInitialTimer.unref();
  }

  const hotCacheTimer = setInterval(scheduleRefreshHotCache, HOT_CACHE_INTERVAL_MS);

  if (hotCacheTimer && typeof hotCacheTimer.unref === "function") {
    hotCacheTimer.unref();
  }
}

/* =====================================================
🔥 RECOMMEND
===================================================== */
async function recommend(user, opts = {}) {
  return rankShops({
    user,
    ...opts,
  });
}

/* =====================================================
🔥 DEBUG / METRIC
===================================================== */
function debugMetrics() {
  return {
    ...METRIC,
    cacheSize: CACHE.size,
    shopModel: !!Shop,
    dbReady: isDBReady(),
    dbStable: isDBStable(),
    dbState: mongoose.connection ? mongoose.connection.readyState : 0,
    dbStableDelayMs: DB_STABLE_DELAY_MS,
    rankingQueryTimeoutMs: RANKING_QUERY_TIMEOUT_MS,
    hotCache: HOT_CACHE.length,
    refreshHotCacheRunning,
  };
}

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
if (!global.__RANKING_CLEAN__) {
  global.__RANKING_CLEAN__ = true;

  const cleanTimer = setInterval(() => {
    if (CACHE.size > MAX_CACHE) {
      CACHE.clear();
    }
  }, 30000);

  if (cleanTimer && typeof cleanTimer.unref === "function") {
    cleanTimer.unref();
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  rankShops,
  rankByService,
  rankByRegion,
  getTrending,
  recommend,
  getAds,
  getHot: () => HOT_CACHE,
  calcFinalScore,
  calcBaseScore,
  calcAiScore,
  calcTrendScore,
  calcDistanceScore,
  calcPersonalScore,
  debugMetrics,
  calcQualityScore,
  calcFreshness,
};

console.log("🔥 SHOP RANKING SERVICE ULTRA FINAL READY");
