"use strict";

/* =====================================================
🔥 SYSTEM CONTROLLER
👉 서버 상태 / 시스템 정보 / 프로세스 정보
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const systemService = require("../modules/system/services/system.service");

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
    message: err.message || "SYSTEM_ERROR",
  });
}

/* =====================================================
🔥 HEALTH CHECK
GET /system/health
===================================================== */
exports.health = async (req, res) => {
  try {
    const data = await systemService.getHealth();
    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 SYSTEM INFO
GET /system/info
===================================================== */
exports.info = async (req, res) => {
  try {
    const data = await systemService.getSystemInfo();
    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 PROCESS INFO
GET /system/process
===================================================== */
exports.process = async (req, res) => {
  try {
    const data = await systemService.getProcessInfo();
    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 FULL STATUS
GET /system/full
===================================================== */
exports.full = async (req, res) => {
  try {
    const [health, system, process] = await Promise.all([
      systemService.getHealth(),
      systemService.getSystemInfo(),
      systemService.getProcessInfo(),
    ]);

    return ok(res, {
      health,
      system,
      process,
    });
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 SYSTEM CONTROLLER READY");