"use strict";

/**
 * =====================================================
 * 🔥 ADMIN DASHBOARD ROUTES (FINAL COMPLETE)
 * ✔ 관리자 대시보드 라우트
 * ✔ auth / admin 미들웨어 안전 fallback
 * ✔ 컨트롤러 없을 경우 0% 오류 fallback
 * ✔ 기존 구조 영향 없음
 * =====================================================
 */

const express = require("express");
const router = express.Router();

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch {
    console.warn("[SAFE REQUIRE FAIL]", path);
    return null;
  }
}

const controller =
  safeRequire("../../controllers/admin/admin.dashboard.controller") || {};

/* =========================
MIDDLEWARE SAFE
========================= */
const jwt = require("jsonwebtoken");

const externalAuth = safeRequire("../../middlewares/auth");
const externalAdmin = safeRequire("../../middlewares/admin");

const auth =
  externalAuth ||
  function (req, res, next) {
    try {
      const token = (req.headers.authorization || "").replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({ ok: false, msg: "NO_TOKEN" });
      }

      req.user = jwt.verify(token, process.env.JWT_SECRET || "change_me");
      next();
    } catch {
      return res.status(401).json({ ok: false, msg: "INVALID_TOKEN" });
    }
  };

const admin =
  externalAdmin ||
  function (req, res, next) {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ ok: false, msg: "ADMIN_ONLY" });
    }
    next();
  };

/* =========================
CONTROLLER FALLBACK
========================= */
function fallback(name) {
  return function (req, res) {
    return res.status(500).json({
      ok: false,
      msg: `CONTROLLER_NOT_FOUND:${name}`,
    });
  };
}

const getDashboard =
  controller.getDashboard || fallback("getDashboard");

/* =====================================================
🔥 ROUTES
===================================================== */

/* 대시보드 */
router.get("/", auth, admin, getDashboard);

/* health */
router.get("/health/check", (req, res) => {
  res.json({
    ok: true,
    service: "admin_dashboard_routes",
    time: new Date(),
  });
});

/* =====================================================
EXPORT
===================================================== */
module.exports = router;