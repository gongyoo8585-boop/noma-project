"use strict";

/* =====================================================
🔥 IP GUARD MIDDLEWARE
👉 IP 화이트리스트 / 블랙리스트 / 차단
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
const WHITELIST = (process.env.IP_WHITELIST || "")
  .split(",")
  .filter(Boolean);

const BLACKLIST = (process.env.IP_BLACKLIST || "")
  .split(",")
  .filter(Boolean);

const MAX_REQ = Number(process.env.IP_RATE_LIMIT || 300);
const WINDOW = Number(process.env.IP_RATE_WINDOW || 60);

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

function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

/* =====================================================
🔥 MAIN FACTORY
===================================================== */
function ipGuard(options = {}) {
  const {
    whitelistOnly = false,
    adminOnly = false,
    rateLimit = MAX_REQ,
  } = options;

  return (req, res, next) => {
    try {
      const ip = getIP(req);

      /* =====================================================
      🔥 WHITELIST ONLY
      ===================================================== */
      if (whitelistOnly && !WHITELIST.includes(ip)) {
        logger?.warn("ip_not_whitelisted", { ip });

        return fail(res, 403, "NOT_ALLOWED_IP");
      }

      /* =====================================================
      🔥 BLACKLIST
      ===================================================== */
      if (BLACKLIST.includes(ip) || cacheService?.get(`ip:block:${ip}`)) {
        logger?.warn("ip_blocked", { ip });

        return fail(res, 403, "BLOCKED_IP");
      }

      /* =====================================================
      🔥 ADMIN ONLY ACCESS
      ===================================================== */
      if (adminOnly && req.user?.role !== "admin") {
        return fail(res, 403, "ADMIN_ONLY");
      }

      /* =====================================================
      🔥 RATE LIMIT
      ===================================================== */
      const key = `ip:rate:${ip}`;

      let count = cacheService?.get(key) || 0;
      count++;

      cacheService?.set(key, count, WINDOW);

      if (count > rateLimit) {
        cacheService?.set(`ip:block:${ip}`, true, 300);

        logger?.error("ip_rate_exceeded", { ip });

        slack?.warn?.("IP RATE LIMIT", { ip });

        analyticsService?.track({
          type: "ip_rate_block",
          payload: { ip },
        });

        return fail(res, 429, "TOO_MANY_REQUESTS");
      }

      next();
    } catch (err) {
      logger?.error("ip_guard_error", {
        message: err.message,
      });

      return fail(res, 500, "IP_GUARD_ERROR");
    }
  };
}

/* =====================================================
🔥 SHORTCUTS
===================================================== */

/* 일반 보호 */
ipGuard.basic = ipGuard();

/* 화이트리스트 전용 */
ipGuard.whitelist = ipGuard({ whitelistOnly: true });

/* 관리자 전용 */
ipGuard.admin = ipGuard({ adminOnly: true });

/* 강력 보호 */
ipGuard.strict = ipGuard({
  whitelistOnly: true,
  rateLimit: 50,
});

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = ipGuard;