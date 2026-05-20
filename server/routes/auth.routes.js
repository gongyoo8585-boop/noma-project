"use strict";

/**
 * =====================================================
 * 🔥 AUTH ROUTES (FINAL COMPLETE - PATCHED)
 * =====================================================
 */

const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const controller = require("../controllers/auth.controller");

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

/* =========================
🔥 최소 추가: controller 함수 안전 래핑 (로그인 오류 방지)
========================= */
function safe(fn, name) {
  if (typeof fn === "function") return fn;

  return (req, res) => {
    console.error(`❌ CONTROLLER MISSING: ${name}`);
    return res.status(500).json({
      ok: false,
      msg: `${name}_NOT_IMPLEMENTED`,
    });
  };
}

/* =========================
AUTH MIDDLEWARE
========================= */
const externalAuth = safeRequire("../middlewares/auth");

const auth =
  externalAuth ||
  function (req, res, next) {
    try {
      const token = (req.headers.authorization || "").replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          ok: false,
          msg: "NO_TOKEN",
        });
      }

      req.user = jwt.verify(token, process.env.JWT_SECRET || "change_me");
      next();
    } catch {
      return res.status(401).json({
        ok: false,
        msg: "INVALID_TOKEN",
      });
    }
  };

/* =========================
기본 인증
========================= */

// 회원가입
router.post("/register", safe(controller.register, "register"));

router.get("/register", (req, res) => {
  return res.status(405).json({ ok: false, msg: "USE_POST_METHOD" });
});

// 로그인
router.post("/login", safe(controller.login, "login"));

router.get("/login", (req, res) => {
  return res.status(405).json({ ok: false, msg: "USE_POST_METHOD" });
});

// 내 정보
router.get("/me", auth, safe(controller.me, "me"));

// 토큰 검증
router.get("/verify", auth, safe(controller.verify, "verify"));

// 로그아웃
router.post("/logout", safe(controller.logout, "logout"));

/* =========================
🔥 최소 추가: admin dashboard API 연결 (500 에러 해결)
========================= */
router.get(
  "/admin/dashboard",
  auth,
  safe(controller.adminDashboard, "adminDashboard")
);

/* =========================
추가 기능
========================= */
if (typeof controller.getToken === "function") {
  router.get("/token", auth, controller.getToken);
}

/* =========================
카카오 로그인
========================= */
router.get("/kakao/login", safe(controller.kakaoLogin, "kakaoLogin"));
router.get("/kakao/callback", safe(controller.kakaoCallback, "kakaoCallback"));
router.post("/kakao/simple", safe(controller.kakaoSimple, "kakaoSimple"));

/* =========================
헬스 체크
========================= */
router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "auth.routes",
    time: new Date(),
  });
});

/* =========================
EXPORT
========================= */
module.exports = router;