"use strict";

const authService = require("../../services/auth/auth.service");
const auth = require("../../middlewares/auth");

/* =====================================================
🔥 RESPONSE UTILS
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({ ok: true, message, data });
}

function fail(res, message = "ERROR", code = 400, errorCode = "AUTH_ERROR") {
  return res.status(code).json({
    ok: false,
    message,
    errorCode
  });
}

/* =====================================================
🔥 SAFE WRAPPER
===================================================== */
function safe(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      return fail(res, e.message || "SERVER_ERROR", 500);
    }
  };
}

/* =====================================================
🔥 REGISTER
===================================================== */
exports.register = safe(async (req, res) => {
  const result = await authService.register({
    email: req.body.email,
    password: req.body.password,
    name: req.body.name,
    phone: req.body.phone,
    role: req.body.role || "user"
  });

  return ok(res, result, "회원가입 완료");
});

/* =====================================================
🔥 LOGIN
===================================================== */
exports.login = safe(async (req, res) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    device: req.headers["user-agent"],
    ip: req.ip
  });

  return ok(res, result, "로그인 성공");
});

/* =====================================================
🔥 LOGOUT
===================================================== */
exports.logout = [
  auth,
  safe(async (req, res) => {
    await authService.logout({
      userId: auth.getUserId(req),
      token: req.token
    });

    return ok(res, true, "로그아웃 완료");
  })
];

/* =====================================================
🔥 REFRESH TOKEN
===================================================== */
exports.refresh = safe(async (req, res) => {
  const result = await authService.refreshToken({
    refreshToken: req.body.refreshToken
  });

  return ok(res, result, "토큰 재발급");
});

/* =====================================================
🔥 ME
===================================================== */
exports.me = [
  auth,
  safe(async (req, res) => {
    const user = await authService.getMe(auth.getUserId(req));
    return ok(res, user);
  })
];

/* =====================================================
🔥 UPDATE PROFILE
===================================================== */
exports.updateProfile = [
  auth,
  safe(async (req, res) => {
    const result = await authService.updateProfile({
      userId: auth.getUserId(req),
      ...req.body
    });

    return ok(res, result, "프로필 수정 완료");
  })
];

/* =====================================================
🔥 CHANGE PASSWORD
===================================================== */
exports.changePassword = [
  auth,
  safe(async (req, res) => {
    await authService.changePassword({
      userId: auth.getUserId(req),
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword
    });

    return ok(res, true, "비밀번호 변경 완료");
  })
];

/* =====================================================
🔥 FORGOT PASSWORD
===================================================== */
exports.forgotPassword = safe(async (req, res) => {
  await authService.forgotPassword({
    email: req.body.email
  });

  return ok(res, true, "비밀번호 재설정 요청 완료");
});

/* =====================================================
🔥 RESET PASSWORD
===================================================== */
exports.resetPassword = safe(async (req, res) => {
  await authService.resetPassword({
    token: req.body.token,
    newPassword: req.body.newPassword
  });

  return ok(res, true, "비밀번호 재설정 완료");
});

/* =====================================================
🔥 VERIFY EMAIL
===================================================== */
exports.verifyEmail = safe(async (req, res) => {
  await authService.verifyEmail({
    token: req.query.token
  });

  return ok(res, true, "이메일 인증 완료");
});

/* =====================================================
🔥 ADMIN - USER LIST
===================================================== */
exports.adminUsers = [
  auth,
  safe(async (req, res) => {
    if (!auth.isAdmin(req)) {
      return fail(res, "관리자만", 403, "ADMIN_ONLY");
    }

    const result = await authService.getUsers({
      limit: req.query.limit,
      page: req.query.page
    });

    return ok(res, result);
  })
];

/* =====================================================
🔥 ADMIN - FORCE LOGOUT
===================================================== */
exports.forceLogout = [
  auth,
  safe(async (req, res) => {
    if (!auth.isAdmin(req)) {
      return fail(res, "관리자만", 403);
    }

    await authService.forceLogout({
      userId: req.params.id
    });

    return ok(res, true, "강제 로그아웃 완료");
  })
];

/* =====================================================
🔥 LOGIN HISTORY
===================================================== */
exports.loginHistory = [
  auth,
  safe(async (req, res) => {
    const data = await authService.getLoginHistory(auth.getUserId(req));
    return ok(res, data);
  })
];

/* =====================================================
🔥 SECURITY CHECK
===================================================== */
exports.securityCheck = [
  auth,
  safe(async (req, res) => {
    const data = await authService.securityCheck(auth.getUserId(req));
    return ok(res, data);
  })
];

/* =====================================================
🔥 HEALTH
===================================================== */
exports.ping = (req, res) => {
  res.json({
    ok: true,
    message: "auth controller alive",
    time: new Date()
  });
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 authController FINAL READY");

module.exports = exports;