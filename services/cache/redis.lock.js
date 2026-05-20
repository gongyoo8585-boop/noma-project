"use strict";

/* =====================================================
🔥 REDIS LOCK SERVICE
👉 분산 락 (Distributed Lock)
👉 중복 결제 / 예약 충돌 방지
👉 Redis + Memory fallback
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Redis = null;

try {
  Redis = require("ioredis");
} catch (_) {
  console.warn("[redis.lock] ioredis not installed → memory fallback");
}

/* =====================================================
🔥 CONFIG
===================================================== */
const REDIS_URL = process.env.REDIS_URL || null;
const DEFAULT_TTL = Number(process.env.LOCK_TTL || 5000); // ms

/* =====================================================
🔥 INIT
===================================================== */
const redis =
  Redis && REDIS_URL
    ? new Redis(REDIS_URL)
    : null;

/* =====================================================
🔥 MEMORY FALLBACK
===================================================== */
const memoryLocks = new Map();

/* =====================================================
🔥 HELPER
===================================================== */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function now() {
  return Date.now();
}

/* =====================================================
🔥 SERVICE
===================================================== */
class RedisLockService {
  constructor() {
    this.prefix = "lock:";
  }

  /* =====================================================
  🔥 ACQUIRE LOCK
  ===================================================== */
  async acquire(key, ttl = DEFAULT_TTL) {
    const lockKey = this.prefix + key;
    const value = `${process.pid}_${now()}`;

    /* 🔥 REDIS */
    if (redis) {
      const result = await redis.set(
        lockKey,
        value,
        "PX",
        ttl,
        "NX"
      );

      if (result === "OK") {
        return { key: lockKey, value };
      }

      return null;
    }

    /* 🔥 MEMORY FALLBACK */
    const existing = memoryLocks.get(lockKey);

    if (!existing || existing.expireAt < now()) {
      memoryLocks.set(lockKey, {
        value,
        expireAt: now() + ttl,
      });

      return { key: lockKey, value };
    }

    return null;
  }

  /* =====================================================
  🔥 RELEASE LOCK (SAFE)
  ===================================================== */
  async release(lock) {
    if (!lock) return false;

    const { key, value } = lock;

    /* 🔥 REDIS */
    if (redis) {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1]
        then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      try {
        await redis.eval(script, 1, key, value);
        return true;
      } catch (_) {
        return false;
      }
    }

    /* 🔥 MEMORY */
    const existing = memoryLocks.get(key);

    if (existing && existing.value === value) {
      memoryLocks.delete(key);
      return true;
    }

    return false;
  }

  /* =====================================================
  🔥 WITH LOCK (권장 사용 방식)
  ===================================================== */
  async withLock(key, fn, ttl = DEFAULT_TTL, retry = 3) {
    let lock = null;

    for (let i = 0; i < retry; i++) {
      lock = await this.acquire(key, ttl);

      if (lock) break;

      await sleep(100);
    }

    if (!lock) {
      throw new Error("LOCK_ACQUIRE_FAILED");
    }

    try {
      return await fn();
    } finally {
      await this.release(lock);
    }
  }

  /* =====================================================
  🔥 FORCE RELEASE (관리자용)
  ===================================================== */
  async forceRelease(key) {
    const lockKey = this.prefix + key;

    if (redis) {
      await redis.del(lockKey);
      return true;
    }

    memoryLocks.delete(lockKey);
    return true;
  }

  /* =====================================================
  🔥 STATUS
  ===================================================== */
  async isLocked(key) {
    const lockKey = this.prefix + key;

    if (redis) {
      const res = await redis.get(lockKey);
      return !!res;
    }

    const existing = memoryLocks.get(lockKey);
    return !!existing && existing.expireAt > now();
  }

  /* =====================================================
  🔥 RESET (개발용)
  ===================================================== */
  async reset() {
    if (redis) {
      // prefix 기반 삭제 (주의)
      const keys = await redis.keys(this.prefix + "*");
      if (keys.length) {
        await redis.del(keys);
      }
      return true;
    }

    memoryLocks.clear();
    return true;
  }
}

module.exports = new RedisLockService();