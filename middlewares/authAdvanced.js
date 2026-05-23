"use strict";

/* =====================================================
🔥 ADVANCED AUTH MIDDLEWARE
👉 JWT 인증 + Role + RateLimit + Block + Lock
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const authSecurity = require("../services/auth.security");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let lockService = null;

try { cacheService = require("../services/cacheService"); } catch (_) {}
try { lockService = require("../services/redis.lock"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_RATE_LIMIT = 100;
const DEFAULT_WINDOW = 60;

/* =====================================================
🔥 HELPER
===================================================== */
function getIP(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
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
🔥 MAIN FACTORY
===================================================== */
function authAdvanced(options = {}) {
  const {
    roles = null,               // ["admin"]
    permissions = null,         // ["payment:write"]
    rateLimit = DEFAULT_RATE_LIMIT,
    windowSec = DEFAULT_WINDOW,
    blockCheck = true,
    useLock = false,
  } = options;

  return async (req, res, next) => {
    try {
      /* =====================================================
      🔥 TOKEN
      ===================================================== */
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        null;

      const user = authSecurity.verifyToken(token);

      if (!user) {
        return fail(res, 401, "UNAUTHORIZED");
      }

      req.user = user;

      /* =====================================================
      🔥 BLOCK CHECK
      ===================================================== */
      if (blockCheck) {
        const blocked = authSecurity.isBlocked(user.id);
        if (blocked) {
          return fail(res, 403, "ACCOUNT_BLOCKED");
        }
      }

      /* =====================================================
      🔥 RATE LIMIT (IP + USER)
      ===================================================== */
      const ip = getIP(req);

      const rateKey = `rate:${ip}:${user.id}`;
      let count = cacheService?.get(rateKey) || 0;

      count++;
      cacheService?.set(rateKey, count, windowSec);

      if (count > rateLimit) {
        return fail(res, 429, "RATE_LIMIT_EXCEEDED");
      }

      /* =====================================================
      🔥 ROLE CHECK
      ===================================================== */
      if (roles && roles.length) {
        if (!roles.includes(user.role)) {
          return fail(res, 403, "FORBIDDEN_ROLE");
        }
      }

      /* =====================================================
      🔥 PERMISSION CHECK
      ===================================================== */
      if (permissions && permissions.length) {
        const userPerms = user.permissions || [];

        const ok = permissions.every(p =>
          userPerms.includes(p)
        );

        if (!ok) {
          return fail(res, 403, "FORBIDDEN_PERMISSION");
        }
      }

      /* =====================================================
      🔥 LOCK (중복 요청 방지)
      ===================================================== */
      if (useLock && lockService) {
        const key = `req:${user.id}:${req.originalUrl}`;

        return lockService.withLock(
          key,
          async () => next(),
          3000
        );
      }

      next();
    } catch (err) {
      return fail(res, 500, err.message);
    }
  };
}

/* =====================================================
🔥 SHORTCUTS
===================================================== */

/* 기본 인증 */
authAdvanced.auth = authAdvanced();

/* 관리자 */
authAdvanced.admin = authAdvanced({
  roles: ["admin"],
});

/* 결제 보호 */
authAdvanced.payment = authAdvanced({
  rateLimit: 20,
  windowSec: 60,
  useLock: true,
});

/* 예약 보호 */
authAdvanced.reservation = authAdvanced({
  rateLimit: 30,
  useLock: true,
});

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = authAdvanced;