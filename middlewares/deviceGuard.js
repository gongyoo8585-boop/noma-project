"use strict";

/* =====================================================
🔥 DEVICE GUARD MIDDLEWARE
👉 디바이스 식별 / 이상 로그인 방지
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
const MAX_DEVICES = Number(process.env.MAX_DEVICES || 5);
const DEVICE_TTL = Number(process.env.DEVICE_TTL || 60 * 60 * 24 * 30); // 30일

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

function getUA(req) {
  return req.headers["user-agent"] || "unknown";
}

function buildDeviceId(req) {
  const ip = getIP(req);
  const ua = getUA(req);

  return Buffer.from(ip + "|" + ua).toString("base64");
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
function deviceGuard(options = {}) {
  const {
    strict = false,       // 새로운 디바이스 차단 여부
    notify = true,        // 알림 여부
  } = options;

  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return next(); // 인증 이전이면 skip

      const deviceId = buildDeviceId(req);
      const key = `device:${user.id}`;

      let devices = cacheService?.get(key) || [];

      /* =====================================================
      🔥 기존 디바이스 체크
      ===================================================== */
      const exists = devices.includes(deviceId);

      if (!exists) {
        /* 신규 디바이스 */
        devices.push(deviceId);

        /* 최대 제한 */
        if (devices.length > MAX_DEVICES) {
          devices.shift();
        }

        cacheService?.set(key, devices, DEVICE_TTL);

        logger?.warn("new_device_detected", {
          userId: user.id,
          deviceId,
        });

        analyticsService?.track({
          type: "new_device",
          userId: user.id,
        });

        if (notify) {
          slack?.warn?.("새로운 디바이스 로그인", {
            userId: user.id,
            ip: getIP(req),
          });
        }

        if (strict) {
          return fail(res, 403, "NEW_DEVICE_BLOCKED");
        }
      }

      /* =====================================================
      🔥 의심 디바이스 체크 (간단 heuristic)
      ===================================================== */
      const suspiciousKey = `device:suspicious:${user.id}`;
      let suspiciousCount = cacheService?.get(suspiciousKey) || 0;

      if (!exists) {
        suspiciousCount++;
        cacheService?.set(suspiciousKey, suspiciousCount, 300);
      }

      if (suspiciousCount > 3) {
        logger?.error("device_attack_detected", {
          userId: user.id,
        });

        slack?.error?.(new Error("Device attack"), {
          userId: user.id,
        });

        return fail(res, 403, "DEVICE_SUSPICIOUS");
      }

      /* =====================================================
      🔥 ATTACH
      ===================================================== */
      req.device = {
        id: deviceId,
        known: exists,
      };

      next();
    } catch (err) {
      logger?.error("device_guard_error", {
        message: err.message,
      });

      return fail(res, 500, "DEVICE_GUARD_ERROR");
    }
  };
}

/* =====================================================
🔥 SHORTCUTS
===================================================== */

/* 기본 */
deviceGuard.basic = deviceGuard();

/* 신규 디바이스 차단 */
deviceGuard.strict = deviceGuard({ strict: true });

/* 알림 OFF */
deviceGuard.silent = deviceGuard({ notify: false });

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = deviceGuard;