"use strict";

/**
 * =====================================================
 * 🔥 AUTH ROUTES (COMPLETE - PRODUCTION READY)
 * =====================================================
 */

const express = require("express");
const router = express.Router();

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.error("[AUTH ROUTE LOAD FAIL]", path);
    return null;
  }
}

/* =========================
CONTROLLER
========================= */
const authController = safeRequire("../../controllers/auth/auth.controller");

/* =========================
MIDDLEWARE (OPTIONAL)
========================= */
const authMiddleware = safeRequire("../../middlewares/auth");

/* =====================================================
🔥 AUTH ROUTES
===================================================== */

/* 회원가입 */
router.post("/register", (req, res, next) => {
  if (!authController?.register) {
    return res.status(500).json({ ok: false, msg: "REGISTER_NOT_IMPLEMENTED" });
  }
  return authController.register(req, res, next);
});

/* 로그인 */
router.post("/login", (req, res, next) => {
  if (!authController?.login) {
    return res.status(500).json({ ok: false, msg: "LOGIN_NOT_IMPLEMENTED" });
  }
  return authController.login(req, res, next);
});

/* 내 정보 */
router.get("/me", (req, res, next) => {
  if (!authController?.me) {
    return res.status(500).json({ ok: false, msg: "ME_NOT_IMPLEMENTED" });
  }

  /* auth middleware 적용 (있을 경우만) */
  if (authMiddleware) {
    return authMiddleware(req, res, () =>
      authController.me(req, res, next)
    );
  }

  return authController.me(req, res, next);
});

/* 토큰 검증 */
router.get("/verify", (req, res, next) => {
  if (!authController?.verify) {
    return res.status(500).json({ ok: false, msg: "VERIFY_NOT_IMPLEMENTED" });
  }

  if (authMiddleware) {
    return authMiddleware(req, res, () =>
      authController.verify(req, res, next)
    );
  }

  return authController.verify(req, res, next);
});

/* 로그아웃 */
router.post("/logout", (req, res, next) => {
  if (!authController?.logout) {
    return res.status(500).json({ ok: false, msg: "LOGOUT_NOT_IMPLEMENTED" });
  }
  return authController.logout(req, res, next);
});

/* 토큰 재발급 */
router.get("/token", (req, res, next) => {
  if (!authController?.getToken) {
    return res.status(500).json({ ok: false, msg: "TOKEN_NOT_IMPLEMENTED" });
  }

  if (authMiddleware) {
    return authMiddleware(req, res, () =>
      authController.getToken(req, res, next)
    );
  }

  return authController.getToken(req, res, next);
});

/* =====================================================
🔥 KAKAO AUTH
===================================================== */

/* 카카오 로그인 URL */
router.get("/kakao", (req, res, next) => {
  if (!authController?.kakaoLogin) {
    return res.status(500).json({ ok: false, msg: "KAKAO_LOGIN_NOT_IMPLEMENTED" });
  }
  return authController.kakaoLogin(req, res, next);
});

/* 카카오 콜백 */
router.get("/kakao/callback", (req, res, next) => {
  if (!authController?.kakaoCallback) {
    return res.status(500).json({ ok: false, msg: "KAKAO_CALLBACK_NOT_IMPLEMENTED" });
  }
  return authController.kakaoCallback(req, res, next);
});

/* 카카오 간편 로그인 */
router.post("/kakao/simple", (req, res, next) => {
  if (!authController?.kakaoSimple) {
    return res.status(500).json({ ok: false, msg: "KAKAO_SIMPLE_NOT_IMPLEMENTED" });
  }
  return authController.kakaoSimple(req, res, next);
});

/* =====================================================
🔥 DEBUG
===================================================== */

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "auth",
    time: new Date(),
  });
});

/* ===================================================== */
module.exports = router;