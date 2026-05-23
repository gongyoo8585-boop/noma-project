"use strict";

/* =====================================================
🔥 HEALTH CONTROLLER
👉 서비스 상태 / 헬스 체크 / 종합 상태
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
let systemService = null;
let healthService = null;

try {
  systemService = require("../modules/system/services/system.service");
} catch (_) {}

try {
  healthService = require("../services/healthService");
} catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function ok(res, data = {}) {
  return res.json({
    ok: true,
    data,
  });
}

function fail(res, err) {
  return res.status(500).json({
    ok: false,
    message: err.message || "HEALTH_ERROR",
  });
}

/* =====================================================
🔥 BASIC HEALTH
GET /health
===================================================== */
exports.health = async (req, res) => {
  try {
    if (healthService?.getHealth) {
      const data = await healthService.getHealth();
      return ok(res, data);
    }

    if (systemService?.getHealth) {
      const data = await systemService.getHealth();
      return ok(res, data);
    }

    return ok(res, {
      status: "ok",
      timestamp: Date.now(),
    });
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 READINESS CHECK
GET /health/ready
===================================================== */
exports.ready = async (req, res) => {
  try {
    const checks = [];

    if (healthService?.checkDB) {
      checks.push(healthService.checkDB());
    }

    if (healthService?.checkCache) {
      checks.push(healthService.checkCache());
    }

    if (healthService?.checkQueue) {
      checks.push(healthService.checkQueue());
    }

    const results = await Promise.allSettled(checks);

    const failed = results.filter(r => r.status === "rejected");

    if (failed.length > 0) {
      return res.status(503).json({
        ok: false,
        status: "not_ready",
        failed: failed.length,
      });
    }

    return ok(res, {
      status: "ready",
      checks: results.length,
    });
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 LIVENESS CHECK
GET /health/live
===================================================== */
exports.live = async (req, res) => {
  try {
    return ok(res, {
      status: "alive",
      uptime: process.uptime(),
    });
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 FULL HEALTH
GET /health/full
===================================================== */
exports.full = async (req, res) => {
  try {
    const result = {};

    if (systemService) {
      const [health, system, processInfo] = await Promise.all([
        systemService.getHealth?.(),
        systemService.getSystemInfo?.(),
        systemService.getProcessInfo?.(),
      ]);

      result.system = system;
      result.process = processInfo;
      result.health = health;
    }

    if (healthService?.fullCheck) {
      result.services = await healthService.fullCheck();
    }

    return ok(res, result);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 HEALTH CONTROLLER READY");