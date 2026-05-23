"use strict";

/* =====================================================
🔥 SCALE SERVICE (FINAL MASTER)
트래픽 기반 자동 확장 / 제한 / 보호 / 스로틀링
===================================================== */

/* =====================================================
🔥 CONFIG
===================================================== */
const MAX_REQUEST_PER_SEC = 100;
const BURST_LIMIT = 200;
const WINDOW = 1000; // 1초

/* =====================================================
🔥 STATE
===================================================== */
const REQUEST_LOG = new Map(); // ip -> timestamps[]
const BLOCKED = new Set();

/* =====================================================
🔥 STATS
===================================================== */
const STATS = {
  total: 0,
  blocked: 0,
  allowed: 0,
  throttled: 0
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function cleanOld(arr) {
  const cutoff = now() - WINDOW;
  return arr.filter(t => t > cutoff);
}

/* =====================================================
🔥 CORE
===================================================== */

/* 요청 체크 */
function check(ip = "unknown") {
  STATS.total++;

  if (BLOCKED.has(ip)) {
    STATS.blocked++;
    return { ok: false, reason: "BLOCKED" };
  }

  let arr = REQUEST_LOG.get(ip) || [];
  arr = cleanOld(arr);

  if (arr.length >= BURST_LIMIT) {
    BLOCKED.add(ip);
    STATS.blocked++;
    return { ok: false, reason: "BURST_LIMIT" };
  }

  if (arr.length >= MAX_REQUEST_PER_SEC) {
    STATS.throttled++;
    return { ok: false, reason: "THROTTLED" };
  }

  arr.push(now());
  REQUEST_LOG.set(ip, arr);

  STATS.allowed++;
  return { ok: true };
}

/* =====================================================
🔥 EXPRESS MIDDLEWARE
===================================================== */
function middleware(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

  const result = check(ip);

  if (!result.ok) {
    return res.status(429).json({
      ok: false,
      message: result.reason
    });
  }

  next();
}

/* =====================================================
🔥 CONTROL
===================================================== */

/* 차단 해제 */
function unblock(ip) {
  BLOCKED.delete(ip);
  return true;
}

/* 전체 리셋 */
function reset() {
  REQUEST_LOG.clear();
  BLOCKED.clear();
}

/* 특정 IP 상태 */
function getIpStatus(ip) {
  return {
    blocked: BLOCKED.has(ip),
    requests: (REQUEST_LOG.get(ip) || []).length
  };
}

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
setInterval(() => {
  try {
    for (const [ip, arr] of REQUEST_LOG.entries()) {
      const cleaned = cleanOld(arr);
      if (cleaned.length === 0) {
        REQUEST_LOG.delete(ip);
      } else {
        REQUEST_LOG.set(ip, cleaned);
      }
    }
  } catch (_) {}
}, 2000);

/* =====================================================
🔥 HEALTH
===================================================== */
function getHealth() {
  return {
    ips: REQUEST_LOG.size,
    blocked: BLOCKED.size,
    stats: STATS,
    time: new Date()
  };
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  check,
  middleware,

  unblock,
  reset,
  getIpStatus,

  getHealth
};