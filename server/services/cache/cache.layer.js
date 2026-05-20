"use strict";

/**
 * =====================================================
 * 🔥 CACHE LAYER (ULTRA FINAL COMPLETE - FIXED)
 * =====================================================
 */

const redis = require("./redis.service");

/* =========================
MEMORY CACHE
========================= */
const MEMORY = new Map();

/* =========================
UTIL
========================= */
function now() {
  return Date.now();
}

function toTTL(ttl) {
  const t = Number(ttl);
  return Number.isFinite(t) && t > 0 ? t : 60;
}

/* =========================
MEMORY SET
========================= */
function memorySet(key, value, ttl) {
  MEMORY.set(key, {
    value,
    expire: now() + ttl * 1000,
  });
}

/* =========================
MEMORY GET
========================= */
function memoryGet(key) {
  const data = MEMORY.get(key);
  if (!data) return null;

  if (now() > data.expire) {
    MEMORY.delete(key);
    return null;
  }

  return data.value;
}

/* =========================
GET
========================= */
async function get(key) {
  try {
    // 1. memory
    const mem = memoryGet(key);
    if (mem !== null) return mem;

    // 2. redis
    const val = await redis.get(key);
    if (val !== null) {
      memorySet(key, val, 10);
      return val;
    }

    return null;
  } catch {
    return null;
  }
}

/* =========================
SET
========================= */
async function set(key, value, ttl = 60) {
  const t = toTTL(ttl);

  try {
    // memory 우선
    memorySet(key, value, t);

    // 🔥 redis 비동기 처리 (지연 방지)
    redis.set(key, value, t).catch(() => {});

    return true;
  } catch {
    return false;
  }
}

/* =========================
DEL
========================= */
async function del(key) {
  try {
    MEMORY.delete(key);

    // 🔥 redis 비동기
    redis.del(key).catch(() => {});

    return true;
  } catch {
    return false;
  }
}

/* =========================
WRAP (🔥 수정 핵심)
========================= */
async function wrap(key, fn, ttl = 60) {
  const cached = await get(key);
  if (cached !== null) return cached;

  try {
    const result = await fn();

    // 캐시 실패해도 무시
    set(key, result, ttl).catch(() => {});

    return result;
  } catch (e) {
    // fn 실패 시 그대로 throw
    throw e;
  }
}

/* =========================
CLEAR MEMORY
========================= */
function clearMemory() {
  MEMORY.clear();
}

/* =========================
AUTO CLEAN
========================= */
setInterval(() => {
  const current = now();

  for (const [key, data] of MEMORY.entries()) {
    if (current > data.expire) {
      MEMORY.delete(key);
    }
  }
}, 10000);

/* =========================
EXPORT
========================= */
module.exports = {
  get,
  set,
  del,
  wrap,
  clearMemory,
};