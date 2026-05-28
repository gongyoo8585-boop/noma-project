"use strict";

/* =====================================================
🔥 ADMIN ROUTES (FINAL MASTER)
관리자 라우트 / 대시보드 / 유저 / 매장 / 예약 / 결제 / 시스템
===================================================== */

const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

/* =====================================================
🔥 SAFE REQUIRE
/routes/admin/admin.routes.js
→ /middlewares
→ /controllers
→ /services
→ /config
===================================================== */
function safeRequire(modulePath) {
  try {
    const basePath = path.resolve(__dirname, modulePath);

    const candidates = [
      basePath,
      `${basePath}.js`,
      `${basePath}.json`,
      path.join(basePath, "index.js"),
    ];

    const found = candidates.find((filePath) => fs.existsSync(filePath));

    if (!found) {
      return null;
    }

    return require(found);
  } catch (err) {
    console.error("[admin.routes] require error:", modulePath, err.message);
    return null;
  }
}

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
const auth =
  safeRequire("../../middlewares/auth") ||
  safeRequire("../../middleware/auth") ||
  {};

const admin =
  safeRequire("../../middlewares/admin") ||
  safeRequire("../../middleware/admin") ||
  {};

const adminGuard =
  safeRequire("../../middlewares/adminGuard") ||
  safeRequire("../../middleware/adminGuard") ||
  {};

/* =====================================================
🔥 CONTROLLERS
===================================================== */
const adminController =
  safeRequire("../../controllers/admin/adminController") ||
  safeRequire("../../controllers/admin/admin.controller") ||
  safeRequire("../../controllers/admin.controller") ||
  safeRequire("../../controllers/adminController") ||
  safeRequire("../../controllers/admin") ||
  {};

const paymentController =
  safeRequire("../../controllers/payment/paymentController") ||
  safeRequire("../../controllers/payment/payment.controller") ||
  safeRequire("../../controllers/payment.controller") ||
  safeRequire("../../controllers/paymentController") ||
  {};

const reservationController =
  safeRequire("../../controllers/reservation/reservationController") ||
  safeRequire("../../controllers/reservation/reservation.controller") ||
  safeRequire("../../controllers/reservation.controller") ||
  safeRequire("../../controllers/reservationController") ||
  {};

const shopController =
  safeRequire("../../controllers/shop/shopController") ||
  safeRequire("../../controllers/shop/shop.controller") ||
  safeRequire("../../controllers/shop.controller") ||
  safeRequire("../../controllers/shopController") ||
  {};

const userController =
  safeRequire("../../controllers/user/userController") ||
  safeRequire("../../controllers/user/user.controller") ||
  safeRequire("../../controllers/user.controller") ||
  safeRequire("../../controllers/userController") ||
  {};

const notificationController =
  safeRequire("../../controllers/notification/notificationController") ||
  safeRequire("../../controllers/notification/notification.controller") ||
  safeRequire("../../controllers/notification.controller") ||
  safeRequire("../../controllers/notificationController") ||
  {};

/* =====================================================
🔥 SERVICES
===================================================== */
const cacheService =
  safeRequire("../../services/cache/cacheService") ||
  safeRequire("../../services/cache/cache.service") ||
  safeRequire("../../services/cache.service") ||
  safeRequire("../../services/cacheService") ||
  safeRequire("../../utils/cache") ||
  {};

const queueService =
  safeRequire("../../services/queue/queueService") ||
  safeRequire("../../services/queue/queue.service") ||
  safeRequire("../../services/queue.service") ||
  safeRequire("../../services/queueService") ||
  safeRequire("../../utils/queue") ||
  {};

const db =
  safeRequire("../../config/database") ||
  safeRequire("../../db") ||
  {};

/* =====================================================
🔥 RESPONSE
===================================================== */
function ok(res, data = {}, message = "OK") {
  if (res.headersSent) {
    return null;
  }

  return res.json({
    ok: true,
    success: true,
    message,
    ...data,
  });
}

function fail(res, status = 500, message = "ADMIN_ROUTE_ERROR", extra = {}) {
  if (res.headersSent) {
    return null;
  }

  return res.status(status).json({
    ok: false,
    success: false,
    message,
    error: message,
    ...extra,
  });
}

/* =====================================================
🔥 SAFE ASYNC
===================================================== */
function safeAsync(fn) {
  return (req, res, next) => {
    try {
      return Promise.resolve(fn(req, res, next)).catch((err) => {
        console.error("[admin.routes] error:", err);
        return fail(res, err.status || 500, err.message || "SERVER_ERROR");
      });
    } catch (err) {
      console.error("[admin.routes] error:", err);
      return fail(res, err.status || 500, err.message || "SERVER_ERROR");
    }
  };
}

function safeHandler(handler) {
  if (Array.isArray(handler)) {
    const handlers = handler.flat(Infinity).filter((fn) => typeof fn === "function");

    if (handlers.length === 0) {
      return (req, res) => fail(res, 501, "NOT_IMPLEMENTED");
    }

    return handlers.map((fn) => safeAsync(fn));
  }

  return typeof handler === "function"
    ? safeAsync(handler)
    : (req, res) => fail(res, 501, "NOT_IMPLEMENTED");
}

/* =====================================================
🔥 AUTH HELPERS
===================================================== */
function passMiddleware(req, res, next) {
  return next();
}

function asMiddleware(value, fallback = passMiddleware) {
  if (typeof value !== "function") {
    return fallback;
  }

  if (value.length >= 3) {
    return value;
  }

  return (req, res, next) => {
    try {
      const result = value(req, res);

      if (result === false) {
        return fail(res, 403, "ADMIN_ONLY");
      }

      return next();
    } catch (err) {
      return fail(res, 403, err.message || "ADMIN_ONLY");
    }
  };
}

function getMiddleware(value, fallback = passMiddleware) {
  if (typeof value === "function") {
    return asMiddleware(value, fallback);
  }

  if (!value || typeof value !== "object") {
    return fallback || passMiddleware;
  }

  return asMiddleware(
    value.admin ||
      value.requireAdmin ||
      value.adminOnly ||
      value.verifyAdmin ||
      value.verifyToken ||
      value.authenticateToken ||
      value.authMiddleware ||
      value.protect ||
      value.isAdmin,
    fallback || passMiddleware
  );
}

const loginAuth = getMiddleware(auth);
const adminAuth = getMiddleware(adminGuard, getMiddleware(admin));

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const RATE_MAP = new Map();

function rateLimit(req, res, next) {
  const key = req.user?.id || req.user?._id || req.ip || "admin";
  const currentTime = Date.now();
  const arr = RATE_MAP.get(key) || [];
  const filtered = arr.filter((t) => currentTime - t < 1000);

  filtered.push(currentTime);
  RATE_MAP.set(key, filtered);

  if (filtered.length > 100) {
    return fail(res, 429, "TOO_MANY_ADMIN_REQUESTS");
  }

  return next();
}

/* =====================================================
🔥 GLOBAL GUARD
===================================================== */
router.use(loginAuth);
router.use(adminAuth);
router.use(rateLimit);

/* =====================================================
🔥 ROOT / HEALTH / DEBUG
===================================================== */
router.get("/", (req, res) => {
  return ok(
    res,
    {
      admin: true,
      user: req.user || null,
      time: new Date(),
    },
    "ADMIN_READY"
  );
});

router.get(
  "/health",
  safeAsync(async (req, res) => {
    return ok(
      res,
      {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        db:
          (typeof db.getDBHealth === "function" && db.getDBHealth()) ||
          (typeof db.health === "function" && db.health()) ||
          {},
        cache:
          (typeof cacheService.getHealth === "function" && cacheService.getHealth()) ||
          (typeof cacheService.health === "function" && cacheService.health()) ||
          {},
        queue:
          (typeof queueService.getAllStats === "function" && queueService.getAllStats()) ||
          (typeof queueService.getHealth === "function" && queueService.getHealth()) ||
          {},
      },
      "ADMIN_HEALTH"
    );
  })
);

router.get("/debug", (req, res) => {
  return ok(
    res,
    {
      rateMapSize: RATE_MAP.size,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      user: req.user || null,
    },
    "ADMIN_DEBUG"
  );
});

/* =====================================================
🔥 DASHBOARD / STATS
===================================================== */
router.get(
  "/dashboard",
  safeHandler(adminController.getFull || adminController.dashboard)
);

router.get(
  "/stats/live",
  safeHandler(adminController.getLiveStats)
);

router.get(
  "/stats/revenue",
  safeHandler(adminController.getRevenue || adminController.getRevenueDetail)
);

router.get(
  "/stats/system",
  safeHandler(adminController.getSystemStatus)
);

/* =====================================================
🔥 USERS
===================================================== */
router.get(
  "/users",
  safeHandler(adminController.getUsers || userController.adminList)
);

router.get(
  "/users/search",
  safeHandler(adminController.searchUsers || userController.adminSearch)
);

router.get(
  "/users/:id",
  safeHandler(adminController.getUserDetail || userController.adminDetail)
);

router.post(
  "/users/:id/role",
  safeHandler(adminController.toggleUserRole || userController.changeRole)
);

router.post(
  "/users/:id/point",
  safeHandler(adminController.adjustUserPoint)
);

router.delete(
  "/users/:id/safe",
  safeHandler(adminController.safeDeleteUser || userController.adminDelete)
);

/* =====================================================
🔥 SHOPS
===================================================== */
router.get(
  "/shops",
  safeHandler(adminController.getShops || shopController.adminList || shopController.publicList || shopController.list)
);

router.get(
  "/shops/search",
  safeHandler(adminController.searchShops || shopController.adminSearch || shopController.search || shopController.publicList)
);

router.get(
  "/shops/:id",
  safeHandler(shopController.adminDetail || shopController.detail || shopController.publicDetail || shopController.getOne)
);

router.delete(
  "/shops/:id/safe",
  safeHandler(adminController.safeDeleteShop || shopController.adminDelete || shopController.remove)
);

/* =====================================================
🔥 RESERVATIONS
===================================================== */
router.get(
  "/reservations",
  safeHandler(adminController.getReservations || reservationController.adminList || reservationController.list)
);

router.get(
  "/reservations/filter",
  safeHandler(adminController.filterReservations || reservationController.adminList || reservationController.list)
);

router.get(
  "/reservations/:id",
  safeHandler(adminController.getReservationDetail || reservationController.detail || reservationController.getOne)
);

router.post(
  "/reservations/:id/status",
  safeHandler(adminController.updateReservationStatus || reservationController.updateStatus)
);

router.post(
  "/reservations/:id/force-status",
  safeHandler(adminController.forceReservationStatus || reservationController.updateStatus)
);

/* =====================================================
🔥 PAYMENTS
===================================================== */
router.get(
  "/payments",
  safeHandler(paymentController.adminList || paymentController.listPayments || paymentController.list)
);

router.get(
  "/payments/logs",
  safeHandler(paymentController.getLogs)
);

router.get(
  "/payments/metrics",
  safeHandler(paymentController.getMetrics)
);

router.post(
  "/payments/:id/refund",
  safeHandler(paymentController.refundPayment)
);

router.post(
  "/payments/clear-expired",
  safeHandler(paymentController.clearExpired)
);

/* =====================================================
🔥 NOTIFICATIONS
===================================================== */
router.get(
  "/notifications",
  safeHandler(notificationController.adminList || notificationController.list)
);

router.post(
  "/notifications/broadcast",
  safeHandler(notificationController.broadcast || notificationController.sendBroadcast)
);

/* =====================================================
🔥 LOGS / EXPORT
===================================================== */
router.get(
  "/logs",
  safeHandler(adminController.getLogs)
);

router.get(
  "/logs/search",
  safeHandler(adminController.searchLogs)
);

router.get(
  "/export/users",
  safeHandler(adminController.exportUsers)
);

/* =====================================================
🔥 CACHE / QUEUE / DB / SYSTEM
===================================================== */
router.post(
  "/cache-clear",
  safeHandler(
    adminController.clearCache ||
      ((req, res) => {
        if (typeof cacheService.clear === "function") {
          cacheService.clear();
        }

        if (typeof cacheService.resetAll === "function") {
          cacheService.resetAll();
        }

        return ok(res, { reset: true }, "CACHE_CLEAR");
      })
  )
);

router.get("/cache/status", (req, res) => {
  return ok(
    res,
    {
      cache:
        (typeof cacheService.getHealth === "function" && cacheService.getHealth()) ||
        (typeof cacheService.health === "function" && cacheService.health()) ||
        {},
    },
    "CACHE_STATUS"
  );
});

router.post("/system/cache-reset", (req, res) => {
  if (typeof cacheService.clear === "function") {
    cacheService.clear();
  }

  if (typeof cacheService.reset === "function") {
    cacheService.reset();
  }

  if (typeof cacheService.resetAll === "function") {
    cacheService.resetAll();
  }

  if (typeof cacheService.flush === "function") {
    cacheService.flush();
  }

  return ok(res, { reset: true }, "CACHE_RESET");
});

router.get("/queue/status", (req, res) => {
  return ok(
    res,
    {
      queue:
        (typeof queueService.getAllStats === "function" && queueService.getAllStats()) ||
        (typeof queueService.getHealth === "function" && queueService.getHealth()) ||
        {},
    },
    "QUEUE_STATUS"
  );
});

router.get("/db/status", (req, res) => {
  return ok(
    res,
    {
      db:
        (typeof db.getDBHealth === "function" && db.getDBHealth()) ||
        (typeof db.health === "function" && db.health()) ||
        {},
    },
    "DB_STATUS"
  );
});

router.get("/system/metrics", (req, res) => {
  return ok(
    res,
    {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      pid: process.pid,
      node: process.version,
      platform: process.platform,
      rateMapSize: RATE_MAP.size,
    },
    "SYSTEM_METRICS"
  );
});

router.get("/system/time", (req, res) => {
  return ok(
    res,
    {
      now: Date.now(),
      iso: new Date().toISOString(),
    },
    "SYSTEM_TIME"
  );
});

/* =====================================================
🔥 MODULE ADMIN ROUTES LINK
===================================================== */
function normalizeSubRouter(candidate) {
  if (!candidate) {
    return null;
  }

  if (typeof candidate === "function") {
    return candidate;
  }

  if (candidate && typeof candidate === "object") {
    const nested =
      candidate.router ||
      candidate.default ||
      candidate.routes ||
      candidate.route ||
      candidate.adminRoutes;

    if (typeof nested === "function") {
      return nested;
    }
  }

  return null;
}

function mountAdminSubRouter(mountPath, candidate, label) {
  const subRouter = normalizeSubRouter(candidate);

  if (subRouter) {
    router.use(mountPath, subRouter);
    return true;
  }

  if (candidate) {
    console.warn("[admin.routes] skip invalid admin sub router:", label);
  }

  return false;
}

mountAdminSubRouter(
  "/module/shops",
  shopController && shopController.adminRoutes,
  "shopController.adminRoutes"
);

mountAdminSubRouter(
  "/module/reservations",
  reservationController && reservationController.adminRoutes,
  "reservationController.adminRoutes"
);

mountAdminSubRouter(
  "/module/payments",
  paymentController && paymentController.adminRoutes,
  "paymentController.adminRoutes"
);

mountAdminSubRouter(
  "/module/notifications",
  notificationController && notificationController.adminRoutes,
  "notificationController.adminRoutes"
);

/* =====================================================
🔥 FALLBACK
===================================================== */
router.use((req, res) => {
  return fail(res, 404, "ADMIN_ROUTE_NOT_FOUND", {
    path: req.originalUrl,
  });
});

/* =====================================================
🔥 CLEANUP
===================================================== */
if (!global.__ADMIN_ROUTES_RATE_CLEANER__) {
  global.__ADMIN_ROUTES_RATE_CLEANER__ = setInterval(() => {
    try {
      if (RATE_MAP.size > 5000) {
        RATE_MAP.clear();
      }
    } catch (_) {}
  }, 30000);

  if (
    global.__ADMIN_ROUTES_RATE_CLEANER__ &&
    typeof global.__ADMIN_ROUTES_RATE_CLEANER__.unref === "function"
  ) {
    global.__ADMIN_ROUTES_RATE_CLEANER__.unref();
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
console.log("🔥 admin.routes FINAL READY");

module.exports = router;
