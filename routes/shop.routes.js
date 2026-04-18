"use strict";

/* =====================================================
🔥 SHOP ROUTES (ULTRA FINAL MASTER)
===================================================== */

const express = require("express");
const router = express.Router();

const shopController = require("../controllers/shopController"); // ✅ FIX
const auth = require("../middlewares/auth");

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("SHOP ROUTE ERROR:", e);
      return res.status(500).json({
        ok: false,
        message: e.message || "SERVER ERROR"
      });
    });
  };
}

function safeHandler(handler) {
  return typeof handler === "function"
    ? safeAsync(handler)
    : (req, res) =>
        res.status(501).json({ ok: false, message: "NOT IMPLEMENTED" });
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

/* =====================================================
🔥 RATE LIMIT (SAFE)
===================================================== */
const RATE_MAP = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || "x";
  const now = Date.now();

  const arr = RATE_MAP.get(ip) || [];
  const filtered = arr.filter((t) => now - t < 1000);

  filtered.push(now);
  RATE_MAP.set(ip, filtered);

  if (filtered.length > 50) {
    return res.status(429).json({ ok: false, message: "Too many requests" });
  }

  next();
}

/* =====================================================
🔥 ADMIN GUARD
===================================================== */
const adminOnly =
  (auth && auth.adminOnly) ||
  ((req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "로그인 필요" });
    }

    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: "관리자만 접근 가능" });
    }

    next();
  });

/* =====================================================
🔥 OPTIONAL AUTH SAFE
===================================================== */
const optionalAuth =
  (auth && auth.optional) ||
  ((req, res, next) => next());

/* =====================================================
🔥 GLOBAL MIDDLEWARE
===================================================== */
router.use(rateLimit);

/* =====================================================
🔥 PUBLIC ROUTES (순서 중요)
===================================================== */

// 기본
router.get("/", safeHandler(shopController.getShops));

// 상태
router.get("/health", (req, res) => res.json({ ok: true, time: Date.now() }));
router.get("/ping", (req, res) => res.json({ ok: true }));

// 통계
router.get("/stats", safeHandler(shopController.stats));

// 랭킹
router.get("/top", safeHandler(shopController.top));
router.get("/hot", safeHandler(shopController.hot));
router.get("/trending", safeHandler(shopController.trending));

// 추천
router.get("/recommend", optionalAuth, safeHandler(shopController.recommend));

// 광고
router.get("/ads", safeHandler(shopController.ads));

// 위치
router.get("/nearby", safeHandler(shopController.nearby));

// 검색 (ID보다 위!!)
router.get("/search", safeHandler(shopController.search));
router.get("/search/advanced", safeHandler(shopController.searchAdvanced));

// 필터
router.get("/tag", safeHandler(shopController.byTag));
router.get("/service", safeHandler(shopController.byService || shopController.byServiceType));
router.get("/service-type", safeHandler(shopController.byServiceType));
router.get("/region", safeHandler(shopController.byRegion));

// 품질
router.get("/low-bounce", safeHandler(shopController.lowBounce));
router.get("/high-conversion", safeHandler(shopController.highConversion));

/* =====================================================
🔥 USER ACTION
===================================================== */
router.post("/:id/like", auth, safeHandler(shopController.like));
router.post("/:id/unlike", auth, safeHandler(shopController.unlike));
router.post("/:id/click", safeHandler(shopController.click));
router.post("/:id/share", safeHandler(shopController.share));
router.post("/:id/reserve", auth, safeHandler(shopController.reserve));

/* =====================================================
🔥 ADMIN
===================================================== */
router.post("/", auth, adminOnly, safeHandler(shopController.createShop));
router.put("/:id", auth, adminOnly, safeHandler(shopController.updateShop));
router.delete("/:id", auth, adminOnly, safeHandler(shopController.deleteShop));
router.post("/:id/restore", auth, adminOnly, safeHandler(shopController.restoreShop));
router.post("/:id/recalculate", auth, adminOnly, safeHandler(shopController.recalculate));

/* =====================================================
🔥 DETAIL (맨 마지막!!)
===================================================== */
router.get("/:id", (req, res, next) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ ok: false, message: "invalid id" });
  }
  next();
}, safeHandler(shopController.getShop));

/* =====================================================
🔥 ADMIN DEBUG
===================================================== */
router.get("/admin/cache", auth, adminOnly, (req, res) => {
  res.json({ ok: true, size: RATE_MAP.size });
});

/* =====================================================
🔥 AUTO CLEAN (SAFE)
===================================================== */
if (!global.__SHOP_ROUTE_CLEAN__) {
  global.__SHOP_ROUTE_CLEAN__ = true;

  setInterval(() => {
    if (RATE_MAP.size > 5000) RATE_MAP.clear();
  }, 30000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 SHOP ROUTES ULTRA FINAL READY");

module.exports = router;