"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

function safeRequire(modulePath) {
  try {
    const basePath = path.resolve(__dirname, modulePath);

    const candidates = [
      basePath,
      `${basePath}.js`,
      path.join(basePath, "index.js"),
    ];

    const found = candidates.find((filePath) => fs.existsSync(filePath));

    if (!found) {
      return null;
    }

    return require(found);
  } catch (error) {
    console.error(
      "[AUTH ROUTE LOAD ERROR]",
      modulePath,
      error.message
    );

    return null;
  }
}

function isHandler(value) {
  return typeof value === "function";
}

function normalizeHandlers(value, fallback) {
  if (Array.isArray(value)) {
    const handlers = value.flat(Infinity).filter(isHandler);

    if (handlers.length > 0) {
      return handlers;
    }
  }

  if (isHandler(value)) {
    return [value];
  }

  if (Array.isArray(fallback)) {
    const fallbackHandlers = fallback.flat(Infinity).filter(isHandler);

    if (fallbackHandlers.length > 0) {
      return fallbackHandlers;
    }
  }

  if (isHandler(fallback)) {
    return [fallback];
  }

  return [
    async (req, res) => {
      return res.status(500).json({
        success: false,
        message: "NORA auth handler not connected",
      });
    },
  ];
}

function pickHandler(source, names, fallback) {
  if (!source || typeof source !== "object") {
    return normalizeHandlers(null, fallback);
  }

  for (const name of names) {
    const value = source[name];

    if (isHandler(value) || Array.isArray(value)) {
      return normalizeHandlers(value, fallback);
    }
  }

  return normalizeHandlers(null, fallback);
}

function pickMiddleware(source, names, fallback) {
  return pickHandler(source, names, fallback);
}

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    try {
      return Promise.resolve(handler(req, res, next)).catch(next);
    } catch (error) {
      return next(error);
    }
  };
}

function wrapHandlers(handlers) {
  return normalizeHandlers(handlers).map((handler) => asyncHandler(handler));
}

/* =====================================================
🔥 ACTUAL PROJECT STRUCTURE
/routes/auth/auth.routes.js
→ /controllers/auth/auth.controller.js
→ /middlewares/auth.js
===================================================== */

const authController =
  safeRequire("../../controllers/auth/auth.controller") ||
  {};

const authMiddleware =
  safeRequire("../../middlewares/auth") ||
  {};

const verifyToken = pickMiddleware(
  authMiddleware,
  ["verifyToken", "authenticateToken", "authMiddleware", "protect"],
  (req, res, next) => next()
);

const optionalAuth = pickMiddleware(
  authMiddleware,
  ["optionalAuth"],
  (req, res, next) => next()
);

const loginHandler = pickHandler(
  authController,
  ["login", "signIn", "adminLogin"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA login controller not connected",
    });
  }
);

const registerHandler = pickHandler(
  authController,
  ["register", "signup", "signUp"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA register controller not connected",
    });
  }
);

const meHandler = pickHandler(
  authController,
  ["me", "profile", "getProfile"],
  async (req, res) => {
    return res.status(200).json({
      success: true,
      user: req.user || null,
    });
  }
);

const logoutHandler = pickHandler(
  authController,
  ["logout"],
  async (req, res) => {
    return res.status(200).json({
      success: true,
      message: "NORA logout success",
    });
  }
);

const refreshHandler = pickHandler(
  authController,
  ["refresh", "refreshToken"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA refresh controller not connected",
    });
  }
);

const kakaoLoginHandler = pickHandler(
  authController,
  ["kakaoLogin", "kakao"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA kakao login controller not connected",
    });
  }
);

const kakaoCallbackHandler = pickHandler(
  authController,
  ["kakaoCallback"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA kakao callback controller not connected",
    });
  }
);

const updateProfileHandler = pickHandler(
  authController,
  ["updateProfile"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA update profile controller not connected",
    });
  }
);

const changePasswordHandler = pickHandler(
  authController,
  ["changePassword"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA change password controller not connected",
    });
  }
);

const forgotPasswordHandler = pickHandler(
  authController,
  ["forgotPassword"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA forgot password controller not connected",
    });
  }
);

const resetPasswordHandler = pickHandler(
  authController,
  ["resetPassword"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA reset password controller not connected",
    });
  }
);

const verifyEmailHandler = pickHandler(
  authController,
  ["verifyEmail"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA verify email controller not connected",
    });
  }
);

const adminUsersHandler = pickHandler(
  authController,
  ["adminUsers"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA admin users controller not connected",
    });
  }
);

const forceLogoutHandler = pickHandler(
  authController,
  ["forceLogout"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA force logout controller not connected",
    });
  }
);

const loginHistoryHandler = pickHandler(
  authController,
  ["loginHistory"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA login history controller not connected",
    });
  }
);

const securityCheckHandler = pickHandler(
  authController,
  ["securityCheck"],
  async (req, res) => {
    return res.status(501).json({
      success: false,
      message: "NORA security check controller not connected",
    });
  }
);

const pingHandler = pickHandler(
  authController,
  ["ping"],
  (req, res) => {
    return res.status(200).json({
      success: true,
      service: "NORA AUTH API",
      timestamp: new Date().toISOString(),
    });
  }
);

router.get("/health", ...wrapHandlers(pingHandler));

router.post("/login", ...wrapHandlers(loginHandler));

router.post("/register", ...wrapHandlers(registerHandler));

router.post("/signup", ...wrapHandlers(registerHandler));

router.post("/logout", ...wrapHandlers(logoutHandler));

router.post("/refresh", ...wrapHandlers(refreshHandler));

router.get("/me", ...wrapHandlers(meHandler));

router.get("/profile", ...wrapHandlers(meHandler));

router.get("/session", ...wrapHandlers([...optionalAuth, ...meHandler]));

router.patch("/profile", ...wrapHandlers(updateProfileHandler));

router.put("/profile", ...wrapHandlers(updateProfileHandler));

router.post("/change-password", ...wrapHandlers(changePasswordHandler));

router.post("/forgot-password", ...wrapHandlers(forgotPasswordHandler));

router.post("/reset-password", ...wrapHandlers(resetPasswordHandler));

router.get("/verify-email", ...wrapHandlers(verifyEmailHandler));

router.get("/admin/users", ...wrapHandlers(adminUsersHandler));

router.post(
  "/admin/users/:id/force-logout",
  ...wrapHandlers(forceLogoutHandler)
);

router.get("/login-history", ...wrapHandlers(loginHistoryHandler));

router.get("/security-check", ...wrapHandlers(securityCheckHandler));

router.get("/kakao", ...wrapHandlers(kakaoLoginHandler));

router.get(
  "/kakao/callback",
  ...wrapHandlers(kakaoCallbackHandler)
);

module.exports = router;
