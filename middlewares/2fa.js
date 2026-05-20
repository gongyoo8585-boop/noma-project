"use strict";

/* =====================================================
🔥 2FA MIDDLEWARE
👉 2차 인증 검증
👉 OTP / 인증코드 기반 보호
👉 cacheService / analytics / notify 연동
===================================================== */

let cacheService = null;
let analyticsService = null;
let notifyService = null;

try { cacheService = require("../services/cacheService"); } catch (_) {}
try { analyticsService = require("../services/analyticsService"); } catch (_) {}
try { notifyService = require("../services/notifyService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const OTP_TTL = Number(process.env.OTP_TTL || 300); // 5분
const OTP_LENGTH = Number(process.env.OTP_LENGTH || 6);

/* =====================================================
🔥 HELPER
===================================================== */
function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

function generateCode() {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;

  return String(Math.floor(min + Math.random() * (max - min)));
}

function getUserId(req) {
  return req.user?.id || req.user?._id || req.body?.userId || null;
}

/* =====================================================
🔥 ISSUE OTP
===================================================== */
async function issueOTP(userId) {
  if (!userId) throw new Error("USER_ID_REQUIRED");

  const code = generateCode();
  const key = `2fa:${userId}`;

  cacheService?.set(key, code, OTP_TTL);

  analyticsService?.track({
    type: "2fa_issue",
    userId,
  });

  notifyService?.pushAsync({
    userId,
    type: "2fa",
    title: "2차 인증 코드",
    message: `인증코드: ${code}`,
    payload: { expiresIn: OTP_TTL },
  });

  return {
    success: true,
    expiresIn: OTP_TTL,
  };
}

/* =====================================================
🔥 VERIFY OTP
===================================================== */
function verifyOTP(userId, code) {
  if (!userId) throw new Error("USER_ID_REQUIRED");
  if (!code) throw new Error("OTP_REQUIRED");

  const key = `2fa:${userId}`;
  const saved = cacheService?.get(key);

  if (!saved) {
    throw new Error("OTP_EXPIRED");
  }

  if (String(saved) !== String(code)) {
    analyticsService?.track({
      type: "2fa_fail",
      userId,
    });

    throw new Error("INVALID_OTP");
  }

  // 1회용 처리
  cacheService?.del?.(key);
  cacheService?.delete?.(key);

  analyticsService?.track({
    type: "2fa_success",
    userId,
  });

  return true;
}

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
function require2FA(options = {}) {
  const {
    headerName = "x-otp-code",
    bodyField = "otp",
  } = options;

  return (req, res, next) => {
    try {
      const userId = getUserId(req);
      const code = req.headers[headerName] || req.body?.[bodyField];

      verifyOTP(userId, code);

      req.twoFactorVerified = true;

      next();
    } catch (err) {
      return fail(res, 401, err.message);
    }
  };
}

/* =====================================================
🔥 EXPRESS HANDLERS
===================================================== */
async function requestOTP(req, res) {
  try {
    const userId = getUserId(req);
    const result = await issueOTP(userId);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

async function verifyOTPHandler(req, res) {
  try {
    const userId = getUserId(req);
    const code = req.body?.otp || req.headers["x-otp-code"];

    verifyOTP(userId, code);

    return res.json({
      success: true,
      verified: true,
    });
  } catch (err) {
    return fail(res, 401, err.message);
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  require2FA,
  issueOTP,
  verifyOTP,
  requestOTP,
  verifyOTPHandler,
};