"use strict";

/* =====================================================
🔥 AUTH SECURITY SERVICE
👉 인증 보안 강화
👉 JWT 검증 / 로그인 보호 / 토큰 블랙리스트
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let analyticsService = null;
let notifyService = null;
let lockService = null;

const jwt = require("jsonwebtoken");

try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { notifyService = require("./notifyService"); } catch (_) {}
try { lockService = require("./redis.lock"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
const BLOCK_TIME = Number(process.env.LOGIN_BLOCK_TIME || 300); // sec

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function getIP(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

/* =====================================================
🔥 SERVICE
===================================================== */
class AuthSecurityService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 TOKEN VERIFY
  ===================================================== */
  verifyToken(token) {
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // 블랙리스트 체크
      if (cacheService?.get(`blacklist:${token}`)) {
        throw new Error("TOKEN_BLACKLISTED");
      }

      return decoded;
    } catch (_) {
      return null;
    }
  }

  /* =====================================================
  🔥 TOKEN BLACKLIST (로그아웃)
  ===================================================== */
  blacklist(token, ttl = 3600) {
    if (!token) return false;

    cacheService?.set(`blacklist:${token}`, true, ttl);

    return true;
  }

  /* =====================================================
  🔥 LOGIN ATTEMPT TRACK
  ===================================================== */
  trackLoginAttempt(identifier) {
    const key = `login:fail:${identifier}`;

    let count = cacheService?.get(key) || 0;
    count++;

    cacheService?.set(key, count, BLOCK_TIME);

    if (count >= MAX_LOGIN_ATTEMPTS) {
      cacheService?.set(`login:block:${identifier}`, true, BLOCK_TIME);

      notifyService?.pushAsync({
        userId: identifier,
        type: "security_alert",
        message: "로그인 시도 초과 (계정 보호)",
      });

      return false;
    }

    return true;
  }

  /* =====================================================
  🔥 RESET LOGIN ATTEMPT (성공 시)
  ===================================================== */
  resetLoginAttempt(identifier) {
    cacheService?.set(`login:fail:${identifier}`, 0, 1);
    return true;
  }

  /* =====================================================
  🔥 BLOCK CHECK
  ===================================================== */
  isBlocked(identifier) {
    return !!cacheService?.get(`login:block:${identifier}`);
  }

  /* =====================================================
  🔥 RATE LIMIT (IP 기반)
  ===================================================== */
  async rateLimit(req, limit = 100, windowSec = 60) {
    const ip = getIP(req);
    const key = `rate:${ip}`;

    let count = cacheService?.get(key) || 0;
    count++;

    cacheService?.set(key, count, windowSec);

    if (count > limit) {
      analyticsService?.track({
        type: "rate_limit",
        payload: { ip, count },
      });

      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    return true;
  }

  /* =====================================================
  🔥 SECURE LOGIN WRAPPER
  ===================================================== */
  async secureLogin(identifier, fn) {
    if (this.isBlocked(identifier)) {
      throw new Error("ACCOUNT_BLOCKED");
    }

    try {
      const result = await fn();

      this.resetLoginAttempt(identifier);

      return result;
    } catch (err) {
      this.trackLoginAttempt(identifier);
      throw err;
    }
  }

  /* =====================================================
  🔥 LOCKED ACTION (중복 방지)
  ===================================================== */
  async secureAction(key, fn) {
    if (!lockService) return fn();

    return lockService.withLock(`auth:${key}`, fn, 3000);
  }

  /* =====================================================
  🔥 MIDDLEWARE (EXPRESS)
  ===================================================== */
  middleware() {
    return async (req, res, next) => {
      try {
        const token =
          req.headers.authorization?.replace("Bearer ", "") ||
          null;

        const user = this.verifyToken(token);

        if (!user) {
          return res.status(401).json({
            message: "UNAUTHORIZED",
          });
        }

        req.user = user;

        await this.rateLimit(req);

        next();
      } catch (err) {
        return res.status(429).json({
          message: err.message,
        });
      }
    };
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.last;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.last = null;
    return true;
  }
}

module.exports = new AuthSecurityService();