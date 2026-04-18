"use strict";

/* =====================================================
🔥 VALIDATOR UTIL (FINAL ULTRA COMPLETE MASTER)
👉 공통 검증 / sanitize / assert / custom error
👉 controller / service / middleware 전역 사용 가능
👉 통째로 교체 가능한 완성형
===================================================== */

/* =====================================================
🔥 UTIL
===================================================== */
function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function safeBool(v, d = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    return ["true", "1", "yes", "y", "on"].includes(v.toLowerCase());
  }
  return d;
}

function uniq(arr = []) {
  return [...new Set(Array.isArray(arr) ? arr : [])];
}

function toArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function clone(v) {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch (_) {
    return v;
  }
}

/* =====================================================
🔥 ERROR HELPER
===================================================== */
function createError(message = "VALIDATION ERROR", status = 400, details = null) {
  const err = new Error(message);
  err.status = status;
  err.details = details;
  return err;
}

function assert(condition, message = "VALIDATION ERROR", status = 400, details = null) {
  if (!condition) {
    throw createError(message, status, details);
  }
  return true;
}

/* =====================================================
🔥 BASIC CHECKERS
===================================================== */
function exists(v) {
  return !(typeof v === "undefined" || v === null);
}

function notEmpty(v) {
  if (!exists(v)) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function isString(v) {
  return typeof v === "string";
}

function isNumber(v) {
  return Number.isFinite(Number(v));
}

function isInteger(v) {
  return Number.isInteger(Number(v));
}

function isBoolean(v) {
  return typeof v === "boolean";
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isArray(v) {
  return Array.isArray(v);
}

function isFunction(v) {
  return typeof v === "function";
}

/* =====================================================
🔥 FORMAT CHECKERS
===================================================== */
function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

function isPhone(v) {
  return /^[0-9+\-()\s]{7,20}$/.test(String(v || "").trim());
}

function isUrl(v) {
  try {
    const u = new URL(String(v || "").trim());
    return ["http:", "https:"].includes(u.protocol);
  } catch (_) {
    return false;
  }
}

function isDate(v) {
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

function isPastDate(v) {
  if (!isDate(v)) return false;
  return new Date(v).getTime() < Date.now();
}

function isFutureDate(v) {
  if (!isDate(v)) return false;
  return new Date(v).getTime() > Date.now();
}

function isEnum(v, allowed = []) {
  return (Array.isArray(allowed) ? allowed : []).includes(v);
}

function isMinLength(v, len = 1) {
  return String(v || "").length >= len;
}

function isMaxLength(v, len = 255) {
  return String(v || "").length <= len;
}

function isLengthBetween(v, min = 1, max = 255) {
  const s = String(v || "");
  return s.length >= min && s.length <= max;
}

function isBetween(v, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max;
}

/* =====================================================
🔥 SANITIZE
===================================================== */
function sanitizeString(v, d = "") {
  return safeStr(v, d).replace(/[<>]/g, "");
}

function sanitizeEmail(v, d = "") {
  return sanitizeString(v, d).toLowerCase();
}

function sanitizePhone(v, d = "") {
  return String(v == null ? d : v).replace(/[^\d+]/g, "");
}

function sanitizeNumber(v, d = 0, min = -Infinity, max = Infinity) {
  const n = safeNum(v, d);
  return Math.min(max, Math.max(min, n));
}

function sanitizeInt(v, d = 0, min = -Infinity, max = Infinity) {
  const n = safeInt(v, d);
  return Math.min(max, Math.max(min, n));
}

function sanitizeBool(v, d = false) {
  return safeBool(v, d);
}

function sanitizeArray(v, itemSanitizer = null) {
  const arr = Array.isArray(v) ? v : toArray(v);
  if (typeof itemSanitizer !== "function") return uniq(arr);
  return uniq(arr.map(itemSanitizer).filter((x) => x !== "" && x != null));
}

function sanitizeObject(obj = {}) {
  if (!isObject(obj)) return {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = sanitizeString(v);
    else if (Array.isArray(v)) out[k] = v;
    else if (isObject(v)) out[k] = sanitizeObject(v);
    else out[k] = v;
  }
  return out;
}

/* =====================================================
🔥 REQUIRE HELPERS
===================================================== */
function required(v, name = "field") {
  assert(notEmpty(v), `${name} required`, 400, { field: name });
  return v;
}

function requiredId(v, name = "id") {
  assert(isValidId(v), `${name} invalid`, 400, { field: name, value: v });
  return String(v);
}

function requiredEmail(v, name = "email") {
  assert(isEmail(v), `${name} invalid`, 400, { field: name, value: v });
  return sanitizeEmail(v);
}

function requiredPhone(v, name = "phone") {
  assert(isPhone(v), `${name} invalid`, 400, { field: name, value: v });
  return sanitizePhone(v);
}

function requiredEnum(v, allowed = [], name = "field") {
  assert(isEnum(v, allowed), `${name} invalid`, 400, { field: name, allowed });
  return v;
}

function requiredDate(v, name = "date") {
  assert(isDate(v), `${name} invalid`, 400, { field: name, value: v });
  return new Date(v);
}

/* =====================================================
🔥 OBJECT SCHEMA VALIDATION
===================================================== */
function validateFields(obj = {}, schema = {}) {
  const errors = [];
  const input = isObject(obj) ? obj : {};

  for (const [field, rule] of Object.entries(schema || {})) {
    const value = input[field];
    const r = isObject(rule) ? rule : {};

    if (r.required && !notEmpty(value)) {
      errors.push({ field, message: `${field} required` });
      continue;
    }

    if (!exists(value) || value === "") continue;

    if (r.type === "string" && !isString(value)) {
      errors.push({ field, message: `${field} must be string` });
    }

    if (r.type === "number" && !isNumber(value)) {
      errors.push({ field, message: `${field} must be number` });
    }

    if (r.type === "integer" && !isInteger(value)) {
      errors.push({ field, message: `${field} must be integer` });
    }

    if (r.type === "boolean" && !["boolean", "string"].includes(typeof value)) {
      errors.push({ field, message: `${field} must be boolean` });
    }

    if (r.type === "array" && !isArray(value) && typeof value !== "string") {
      errors.push({ field, message: `${field} must be array` });
    }

    if (r.type === "object" && !isObject(value)) {
      errors.push({ field, message: `${field} must be object` });
    }

    if (r.email && !isEmail(value)) {
      errors.push({ field, message: `${field} invalid email` });
    }

    if (r.phone && !isPhone(value)) {
      errors.push({ field, message: `${field} invalid phone` });
    }

    if (r.url && !isUrl(value)) {
      errors.push({ field, message: `${field} invalid url` });
    }

    if (r.objectId && !isValidId(value)) {
      errors.push({ field, message: `${field} invalid id` });
    }

    if (r.date && !isDate(value)) {
      errors.push({ field, message: `${field} invalid date` });
    }

    if (exists(r.min) && isNumber(value) && Number(value) < r.min) {
      errors.push({ field, message: `${field} must be >= ${r.min}` });
    }

    if (exists(r.max) && isNumber(value) && Number(value) > r.max) {
      errors.push({ field, message: `${field} must be <= ${r.max}` });
    }

    if (exists(r.minLength) && String(value).length < r.minLength) {
      errors.push({ field, message: `${field} length must be >= ${r.minLength}` });
    }

    if (exists(r.maxLength) && String(value).length > r.maxLength) {
      errors.push({ field, message: `${field} length must be <= ${r.maxLength}` });
    }

    if (Array.isArray(r.enum) && !r.enum.includes(value)) {
      errors.push({ field, message: `${field} invalid value` });
    }

    if (typeof r.custom === "function") {
      const result = r.custom(value, input);
      if (result !== true) {
        errors.push({
          field,
          message: typeof result === "string" ? result : `${field} invalid`
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

function assertFields(obj = {}, schema = {}) {
  const result = validateFields(obj, schema);
  if (!result.ok) {
    throw createError("VALIDATION ERROR", 400, result.errors);
  }
  return true;
}

/* =====================================================
🔥 REQUEST HELPERS
===================================================== */
function requireBody(req) {
  assert(isObject(req?.body), "body required", 400);
  return req.body;
}

function requireQuery(req) {
  assert(isObject(req?.query), "query required", 400);
  return req.query;
}

function requireParams(req) {
  assert(isObject(req?.params), "params required", 400);
  return req.params;
}

function requireUser(req) {
  assert(req?.user, "user required", 401);
  return req.user;
}

function requireAdmin(req) {
  assert(
    req?.user && ["admin", "superAdmin"].includes(req.user.role),
    "admin required",
    403
  );
  return req.user;
}

/* =====================================================
🔥 PICK / FILTER
===================================================== */
function pick(obj = {}, fields = []) {
  const out = {};
  for (const key of Array.isArray(fields) ? fields : []) {
    if (typeof obj[key] !== "undefined") out[key] = obj[key];
  }
  return out;
}

function omit(obj = {}, fields = []) {
  const out = clone(obj || {});
  for (const key of Array.isArray(fields) ? fields : []) {
    delete out[key];
  }
  return out;
}

function pickTruthy(obj = {}, fields = []) {
  const out = {};
  for (const key of Array.isArray(fields) ? fields : []) {
    if (obj[key]) out[key] = obj[key];
  }
  return out;
}

/* =====================================================
🔥 EXPRESS MIDDLEWARE FACTORY
===================================================== */
function validate(schema = {}, source = "body") {
  return (req, res, next) => {
    try {
      const target = req?.[source] || {};
      assertFields(target, schema);
      next();
    } catch (err) {
      next(err);
    }
  };
}

function validateIdParam(paramName = "id") {
  return (req, res, next) => {
    try {
      requiredId(req?.params?.[paramName], paramName);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/* =====================================================
🔥 COMMON DOMAIN VALIDATORS
===================================================== */
function isPositiveNumber(v) {
  return isNumber(v) && Number(v) > 0;
}

function isNonNegativeNumber(v) {
  return isNumber(v) && Number(v) >= 0;
}

function isPercentage(v) {
  return isNumber(v) && Number(v) >= 0 && Number(v) <= 100;
}

function isPrice(v) {
  return isNonNegativeNumber(v);
}

function isRating(v) {
  return isNumber(v) && Number(v) >= 0 && Number(v) <= 5;
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 VALIDATOR UTIL READY");

module.exports = {
  // util
  safeStr,
  safeNum,
  safeInt,
  safeBool,
  uniq,
  toArray,
  clone,

  // error
  createError,
  assert,

  // basic
  exists,
  notEmpty,
  isString,
  isNumber,
  isInteger,
  isBoolean,
  isObject,
  isArray,
  isFunction,

  // checks
  isValidId,
  isEmail,
  isPhone,
  isUrl,
  isDate,
  isPastDate,
  isFutureDate,
  isEnum,
  isMinLength,
  isMaxLength,
  isLengthBetween,
  isBetween,

  // sanitize
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizeInt,
  sanitizeBool,
  sanitizeArray,
  sanitizeObject,

  // require
  required,
  requiredId,
  requiredEmail,
  requiredPhone,
  requiredEnum,
  requiredDate,

  // schema validation
  validateFields,
  assertFields,

  // request
  requireBody,
  requireQuery,
  requireParams,
  requireUser,
  requireAdmin,

  // pick / filter
  pick,
  omit,
  pickTruthy,

  // middleware
  validate,
  validateIdParam,

  // domain
  isPositiveNumber,
  isNonNegativeNumber,
  isPercentage,
  isPrice,
  isRating
};