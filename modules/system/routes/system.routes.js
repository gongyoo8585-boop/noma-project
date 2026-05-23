"use strict";

// modules/system/routes/system.routes.js

const express = require("express");
const router = express.Router();

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (err) {
    console.warn("[system routes] require fail:", modulePath);
    return null;
  }
}

/* =====================================================
🔥 CONTROLLER
===================================================== */
const systemController = safeRequire("../controllers/system.controller");

/* =====================================================
🔥 HELPER
===================================================== */
const noop = (req, res) =>
  res.status(500).json({
    ok: false,
    message: "SYSTEM_CONTROLLER_MISSING",
  });

/* =====================================================
🔥 ROUTES
===================================================== */

/**
 * 서버 헬스체크
 * GET /system/health
 */
router.get(
  "/health",
  systemController?.health?.bind(systemController) || noop
);

/**
 * 시스템 정보
 * GET /system/info
 */
router.get(
  "/info",
  systemController?.info?.bind(systemController) || noop
);

/**
 * 프로세스 정보
 * GET /system/process
 */
router.get(
  "/process",
  systemController?.process?.bind(systemController) || noop
);

/**
 * 전체 상태 요약
 * GET /system/summary
 */
router.get(
  "/summary",
  systemController?.summary?.bind(systemController) || noop
);

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = router;