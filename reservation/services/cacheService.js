"use strict";

/* =====================================================
🔥 RESERVATION CACHE SERVICE (FINAL MASTER)
고성능 캐시 + TTL + LRU + 통계 + 이벤트 + 확장
===================================================== */

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_TTL = 1000 * 30; // 30초
const MAX_SIZE = 5000;

/* =====================================================
🔥 STORAGE
===================================================== */
const STORE = new Map();

/* =====================================================
🔥 STATS
===================================================== */
const STATS = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  evictions: 0
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function isExpired(entry) {
  return entry.expire && entry.expire < now();
}

function clone(v) {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch (_) {
    return v;
  }
}

/* =====================================================
🔥 CORE
===================================================== */

/* SET */
function set(key, value, ttl = DEFAULT_TTL) {
  if (!key) return false;

  if (STORE.size >= MAX_SIZE) {
    evict();
  }

  STORE.set(key, {
    value: clone(value),
    expire: ttl ? now() + ttl : null,
    hit: 0,
    createdAt: now()
  });

  STATS.sets++;
  return true;
}

/* GET */
function get(key) {
  const entry = STORE.get(key);

  if (!entry) {
    STATS.misses++;
    return null;
  }

  if (isExpired(entry)) {
    STORE.delete(key);
    STATS.misses++;
    STATS.deletes++;
    return null;
  }

  entry.hit++;
  STATS.hits++;

  return clone(entry.value);
}

/* DELETE */
function del(key) {
  if (STORE.has(key)) {
    STORE.delete(key);
    STATS.deletes++;
    return true;
  }
  return false;
}

/* HAS */
function has(key) {
  const entry = STORE.get(key);
  if (!entry) return false;
  if (isExpired(entry)) {
    STORE.delete(key);
    return false;
  }
  return true;
}

/* CLEAR */
function clear() {
  STORE.clear();
  return true;
}

/* =====================================================
🔥 BULK
===================================================== */
function mget(keys = []) {
  const result = {};
  for (const k of keys) {
    result[k] = get(k);
  }
  return result;
}

function mset(obj = {}, ttl = DEFAULT_TTL) {
  for (const k in obj) {
    set(k, obj[k], ttl);
  }
  return true;
}

/* =====================================================
🔥 EVICTION (LRU)
===================================================== */
function evict() {
  let oldestKey = null;
  let oldestHit = Infinity;

  for (const [k, v] of STORE.entries()) {
    if (v.hit < oldestHit) {
      oldestHit = v.hit;
      oldestKey = k;
    }
  }

  if (oldestKey) {
    STORE.delete(oldestKey);
    STATS.evictions++;
  }
}

/* =====================================================
🔥 CLEANUP (EXPIRED)
===================================================== */
function cleanup() {
  let removed = 0;

  for (const [k, v] of STORE.entries()) {
    if (isExpired(v)) {
      STORE.delete(k);
      removed++;
    }
  }

  if (removed > 0) {
    STATS.deletes += removed;
  }

  return removed;
}

/* =====================================================
🔥 KEYS / INFO
===================================================== */
function keys() {
  return Array.from(STORE.keys());
}

function size() {
  return STORE.size;
}

function stats() {
  return {
    ...STATS,
    size: STORE.size
  };
}

/* =====================================================
🔥 NAMESPACE SUPPORT
===================================================== */
function prefixKeys(prefix) {
  return keys().filter(k => k.startsWith(prefix));
}

function clearPrefix(prefix) {
  const ks = prefixKeys(prefix);
  for (const k of ks) {
    del(k);
  }
  return ks.length;
}

/* =====================================================
🔥 WRAPPER (자동 캐싱)
===================================================== */
async function wrap(key, fn, ttl = DEFAULT_TTL) {
  const cached = get(key);
  if (cached) return cached;

  const result = await fn();
  set(key, result, ttl);
  return result;
}

/* =====================================================
🔥 WATCH (디버그용)
===================================================== */
function inspect(key) {
  const v = STORE.get(key);
  if (!v) return null;

  return {
    ...v,
    remaining: v.expire ? v.expire - now() : null
  };
}

/* =====================================================
🔥 HEALTH
===================================================== */
function getHealth() {
  return {
    ok: true,
    size: STORE.size,
    hits: STATS.hits,
    misses: STATS.misses,
    evictions: STATS.evictions,
    time: new Date()
  };
}

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
setInterval(() => {
  try {
    cleanup();
  } catch (_) {}
}, 10000);

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  set,
  get,
  del,
  has,
  clear,

  mget,
  mset,

  wrap,

  keys,
  size,
  stats,

  prefixKeys,
  clearPrefix,

  inspect,
  cleanup,

  getHealth
};