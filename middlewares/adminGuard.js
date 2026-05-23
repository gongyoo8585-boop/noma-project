"use strict";

/* =====================================================
🔥 ADMIN GUARD MIDDLEWARE
👉 관리자 접근 제어 (Role + Permission + 보안)
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const authSecurity = require("../services/auth.security");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let logger = null;
let slack = null;
let analyticsService = null;

try { logger = require("../services/logger.elk"); } catch (_) {}
try { slack = require("../services/slack.alert"); } catch (_) {}
try { analyticsService = require("../services/analyticsService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

/* =====================================================
🔥 MAIN FACTORY
===================================================== */
function adminGuard(options = {}) {
  const {
    roles = ["admin"],          // 허용 role
    permissions = null,         // ["admin:read"]
    allowSuperAdmin = true,     // superAdmin bypass
  } = options;

  return (req, res, next) => {
    try {
      /* =====================================================
      🔥 TOKEN
      ===================================================== */
      const token =
        req.headers.authorization?.replace("Bearer ", "") ||
        null;

      const user = authSecurity.verifyToken(token);

      if (!user) {
        return fail(res, 401, "UNAUTHORIZED");
      }

      req.user = user;

      /* =====================================================
      🔥 ROLE CHECK
      ===================================================== */
      if (allowSuperAdmin && user.role === "super_admin") {
        return next();
      }

      if (!roles.includes(user.role)) {
        logger?.warn("admin_guard_role_block", {
          userId: user.id,
          role: user.role,
        });

        slack?.warn?.("관리자 접근 차단 (ROLE)", {
          userId: user.id,
          role: user.role,
          ip: getIP(req),
        });

        return fail(res, 403, "FORBIDDEN_ROLE");
      }

      /* =====================================================
      🔥 PERMISSION CHECK
      ===================================================== */
      if (permissions && permissions.length) {
        const userPerms = user.permissions || [];

        const ok = permissions.every(p =>
          userPerms.includes(p)
        );

        if (!ok) {
          logger?.warn("admin_guard_permission_block", {
            userId: user.id,
          });

          return fail(res, 403, "FORBIDDEN_PERMISSION");
        }
      }

      /* =====================================================
      🔥 BLOCKED USER CHECK
      ===================================================== */
      if (authSecurity.isBlocked?.(user.id)) {
        return fail(res, 403, "ACCOUNT_BLOCKED");
      }

      /* =====================================================
      🔥 ANALYTICS
      ===================================================== */
      analyticsService?.track({
        type: "admin_access",
        userId: user.id,
        payload: {
          path: req.originalUrl,
        },
      });

      next();
    } catch (err) {
      logger?.error("admin_guard_error", {
        message: err.message,
      });

      return fail(res, 500, "ADMIN_GUARD_ERROR");
    }
  };
}

/* =====================================================
🔥 SHORTCUTS
===================================================== */

/* 기본 관리자 */
adminGuard.admin = adminGuard({
  roles: ["admin"],
});

/* 슈퍼 관리자 전용 */
adminGuard.super = adminGuard({
  roles: ["super_admin"],
  allowSuperAdmin: true,
});

/* 읽기 전용 관리자 */
adminGuard.readOnly = adminGuard({
  roles: ["admin"],
  permissions: ["admin:read"],
});

/* 쓰기 관리자 */
adminGuard.write = adminGuard({
  roles: ["admin"],
  permissions: ["admin:write"],
});

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = adminGuard;