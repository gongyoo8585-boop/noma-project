"use strict";

// modules/system/controllers/system.controller.js

const systemService = require("../services/system.service");

/* =====================================================
🔥 COMMON RESPONSE
===================================================== */
function success(res, data = {}, message = "OK") {
  return res.json({
    ok: true,
    message,
    data,
  });
}

function fail(res, message = "ERROR", code = 500) {
  return res.status(code).json({
    ok: false,
    message,
  });
}

/* =====================================================
🔥 CONTROLLER
===================================================== */
class SystemController {
  /**
   * ============================================
   * 서버 헬스체크
   * GET /system/health
   * ============================================
   */
  async health(req, res) {
    try {
      const data = await systemService.getHealth();
      return success(res, data, "HEALTH_OK");
    } catch (err) {
      console.error("system health error:", err.message);
      return fail(res, err.message || "HEALTH_CHECK_FAILED", 500);
    }
  }

  /**
   * ============================================
   * 시스템 정보
   * GET /system/info
   * ============================================
   */
  async info(req, res) {
    try {
      const data = await systemService.getSystemInfo();
      return success(res, data, "SYSTEM_INFO");
    } catch (err) {
      console.error("system info error:", err.message);
      return fail(res, err.message || "SYSTEM_INFO_FAILED", 500);
    }
  }

  /**
   * ============================================
   * 프로세스 정보
   * GET /system/process
   * ============================================
   */
  async process(req, res) {
    try {
      const data = await systemService.getProcessInfo();
      return success(res, data, "PROCESS_INFO");
    } catch (err) {
      console.error("system process error:", err.message);
      return fail(res, err.message || "PROCESS_INFO_FAILED", 500);
    }
  }

  /**
   * ============================================
   * 전체 상태 요약
   * GET /system/summary
   * ============================================
   */
  async summary(req, res) {
    try {
      const [health, info, process] = await Promise.all([
        systemService.getHealth(),
        systemService.getSystemInfo(),
        systemService.getProcessInfo(),
      ]);

      return success(
        res,
        {
          health,
          system: info,
          process,
        },
        "SYSTEM_SUMMARY"
      );
    } catch (err) {
      console.error("system summary error:", err.message);
      return fail(res, err.message || "SYSTEM_SUMMARY_FAILED", 500);
    }
  }
}

module.exports = new SystemController();