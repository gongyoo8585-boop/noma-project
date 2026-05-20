"use strict";

/**
 * =====================================================
 * 🔥 ADMIN ANALYTICS ROUTES (FINAL COMPLETE)
 * ✔ 관리자 분석 라우트
 * ✔ auth / admin 미들웨어 fallback
 * ✔ controller 없어도 0% 오류
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
  safeRequire("../../controllers/admin/admin.analytics.controller") || {};

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

const getRealtime =
  controller.getRealtime || fallback("getRealtime");

const getRevenue =
  controller.getRevenue || fallback("getRevenue");

const getUsers =
  controller.getUsers || fallback("getUsers");

const getShops =
  controller.getShops || fallback("getShops");

const getCache =
  controller.getCache || fallback("getCache");

/* =====================================================
🔥 ROUTES
===================================================== */

router.get("/realtime", auth, admin, getRealtime);
router.get("/revenue", auth, admin, getRevenue);
router.get("/users", auth, admin, getUsers);
router.get("/shops", auth, admin, getShops);
router.get("/cache", auth, admin, getCache);

/* health */
router.get("/health/check", (req, res) => {
  res.json({
    ok: true,
    service: "admin_analytics_routes",
    time: new Date(),
  });
});

/* =====================================================
EXPORT
===================================================== */
module.exports = router;