"use strict";

/* =====================================================
🔥 CSRF MIDDLEWARE
👉 CSRF 토큰 생성 / 검증
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const crypto = require("crypto");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;

try { cacheService = require("../services/cacheService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const CSRF_TTL = Number(process.env.CSRF_TTL || 3600);
const CSRF_HEADER = "x-csrf-token";
const CSRF_COOKIE = "csrf_token";

/* =====================================================
🔥 HELPER
===================================================== */
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

/* =====================================================
🔥 ISSUE TOKEN (GET 요청 시)
===================================================== */
function issueToken(req, res, next) {
  try {
    const token = generateToken();

    const key = `csrf:${token}`;

    cacheService?.set(key, true, CSRF_TTL);

    /* 쿠키 설정 */
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: CSRF_TTL * 1000,
    });

    req.csrfToken = token;

    next();
  } catch (err) {
    return fail(res, 500, "CSRF_ISSUE_ERROR");
  }
}

/* =====================================================
🔥 VERIFY TOKEN (POST/PUT/DELETE)
===================================================== */
function verifyToken(req, res, next) {
  try {
    const token =
      req.headers[CSRF_HEADER] ||
      req.cookies?.[CSRF_COOKIE] ||
      req.body?._csrf;

    if (!token) {
      return fail(res, 403, "CSRF_TOKEN_MISSING");
    }

    const key = `csrf:${token}`;
    const exists = cacheService?.get(key);

    if (!exists) {
      return fail(res, 403, "CSRF_INVALID");
    }

    next();
  } catch (err) {
    return fail(res, 500, "CSRF_VERIFY_ERROR");
  }
}

/* =====================================================
🔥 MAIN MIDDLEWARE
===================================================== */
function csrf() {
  return (req, res, next) => {
    const method = req.method.toUpperCase();

    /* 안전한 요청 */
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return issueToken(req, res, next);
    }

    /* 위험한 요청 */
    return verifyToken(req, res, next);
  };
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = csrf;