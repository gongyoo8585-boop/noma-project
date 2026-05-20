"use strict";

/* =====================================================
🔥 LOGIN LIMIT MIDDLEWARE
👉 로그인 시도 제한 / 계정 잠금 / IP 차단
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let logger = null;
let slack = null;
let analyticsService = null;

try { cacheService = require("../services/cacheService"); } catch (_) {}
try { logger = require("../services/logger.elk"); } catch (_) {}
try { slack = require("../services/slack.alert"); } catch (_) {}
try { analyticsService = require("../services/analyticsService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const BLOCK_TIME = Number(process.env.LOGIN_BLOCK_TIME || 300); // seconds
const WINDOW = Number(process.env.LOGIN_WINDOW || 300);

/* =====================================================
🔥 HELPER
===================================================== */
function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function getIdentifier(req) {
  return (
    req.body?.email ||
    req.body?.username ||
    req.body?.phone ||
    "unknown"
  );
}

function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

/* =====================================================
🔥 MIDDLEWARE (LOGIN ATTEMPT CHECK)
===================================================== */
function loginLimit() {
  return (req, res, next) => {
    try {
      const ip = getIP(req);
      const id = getIdentifier(req);

      const ipBlockKey = `login:block:ip:${ip}`;
      const userBlockKey = `login:block:user:${id}`;

      /* =====================================================
      🔥 BLOCK CHECK
      ===================================================== */
      if (cacheService?.get(ipBlockKey)) {
        return fail(res, 403, "IP_BLOCKED");
      }

      if (cacheService?.get(userBlockKey)) {
        return fail(res, 403, "ACCOUNT_LOCKED");
      }

      next();
    } catch (err) {
      return fail(res, 500, "LOGIN_LIMIT_ERROR");
    }
  };
}

/* =====================================================
🔥 RECORD FAILURE
===================================================== */
function recordFail(req) {
  const ip = getIP(req);
  const id = getIdentifier(req);

  const ipKey = `login:fail:ip:${ip}`;
  const userKey = `login:fail:user:${id}`;

  let ipCount = cacheService?.get(ipKey) || 0;
  let userCount = cacheService?.get(userKey) || 0;

  ipCount++;
  userCount++;

  cacheService?.set(ipKey, ipCount, WINDOW);
  cacheService?.set(userKey, userCount, WINDOW);

  /* =====================================================
  🔥 BLOCK IF EXCEEDED
  ===================================================== */
  if (ipCount >= MAX_ATTEMPTS) {
    cacheService?.set(`login:block:ip:${ip}`, true, BLOCK_TIME);

    logger?.warn("login_ip_blocked", { ip });

    slack?.warn?.("로그인 IP 차단", { ip });

    analyticsService?.track({
      type: "login_ip_block",
      payload: { ip },
    });
  }

  if (userCount >= MAX_ATTEMPTS) {
    cacheService?.set(`login:block:user:${id}`, true, BLOCK_TIME);

    logger?.warn("login_user_blocked", { id });

    slack?.warn?.("계정 잠금 발생", { id });

    analyticsService?.track({
      type: "login_user_block",
      payload: { id },
    });
  }
}

/* =====================================================
🔥 RECORD SUCCESS
===================================================== */
function recordSuccess(req) {
  const ip = getIP(req);
  const id = getIdentifier(req);

  cacheService?.del?.(`login:fail:ip:${ip}`);
  cacheService?.del?.(`login:fail:user:${id}`);

  cacheService?.delete?.(`login:fail:ip:${ip}`);
  cacheService?.delete?.(`login:fail:user:${id}`);

  analyticsService?.track({
    type: "login_success",
    payload: { ip, id },
  });
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  loginLimit,
  recordFail,
  recordSuccess,
};