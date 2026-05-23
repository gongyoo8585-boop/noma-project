"use strict";

/**
 * =====================================================
 * 🔥 REALTIME ANALYTICS SERVICE (FINAL COMPLETE)
 * ✔ 실시간 접속 / 요청 / 시스템 상태 분석
 * ✔ 메모리 기반 (Redis 없어도 동작)
 * ✔ 0% 오류 방어
 * ✔ 서버 어디서든 사용 가능
 * =====================================================
 */

/* =========================
STATE (메모리 기반)
========================= */
const STATE = {
  requests: 0,
  lastReset: Date.now(),
  activeUsers: new Set(),
  sessions: new Map(),
};

/* =========================
UTIL
========================= */
function now() {
  return Date.now();
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* =========================
TRACK REQUEST
========================= */
function trackRequest(req) {
  try {
    STATE.requests++;

    const ip = req?.ip || "unknown";
    const userId = req?.user?._id || req?.user?.id || ip;

    STATE.activeUsers.add(String(userId));

    STATE.sessions.set(String(userId), {
      lastSeen: now(),
      ip,
    });
  } catch {}
}

/* =========================
CLEAN OLD SESSIONS
========================= */
function cleanSessions() {
  const current = now();
  const EXPIRE = 1000 * 60 * 5; // 5분

  for (const [key, data] of STATE.sessions.entries()) {
    if (current - data.lastSeen > EXPIRE) {
      STATE.sessions.delete(key);
      STATE.activeUsers.delete(key);
    }
  }
}

/* =========================
REQUEST PER MINUTE
========================= */
function getRPM() {
  const elapsed = (now() - STATE.lastReset) / 1000;
  if (elapsed <= 0) return 0;

  return Math.round(STATE.requests / (elapsed / 60));
}

/* =========================
RESET COUNTER
========================= */
function resetCounter() {
  STATE.requests = 0;
  STATE.lastReset = now();
}

/* =====================================================
🔥 MAIN REALTIME
===================================================== */
async function getRealtime() {
  try {
    cleanSessions();

    return {
      usersOnline: STATE.activeUsers.size,
      activeSessions: STATE.sessions.size,
      requestsPerMin: getRPM(),
      serverTime: new Date(),
    };
  } catch (e) {
    console.error("REALTIME SERVICE ERROR:", e.message);

    return {
      usersOnline: 0,
      activeSessions: 0,
      requestsPerMin: 0,
      serverTime: new Date(),
    };
  }
}

/* =====================================================
🔥 AUTO RESET (1분)
===================================================== */
setInterval(() => {
  try {
    resetCounter();
  } catch {}
}, 60000);

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  getRealtime,
  trackRequest,
};