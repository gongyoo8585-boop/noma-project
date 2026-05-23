"use strict";

// modules/user/routes/user.routes.js

const express = require("express");
const router = express.Router();

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn("[user routes] require fail:", path);
    return null;
  }
}

/* =====================================================
🔥 LOAD
===================================================== */
const userController = safeRequire("../controllers/user.controller");

const auth =
  safeRequire("../../middlewares/auth") ||
  safeRequire("../../middlewares/auth.middleware");

/* =====================================================
🔥 HELPER
===================================================== */
const noop = (req, res, next) => next();

/* =====================================================
🔥 ROUTES
===================================================== */

/**
 * 회원가입
 * POST /users/register
 */
router.post(
  "/register",
  userController?.register || noop
);

/**
 * 로그인
 * POST /users/login
 */
router.post(
  "/login",
  userController?.login || noop
);

/**
 * 내 정보
 * GET /users/me
 */
router.get(
  "/me",
  ...(auth ? [auth] : []),
  userController?.getMe || noop
);

/**
 * 사용자 목록 (관리자)
 * GET /users
 */
router.get(
  "/",
  ...(auth ? [auth] : []),
  userController?.getUsers || noop
);

/**
 * 사용자 단건 조회
 * GET /users/:id
 */
router.get(
  "/:id",
  ...(auth ? [auth] : []),
  userController?.getUser || noop
);

/**
 * 역할 변경 (관리자)
 * PATCH /users/:id/role
 */
router.patch(
  "/:id/role",
  ...(auth ? [auth] : []),
  userController?.updateRole || noop
);

/**
 * 비밀번호 변경
 * PATCH /users/password
 */
router.patch(
  "/password",
  ...(auth ? [auth] : []),
  userController?.changePassword || noop
);

/**
 * 회원 탈퇴 (soft delete)
 * DELETE /users
 */
router.delete(
  "/",
  ...(auth ? [auth] : []),
  userController?.deleteUser || noop
);

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = router;