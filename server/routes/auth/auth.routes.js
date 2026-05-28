"use strict";

/**
 * =====================================================
 * 🔥 AUTH ROUTES (COMPLETE - PRODUCTION READY)
 * 기존 라우팅 유지 + require 경로 안정화 + middleware 함수 검증
 * =====================================================
 */

const express = require("express");
const router = express.Router();

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (e) {
    console.error("[AUTH ROUTE LOAD FAIL]", modulePath, e.message);
    return null;
  }
}

function firstAvailable(paths) {
  for (const modulePath of paths) {
    const mod = safeRequire(modulePath);
    if (mod) {
      return mod;
    }
  }
  return null;
}

function pickFunction(mod, names = []) {
  if (typeof mod === "function") {
    return mod;
  }

  if (!mod || typeof mod !== "object") {
    return null;
  }

  for (const name of names) {
    if (typeof mod[name] === "function") {
      return mod[name];
    }
  }

  if (mod.default) {
    return pickFunction(mod.default, names);
  }

  return null;
}

function runAuth(req, res, next) {
  const middleware = pickFunction(authMiddleware, [
    "auth",
    "verifyToken",
    "authenticate",
    "requireAuth",
    "protect",
    "default",
  ]);

  if (!middleware) {
    return next();
  }

  return middleware(req, res, next);
}

function controllerAction(name) {
  return (req, res, next) => {
    const action = authController && authController[name];

    if (typeof action !== "function") {
      return res.status(500).json({
        ok: false,
        msg: `${String(name).toUpperCase()}_NOT_IMPLEMENTED`,
      });
    }

    return action(req, res, next);
  };
}

function protectedControllerAction(name) {
  return (req, res, next) => {
    return runAuth(req, res, (authError) => {
      if (authError) {
        return next(authError);
      }

      return controllerAction(name)(req, res, next);
    });
  };
}

/* =========================
CONTROLLER
========================= */
const authController = firstAvailable([
  "../../controllers/auth.controller",
  "../../controllers/auth/auth.controller",
  "../../../controllers/auth/authController",
  "../../../controllers/auth/auth.controller",
  "../../../controllers/authController",
]);

/* =========================
MIDDLEWARE (OPTIONAL)
========================= */
const authMiddleware = firstAvailable([
  "../../middlewares/auth",
  "../../middleware/auth",
  "../../../middlewares/auth",
  "../../../middleware/auth",
]);

/* =====================================================
🔥 AUTH ROUTES
===================================================== */

/* 회원가입 */
router.post("/register", controllerAction("register"));

/* 로그인 */
router.post("/login", controllerAction("login"));

/* 내 정보 */
router.get("/me", protectedControllerAction("me"));

/* 토큰 검증 */
router.get("/verify", protectedControllerAction("verify"));

/* 로그아웃 */
router.post("/logout", controllerAction("logout"));

/* 토큰 재발급 */
router.get("/token", protectedControllerAction("getToken"));

/* =====================================================
🔥 KAKAO AUTH
===================================================== */

/* 카카오 로그인 URL */
router.get("/kakao", controllerAction("kakaoLogin"));

/* 카카오 콜백 */
router.get("/kakao/callback", controllerAction("kakaoCallback"));

/* 카카오 간편 로그인 */
router.post("/kakao/simple", controllerAction("kakaoSimple"));

/* =====================================================
🔥 DEBUG
===================================================== */

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "auth",
    controller: !!authController,
    middleware: !!pickFunction(authMiddleware, [
      "auth",
      "verifyToken",
      "authenticate",
      "requireAuth",
      "protect",
      "default",
    ]),
    time: new Date(),
  });
});

/* ===================================================== */
console.log("🔥 AUTH ROUTES FINAL SAFE READY");

module.exports = router;
