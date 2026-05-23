"use strict";

/* =====================================================
🔥 RESPONSE UTIL (FINAL ULTRA COMPLETE MASTER)
👉 공통 응답 포맷 통합
👉 ok / fail / created / pagination / noContent / error
👉 traceId / meta / debug 확장 포함
👉 통째로 교체 가능한 완성형
===================================================== */

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeBool(v, d = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes", "y"].includes(v.toLowerCase());
  return d;
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function getTraceId(req) {
  return safeStr(req?.traceId || "");
}

function buildBase(req, message = "OK") {
  return {
    ok: true,
    message: safeStr(message, "OK"),
    traceId: getTraceId(req),
    timestamp: now()
  };
}

function buildFailBase(req, message = "ERROR") {
  return {
    ok: false,
    message: safeStr(message, "ERROR"),
    traceId: getTraceId(req),
    timestamp: now()
  };
}

/* =====================================================
🔥 CORE SUCCESS
===================================================== */
function ok(res, req, data = {}, message = "OK") {
  return res.json({
    ...buildBase(req, message),
    ...(data && typeof data === "object" ? data : { data })
  });
}

/* =====================================================
🔥 CREATED
===================================================== */
function created(res, req, data = {}, message = "CREATED") {
  return res.status(201).json({
    ...buildBase(req, message),
    ...(data && typeof data === "object" ? data : { data })
  });
}

/* =====================================================
🔥 ACCEPTED
===================================================== */
function accepted(res, req, data = {}, message = "ACCEPTED") {
  return res.status(202).json({
    ...buildBase(req, message),
    ...(data && typeof data === "object" ? data : { data })
  });
}

/* =====================================================
🔥 NO CONTENT
===================================================== */
function noContent(res) {
  return res.status(204).send();
}

/* =====================================================
🔥 FAIL
===================================================== */
function fail(res, req, status = 500, message = "ERROR", extra = {}) {
  return res.status(status).json({
    ...buildFailBase(req, message),
    ...(extra && typeof extra === "object" ? extra : {})
  });
}

/* =====================================================
🔥 BAD REQUEST
===================================================== */
function badRequest(res, req, message = "BAD REQUEST", extra = {}) {
  return fail(res, req, 400, message, extra);
}

/* =====================================================
🔥 UNAUTHORIZED
===================================================== */
function unauthorized(res, req, message = "UNAUTHORIZED", extra = {}) {
  return fail(res, req, 401, message, extra);
}

/* =====================================================
🔥 FORBIDDEN
===================================================== */
function forbidden(res, req, message = "FORBIDDEN", extra = {}) {
  return fail(res, req, 403, message, extra);
}

/* =====================================================
🔥 NOT FOUND
===================================================== */
function notFound(res, req, message = "NOT FOUND", extra = {}) {
  return fail(res, req, 404, message, extra);
}

/* =====================================================
🔥 CONFLICT
===================================================== */
function conflict(res, req, message = "CONFLICT", extra = {}) {
  return fail(res, req, 409, message, extra);
}

/* =====================================================
🔥 TOO MANY REQUESTS
===================================================== */
function tooMany(res, req, message = "TOO MANY REQUESTS", extra = {}) {
  return fail(res, req, 429, message, extra);
}

/* =====================================================
🔥 SERVER ERROR
===================================================== */
function serverError(res, req, err = null, message = "SERVER ERROR") {
  const payload = {};

  if (isDev() && err) {
    payload.debug = {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
  }

  return fail(res, req, err?.status || 500, message || err?.message || "SERVER ERROR", payload);
}

/* =====================================================
🔥 PAGINATION
===================================================== */
function pagination(page = 1, limit = 20, total = 0) {
  const p = Math.max(1, safeNum(page, 1));
  const l = Math.max(1, safeNum(limit, 20));
  const t = Math.max(0, safeNum(total, 0));

  return {
    page: p,
    limit: l,
    total: t,
    totalPages: Math.max(1, Math.ceil(t / l)),
    hasMore: p * l < t,
    hasPrev: p > 1
  };
}

function paged(res, req, list = [], page = 1, limit = 20, total = 0, message = "OK") {
  return res.json({
    ...buildBase(req, message),
    list: Array.isArray(list) ? list : [],
    ...pagination(page, limit, total)
  });
}

/* =====================================================
🔥 META RESPONSE
===================================================== */
function withMeta(res, req, data = {}, meta = {}, message = "OK") {
  return res.json({
    ...buildBase(req, message),
    ...(data && typeof data === "object" ? data : { data }),
    meta: meta && typeof meta === "object" ? meta : {}
  });
}

/* =====================================================
🔥 LIST RESPONSE
===================================================== */
function list(res, req, items = [], message = "OK") {
  return res.json({
    ...buildBase(req, message),
    list: Array.isArray(items) ? items : [],
    count: Array.isArray(items) ? items.length : 0
  });
}

/* =====================================================
🔥 SINGLE ITEM
===================================================== */
function item(res, req, itemData = null, key = "item", message = "OK") {
  return res.json({
    ...buildBase(req, message),
    [safeStr(key, "item")]: itemData
  });
}

/* =====================================================
🔥 BOOLEAN RESPONSE
===================================================== */
function bool(res, req, value = false, key = "result", message = "OK") {
  return res.json({
    ...buildBase(req, message),
    [safeStr(key, "result")]: safeBool(value)
  });
}

/* =====================================================
🔥 COUNT RESPONSE
===================================================== */
function count(res, req, value = 0, key = "count", message = "OK") {
  return res.json({
    ...buildBase(req, message),
    [safeStr(key, "count")]: Math.max(0, safeNum(value, 0))
  });
}

/* =====================================================
🔥 DEBUG RESPONSE
===================================================== */
function debug(res, req, data = {}, message = "DEBUG") {
  return res.json({
    ...buildBase(req, message),
    debug: data && typeof data === "object" ? data : { value: data }
  });
}

/* =====================================================
🔥 WRAP HELPERS
===================================================== */
function wrap(message = "OK", data = {}, req = null) {
  return {
    ...buildBase(req, message),
    ...(data && typeof data === "object" ? data : { data })
  };
}

function wrapFail(message = "ERROR", extra = {}, req = null) {
  return {
    ...buildFailBase(req, message),
    ...(extra && typeof extra === "object" ? extra : {})
  };
}

/* =====================================================
🔥 EXPRESS HELPER FACTORY
===================================================== */
function bind(req, res) {
  return {
    ok: (data = {}, message = "OK") => ok(res, req, data, message),
    created: (data = {}, message = "CREATED") => created(res, req, data, message),
    accepted: (data = {}, message = "ACCEPTED") => accepted(res, req, data, message),
    noContent: () => noContent(res),
    fail: (status = 500, message = "ERROR", extra = {}) => fail(res, req, status, message, extra),
    badRequest: (message = "BAD REQUEST", extra = {}) => badRequest(res, req, message, extra),
    unauthorized: (message = "UNAUTHORIZED", extra = {}) => unauthorized(res, req, message, extra),
    forbidden: (message = "FORBIDDEN", extra = {}) => forbidden(res, req, message, extra),
    notFound: (message = "NOT FOUND", extra = {}) => notFound(res, req, message, extra),
    conflict: (message = "CONFLICT", extra = {}) => conflict(res, req, message, extra),
    tooMany: (message = "TOO MANY REQUESTS", extra = {}) => tooMany(res, req, message, extra),
    serverError: (err = null, message = "SERVER ERROR") => serverError(res, req, err, message),
    paged: (items = [], page = 1, limit = 20, total = 0, message = "OK") =>
      paged(res, req, items, page, limit, total, message),
    list: (items = [], message = "OK") => list(res, req, items, message),
    item: (itemData = null, key = "item", message = "OK") => item(res, req, itemData, key, message),
    bool: (value = false, key = "result", message = "OK") => bool(res, req, value, key, message),
    count: (value = 0, key = "count", message = "OK") => count(res, req, value, key, message),
    meta: (data = {}, meta = {}, message = "OK") => withMeta(res, req, data, meta, message),
    debug: (data = {}, message = "DEBUG") => debug(res, req, data, message)
  };
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 RESPONSE UTIL READY");

module.exports = {
  ok,
  created,
  accepted,
  noContent,
  fail,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooMany,
  serverError,
  pagination,
  paged,
  withMeta,
  list,
  item,
  bool,
  count,
  debug,
  wrap,
  wrapFail,
  bind
};