"use strict";

/**
 * =====================================================
 * 🔥 REDIS SERVICE (ULTRA FINAL COMPLETE)
 * =====================================================
 */

let Redis = null;
let client = null;
let isConnecting = false;
let redisDisabled = false;
let redisWarned = false;

/* =========================
SAFE LOAD
========================= */
try {
  Redis = require("ioredis");
} catch (e) {
  redisDisabled = true;
  console.warn("⚠️ ioredis not installed → Redis disabled");
}

/* =========================
ENV CHECK
========================= */
function isRedisEnabled() {
  if (redisDisabled) return false;
  if (!Redis) return false;

  const disabledByEnv =
    String(process.env.REDIS_DISABLED || "").toLowerCase() === "true" ||
    String(process.env.DISABLE_REDIS || "").toLowerCase() === "true" ||
    String(process.env.REDIS_ENABLE || "").toLowerCase() === "false";

  if (disabledByEnv) return false;

  return true;
}

function warnOnce(message) {
  if (redisWarned) return;
  redisWarned = true;
  console.warn(message);
}

/* =========================
INIT
========================= */
function init() {
  if (!isRedisEnabled()) return null;
  if (client) return client;

  try {
    client = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB || 0),

      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT || 800),
      commandTimeout: Number(process.env.REDIS_COMMAND_TIMEOUT || 1000),
      retryStrategy: () => null,
      reconnectOnError: () => false,
    });

    client.on("connect", () => {
      console.log("🟢 Redis connected");
      isConnecting = false;
      redisWarned = false;
    });

    client.on("ready", () => {
      console.log("🟢 Redis ready");
      isConnecting = false;
      redisWarned = false;
    });

    client.on("close", () => {
      isConnecting = false;
    });

    client.on("end", () => {
      isConnecting = false;
    });

    client.on("error", (err) => {
      isConnecting = false;
      warnOnce(`⚠️ Redis disabled or unavailable: ${err.message}`);
    });

    return client;
  } catch (e) {
    redisDisabled = true;
    warnOnce(`❌ Redis init fail: ${e.message}`);
    return null;
  }
}

/* =========================
CONNECT SAFE
========================= */
async function connectSafe() {
  if (!isRedisEnabled()) return null;

  const c = init();
  if (!c) return null;

  if (c.status === "ready") return c;

  if (
    c.status === "connecting" ||
    c.status === "connect" ||
    c.status === "wait"
  ) {
    if (isConnecting) return null;
  }

  if (
    c.status === "end" ||
    c.status === "close" ||
    c.status === "wait"
  ) {
    if (isConnecting) return null;

    try {
      isConnecting = true;
      await c.connect();
      isConnecting = false;

      if (c.status === "ready") return c;

      return null;
    } catch (e) {
      isConnecting = false;
      warnOnce(`⚠️ Redis connect skipped: ${e.message}`);
      return null;
    }
  }

  return c.status === "ready" ? c : null;
}

/* =========================
GET CLIENT
========================= */
function getClient() {
  if (!isRedisEnabled()) return null;

  if (!client) {
    init();
  }

  if (!client) return null;

  if (client.status === "ready") return client;

  if (
    !isConnecting &&
    (client.status === "wait" ||
      client.status === "end" ||
      client.status === "close")
  ) {
    isConnecting = true;

    client
      .connect()
      .then(() => {
        isConnecting = false;
      })
      .catch((e) => {
        isConnecting = false;
        warnOnce(`⚠️ Redis connect skipped: ${e.message}`);
      });
  }

  return client.status === "ready" ? client : null;
}

/* =========================
SET
========================= */
async function set(key, value, ttl = 60) {
  try {
    const c = await connectSafe();
    if (!c) return false;

    const v =
      typeof value === "string"
        ? value
        : JSON.stringify(value);

    if (ttl > 0) {
      await c.set(key, v, "EX", ttl);
    } else {
      await c.set(key, v);
    }

    return true;
  } catch (e) {
    warnOnce(`REDIS SET FAIL: ${e.message}`);
    return false;
  }
}

/* =========================
GET
========================= */
async function get(key) {
  try {
    const c = await connectSafe();
    if (!c) return null;

    const v = await c.get(key);
    if (!v) return null;

    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  } catch (e) {
    warnOnce(`REDIS GET FAIL: ${e.message}`);
    return null;
  }
}

/* =========================
DEL
========================= */
async function del(key) {
  try {
    const c = await connectSafe();
    if (!c) return false;

    await c.del(key);
    return true;
  } catch (e) {
    warnOnce(`REDIS DEL FAIL: ${e.message}`);
    return false;
  }
}

/* =========================
EXISTS
========================= */
async function exists(key) {
  try {
    const c = await connectSafe();
    if (!c) return false;

    const res = await c.exists(key);
    return res === 1;
  } catch (e) {
    warnOnce(`REDIS EXISTS FAIL: ${e.message}`);
    return false;
  }
}

/* =========================
TTL
========================= */
async function ttl(key) {
  try {
    const c = await connectSafe();
    if (!c) return -1;

    return await c.ttl(key);
  } catch (e) {
    warnOnce(`REDIS TTL FAIL: ${e.message}`);
    return -1;
  }
}

/* =========================
FLUSH
========================= */
async function flush() {
  try {
    const c = await connectSafe();
    if (!c) return false;

    await c.flushall();
    return true;
  } catch (e) {
    warnOnce(`REDIS FLUSH FAIL: ${e.message}`);
    return false;
  }
}

/* =========================
LOCK
========================= */
async function lock(key, ttl = 30) {
  try {
    const c = await connectSafe();
    if (!c) return false;

    const lockKey = `lock:${key}`;
    const value = `${process.pid}:${Date.now()}`;

    const result = await c.set(lockKey, value, "NX", "EX", ttl);

    return result === "OK";
  } catch (e) {
    warnOnce(`REDIS LOCK FAIL: ${e.message}`);
    return false;
  }
}

/* =========================
UNLOCK
========================= */
async function unlock(key) {
  try {
    const c = await connectSafe();
    if (!c) return false;

    const lockKey = `lock:${key}`;

    await c.del(lockKey);
    return true;
  } catch (e) {
    warnOnce(`REDIS UNLOCK FAIL: ${e.message}`);
    return false;
  }
}

/* =========================
QUIT
========================= */
async function quit() {
  try {
    if (!client) return true;

    await client.quit();
    client = null;
    isConnecting = false;

    return true;
  } catch (e) {
    client = null;
    isConnecting = false;
    return false;
  }
}

/* =========================
EXPORT
========================= */
module.exports = {
  getClient,
  set,
  get,
  del,
  exists,
  ttl,
  flush,
  lock,
  unlock,
  quit,
};