"use strict";

/* =====================================================
🔥 GOOGLE 2FA (TOTP)
👉 Google Authenticator 기반 2차 인증
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let User = null;

try { cacheService = require("../services/cacheService"); } catch (_) {}
try { User = require("../modules/user/models/User"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const APP_NAME = process.env.APP_NAME || "MyApp";

/* =====================================================
🔥 HELPER
===================================================== */
function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

/* =====================================================
🔥 GENERATE SECRET + QR
===================================================== */
async function generate(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) throw new Error("USER_REQUIRED");

    const secret = speakeasy.generateSecret({
      length: 20,
      name: `${APP_NAME}:${userId}`,
    });

    const qr = await QRCode.toDataURL(secret.otpauth_url);

    /* 임시 저장 (검증 전) */
    cacheService?.set(`2fa:temp:${userId}`, secret.base32, 300);

    return res.json({
      success: true,
      data: {
        secret: secret.base32,
        qr,
      },
    });
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

/* =====================================================
🔥 ENABLE 2FA (VERIFY FIRST)
===================================================== */
async function enable(req, res) {
  try {
    const userId = getUserId(req);
    const { token } = req.body;

    const secret = cacheService?.get(`2fa:temp:${userId}`);
    if (!secret) throw new Error("SECRET_EXPIRED");

    const verified = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token,
      window: 1,
    });

    if (!verified) {
      throw new Error("INVALID_TOKEN");
    }

    /* DB 저장 */
    if (User) {
      await User.updateOne(
        { _id: userId },
        {
          twoFactorSecret: secret,
          twoFactorEnabled: true,
        }
      );
    }

    cacheService?.del?.(`2fa:temp:${userId}`);

    return res.json({ success: true, enabled: true });
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

/* =====================================================
🔥 VERIFY (LOGIN / ACTION)
===================================================== */
function verifyToken(user, token) {
  if (!user?.twoFactorEnabled) return true;

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
    window: 1,
  });

  if (!verified) {
    throw new Error("INVALID_2FA");
  }

  return true;
}

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
function requireGoogle2FA() {
  return (req, res, next) => {
    try {
      const user = req.user;
      const token =
        req.headers["x-2fa-token"] ||
        req.body?.token;

      if (!user) return fail(res, 401, "UNAUTHORIZED");

      verifyToken(user, token);

      req.twoFactorVerified = true;

      next();
    } catch (err) {
      return fail(res, 401, err.message);
    }
  };
}

/* =====================================================
🔥 DISABLE 2FA
===================================================== */
async function disable(req, res) {
  try {
    const userId = getUserId(req);

    if (User) {
      await User.updateOne(
        { _id: userId },
        {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        }
      );
    }

    return res.json({ success: true, disabled: true });
  } catch (err) {
    return fail(res, 400, err.message);
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  generate,
  enable,
  disable,
  requireGoogle2FA,
  verifyToken,
};