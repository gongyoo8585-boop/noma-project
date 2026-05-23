"use strict";

/* =====================================================
🔥 ADMIN ROUTES (FINAL MASTER)
관리자 라우트 / 대시보드 / 유저 / 매장 / 예약 / 결제 / 시스템
===================================================== */

const express = require("express");
const router = express.Router();

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try {
    return require(path);
  } catch (err) {
    console.warn("[admin.routes] require fail:", path);
    return null;
  }
}

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
const auth = safeRequire("../../middlewares/auth");
const admin = safeRequire("../../middlewares/admin");
const adminGuard = safeRequire("../../middlewares/adminGuard");

/* =====================================================
🔥 CONTROLLERS
===================================================== */
const adminController =
  safeRequire("../../controllers/admin/adminController") ||
  safeRequire("../../controllers/adminController") ||
  {};

const paymentController =
  safeRequire("../../controllers/payment/paymentController") ||
  safeRequire("../../controllers/payment.controller") ||
  {};

const reservationController =
  safeRequire("../../controllers/reservation/reservationController") ||
  safeRequire("../../controllers/reservationController") ||
  {};

const shopController =
  safeRequire("../../controllers/shop/shopController") ||
  safeRequire("../../controllers/shopController") ||
  {};

const userController =
  safeRequire("../../controllers/user/userController") ||
  safeRequire("../../controllers/userController") ||
  {};

const notificationController =
  safeRequire("../../controllers/notification/notificationController") ||
  safeRequire("../../controllers/notificationController") ||
  {};

/* =====================================================
🔥 SERVICES
===================================================== */
const cacheService =
  safeRequire("../../services/cache.service") ||
  safeRequire("../../services/cacheService") ||
  safeRequire("../../utils/cache");

const queueService =
  safeRequire("../../services/queue.service") ||
  safeRequire("../../utils/queue");

const db =
  safeRequire("../../config/database") ||
  safeRequire("../../db");

/* =====================================================
🔥 RESPONSE
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({
    ok: true,
    message,
    ...data,
  });
}

function fail(res, status = 500, message = "ADMIN_ROUTE_ERROR", extra = {}) {
  return res.status(status).json({
    ok: false,
    message,
    ...extra,
  });
}

/* =====================================================
🔥 SAFE ASYNC
===================================================== */
function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error("[admin.routes] error:", err);
      return fail(res, err.status || 500, err.message || "SERVER_ERROR");
    });
  };
}

function safeHandler(handler) {
  if (Array.isArray(handler)) {
    const last = handler[handler.length - 1];
    return [...handler.slice(0, -1), safeAsync(last)];
  }

  return typeof handler === "function"
    ? safeAsync(handler)
    : (req, res) => fail(res, 501, "NOT_IMPLEMENTED");
}

/* =====================================================
🔥 AUTH HELPERS
===================================================== */
const adminAuth =
  adminGuard?.admin ||
  adminGuard ||
  admin ||
  auth ||
  ((req, res, next) => next());

const loginAuth =
  auth ||
  ((req, res, next) => next());

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const RATE_MAP = new Map();

function rateLimit(req, res, next) {
  const key = req.user?.id || req.user?._id || req.ip || "admin";
  const now = Date.now();
  const arr = RATE_MAP.get(key) || [];
  const filtered = arr.filter((t) => now - t < 1000);

  filtered.push(now);
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
  return ok(res, {
    admin: true,
    user: req.user || null,
    time: new Date(),
  }, "ADMIN_READY");
});

router.get("/health", safeAsync(async (req, res) => {
  return ok(res, {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    db: db?.getDBHealth?.() || db?.health?.() || {},
    cache: cacheService?.getHealth?.() || cacheService?.health?.() || {},
    queue: queueService?.getAllStats?.() || queueService?.getHealth?.() || {},
  }, "ADMIN_HEALTH");
}));

router.get("/debug", (req, res) => {
  return ok(res, {
    rateMapSize: RATE_MAP.size,
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    user: req.user || null,
  }, "ADMIN_DEBUG");
});

/* =====================================================
🔥 DASHBOARD / STATS
===================================================== */
router.get("/dashboard", safeHandler(adminController.getFull || adminController.dashboard));
router.get("/stats/live", safeHandler(adminController.getLiveStats));
router.get("/stats/revenue", safeHandler(adminController.getRevenue || adminController.getRevenueDetail));
router.get("/stats/system", safeHandler(adminController.getSystemStatus));

/* =====================================================
🔥 USERS
===================================================== */
router.get("/users", safeHandler(adminController.getUsers || userController.adminList));
router.get("/users/search", safeHandler(adminController.searchUsers || userController.adminSearch));
router.get("/users/:id", safeHandler(adminController.getUserDetail || userController.adminDetail));
router.post("/users/:id/role", safeHandler(adminController.toggleUserRole || userController.changeRole));
router.post("/users/:id/point", safeHandler(adminController.adjustUserPoint));
router.delete("/users/:id/safe", safeHandler(adminController.safeDeleteUser || userController.adminDelete));

/* =====================================================
🔥 SHOPS
===================================================== */
router.get("/shops", safeHandler(adminController.getShops || shopController.adminList));
router.get("/shops/search", safeHandler(adminController.searchShops || shopController.adminSearch));
router.get("/shops/:id", safeHandler(shopController.adminDetail || shopController.detail));
router.delete("/shops/:id/safe", safeHandler(adminController.safeDeleteShop || shopController.adminDelete));

/* =====================================================
🔥 RESERVATIONS
===================================================== */
router.get("/reservations", safeHandler(adminController.getReservations || reservationController.adminList));
router.get("/reservations/filter", safeHandler(adminController.filterReservations));
router.get("/reservations/:id", safeHandler(adminController.getReservationDetail || reservationController.detail));
router.post("/reservations/:id/status", safeHandler(adminController.updateReservationStatus));
router.post("/reservations/:id/force-status", safeHandler(adminController.forceReservationStatus));

/* =====================================================
🔥 PAYMENTS
===================================================== */
router.get("/payments", safeHandler(paymentController.adminList || paymentController.listPayments));
router.get("/payments/logs", safeHandler(paymentController.getLogs));
router.get("/payments/metrics", safeHandler(paymentController.getMetrics));
router.post("/payments/:id/refund", safeHandler(paymentController.refundPayment));
router.post("/payments/clear-expired", safeHandler(paymentController.clearExpired));

/* =====================================================
🔥 NOTIFICATIONS
===================================================== */
router.get("/notifications", safeHandler(notificationController.adminList || notificationController.list));
router.post("/notifications/broadcast", safeHandler(notificationController.broadcast || notificationController.sendBroadcast));

/* =====================================================
🔥 LOGS / EXPORT
===================================================== */
router.get("/logs", safeHandler(adminController.getLogs));
router.get("/logs/search", safeHandler(adminController.searchLogs));
router.get("/export/users", safeHandler(adminController.exportUsers));

/* =====================================================
🔥 CACHE / QUEUE / DB / SYSTEM
===================================================== */
router.post("/cache-clear", safeHandler(adminController.clearCache));

router.get("/cache/status", (req, res) => {
  return ok(res, {
    cache: cacheService?.getHealth?.() || cacheService?.health?.() || {},
  }, "CACHE_STATUS");
});

router.post("/system/cache-reset", (req, res) => {
  cacheService?.clear?.();
  cacheService?.reset?.();
  cacheService?.flush?.();

  return ok(res, { reset: true }, "CACHE_RESET");
});

router.get("/queue/status", (req, res) => {
  return ok(res, {
    queue: queueService?.getAllStats?.() || queueService?.getHealth?.() || {},
  }, "QUEUE_STATUS");
});

router.get("/db/status", (req, res) => {
  return ok(res, {
    db: db?.getDBHealth?.() || db?.health?.() || {},
  }, "DB_STATUS");
});

router.get("/system/metrics", (req, res) => {
  return ok(res, {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    uptime: process.uptime(),
    pid: process.pid,
    node: process.version,
    platform: process.platform,
    rateMapSize: RATE_MAP.size,
  }, "SYSTEM_METRICS");
});

router.get("/system/time", (req, res) => {
  return ok(res, {
    now: Date.now(),
    iso: new Date().toISOString(),
  }, "SYSTEM_TIME");
});

/* =====================================================
🔥 MODULE ADMIN ROUTES LINK
===================================================== */
if (shopController?.adminRoutes) {
  router.use("/module/shops", shopController.adminRoutes);
}

if (reservationController?.adminRoutes) {
  router.use("/module/reservations", reservationController.adminRoutes);
}

if (paymentController?.adminRoutes) {
  router.use("/module/payments", paymentController.adminRoutes);
}

if (notificationController?.adminRoutes) {
  router.use("/module/notifications", notificationController.adminRoutes);
}

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
  global.__ADMIN_ROUTES_RATE_CLEANER__ = true;

  setInterval(() => {
    try {
      if (RATE_MAP.size > 5000) {
        RATE_MAP.clear();
      }
    } catch (_) {}
  }, 30000);
}

/* =====================================================
🔥 EXPORT
===================================================== */
console.log("🔥 admin.routes FINAL READY");

module.exports = router;