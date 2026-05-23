"use strict";

/**
 * =====================================================
 * 🔥 REDIS LOCK SERVICE (ULTRA FINAL - FIXED)
 * ✔ 기존 기능 100% 유지
 * ✔ 분산 락
 * ✔ Redis + 메모리 fallback
 * ✔ TTL / retry / timeout
 * ✔ 소유권 검증
 * ✔ Redis 미설치/미실행 시 무한 REDIS LOCK ERROR 방지
 * ✔ 안정성 강화
 * =====================================================
 */

let redis = null;
let redisReady = false;
let redisConnecting = false;
let redisDisabled = false;
let redisErrorWarned = false;

/* =========================
ENV
========================= */
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || "";
const REDIS_DB = process.env.REDIS_DB || "";

const REDIS_CONNECT_TIMEOUT = Number(process.env.REDIS_CONNECT_TIMEOUT || 700);
const REDIS_DISABLED =
  String(process.env.REDIS_DISABLED || "").toLowerCase() === "true" ||
  String(process.env.DISABLE_REDIS || "").toLowerCase() === "true" ||
  String(process.env.REDIS_ENABLE || "").toLowerCase() === "false";

/* =========================
메모리 fallback
========================= */
const memoryLocks = new Map();

/* =========================
유틸
========================= */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const warnRedisOnce = (message) => {
  if (redisErrorWarned) return;
  redisErrorWarned = true;
  console.warn(message);
};

const cleanupMemoryLocks = () => {
  const now = Date.now();

  memoryLocks.forEach((item, key) => {
    if (!item || item.expire <= now) {
      memoryLocks.delete(key);
    }
  });
};

/* =========================
고유 값 생성
========================= */
const genValue = () => `${process.pid}-${Date.now()}-${Math.random()}`;

/* =========================
Redis URL
========================= */
const getRedisUrl = () => {
  const auth = REDIS_PASSWORD ? `:${encodeURIComponent(REDIS_PASSWORD)}@` : "";
  const db = REDIS_DB !== "" ? `/${REDIS_DB}` : "";

  return `redis://${auth}${REDIS_HOST}:${REDIS_PORT}${db}`;
};

/* =========================
Redis 연결
========================= */
async function initRedis() {
  if (REDIS_DISABLED || redisDisabled) {
    redis = null;
    redisReady = false;
    redisConnecting = false;
    return null;
  }

  if (redis && redisReady) {
    return redis;
  }

  if (redisConnecting) {
    return null;
  }

  try {
    const { createClient } = require("redis");

    redisConnecting = true;

    redis = createClient({
      url: getRedisUrl(),
      socket: {
        connectTimeout: REDIS_CONNECT_TIMEOUT,
        reconnectStrategy: false,
      },
      disableOfflineQueue: true,
    });

    redis.on("error", (err) => {
      redisReady = false;
      redisConnecting = false;
      redisDisabled = true;
      warnRedisOnce(`Redis unavailable → memory lock fallback: ${err.message}`);
    });

    redis.on("connect", () => {
      redisReady = true;
      redisConnecting = false;
      redisErrorWarned = false;
    });

    redis.on("ready", () => {
      redisReady = true;
      redisConnecting = false;
      redisErrorWarned = false;
    });

    redis.on("end", () => {
      redisReady = false;
      redisConnecting = false;
    });

    redis.on("reconnecting", () => {
      redisReady = false;
      redisConnecting = true;
    });

    await redis.connect();

    redisReady = true;
    redisConnecting = false;

    return redis;
  } catch (e) {
    redis = null;
    redisReady = false;
    redisConnecting = false;
    redisDisabled = true;
    warnRedisOnce(`Redis disabled → memory lock fallback: ${e.message}`);
    return null;
  }
}

function getRedisClient() {
  if (REDIS_DISABLED || redisDisabled) {
    return null;
  }

  if (redis && redisReady) {
    return redis;
  }

  initRedis().catch(() => {
    redis = null;
    redisReady = false;
    redisConnecting = false;
    redisDisabled = true;
  });

  return null;
}

/* =========================
🔥 LOCK 획득
========================= */
async function acquireLock(key, ttl = 5000) {
  const lockKey = `lock:${key}`;
  const value = genValue();

  cleanupMemoryLocks();

  const client = getRedisClient();

  if (client && redisReady) {
    try {
      const result = await client.set(lockKey, value, {
        NX: true,
        PX: ttl,
      });

      if (result === "OK") {
        return { success: true, value };
      }

      return { success: false };
    } catch (e) {
      redisReady = false;
      redisDisabled = true;
      warnRedisOnce(`Redis lock fallback activated: ${e.message}`);
    }
  }

  const now = Date.now();
  const existing = memoryLocks.get(lockKey);

  if (existing && existing.expire > now) {
    return { success: false };
  }

  memoryLocks.set(lockKey, {
    value,
    expire: now + ttl,
  });

  return { success: true, value };
}

/* =========================
🔥 LOCK 해제
========================= */
async function releaseLock(key, value) {
  const lockKey = `lock:${key}`;

  cleanupMemoryLocks();

  const client = getRedisClient();

  if (client && redisReady) {
    try {
      const current = await client.get(lockKey);

      if (current === value) {
        await client.del(lockKey);
      }

      return true;
    } catch (e) {
      redisReady = false;
      redisDisabled = true;
      warnRedisOnce(`Redis release fallback activated: ${e.message}`);
    }
  }

  const existing = memoryLocks.get(lockKey);

  if (existing && existing.value === value) {
    memoryLocks.delete(lockKey);
  }

  return true;
}

/* =========================
🔥 LOCK WITH RETRY
========================= */
async function withLock(key, fn, options = {}) {
  const {
    ttl = 5000,
    retry = 15,
    retryDelay = 100,
    timeout = 10000,
  } = options;

  const start = Date.now();
  let lockData = null;

  for (let i = 0; i < retry; i++) {
    lockData = await acquireLock(key, ttl);

    if (lockData && lockData.success) {
      break;
    }

    if (Date.now() - start > timeout) {
      throw new Error("LOCK_TIMEOUT");
    }

    await sleep(retryDelay);
  }

  if (!lockData || !lockData.success) {
    throw new Error("LOCK_ACQUIRE_FAILED");
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key, lockData.value);
  }
}

/* =========================
🔥 예약 락
========================= */
function reservationLockKey({ shopId, date, time }) {
  return `reservation:${shopId}:${date}:${time}`;
}

/* =========================
🔥 결제 락
========================= */
function paymentLockKey({ reservationId }) {
  return `payment:${reservationId}`;
}

/* =========================
🔥 락 상태 조회
========================= */
async function isLocked(key) {
  const lockKey = `lock:${key}`;

  cleanupMemoryLocks();

  const client = getRedisClient();

  if (client && redisReady) {
    try {
      const val = await client.get(lockKey);
      return !!val;
    } catch (e) {
      redisReady = false;
      redisDisabled = true;
      warnRedisOnce(`Redis isLocked fallback activated: ${e.message}`);
    }
  }

  const existing = memoryLocks.get(lockKey);

  if (!existing) return false;

  if (existing.expire <= Date.now()) {
    memoryLocks.delete(lockKey);
    return false;
  }

  return true;
}

/* =========================
🔥 강제 해제
========================= */
async function forceRelease(key) {
  const lockKey = `lock:${key}`;

  cleanupMemoryLocks();

  const client = getRedisClient();

  if (client && redisReady) {
    try {
      await client.del(lockKey);
      return true;
    } catch (e) {
      redisReady = false;
      redisDisabled = true;
      warnRedisOnce(`Redis forceRelease fallback activated: ${e.message}`);
    }
  }

  memoryLocks.delete(lockKey);
  return true;
}

/* =========================
🔥 종료
========================= */
async function close() {
  try {
    if (redis && redisReady) {
      await redis.quit();
    }
  } catch (e) {
    try {
      if (redis) {
        await redis.disconnect();
      }
    } catch (_) {}
  } finally {
    redis = null;
    redisReady = false;
    redisConnecting = false;
  }
}

/* =========================
EXPORT
========================= */
module.exports = {
  acquireLock,
  releaseLock,
  withLock,
  reservationLockKey,
  paymentLockKey,
  isLocked,
  forceRelease,
  close,
};