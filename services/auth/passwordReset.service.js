"use strict";

/* =====================================================
🔥 PASSWORD RESET SERVICE
👉 비밀번호 재설정
👉 토큰 생성 / 검증 / 변경
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let User = null;
let cacheService = null;
let emailService = null;
let smsService = null;
let analyticsService = null;
let authSecurity = null;

try { User = require("../modules/user/models/User"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { emailService = require("./email.service"); } catch (_) {}
try { smsService = require("./sms.service"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { authSecurity = require("./auth.security"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const TOKEN_TTL = Number(process.env.RESET_TOKEN_TTL || 600); // sec
const TOKEN_LENGTH = 32;

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function generateToken() {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

/* =====================================================
🔥 SERVICE
===================================================== */
class PasswordResetService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 REQUEST RESET
  ===================================================== */
  async request({ id, email, phone }) {
    assert(id, "ID_REQUIRED");

    if (!User) throw new Error("USER_MODEL_MISSING");

    const user = await User.findActiveById(id);
    if (!user) throw new Error("USER_NOT_FOUND");

    const token = generateToken();

    /* 저장 (TTL) */
    cacheService?.set(`pwd:reset:${token}`, id, TOKEN_TTL);

    /* 링크 */
    const link = `${process.env.FRONT_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    /* 이메일 발송 */
    if (email && emailService) {
      await emailService.sendAsync({
        to: email,
        subject: "PASSWORD_RESET",
        message: `비밀번호 재설정 링크: ${link}`,
      });
    }

    /* SMS 발송 */
    if (phone && smsService) {
      await smsService.sendAsync({
        to: phone,
        message: `비밀번호 재설정: ${link}`,
      });
    }

    analyticsService?.track({
      type: "password_reset_request",
      userId: id,
    });

    this.last = { token };

    return { success: true };
  }

  /* =====================================================
  🔥 VERIFY TOKEN
  ===================================================== */
  verify(token) {
    assert(token, "TOKEN_REQUIRED");

    const userId = cacheService?.get(`pwd:reset:${token}`);

    if (!userId) {
      throw new Error("INVALID_OR_EXPIRED_TOKEN");
    }

    return { valid: true, userId };
  }

  /* =====================================================
  🔥 RESET PASSWORD
  ===================================================== */
  async reset({ token, newPassword }) {
    assert(token, "TOKEN_REQUIRED");
    assert(newPassword, "PASSWORD_REQUIRED");

    const userId = cacheService?.get(`pwd:reset:${token}`);
    if (!userId) throw new Error("INVALID_OR_EXPIRED_TOKEN");

    const user = await User.findActiveById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    /* 토큰 삭제 (1회용) */
    cacheService?.set(`pwd:reset:${token}`, null, 1);

    /* 보안: 기존 토큰 무효화 */
    authSecurity?.blacklist?.(userId);

    analyticsService?.track({
      type: "password_reset_success",
      userId,
    });

    this.last = { userId };

    return { success: true };
  }

  /* =====================================================
  🔥 ADMIN FORCE RESET
  ===================================================== */
  async forceReset(userId, newPassword) {
    assert(userId, "USER_ID_REQUIRED");
    assert(newPassword, "PASSWORD_REQUIRED");

    const user = await User.findActiveById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    analyticsService?.track({
      type: "password_force_reset",
      userId,
    });

    return true;
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.last;
  }

  /* =====================================================
  🔥 RESET SERVICE
  ===================================================== */
  resetService() {
    this.last = null;
    return true;
  }
}

module.exports = new PasswordResetService();