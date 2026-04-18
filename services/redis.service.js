"use strict";

/* =====================================================
🔥 REDIS SERVICE (FINAL ULTRA MASTER)
👉 cache / session / lock / pubsub / rate-limit
👉 fallback (redis 없어도 동작)
👉 production ready
===================================================== */

let Redis;
try {
  Redis = require("ioredis");
} catch {
  console.warn("⚠️ ioredis not installed → fallback mode");
}

/* =====================================================
🔥 CONFIG
===================================================== */
const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_PREFIX = process.env.REDIS_PREFIX || "app:";
const DEFAULT_TTL = Number(process.env.REDIS_TTL || 60);

/* =====================================================
🔥 INTERNAL STATE
===================================================== */
let client = null;
let subscriber = null;
let publisher = null;

/* fallback memory */
const MEMORY_CACHE = new Map();

/* =====================================================
🔥 INIT
===================================================== */
function init() {
  if (!Redis || !REDIS_URL) {
    console.warn("⚠️ REDIS DISABLED → using memory cache");
    return null;
  }

  client = new Redis(REDIS_URL);
  subscriber = new Redis(REDIS_URL);
  publisher = new Redis(REDIS_URL);

  client.on("connect", () => console.log("🔥 REDIS CONNECTED"));
  client.on("error", (e) => console.error("❌ REDIS ERROR:", e.message));

  return client;
}

init();

/* =====================================================
🔥 UTIL
===================================================== */
function key(k) {
  return REDIS_PREFIX + k;
}

function now() {
  return Date.now();
}

/* =====================================================
🔥 BASIC CACHE
===================================================== */
async function set(k, value, ttl = DEFAULT_TTL) {
  try {
    if (client) {
      await client.set(key(k), JSON.stringify(value), "EX", ttl);
      return true;
    }

    MEMORY_CACHE.set(k, {
      value,
      expire: now() + ttl * 1000
    });

    return true;
  } catch (e) {
    return false;
  }
}

async function get(k) {
  try {
    if (client) {
      const data = await client.get(key(k));
      return data ? JSON.parse(data) : null;
    }

    const c = MEMORY_CACHE.get(k);
    if (!c) return null;

    if (now() > c.expire) {
      MEMORY_CACHE.delete(k);
      return null;
    }

    return c.value;
  } catch {
    return null;
  }
}

async function del(k) {
  try {
    if (client) return await client.del(key(k));

    MEMORY_CACHE.delete(k);
    return true;
  } catch {
    return false;
  }
}

/* =====================================================
🔥 CACHE WRAPPER
===================================================== */
async function cacheWrap(k, fn, ttl = DEFAULT_TTL) {
  const cached = await get(k);
  if (cached) return cached;

  const result = await fn();
  await set(k, result, ttl);

  return result;
}

/* =====================================================
🔥 RATE LIMIT
===================================================== */
async function rateLimit(keyName, limit = 10, window = 60) {
  const k = key("rate:" + keyName);

  if (client) {
    const count = await client.incr(k);

    if (count === 1) {
      await client.expire(k, window);
    }

    return count <= limit;
  }

  // fallback
  const c = MEMORY_CACHE.get(k) || { count: 0, expire: now() + window * 1000 };

  if (now() > c.expire) {
    c.count = 0;
    c.expire = now() + window * 1000;
  }

  c.count++;
  MEMORY_CACHE.set(k, c);

  return c.count <= limit;
}

/* =====================================================
🔥 LOCK (distributed)
===================================================== */
async function acquireLock(lockKey, ttl = 5) {
  if (!client) return true;

  const result = await client.set(
    key("lock:" + lockKey),
    "1",
    "NX",
    "EX",
    ttl
  );

  return result === "OK";
}

async function releaseLock(lockKey) {
  if (!client) return true;

  return client.del(key("lock:" + lockKey));
}

/* =====================================================
🔥 PUB/SUB
===================================================== */
async function publish(channel, message) {
  if (!publisher) return false;

  return publisher.publish(channel, JSON.stringify(message));
}

function subscribe(channel, handler) {
  if (!subscriber) return;

  subscriber.subscribe(channel);

  subscriber.on("message", (ch, msg) => {
    if (ch === channel) {
      try {
        handler(JSON.parse(msg));
      } catch {}
    }
  });
}

/* =====================================================
🔥 SESSION STORE (간단)
===================================================== */
async function setSession(sessionId, data, ttl = 3600) {
  return set("sess:" + sessionId, data, ttl);
}

async function getSession(sessionId) {
  return get("sess:" + sessionId);
}

async function destroySession(sessionId) {
  return del("sess:" + sessionId);
}

/* =====================================================
🔥 BULK OPS
===================================================== */
async function mget(keys = []) {
  if (client) {
    const res = await client.mget(keys.map(key));
    return res.map((v) => (v ? JSON.parse(v) : null));
  }

  return Promise.all(keys.map(get));
}

async function mset(obj = {}, ttl = DEFAULT_TTL) {
  const entries = Object.entries(obj);

  if (client) {
    const pipeline = client.pipeline();

    for (const [k, v] of entries) {
      pipeline.set(key(k), JSON.stringify(v), "EX", ttl);
    }

    await pipeline.exec();
    return true;
  }

  for (const [k, v] of entries) {
    await set(k, v, ttl);
  }

  return true;
}

/* =====================================================
🔥 STATS
===================================================== */
function stats() {
  return {
    redis: !!client,
    memoryKeys: MEMORY_CACHE.size
  };
}

/* =====================================================
🔥 CLEANUP (memory)
===================================================== */
setInterval(() => {
  if (!client) {
    for (const [k, v] of MEMORY_CACHE.entries()) {
      if (now() > v.expire) MEMORY_CACHE.delete(k);
    }
  }
}, 10000);

/* =====================================================
🔥 FINAL EXPORT
===================================================== */
module.exports = {
  init,

  // cache
  set,
  get,
  del,
  cacheWrap,

  // rate
  rateLimit,

  // lock
  acquireLock,
  releaseLock,

  // pubsub
  publish,
  subscribe,

  // session
  setSession,
  getSession,
  destroySession,

  // bulk
  mget,
  mset,

  // stats
  stats
};

console.log("🔥 REDIS SERVICE READY (ULTRA MASTER)");