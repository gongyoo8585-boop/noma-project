"use strict";

/* =====================================================
🔥 CACHE SERVICE (FINAL ULTRA COMPLETE MASTER)
👉 Memory cache + Redis-ready abstraction
👉 TTL / prefix / stats / invalidate / pattern delete
👉 통째 교체 가능한 완성형
===================================================== */

const ENV = (() => {
  try {
    return require("../config/env");
  } catch (_) {
    return {
      ENABLE_CACHE: true,
      CACHE_TTL: 3000,
      NODE_ENV: "development"
    };
  }
})();

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_TTL = Number(ENV.CACHE_TTL || 3000);
const ENABLE_CACHE = ENV.ENABLE_CACHE !== false;
const MAX_KEYS = Number(process.env.CACHE_MAX_KEYS || 5000);
const CLEANUP_INTERVAL = Number(process.env.CACHE_CLEANUP_INTERVAL || 30000);

/* =====================================================
🔥 INTERNAL STORE
===================================================== */
const STORE = new Map();
const STATS = {
  sets: 0,
  gets: 0,
  hits: 0,
  misses: 0,
  deletes: 0,
  clears: 0,
  expirations: 0,
  patternDeletes: 0
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function normalizeKey(key = "") {
  return safeStr(String(key || ""));
}

function normalizeTTL(ttl = DEFAULT_TTL) {
  const n = safeNum(ttl, DEFAULT_TTL);
  return n > 0 ? n : DEFAULT_TTL;
}

function buildKey(prefix = "", key = "") {
  const p = safeStr(prefix);
  const k = normalizeKey(key);
  return p ? `${p}:${k}` : k;
}

function isExpired(item) {
  if (!item) return true;
  if (!item.expireAt) return false;
  return now() > item.expireAt;
}

function ensureCacheEnabled() {
  return !!ENABLE_CACHE;
}

function safePatternToRegex(pattern = "*") {
  const escaped = String(pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}

/* =====================================================
🔥 CORE MEMORY CACHE
===================================================== */
function set(key, value, ttl = DEFAULT_TTL, meta = {}) {
  if (!ensureCacheEnabled()) return value;

  const k = normalizeKey(key);
  const t = normalizeTTL(ttl);

  if (!k) return value;

  if (STORE.size >= MAX_KEYS) {
    cleanupOldest(Math.ceil(MAX_KEYS * 0.1));
  }

  STORE.set(k, {
    value: clone(value),
    createdAt: now(),
    updatedAt: now(),
    expireAt: now() + t,
    ttl: t,
    meta: meta && typeof meta === "object" ? clone(meta) : {}
  });

  STATS.sets += 1;
  return value;
}

function get(key, fallback = null) {
  STATS.gets += 1;

  if (!ensureCacheEnabled()) {
    STATS.misses += 1;
    return fallback;
  }

  const k = normalizeKey(key);
  const item = STORE.get(k);

  if (!item) {
    STATS.misses += 1;
    return fallback;
  }

  if (isExpired(item)) {
    STORE.delete(k);
    STATS.expirations += 1;
    STATS.misses += 1;
    return fallback;
  }

  STATS.hits += 1;
  return clone(item.value);
}

function has(key) {
  const k = normalizeKey(key);
  const item = STORE.get(k);

  if (!item) return false;
  if (isExpired(item)) {
    STORE.delete(k);
    STATS.expirations += 1;
    return false;
  }

  return true;
}

function del(key) {
  const k = normalizeKey(key);
  const existed = STORE.delete(k);
  if (existed) STATS.deletes += 1;
  return existed;
}

function clear() {
  const size = STORE.size;
  STORE.clear();
  STATS.clears += 1;
  return size;
}

function ttl(key) {
  const k = normalizeKey(key);
  const item = STORE.get(k);
  if (!item) return -1;
  if (isExpired(item)) {
    STORE.delete(k);
    STATS.expirations += 1;
    return -1;
  }
  return Math.max(0, item.expireAt - now());
}

function touch(key, ttlValue = DEFAULT_TTL) {
  const k = normalizeKey(key);
  const item = STORE.get(k);
  if (!item) return false;
  if (isExpired(item)) {
    STORE.delete(k);
    STATS.expirations += 1;
    return false;
  }

  const t = normalizeTTL(ttlValue);
  item.expireAt = now() + t;
  item.updatedAt = now();
  item.ttl = t;
  STORE.set(k, item);
  return true;
}

/* =====================================================
🔥 PREFIX API
===================================================== */
function setWithPrefix(prefix, key, value, ttlValue = DEFAULT_TTL, meta = {}) {
  return set(buildKey(prefix, key), value, ttlValue, meta);
}

function getWithPrefix(prefix, key, fallback = null) {
  return get(buildKey(prefix, key), fallback);
}

function delWithPrefix(prefix, key) {
  return del(buildKey(prefix, key));
}

function hasWithPrefix(prefix, key) {
  return has(buildKey(prefix, key));
}

/* =====================================================
🔥 FETCH OR SET
===================================================== */
async function remember(key, ttlValue, resolver, meta = {}) {
  const cached = get(key, undefined);
  if (cached !== undefined) return cached;

  const value = await Promise.resolve(resolver());
  set(key, value, ttlValue, meta);
  return value;
}

async function rememberWithPrefix(prefix, key, ttlValue, resolver, meta = {}) {
  return remember(buildKey(prefix, key), ttlValue, resolver, meta);
}

/* =====================================================
🔥 BULK API
===================================================== */
function mget(keys = []) {
  return (Array.isArray(keys) ? keys : []).map((k) => get(k, null));
}

function mset(entries = [], ttlValue = DEFAULT_TTL) {
  let count = 0;
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!entry || typeof entry !== "object") continue;
    set(entry.key, entry.value, entry.ttl || ttlValue, entry.meta || {});
    count += 1;
  }
  return count;
}

function mdel(keys = []) {
  let count = 0;
  for (const key of Array.isArray(keys) ? keys : []) {
    if (del(key)) count += 1;
  }
  return count;
}

/* =====================================================
🔥 PATTERN DELETE / SEARCH
===================================================== */
function keys(pattern = "*") {
  const regex = safePatternToRegex(pattern);
  const result = [];

  for (const [key, item] of STORE.entries()) {
    if (isExpired(item)) {
      STORE.delete(key);
      STATS.expirations += 1;
      continue;
    }

    if (regex.test(key)) {
      result.push(key);
    }
  }

  return result.sort();
}

function delByPattern(pattern = "*") {
  const matched = keys(pattern);
  let count = 0;

  for (const key of matched) {
    if (STORE.delete(key)) {
      count += 1;
    }
  }

  if (count > 0) {
    STATS.patternDeletes += 1;
    STATS.deletes += count;
  }

  return count;
}

/* =====================================================
🔥 OBJECT / JSON HELPERS
===================================================== */
function setJSON(key, value, ttlValue = DEFAULT_TTL, meta = {}) {
  return set(key, value, ttlValue, meta);
}

function getJSON(key, fallback = null) {
  return get(key, fallback);
}

/* =====================================================
🔥 COUNTER API
===================================================== */
function incr(key, by = 1, ttlValue = DEFAULT_TTL) {
  const current = safeNum(get(key, 0), 0);
  const next = current + safeNum(by, 1);
  set(key, next, ttlValue);
  return next;
}

function decr(key, by = 1, ttlValue = DEFAULT_TTL) {
  const current = safeNum(get(key, 0), 0);
  const next = current - safeNum(by, 1);
  set(key, next, ttlValue);
  return next;
}

/* =====================================================
🔥 CACHE TAG / INVALIDATION
===================================================== */
function tagKey(tag = "", key = "") {
  return buildKey(`tag:${safeStr(tag)}`, key);
}

function setTagged(tag, key, value, ttlValue = DEFAULT_TTL, meta = {}) {
  const fullKey = normalizeKey(key);
  set(fullKey, value, ttlValue, meta);

  const listKey = `__tag_index__:${safeStr(tag)}`;
  const existing = get(listKey, []);
  const next = Array.from(new Set([...(Array.isArray(existing) ? existing : []), fullKey]));
  set(listKey, next, ttlValue * 10);

  return value;
}

function invalidateTag(tag = "") {
  const listKey = `__tag_index__:${safeStr(tag)}`;
  const related = get(listKey, []);
  let count = 0;

  for (const key of Array.isArray(related) ? related : []) {
    if (del(key)) count += 1;
  }

  del(listKey);
  return count;
}

/* =====================================================
🔥 STATS / HEALTH
===================================================== */
function getStats() {
  const total = STORE.size;
  const hitRate = STATS.gets > 0 ? STATS.hits / STATS.gets : 0;

  return {
    ...clone(STATS),
    size: total,
    hitRate,
    enabled: !!ENABLE_CACHE,
    maxKeys: MAX_KEYS
  };
}

function getHealth() {
  return {
    ok: true,
    cacheEnabled: !!ENABLE_CACHE,
    size: STORE.size,
    stats: getStats()
  };
}

/* =====================================================
🔥 CLEANUP
===================================================== */
function cleanupExpired() {
  let count = 0;

  for (const [key, item] of STORE.entries()) {
    if (isExpired(item)) {
      STORE.delete(key);
      count += 1;
    }
  }

  if (count > 0) {
    STATS.expirations += count;
  }

  return count;
}

function cleanupOldest(limit = 100) {
  const entries = Array.from(STORE.entries())
    .sort((a, b) => safeNum(a[1]?.updatedAt) - safeNum(b[1]?.updatedAt))
    .slice(0, Math.max(1, safeNum(limit, 100)));

  let count = 0;
  for (const [key] of entries) {
    if (STORE.delete(key)) count += 1;
  }

  if (count > 0) {
    STATS.deletes += count;
  }

  return count;
}

/* =====================================================
🔥 SPECIALIZED HELPERS
===================================================== */
function shopKey(id) {
  return buildKey("shop", id);
}

function reservationKey(id) {
  return buildKey("reservation", id);
}

function paymentKey(id) {
  return buildKey("payment", id);
}

function rankingKey(name = "default") {
  return buildKey("ranking", name);
}

function userKey(id) {
  return buildKey("user", id);
}

/* =====================================================
🔥 RESET
===================================================== */
function resetAll() {
  clear();

  STATS.sets = 0;
  STATS.gets = 0;
  STATS.hits = 0;
  STATS.misses = 0;
  STATS.deletes = 0;
  STATS.clears = 0;
  STATS.expirations = 0;
  STATS.patternDeletes = 0;

  return true;
}

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
if (!global.__CACHE_SERVICE_INTERVAL__) {
  global.__CACHE_SERVICE_INTERVAL__ = true;

  setInterval(() => {
    try {
      cleanupExpired();

      if (STORE.size > MAX_KEYS) {
        cleanupOldest(Math.ceil(MAX_KEYS * 0.2));
      }
    } catch (_) {}
  }, CLEANUP_INTERVAL);
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  // core
  set,
  get,
  has,
  del,
  clear,
  ttl,
  touch,

  // prefix
  buildKey,
  setWithPrefix,
  getWithPrefix,
  delWithPrefix,
  hasWithPrefix,

  // bulk
  mget,
  mset,
  mdel,

  // async
  remember,
  rememberWithPrefix,

  // pattern
  keys,
  delByPattern,

  // json
  setJSON,
  getJSON,

  // counters
  incr,
  decr,

  // tags
  setTagged,
  invalidateTag,
  tagKey,

  // helpers
  shopKey,
  reservationKey,
  paymentKey,
  rankingKey,
  userKey,

  // stats
  getStats,
  getHealth,

  // cleanup
  cleanupExpired,
  cleanupOldest,
  resetAll
};

console.log("🔥 CACHE SERVICE FINAL MASTER READY");