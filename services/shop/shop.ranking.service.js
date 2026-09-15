"use strict";

/* =====================================================
🔥 SHOP RANKING SERVICE (NORA PRODUCTION SAFE FINAL)
✔ Mongo reconnect storm 방지
✔ concurrent refresh 방지
✔ DB unstable 상태 query 차단
✔ Mongo full scan / memory sort 부하 방지
✔ hot cache interval stabilization
✔ PM2 restart safe
✔ 기존 export/function 유지
===================================================== */

const mongoose = require("mongoose");

function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    console.warn(
      "[shop.ranking.service] require fail:",
      modulePath,
      error.message
    );

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

/* =====================================================
🔥 ENV
===================================================== */

const DB_STABLE_DELAY_MS = Math.max(
  3000,
  Number(process.env.RANKING_DB_STABLE_DELAY_MS || 5000)
);

const HOT_CACHE_INTERVAL_MS = Math.max(
  60000,
  Number(process.env.RANKING_HOT_CACHE_INTERVAL_MS || 60000)
);

const HOT_CACHE_INITIAL_DELAY_MS = Math.max(
  15000,
  Number(process.env.RANKING_HOT_CACHE_INITIAL_DELAY_MS || 15000)
);

const RANKING_QUERY_TIMEOUT_MS = Math.max(
  1000,
  Number(process.env.RANKING_QUERY_TIMEOUT_MS || 2000)
);

const RANKING_QUERY_COOLDOWN_MS = Math.max(
  15000,
  Number(process.env.RANKING_QUERY_COOLDOWN_MS || 30000)
);

const RANKING_MAX_DOCS = Math.max(
  20,
  Math.min(300, Number(process.env.RANKING_MAX_DOCS || 100))
);

/* =====================================================
🔥 DB STABILITY
===================================================== */

let lastDbConnectedAt = isDBReady() ? now() : 0;

let refreshHotCacheRunning = false;

let lastRefreshHotCacheAt = 0;

let consecutiveDbFailures = 0;

let dbCooldownUntil = 0;

let queryRunning = false;

let queryCooldownUntil = 0;

function markDbConnected() {
  lastDbConnectedAt = now();

  consecutiveDbFailures = 0;

  dbCooldownUntil = 0;

  queryCooldownUntil = 0;

  console.log("🟢 DB EVENT: connected");
}

function markDbDisconnected() {
  lastDbConnectedAt = 0;

  dbCooldownUntil = now() + RANKING_QUERY_COOLDOWN_MS;

  queryCooldownUntil = now() + RANKING_QUERY_COOLDOWN_MS;

  console.warn("🟡 DB DISCONNECTED");
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
    return false;
  }

  if (dbCooldownUntil > now()) {
    return false;
  }

  if (queryCooldownUntil > now()) {
    return false;
  }

  return now() - lastDbConnectedAt >= DB_STABLE_DELAY_MS;
}

function activateDbCooldown() {
  consecutiveDbFailures += 1;

  const backoff = Math.min(
    120000,
    Math.max(
      RANKING_QUERY_COOLDOWN_MS,
      consecutiveDbFailures * RANKING_QUERY_COOLDOWN_MS
    )
  );

  dbCooldownUntil = now() + backoff;

  queryCooldownUntil = now() + backoff;

  console.warn(`🔄 DB RETRY IN ${backoff}ms`);
}

function isMongoTransientError(error) {
  const message = String(
    error && error.message ? error.message : error || ""
  ).toLowerCase();

  return (
    message.includes("before initial connection is complete") ||
    message.includes("buffercommands = false") ||
    message.includes("timed out") ||
    message.includes("server selection") ||
    message.includes("not connected") ||
    message.includes("disconnected") ||
    message.includes("topology") ||
    message.includes("connection") ||
    message.includes("pool") ||
    message.includes("sort exceeded memory limit")
  );
}

function createTimeoutError(ms) {
  const error = new Error(`ranking query timeout after ${ms}ms`);

  error.code = "RANKING_QUERY_TIMEOUT";

  return error;
}

async function withQueryTimeout(query, timeoutMs) {
  let timeoutId = null;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createTimeoutError(timeoutMs));
    }, timeoutMs);

    if (timeoutId && typeof timeoutId.unref === "function") {
      timeoutId.unref();
    }
  });

  try {
    return await Promise.race([
      Promise.resolve(query),
      timeoutPromise,
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/* =====================================================
🔥 FALLBACK
===================================================== */

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

function fallbackShopList(limit = FALLBACK_SHOPS.length) {
  return FALLBACK_SHOPS.slice(
    0,
    normalizeLimit(limit, FALLBACK_SHOPS.length)
  );
}

/* =====================================================
🔥 CACHE
===================================================== */

const CACHE = new Map();

const MAX_CACHE = 500;

function cacheSet(key, data, ttl = 10000) {
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
🔥 MEMORY CACHE
===================================================== */

let HOT_CACHE = fallbackShopList(10);

/* =====================================================
🔥 METRIC
===================================================== */

const METRIC = {
  totalRankCalls: 0,
  cacheHits: 0,
  slowQueries: 0,
  lastExecTime: 0,
  fallbackCalls: 0,
  dbNotReadySkips: 0,
  queryTimeouts: 0,
  queryBusySkips: 0,
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

  if (lat == null || lng == null) {
    return 0;
  }

  const shopLat =
    item.lat ??
    item.latitude ??
    (item.location && item.location.lat);

  const shopLng =
    item.lng ??
    item.longitude ??
    (item.location && item.location.lng);

  if (shopLat == null || shopLng == null) {
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

  if (
    Array.isArray(user.favorites) &&
    user.favorites.includes(String(item._id || item.id))
  ) {
    score += 50;
  }

  if (user.recentRegion && user.recentRegion === item.region) {
    score += 10;
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
🔥 QUERY
===================================================== */

function normalizeFilter(filter = {}) {
  return {
    isDeleted: false,
    visible: true,
    approved: true,
    ...filter,
  };
}

function normalizeProjection() {
  return {
    name: 1,
    shopName: 1,
    title: 1,
    region: 1,
    sido: 1,
    province: 1,
    district: 1,
    city: 1,
    address: 1,
    serviceTypes: 1,
    serviceType: 1,
    category: 1,
    tags: 1,
    lat: 1,
    lng: 1,
    latitude: 1,
    longitude: 1,
    location: 1,
    visible: 1,
    approved: 1,
    isDeleted: 1,
    premium: 1,
    isPremium: 1,
    premiumActive: 1,
    bestBadge: 1,
    ratingAvg: 1,
    likeCount: 1,
    viewCount: 1,
    reservationCount: 1,
    clickCount: 1,
    shareCount: 1,
    adScore: 1,
    reportCount: 1,
    bounceRate: 1,
    conversionRate: 1,
    reviewCount: 1,
    adStartedAt: 1,
    adEndedAt: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}

async function findShops(query = {}, limit = RANKING_MAX_DOCS) {
  if (!Shop || typeof Shop.find !== "function") {
    METRIC.fallbackCalls += 1;

    return FALLBACK_SHOPS;
  }

  if (!isDBStable()) {
    METRIC.dbNotReadySkips += 1;
    METRIC.fallbackCalls += 1;

    return HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS;
  }

  if (queryRunning) {
    METRIC.queryBusySkips += 1;
    METRIC.fallbackCalls += 1;

    return HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS;
  }

  queryRunning = true;

  try {
    const safeLimit = Math.min(
      RANKING_MAX_DOCS,
      Math.max(normalizeLimit(limit, 20) * 5, 20)
    );

    const queryTask = Shop.find(query)
      .select(normalizeProjection())
      .limit(safeLimit)
      .maxTimeMS(RANKING_QUERY_TIMEOUT_MS)
      .lean()
      .exec();

    const items = await withQueryTimeout(
      queryTask,
      RANKING_QUERY_TIMEOUT_MS + 500
    );

    consecutiveDbFailures = 0;

    return Array.isArray(items) ? items : [];
  } catch (error) {
    if (
      error &&
      (error.code === "RANKING_QUERY_TIMEOUT" || isMongoTransientError(error))
    ) {
      if (error.code === "RANKING_QUERY_TIMEOUT") {
        METRIC.queryTimeouts += 1;
      }

      activateDbCooldown();

      METRIC.dbNotReadySkips += 1;
      METRIC.fallbackCalls += 1;

      return HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS;
    }

    console.error(
      "[shop.ranking.service] find shops fail:",
      error.message
    );

    METRIC.fallbackCalls += 1;

    return HOT_CACHE.length ? HOT_CACHE : FALLBACK_SHOPS;
  } finally {
    queryRunning = false;
  }
}

/* =====================================================
🔥 CORE RANK
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

  const shops = await findShops(query, normalizedLimit);

  const ranked = shops
    .map((shop) => {
      const item = normalizeShop(shop);

      const base = calcFinalScore(item);

      const distance = calcDistanceScore(item, lat, lng);

      const personal = calcPersonalScore(item, user);

      return {
        ...item,
        finalScore: base + distance + personal,
      };
    })
    .sort((a, b) => safeNum(b.finalScore) - safeNum(a.finalScore))
    .slice(0, normalizedLimit);

  cacheSet(cacheKey, ranked);

  const elapsed = now() - startTime;

  METRIC.lastExecTime = elapsed;

  if (elapsed > 5000 && isDBStable()) {
    METRIC.slowQueries += 1;

    console.warn(`SLOW RANK: ${elapsed}ms`);
  }

  return ranked;
}

/* =====================================================
🔥 CATEGORY
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
      ],
    },
  });
}

/* =====================================================
🔥 TRENDING
===================================================== */

async function getTrending(limit = 20) {
  const normalizedLimit = normalizeLimit(limit, 20);

  const shops = await findShops(
    {
      isDeleted: false,
    },
    normalizedLimit
  );

  return shops
    .map((shop) => ({
      ...normalizeShop(shop),
      trendScore:
        calcTrendScore(shop) + calcFreshness(shop),
    }))
    .sort((a, b) => safeNum(b.trendScore) - safeNum(a.trendScore))
    .slice(0, normalizedLimit);
}

/* =====================================================
🔥 ADS
===================================================== */

async function getAds(limit = 10) {
  return rankShops({
    limit,
    filter: {
      premium: true,
    },
  });
}

/* =====================================================
🔥 HOT CACHE
===================================================== */

async function refreshHotCache() {
  if (refreshHotCacheRunning) {
    return HOT_CACHE;
  }

  if (!isDBStable()) {
    METRIC.dbNotReadySkips += 1;

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
    if (!isMongoTransientError(error)) {
      console.warn(
        "[shop.ranking.service] refresh hot cache fail:",
        error.message
      );
    }

    return HOT_CACHE;
  } finally {
    refreshHotCacheRunning = false;
  }
}

function scheduleRefreshHotCache() {
  if (!isDBStable()) {
    return;
  }

  if (queryRunning || refreshHotCacheRunning) {
    return;
  }

  if (
    now() - lastRefreshHotCacheAt <
    HOT_CACHE_INTERVAL_MS
  ) {
    return;
  }

  refreshHotCache().catch((error) => {
    if (!isMongoTransientError(error)) {
      console.warn(
        "[shop.ranking.service] hot cache schedule fail:",
        error.message
      );
    }
  });
}

if (!global.__NORA_RANKING_HOT_CACHE__) {
  global.__NORA_RANKING_HOT_CACHE__ = true;

  const initialTimer = setTimeout(() => {
    scheduleRefreshHotCache();
  }, HOT_CACHE_INITIAL_DELAY_MS);

  if (typeof initialTimer.unref === "function") {
    initialTimer.unref();
  }

  const intervalTimer = setInterval(() => {
    scheduleRefreshHotCache();
  }, HOT_CACHE_INTERVAL_MS);

  if (typeof intervalTimer.unref === "function") {
    intervalTimer.unref();
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
🔥 DEBUG
===================================================== */

function debugMetrics() {
  return {
    ...METRIC,
    cacheSize: CACHE.size,
    shopModel: !!Shop,
    dbReady: isDBReady(),
    dbStable: isDBStable(),
    dbState: mongoose.connection
      ? mongoose.connection.readyState
      : 0,
    dbCooldownUntil,
    queryCooldownUntil,
    consecutiveDbFailures,
    queryRunning,
    refreshHotCacheRunning,
    hotCache: HOT_CACHE.length,
    rankingQueryTimeoutMs: RANKING_QUERY_TIMEOUT_MS,
    rankingQueryCooldownMs: RANKING_QUERY_COOLDOWN_MS,
    rankingMaxDocs: RANKING_MAX_DOCS,
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
  }, 60000);

  if (typeof cleanTimer.unref === "function") {
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