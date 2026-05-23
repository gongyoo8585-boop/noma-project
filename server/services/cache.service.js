"use strict";

/**
 * =====================================================
 * 🔥 CACHE SERVICE (FINAL COMPLETE)
 * ✔ Redis 기반 캐싱
 * ✔ 메모리 fallback (Redis 없을 때)
 * ✔ TTL 지원
 * ✔ JSON 자동 직렬화
 * ✔ 운영 가능한 수준
 * =====================================================
 */

let redis = null;

/* =========================
ENV
========================= */
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_TTL = Number(process.env.REDIS_TTL || 3600);

/* =========================
메모리 캐시 (fallback)
========================= */
const memoryCache = new Map();

/* =========================
Redis 연결 시도
========================= */
try {
  const { createClient } = require("redis");

  redis = createClient({
    url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
  });

  redis.on("error", (err) => {
    console.error("REDIS ERROR:", err.message);
    redis = null;
  });

  redis.connect().catch(() => {
    redis = null;
  });

} catch (e) {
  console.warn("Redis not installed → memory cache fallback");
  redis = null;
}

/* =========================
공통 직렬화
========================= */
const serialize = (data) => JSON.stringify(data);
const deserialize = (data) => {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

/* =========================
SET
========================= */
async function set(key, value, ttl = REDIS_TTL) {
  try {
    const data = serialize(value);

    if (redis) {
      await redis.set(key, data, {
        EX: ttl,
      });
    } else {
      memoryCache.set(key, {
        value: data,
        expireAt: Date.now() + ttl * 1000,
      });
    }
  } catch (e) {
    console.error("CACHE SET ERROR:", e.message);
  }
}

/* =========================
GET
========================= */
async function get(key) {
  try {
    if (redis) {
      const data = await redis.get(key);
      return data ? deserialize(data) : null;
    } else {
      const item = memoryCache.get(key);

      if (!item) return null;

      if (Date.now() > item.expireAt) {
        memoryCache.delete(key);
        return null;
      }

      return deserialize(item.value);
    }
  } catch (e) {
    console.error("CACHE GET ERROR:", e.message);
    return null;
  }
}

/* =========================
DEL
========================= */
async function del(key) {
  try {
    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (e) {
    console.error("CACHE DEL ERROR:", e.message);
  }
}

/* =========================
FLUSH (전체 삭제)
========================= */
async function flush() {
  try {
    if (redis) {
      await redis.flushAll();
    } else {
      memoryCache.clear();
    }
  } catch (e) {
    console.error("CACHE FLUSH ERROR:", e.message);
  }
}

/* =========================
WRAP (캐시 자동 처리)
========================= */
async function wrap(key, fn, ttl = REDIS_TTL) {
  const cached = await get(key);

  if (cached) return cached;

  const fresh = await fn();

  await set(key, fresh, ttl);

  return fresh;
}

/* =========================
EXPORT
========================= */
module.exports = {
  set,
  get,
  del,
  flush,
  wrap,
};