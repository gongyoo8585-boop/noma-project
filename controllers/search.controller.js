"use strict";

/* =====================================================
🔥 SEARCH CONTROLLER (FINAL ULTRA MASTER)
👉 search / autocomplete / advanced / trending
👉 safe wrapper + logging + metrics 포함
===================================================== */

const searchService = require("../services/search.service");

/* =====================================================
🔥 METRICS
===================================================== */
const METRIC = {
  total: 0,
  errors: 0,
  slow: 0
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeStr(v) {
  return String(v || "").trim();
}

function safeArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* =====================================================
🔥 SAFE HANDLER
===================================================== */
function safeHandler(fn) {
  return async (req, res) => {
    const start = now();
    METRIC.total++;

    try {
      const result = await fn(req, res);

      const elapsed = now() - start;
      if (elapsed > 800) {
        METRIC.slow++;
        console.warn("🐢 SLOW SEARCH API:", req.originalUrl, elapsed + "ms");
      }

      return result;
    } catch (e) {
      METRIC.errors++;
      console.error("🔥 SEARCH ERROR:", e);

      return res.status(500).json({
        ok: false,
        message: e.message || "SEARCH ERROR"
      });
    }
  };
}

/* =====================================================
🔥 SEARCH
GET /api/search?q=
===================================================== */
exports.search = safeHandler(async (req, res) => {
  const q = safeStr(req.query.q);
  const limit = safeNum(req.query.limit, 20);
  const region = safeStr(req.query.region) || null;
  const service = safeStr(req.query.service) || null;
  const tags = safeArray(req.query.tags);
  const sort = safeStr(req.query.sort) || "score";

  // 검색 로그
  if (q) searchService.logSearch(q);

  const data = await searchService.search({
    q,
    limit,
    region,
    service,
    tags,
    sort
  });

  return res.json({
    ok: true,
    count: data.length,
    data
  });
});

/* =====================================================
🔥 AUTOCOMPLETE
GET /api/search/autocomplete?q=
===================================================== */
exports.autocomplete = safeHandler(async (req, res) => {
  const q = safeStr(req.query.q);
  const limit = safeNum(req.query.limit, 10);

  const data = await searchService.autocomplete(q, limit);

  return res.json({
    ok: true,
    data
  });
});

/* =====================================================
🔥 ADVANCED SEARCH
GET /api/search/advanced
===================================================== */
exports.advanced = safeHandler(async (req, res) => {
  const minRating = safeNum(req.query.minRating);
  const maxPrice = safeNum(req.query.maxPrice);
  const region = safeStr(req.query.region);
  const tags = safeArray(req.query.tags);
  const limit = safeNum(req.query.limit, 20);

  const data = await searchService.advanced({
    minRating,
    maxPrice,
    region,
    tags,
    limit
  });

  return res.json({
    ok: true,
    count: data.length,
    data
  });
});

/* =====================================================
🔥 TRENDING SEARCH
GET /api/search/trending
===================================================== */
exports.trending = safeHandler(async (req, res) => {
  const data = searchService.trending();

  return res.json({
    ok: true,
    data
  });
});

/* =====================================================
🔥 POPULAR SEARCH
GET /api/search/popular
===================================================== */
exports.popular = safeHandler(async (req, res) => {
  const data = searchService.getPopular();

  return res.json({
    ok: true,
    data
  });
});

/* =====================================================
🔥 RELATED
GET /api/search/related?q=
===================================================== */
exports.related = safeHandler(async (req, res) => {
  const q = safeStr(req.query.q);

  const data = searchService.related(q);

  return res.json({
    ok: true,
    data
  });
});

/* =====================================================
🔥 RECOMMEND BY QUERY
GET /api/search/recommend?q=
===================================================== */
exports.recommend = safeHandler(async (req, res) => {
  const q = safeStr(req.query.q);

  const data = await searchService.recommendByQuery(q);

  return res.json({
    ok: true,
    data
  });
});

/* =====================================================
🔥 DEBUG / METRICS
===================================================== */
exports.metrics = (req, res) => {
  return res.json({
    ok: true,
    metrics: METRIC
  });
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 SEARCH CONTROLLER READY");