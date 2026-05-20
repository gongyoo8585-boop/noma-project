"use strict";

/**
 * =====================================================
 * 🔥 CACHE ANALYTICS SERVICE (FINAL COMPLETE)
 * ✔ Redis + Memory 캐시 상태 분석
 * ✔ hit / miss / key 수 / memory 상태
 * ✔ Redis 없어도 fallback
 * ✔ 0% 오류 방어
 * =====================================================
 */

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

const redisService = safeRequire("../cache/redis.service");

/* =========================
MEMORY CACHE TRACKING
========================= */
const STATS = {
  hit: 0,
  miss: 0,
};

/* =========================
UTIL
========================= */
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* =========================
TRACK FUNCTIONS
========================= */
function trackHit() {
  STATS.hit++;
}

function trackMiss() {
  STATS.miss++;
}

/* =========================
REDIS KEY COUNT
========================= */
async function getRedisKeyCount() {
  try {
    if (!redisService?.getClient) return 0;

    const client = redisService.getClient();
    if (!client) return 0;

    const keys = await client.keys("*");
    return Array.isArray(keys) ? keys.length : 0;
  } catch {
    return 0;
  }
}

/* =========================
REDIS INFO
========================= */
async function getRedisInfo() {
  try {
    if (!redisService?.getClient) {
      return {
        connected: false,
        memoryUsed: 0,
      };
    }

    const client = redisService.getClient();
    if (!client) {
      return {
        connected: false,
        memoryUsed: 0,
      };
    }

    const info = await client.info("memory");

    const match = typeof info === "string"
      ? info.match(/used_memory:(\d+)/)
      : null;

    return {
      connected: true,
      memoryUsed: match ? toNumber(match[1], 0) : 0,
    };
  } catch {
    return {
      connected: false,
      memoryUsed: 0,
    };
  }
}

/* =====================================================
🔥 MAIN
===================================================== */
async function getCacheStats() {
  try {
    const [keyCount, redisInfo] = await Promise.all([
      getRedisKeyCount(),
      getRedisInfo(),
    ]);

    return {
      hit: toNumber(STATS.hit, 0),
      miss: toNumber(STATS.miss, 0),
      keys: toNumber(keyCount, 0),

      redis: {
        connected: Boolean(redisInfo.connected),
        memoryUsed: toNumber(redisInfo.memoryUsed, 0),
      },

      generatedAt: new Date(),
    };
  } catch (e) {
    console.error("CACHE ANALYTICS ERROR:", e.message);

    return {
      hit: 0,
      miss: 0,
      keys: 0,
      redis: {
        connected: false,
        memoryUsed: 0,
      },
      generatedAt: new Date(),
    };
  }
}

/* =====================================================
EXPORT
===================================================== */
module.exports = {
  getCacheStats,
  trackHit,
  trackMiss,
};