"use strict";

/* =====================================================
🔥 SEARCH ROUTES (FINAL ULTRA MASTER)
👉 search / autocomplete / advanced / trending / related
👉 safe handler + rate limit + metrics + health
👉 통째로 교체 가능한 완성형
===================================================== */

const express = require("express");
const router = express.Router();

const searchController = require("../controllers/search.controller");

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("SEARCH ROUTE ERROR:", e);
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
        res.status(501).json({
          ok: false,
          message: "NOT IMPLEMENTED"
        });
}

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const RATE_MAP = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "x";
  const now = Date.now();

  const arr = RATE_MAP.get(ip) || [];
  const filtered = arr.filter((t) => now - t < 1000);
  filtered.push(now);

  RATE_MAP.set(ip, filtered);

  if (filtered.length > 80) {
    return res.status(429).json({
      ok: false,
      message: "Too many requests"
    });
  }

  next();
}

/* =====================================================
🔥 GLOBAL
===================================================== */
router.use(rateLimit);

/* =====================================================
🔥 ROOT
GET /api/search
===================================================== */
router.get("/", safeHandler(searchController.search));

/* =====================================================
🔥 AUTOCOMPLETE
GET /api/search/autocomplete?q=
===================================================== */
router.get("/autocomplete", safeHandler(searchController.autocomplete));

/* =====================================================
🔥 ADVANCED
GET /api/search/advanced
===================================================== */
router.get("/advanced", safeHandler(searchController.advanced));

/* =====================================================
🔥 TRENDING
GET /api/search/trending
===================================================== */
router.get("/trending", safeHandler(searchController.trending));

/* =====================================================
🔥 POPULAR
GET /api/search/popular
===================================================== */
router.get("/popular", safeHandler(searchController.popular));

/* =====================================================
🔥 RELATED
GET /api/search/related?q=
===================================================== */
router.get("/related", safeHandler(searchController.related));

/* =====================================================
🔥 RECOMMEND
GET /api/search/recommend?q=
===================================================== */
router.get("/recommend", safeHandler(searchController.recommend));

/* =====================================================
🔥 METRICS
GET /api/search/metrics
===================================================== */
router.get("/metrics", safeHandler(searchController.metrics));

/* =====================================================
🔥 HEALTH
GET /api/search/health
===================================================== */
router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    message: "SEARCH ROUTES READY",
    time: Date.now()
  });
});

/* =====================================================
🔥 DEBUG
GET /api/search/debug
===================================================== */
router.get("/debug", (req, res) => {
  return res.json({
    ok: true,
    route: "search",
    time: Date.now(),
    rateMapSize: RATE_MAP.size
  });
});

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
if (!global.__SEARCH_ROUTE_CLEAN__) {
  global.__SEARCH_ROUTE_CLEAN__ = true;

  setInterval(() => {
    try {
      if (RATE_MAP.size > 5000) {
        RATE_MAP.clear();
      }
    } catch {}
  }, 30000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 SEARCH ROUTES READY");

module.exports = router;