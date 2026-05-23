"use strict";

/* =====================================================
🔥 SEARCH SERVICE (FINAL ULTRA MASTER)
👉 full-text + filter + ranking + autocomplete
👉 fuzzy search + token scoring + caching
👉 redis 연동 + fallback
===================================================== */

const Shop = require("../models/Shop");
const cache = require("./cache.service");

/* =====================================================
🔥 CONFIG
===================================================== */
const CACHE_TTL = 10;
const MAX_LIMIT = 50;

/* =====================================================
🔥 UTIL
===================================================== */
function safeString(v) {
  return String(v || "").toLowerCase().trim();
}

function tokenize(text = "") {
  return safeString(text)
    .split(/[\s,.-]+/)
    .filter(Boolean);
}

function unique(arr) {
  return [...new Set(arr)];
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/* =====================================================
🔥 FUZZY MATCH (Levenshtein 기반 간단 버전)
===================================================== */
function similarity(a, b) {
  if (!a || !b) return 0;

  let matches = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }

  return matches / Math.max(a.length, b.length);
}

/* =====================================================
🔥 SCORE ENGINE
===================================================== */
function calcScore(shop, tokens = []) {
  let score = 0;

  const name = safeString(shop.name);
  const desc = safeString(shop.description);
  const tags = (shop.tags || []).map(safeString);

  for (const t of tokens) {
    if (name.includes(t)) score += 50;
    if (desc.includes(t)) score += 20;

    for (const tag of tags) {
      if (tag.includes(t)) score += 30;
    }

    // fuzzy
    score += similarity(name, t) * 20;
  }

  // 기본 가중치
  score += (shop.ratingAvg || 0) * 10;
  score += (shop.likeCount || 0) * 2;
  score += (shop.viewCount || 0) * 0.2;

  return score;
}

/* =====================================================
🔥 CORE SEARCH
===================================================== */
async function search({
  q = "",
  limit = 20,
  region = null,
  service = null,
  tags = [],
  sort = "score"
} = {}) {
  const queryKey = JSON.stringify({ q, limit, region, service, tags, sort });

  return cache.cacheWrap("search:" + queryKey, async () => {
    const tokens = tokenize(q);

    let mongoQuery = {
      isDeleted: false,
      visible: true,
      approved: true
    };

    if (region) mongoQuery.region = region;
    if (service) mongoQuery.serviceTypes = service;
    if (tags?.length) mongoQuery.tags = { $in: tags };

    const shops = await Shop.find(mongoQuery).lean();

    const ranked = shops.map((s) => {
      const score = calcScore(s, tokens);
      return { ...s, _score: score };
    });

    let sorted;

    if (sort === "latest") {
      sorted = ranked.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === "rating") {
      sorted = ranked.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
    } else {
      sorted = ranked.sort((a, b) => b._score - a._score);
    }

    return sorted.slice(0, clamp(limit, 1, MAX_LIMIT));
  }, CACHE_TTL);
}

/* =====================================================
🔥 AUTOCOMPLETE
===================================================== */
async function autocomplete(q = "", limit = 10) {
  const tokens = tokenize(q);

  if (!tokens.length) return [];

  const shops = await Shop.find({
    name: { $regex: tokens[0], $options: "i" }
  })
    .select("name")
    .limit(limit)
    .lean();

  return unique(shops.map((s) => s.name));
}

/* =====================================================
🔥 POPULAR SEARCH
===================================================== */
const SEARCH_LOG = new Map();

function logSearch(q) {
  const key = safeString(q);
  if (!key) return;

  const count = SEARCH_LOG.get(key) || 0;
  SEARCH_LOG.set(key, count + 1);
}

function getPopular(limit = 10) {
  return [...SEARCH_LOG.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([q]) => q);
}

/* =====================================================
🔥 RELATED KEYWORDS
===================================================== */
function related(q) {
  const tokens = tokenize(q);

  const result = new Set();

  for (const [k] of SEARCH_LOG.entries()) {
    for (const t of tokens) {
      if (k.includes(t)) result.add(k);
    }
  }

  return [...result].slice(0, 10);
}

/* =====================================================
🔥 ADVANCED FILTER
===================================================== */
async function advanced({
  minRating,
  maxPrice,
  region,
  tags = [],
  limit = 20
} = {}) {
  const query = {
    isDeleted: false,
    visible: true
  };

  if (region) query.region = region;
  if (tags.length) query.tags = { $in: tags };
  if (minRating) query.ratingAvg = { $gte: minRating };
  if (maxPrice) query.price = { $lte: maxPrice };

  const shops = await Shop.find(query).lean();

  return shops.slice(0, limit);
}

/* =====================================================
🔥 RECOMMEND BASED SEARCH
===================================================== */
async function recommendByQuery(q) {
  const base = await search({ q, limit: 5 });

  if (!base.length) return [];

  const tags = base[0].tags || [];

  return search({ tags, limit: 10 });
}

/* =====================================================
🔥 TREND SEARCH
===================================================== */
function trending() {
  return getPopular(10);
}

/* =====================================================
🔥 CLEANUP
===================================================== */
setInterval(() => {
  if (SEARCH_LOG.size > 1000) {
    SEARCH_LOG.clear();
  }
}, 60000);

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  search,
  autocomplete,
  advanced,
  logSearch,
  getPopular,
  related,
  recommendByQuery,
  trending
};

console.log("🔥 SEARCH SERVICE FINAL READY");