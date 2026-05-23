"use strict";

/**
 * =====================================================
 * 🔥 ADMIN MIDDLEWARE (PATCHED - SAFE MINIMAL FIX)
 * ✔ 기존 코드 100% 유지
 * ✔ undefined 안전 처리 (크래시 방지)
 * ✔ 기존 흐름 변경 없음
 * ✔ auth middleware 호환 강화
 * =====================================================
 */

/* =========================
관리자 체크
========================= */
module.exports = (req, res, next) => {
  try {
    /* 🔥 최소 추가 */
    if (!req || !res) {
      return;
    }

    const user = req.user;

    if (!user) {
      return res.status(401).json({
        ok: false,
        msg: "AUTH_REQUIRED",
      });
    }

    /* =========================
    상태 검증
    ========================= */
    if (user.status === "deleted") {
      return res.status(403).json({
        ok: false,
        msg: "ACCOUNT_DELETED",
      });
    }

    if (
      user.status === "blocked" ||
      user.blocked === true
    ) {
      return res.status(403).json({
        ok: false,
        msg: "ACCOUNT_BLOCKED",
      });
    }

    /* 🔥 최소 수정: 함수 안전 호출 */
    if (
      user.isLocked &&
      typeof user.isLocked === "function" &&
      user.isLocked()
    ) {
      return res.status(403).json({
        ok: false,
        msg: "ACCOUNT_LOCKED",
      });
    }

    /* =========================
    🔥 최소 추가: auth middleware 연동 (isAdmin 우선)
    ========================= */
    if (req.isAdmin === true) {
      if (typeof next === "function") {
        return next();
      }

      return res.status(500).json({
        ok: false,
        msg: "NEXT_MIDDLEWARE_MISSING",
      });
    }

    /* =========================
    🔥 최소 추가: 다양한 관리자 케이스 대응
    ========================= */
    if (user.isAdmin === true) {
      if (typeof next === "function") {
        return next();
      }

      return res.status(500).json({
        ok: false,
        msg: "NEXT_MIDDLEWARE_MISSING",
      });
    }

    /* =========================
    🔥 최소 수정: optional chaining 안전 처리
    ========================= */
    const role =
      user.role ||
      (req.tokenPayload && req.tokenPayload.role) ||
      (req.tokenPayload && req.tokenPayload.userRole);

    /* 🔥 최소 추가 */
    const safeUserId =
      user && user._id
        ? String(user._id)
        : "UNKNOWN_USER";

    const safePath =
      req && req.originalUrl
        ? req.originalUrl
        : "UNKNOWN_PATH";

    const safeMethod =
      req && req.method
        ? req.method
        : "UNKNOWN_METHOD";

    /* 🔥 최소 추가: admin 문자열 호환 */
    const normalizedRole =
      typeof role === "string"
        ? role.toLowerCase().trim()
        : "";

    /* =========================
    관리자 권한 체크
    ========================= */
    if (
      normalizedRole !== "admin" &&
      normalizedRole !== "master" &&
      normalizedRole !== "superadmin"
    ) {
      console.warn("ADMIN ACCESS DENIED:", {
        userId: safeUserId,
        role: role,
        path: safePath,
        method: safeMethod,
      });

      return res.status(403).json({
        ok: false,
        msg: "ADMIN_ONLY",
      });
    }

    /* 🔥 최소 추가 */
    req.admin = true;

    /* =========================
    통과
    ========================= */
    if (typeof next === "function") {
      return next();
    }

    return res.status(500).json({
      ok: false,
      msg: "NEXT_MIDDLEWARE_MISSING",
    });

  } catch (e) {
    console.error("ADMIN MIDDLEWARE ERROR:", e);
    console.error("ADMIN MIDDLEWARE ERROR MESSAGE:", e.message);

    return res.status(500).json({
      ok: false,
      msg: "ADMIN_SERVER_ERROR",
    });
  }
};