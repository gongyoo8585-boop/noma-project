"use strict";

/* =====================================================
🔥 PAGINATION UTIL (FINAL ULTRA COMPLETE MASTER)
👉 page / limit / skip / sort 공통 처리
👉 Mongo query 옵션 생성
👉 response meta 생성
👉 통째로 교체 가능한 완성형
===================================================== */

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/* =====================================================
🔥 UTIL
===================================================== */
function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeBool(v, d = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    return ["true", "1", "yes", "y"].includes(v.toLowerCase());
  }
  return d;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/* =====================================================
🔥 CORE PARSE
===================================================== */
function getPage(v, fallback = DEFAULT_PAGE) {
  return Math.max(1, safeInt(v, fallback));
}

function getLimit(v, fallback = DEFAULT_LIMIT, max = MAX_LIMIT) {
  return clamp(safeInt(v, fallback), 1, max);
}

function getSkip(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT) {
  return Math.max(0, (getPage(page) - 1) * getLimit(limit));
}

/* =====================================================
🔥 SORT PARSER
===================================================== */
/*
예시:
sort=createdAt
order=desc

sort=-createdAt
sort=score:desc
sort=score,-createdAt
*/
function parseSort(sort = "", order = "desc", fallback = { createdAt: -1 }) {
  const raw = safeStr(sort);

  if (!raw) return fallback;

  const result = {};

  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes(":")) {
      const [field, dir] = part.split(":");
      const key = safeStr(field);
      const value = safeStr(dir).toLowerCase() === "asc" ? 1 : -1;
      if (key) result[key] = value;
      continue;
    }

    if (part.startsWith("-")) {
      const key = safeStr(part.slice(1));
      if (key) result[key] = -1;
      continue;
    }

    if (part.startsWith("+")) {
      const key = safeStr(part.slice(1));
      if (key) result[key] = 1;
      continue;
    }

    const dir = safeStr(order, "desc").toLowerCase() === "asc" ? 1 : -1;
    result[part] = dir;
  }

  return Object.keys(result).length ? result : fallback;
}

/* =====================================================
🔥 QUERY PARSER
===================================================== */
function parse(reqQuery = {}, options = {}) {
  const page = getPage(reqQuery.page, options.defaultPage || DEFAULT_PAGE);
  const limit = getLimit(
    reqQuery.limit,
    options.defaultLimit || DEFAULT_LIMIT,
    options.maxLimit || MAX_LIMIT
  );
  const skip = getSkip(page, limit);
  const sort = parseSort(
    reqQuery.sort,
    reqQuery.order,
    options.defaultSort || { createdAt: -1 }
  );

  return {
    page,
    limit,
    skip,
    sort
  };
}

/* =====================================================
🔥 META BUILDER
===================================================== */
function meta(page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, total = 0) {
  const p = getPage(page);
  const l = getLimit(limit);
  const t = Math.max(0, safeInt(total, 0));
  const totalPages = Math.max(1, Math.ceil(t / l));

  return {
    page: p,
    limit: l,
    total: t,
    totalPages,
    hasMore: p < totalPages,
    hasPrev: p > 1,
    nextPage: p < totalPages ? p + 1 : null,
    prevPage: p > 1 ? p - 1 : null
  };
}

/* =====================================================
🔥 MONGO OPTIONS
===================================================== */
function mongo(reqQuery = {}, options = {}) {
  const parsed = parse(reqQuery, options);

  return {
    skip: parsed.skip,
    limit: parsed.limit,
    sort: parsed.sort
  };
}

/* =====================================================
🔥 RESPONSE WRAPPER
===================================================== */
function wrap(list = [], page = DEFAULT_PAGE, limit = DEFAULT_LIMIT, total = 0, extra = {}) {
  return {
    list: Array.isArray(list) ? list : [],
    ...meta(page, limit, total),
    ...(extra && typeof extra === "object" ? extra : {})
  };
}

/* =====================================================
🔥 OFFSET/LIMIT STYLE
===================================================== */
function offset(v, fallback = 0) {
  return Math.max(0, safeInt(v, fallback));
}

function limitOnly(v, fallback = DEFAULT_LIMIT, max = MAX_LIMIT) {
  return getLimit(v, fallback, max);
}

function offsetMeta(offsetValue = 0, limitValue = DEFAULT_LIMIT, total = 0) {
  const o = offset(offsetValue);
  const l = limitOnly(limitValue);
  const t = Math.max(0, safeInt(total, 0));

  return {
    offset: o,
    limit: l,
    total: t,
    hasMore: o + l < t
  };
}

/* =====================================================
🔥 CURSOR READY HELPERS
===================================================== */
function cursor(value = null, size = DEFAULT_LIMIT) {
  return {
    cursor: value || null,
    size: getLimit(size, DEFAULT_LIMIT, MAX_LIMIT)
  };
}

function cursorMeta(nextCursor = null, size = DEFAULT_LIMIT, count = 0) {
  return {
    nextCursor: nextCursor || null,
    size: getLimit(size, DEFAULT_LIMIT, MAX_LIMIT),
    count: Math.max(0, safeInt(count, 0)),
    hasMore: !!nextCursor
  };
}

/* =====================================================
🔥 FILTER HELPERS
===================================================== */
function pickQuery(reqQuery = {}, allowed = []) {
  const result = {};
  const keys = Array.isArray(allowed) ? allowed : [];

  for (const key of keys) {
    if (typeof reqQuery[key] !== "undefined" && reqQuery[key] !== "") {
      result[key] = reqQuery[key];
    }
  }

  return result;
}

function pickTruthyQuery(reqQuery = {}, allowed = []) {
  const result = {};
  const keys = Array.isArray(allowed) ? allowed : [];

  for (const key of keys) {
    if (reqQuery[key]) {
      result[key] = reqQuery[key];
    }
  }

  return result;
}

/* =====================================================
🔥 SEARCH HELPERS
===================================================== */
function keyword(reqQuery = {}, field = "q") {
  return safeStr(reqQuery[field] || "");
}

function searchMeta(reqQuery = {}, field = "q") {
  return {
    keyword: keyword(reqQuery, field),
    page: getPage(reqQuery.page),
    limit: getLimit(reqQuery.limit)
  };
}

/* =====================================================
🔥 PAGE RANGE
===================================================== */
function pageRange(page = 1, limit = 20, total = 0) {
  const m = meta(page, limit, total);
  const start = m.total === 0 ? 0 : (m.page - 1) * m.limit + 1;
  const end = Math.min(m.page * m.limit, m.total);

  return {
    start,
    end,
    ...m
  };
}

/* =====================================================
🔥 EXPRESS HELPER
===================================================== */
function fromReq(req = {}, options = {}) {
  return parse(req.query || {}, options);
}

/* =====================================================
🔥 DEBUG
===================================================== */
function debug(reqQuery = {}, options = {}) {
  return {
    input: reqQuery,
    output: parse(reqQuery, options),
    options
  };
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 PAGINATION UTIL READY");

module.exports = {
  // core
  getPage,
  getLimit,
  getSkip,
  parseSort,
  parse,
  meta,
  mongo,
  wrap,

  // offset style
  offset,
  limitOnly,
  offsetMeta,

  // cursor style
  cursor,
  cursorMeta,

  // helpers
  pickQuery,
  pickTruthyQuery,
  keyword,
  searchMeta,
  pageRange,
  fromReq,
  debug
};