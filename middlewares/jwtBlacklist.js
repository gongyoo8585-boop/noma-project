"use strict";

/* =====================================================
🔥 JWT BLACKLIST MIDDLEWARE
👉 로그아웃 / 차단된 JWT 무효화
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const authSecurity = require("../services/auth.security");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let logger = null;
let analyticsService = null;

try { cacheService = require("../services/cacheService"); } catch (_) {}
try { logger = require("../services/logger.elk"); } catch (_) {}
try { analyticsService = require("../services/analyticsService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function getToken(req) {
  return (
    req.headers.authorization?.replace("Bearer ", "") ||
    req.cookies?.token ||
    null
  );
}

function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
function jwtBlacklist() {
  return (req, res, next) => {
    try {
      const token = getToken(req);

      if (!token) {
        return fail(res, 401, "TOKEN_REQUIRED");
      }

      /* =====================================================
      🔥 BLACKLIST CHECK
      ===================================================== */
      const blacklisted = cacheService?.get(`jwt:blacklist:${token}`);

      if (blacklisted) {
        logger?.warn("jwt_blocked", {
          token: token.slice(0, 10) + "...",
        });

        analyticsService?.track({
          type: "jwt_blocked",
        });

        return fail(res, 401, "TOKEN_REVOKED");
      }

      /* =====================================================
      🔥 OPTIONAL: auth.security 블랙리스트
      ===================================================== */
      try {
        const payload = authSecurity.verifyToken(token);

        if (authSecurity.isBlocked?.(payload.id)) {
          return fail(res, 403, "USER_BLOCKED");
        }

        req.user = payload;
      } catch (err) {
        return fail(res, 401, "INVALID_TOKEN");
      }

      next();
    } catch (err) {
      logger?.error("jwt_blacklist_error", {
        message: err.message,
      });

      return fail(res, 500, "JWT_BLACKLIST_ERROR");
    }
  };
}

/* =====================================================
🔥 ADD TO BLACKLIST (LOGOUT)
===================================================== */
function revokeToken(token, ttl = 3600) {
  if (!token) return false;

  cacheService?.set(`jwt:blacklist:${token}`, true, ttl);

  logger?.info("jwt_revoked");

  analyticsService?.track({
    type: "jwt_revoked",
  });

  return true;
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  jwtBlacklist,
  revokeToken,
};