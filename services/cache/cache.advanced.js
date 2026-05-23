"use strict";

/* =====================================================
🔥 ADVANCED CACHE SERVICE
👉 Redis + Memory Hybrid Cache
👉 TTL / Tag / Namespace / Stats
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Redis = null;

try {
  Redis = require("ioredis");
} catch (_) {
  console.warn("[cache.advanced] ioredis not installed → memory fallback");
}

/* =====================================================
🔥 CONFIG
===================================================== */
const REDIS_URL = process.env.REDIS_URL || null;
const DEFAULT_TTL = Number(process.env.CACHE_TTL || 60);

/* =====================================================
🔥 INIT
===================================================== */
const redis =
  Redis && REDIS_URL
    ? new Redis(REDIS_URL)
    : null;

/* =====================================================
🔥 MEMORY CACHE
===================================================== */
const memory = new Map();
const tagMap = new Map();

/* =====================================================
🔥 HELPER
===================================================== */
function now() {
  return Date.now();
}

function buildKey(ns, key) {
  return ns ? `${ns}:${key}` : key;
}

/* =====================================================
🔥 SERVICE
===================================================== */
class AdvancedCacheService {
  constructor() {
    this.stats = {
      hit: 0,
      miss: 0,
      set: 0,
    };
  }

  /* =====================================================
  🔥 SET
  ===================================================== */
  async set(key, value, ttl = DEFAULT_TTL, options = {}) {
    const { namespace, tags = [] } = options;

    const fullKey = buildKey(namespace, key);
    const expireAt = now() + ttl * 1000;

    this.stats.set++;

    /* Redis */
    if (redis) {
      try {
        await redis.set(fullKey, JSON.stringify(value), "EX", ttl);
      } catch (_) {}
    }

    /* Memory */
    memory.set(fullKey, { value, expireAt });

    /* Tag */
    tags.forEach(tag => {
      if (!tagMap.has(tag)) tagMap.set(tag, new Set());
      tagMap.get(tag).add(fullKey);
    });

    return true;
  }

  /* =====================================================
  🔥 GET
  ===================================================== */
  async get(key, options = {}) {
    const { namespace } = options;
    const fullKey = buildKey(namespace, key);

    /* Redis 우선 */
    if (redis) {
      try {
        const val = await redis.get(fullKey);
        if (val) {
          this.stats.hit++;
          return JSON.parse(val);
        }
      } catch (_) {}
    }

    /* Memory */
    const item = memory.get(fullKey);

    if (item && item.expireAt > now()) {
      this.stats.hit++;
      return item.value;
    }

    this.stats.miss++;

    return null;
  }

  /* =====================================================
  🔥 HAS
  ===================================================== */
  async has(key, options = {}) {
    const val = await this.get(key, options);
    return val !== null;
  }

  /* =====================================================
  🔥 DELETE
  ===================================================== */
  async del(key, options = {}) {
    const { namespace } = options;
    const fullKey = buildKey(namespace, key);

    if (redis) {
      try {
        await redis.del(fullKey);
      } catch (_) {}
    }

    memory.delete(fullKey);

    return true;
  }

  /* =====================================================
  🔥 TAG INVALIDATION
  ===================================================== */
  async invalidateTag(tag) {
    const keys = tagMap.get(tag);
    if (!keys) return false;

    for (const key of keys) {
      await this.del(key);
    }

    tagMap.delete(tag);

    return true;
  }

  /* =====================================================
  🔥 WRAP (자동 캐싱)
  ===================================================== */
  async wrap(key, fn, ttl = DEFAULT_TTL, options = {}) {
    const cached = await this.get(key, options);
    if (cached !== null) return cached;

    const result = await fn();

    await this.set(key, result, ttl, options);

    return result;
  }

  /* =====================================================
  🔥 CLEAR ALL
  ===================================================== */
  async reset() {
    if (redis) {
      try {
        await redis.flushall();
      } catch (_) {}
    }

    memory.clear();
    tagMap.clear();

    this.stats = { hit: 0, miss: 0, set: 0 };

    return true;
  }

  /* =====================================================
  🔥 STATS
  ===================================================== */
  getStats() {
    const total = this.stats.hit + this.stats.miss;

    return {
      ...this.stats,
      hitRate: total ? (this.stats.hit / total).toFixed(2) : 0,
    };
  }
}

module.exports = new AdvancedCacheService();