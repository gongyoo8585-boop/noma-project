"use strict";

/* =====================================================
🔥 ADMIN GUARD MIDDLEWARE
👉 관리자 접근 제어 (Role + Permission + 보안)
✔ ../services/auth.security 없음 오류 방지
✔ logger.elk / slack.alert / analyticsService 없음 로그 방지
✔ 기존 adminGuard(options) factory 구조 유지
✔ adminGuard.admin / super / readOnly / write 유지
✔ auth.security 미존재 시 JWT 기반 fallback
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(modulePath, options = {}) {
  const { silent = false } = options;

  try {
    return require(modulePath);
  } catch (error) {
    if (!silent) {
      console.warn("[adminGuard] require fail:", modulePath, error.message);
    }

    return null;
  }
}

const jwt = safeRequire("jsonwebtoken");

/* =====================================================
🔥 OPTIONAL SERVICE FALLBACKS
===================================================== */
function createNoopLogger() {
  return {
    warn() {},
    error() {},
    info() {},
    debug() {},
  };
}

function createNoopSlack() {
  return {
    warn() {},
    error() {},
    info() {},
    send() {},
  };
}

function createNoopAnalytics() {
  return {
    track() {},
    event() {},
  };
}

/* =====================================================
🔥 AUTH SECURITY FALLBACK
===================================================== */
const loadedAuthSecurity = safeRequire("../services/auth.security", {
  silent: true,
});

const authSecurity =
  loadedAuthSecurity && typeof loadedAuthSecurity === "object"
    ? loadedAuthSecurity
    : {
        verifyToken(token) {
          if (!token) {
            return null;
          }

          if (jwt && process.env.JWT_SECRET) {
            try {
              return jwt.verify(token, process.env.JWT_SECRET);
            } catch (error) {
              console.warn("[adminGuard] jwt verify fail:", error.message);
              return null;
            }
          }

          return null;
        },

        isBlocked() {
          return false;
        },
      };

/* =====================================================
🔥 OPTIONAL SERVICES
===================================================== */
const logger =
  safeRequire("../services/logger.elk", { silent: true }) || createNoopLogger();

const slack =
  safeRequire("../services/slack.alert", { silent: true }) || createNoopSlack();

const analyticsService =
  safeRequire("../services/analyticsService", { silent: true }) ||
  createNoopAnalytics();

/* =====================================================
🔥 HELPER
===================================================== */
function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
}

function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    ok: false,
    message,
  });
}

function normalizeRole(role) {
  const value = String(role || "").trim();

  if (value === "superAdmin") {
    return "super_admin";
  }

  if (value === "superadmin") {
    return "super_admin";
  }

  return value;
}

function normalizeRoles(roles = []) {
  return roles.map(normalizeRole);
}

function extractToken(req) {
  const authorization = req.headers.authorization || "";

  if (authorization.startsWith("Bearer ")) {
    return authorization.replace("Bearer ", "").trim();
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  if (req.cookies?.adminToken) {
    return req.cookies.adminToken;
  }

  if (req.query?.token) {
    return req.query.token;
  }

  return null;
}

/* =====================================================
🔥 MAIN FACTORY
===================================================== */
function adminGuard(options = {}) {
  const {
    roles = ["admin"],
    permissions = null,
    allowSuperAdmin = true,
  } = options;

  const allowedRoles = normalizeRoles(roles);

  return (req, res, next) => {
    try {
      const token = extractToken(req);

      const user =
        req.user ||
        (typeof authSecurity.verifyToken === "function"
          ? authSecurity.verifyToken(token)
          : null);

      if (!user) {
        return fail(res, 401, "UNAUTHORIZED");
      }

      req.user = user;

      const userRole = normalizeRole(user.role);

      if (
        allowSuperAdmin &&
        (userRole === "super_admin" || userRole === "superAdmin")
      ) {
        return next();
      }

      if (!allowedRoles.includes(userRole)) {
        logger.warn("admin_guard_role_block", {
          userId: user.id || user._id,
          role: user.role,
        });

        slack.warn("관리자 접근 차단 (ROLE)", {
          userId: user.id || user._id,
          role: user.role,
          ip: getIP(req),
        });

        return fail(res, 403, "FORBIDDEN_ROLE");
      }

      if (permissions && permissions.length) {
        const userPerms = Array.isArray(user.permissions)
          ? user.permissions
          : [];

        const permitted = permissions.every((permission) =>
          userPerms.includes(permission)
        );

        if (!permitted) {
          logger.warn("admin_guard_permission_block", {
            userId: user.id || user._id,
          });

          return fail(res, 403, "FORBIDDEN_PERMISSION");
        }
      }

      if (
        typeof authSecurity.isBlocked === "function" &&
        authSecurity.isBlocked(user.id || user._id)
      ) {
        return fail(res, 403, "ACCOUNT_BLOCKED");
      }

      analyticsService.track({
        type: "admin_access",
        userId: user.id || user._id,
        payload: {
          path: req.originalUrl,
          ip: getIP(req),
        },
      });

      return next();
    } catch (err) {
      logger.error("admin_guard_error", {
        message: err.message,
      });

      console.error("[adminGuard] error:", err);

      return fail(res, 500, "ADMIN_GUARD_ERROR");
    }
  };
}

/* =====================================================
🔥 SHORTCUTS
===================================================== */
adminGuard.admin = adminGuard({
  roles: ["admin"],
});

adminGuard.super = adminGuard({
  roles: ["super_admin"],
  allowSuperAdmin: true,
});

adminGuard.readOnly = adminGuard({
  roles: ["admin"],
  permissions: ["admin:read"],
});

adminGuard.write = adminGuard({
  roles: ["admin"],
  permissions: ["admin:write"],
});

adminGuard.adminOnly = adminGuard.admin;
adminGuard.requireAdmin = adminGuard.admin;

/* =====================================================
🔥 EXPORT
===================================================== */
console.log("🔥 ADMIN GUARD READY");

module.exports = adminGuard;
