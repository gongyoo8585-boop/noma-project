"use strict";

/* =====================================================
🔥 ADMIN ROUTES (FINAL ULTRA COMPLETE MASTER)
👉 통합 관리자 API
👉 shop / reservation / payment / notification / system
👉 admin 보호 + rate limit + safe handler
👉 통째로 교체 가능한 완성형
===================================================== */

const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth");
const admin = require("../middlewares/admin");

/* controllers */
const shopController = (() => {
  try {
    return require("../controllers/shop.controller");
  } catch (_) {
    return {};
  }
})();

const reservationController = (() => {
  try {
    return require("../controllers/reservation.controller");
  } catch (_) {
    return {};
  }
})();

const paymentController = (() => {
  try {
    return require("../controllers/payment.controller");
  } catch (_) {
    return {};
  }
})();

const notificationController = (() => {
  try {
    return require("../controllers/notification.controller");
  } catch (_) {
    return {};
  }
})();

/* services / utils */
const cacheService = (() => {
  try {
    return require("../services/cache.service");
  } catch (_) {
    try {
      return require("../utils/cache");
    } catch (__) {
      return null;
    }
  }
})();

const queue = (() => {
  try {
    return require("../utils/queue");
  } catch (_) {
    return null;
  }
})();

const db = (() => {
  try {
    return require("../config/database");
  } catch (_) {
    return null;
  }
})();

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({ ok: true, message, ...data });
}

function fail(res, status = 500, message = "SERVER ERROR", extra = {}) {
  return res.status(status).json({ ok: false, message, ...extra });
}

function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("ADMIN ROUTE ERROR:", e);
      return fail(res, 500, e.message || "SERVER ERROR");
    });
  };
}

function safeHandler(handler) {
  return typeof handler === "function"
    ? safeAsync(handler)
    : (req, res) => fail(res, 501, "NOT IMPLEMENTED");
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function parseIds(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const RATE_MAP = new Map();

function rateLimit(req, res, next) {
  const key = req.user?.id || req.ip || "admin";
  const now = Date.now();
  const arr = RATE_MAP.get(key) || [];
  const filtered = arr.filter((t) => now - t < 1000);
  filtered.push(now);
  RATE_MAP.set(key, filtered);

  if (filtered.length > 100) {
    return fail(res, 429, "Too many admin requests");
  }

  next();
}

/* =====================================================
🔥 GLOBAL ADMIN GUARD
===================================================== */
router.use(auth);
router.use(admin);
router.use(rateLimit);

/* =====================================================
🔥 ROOT / HEALTH / DEBUG
===================================================== */
router.get("/", (req, res) => {
  return ok(res, {
    admin: true,
    user: {
      id: req.user?.id || "",
      role: req.user?.role || ""
    },
    time: Date.now()
  }, "ADMIN ROOT READY");
});

router.get("/health", safeAsync(async (req, res) => {
  const dbHealth =
    db && typeof db.getDBHealth === "function"
      ? db.getDBHealth()
      : { ok: true };

  const cacheHealth =
    cacheService && typeof cacheService.getHealth === "function"
      ? cacheService.getHealth()
      : { ok: true };

  const queueHealth =
    queue && typeof queue.getAllStats === "function"
      ? queue.getAllStats()
      : { ok: true };

  return ok(res, {
    db: dbHealth,
    cache: cacheHealth,
    queue: queueHealth,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  }, "ADMIN HEALTH");
}));

router.get("/debug", safeAsync(async (req, res) => {
  return ok(res, {
    now: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    rateMapSize: RATE_MAP.size
  }, "ADMIN DEBUG");
}));

/* =====================================================
🔥 SHOP ADMIN
===================================================== */
router.get("/shops", safeHandler(shopController.getShops));
router.get("/shops/deleted", safeHandler(shopController.getDeleted));
router.get("/shops/moderation", safeHandler(shopController.getNeedModeration));
router.get("/shops/metrics", safeHandler(shopController.stats));
router.get("/shops/top-regions", safeHandler(shopController.topRegions));
router.get("/shops/tag-stats", safeHandler(shopController.tagStats));
router.get("/shops/db-health", safeHandler(shopController.dbHealth));

router.post("/shops/refresh-score-all", safeHandler(shopController.refreshScoreAll));
router.post("/shops/bulk-hide", safeHandler(shopController.bulkHide));
router.post("/shops/bulk-show", safeHandler(shopController.bulkShow));
router.post("/shops/bulk-delete", safeHandler(shopController.bulkDelete));
router.post("/shops/bulk-restore", safeHandler(shopController.bulkRestore));
router.post("/shops/bulk-recalculate", safeHandler(shopController.bulkRecalculate));

router.post("/shops/:id/owner-memo", safeHandler(shopController.setOwnerMemo));
router.post("/shops/:id/admin-memo", safeHandler(shopController.setAdminMemo));
router.post("/shops/:id/business-status", safeHandler(shopController.setBusinessStatus));
router.post("/shops/:id/priority", safeHandler(shopController.setPriority));
router.post("/shops/:id/priority-boost", safeHandler(shopController.setPriorityBoost));
router.post("/shops/:id/ad-score", safeHandler(shopController.setAdScore));
router.post("/shops/:id/toggle-visible", safeHandler(shopController.toggleVisible));
router.post("/shops/:id/toggle-premium", safeHandler(shopController.togglePremium));
router.post("/shops/:id/toggle-best-badge", safeHandler(shopController.toggleBestBadge));
router.post("/shops/:id/toggle-approved", safeHandler(shopController.toggleApproved));
router.post("/shops/:id/generate-seo", safeHandler(shopController.generateSeo));
router.post("/shops/:id/rebuild-searchable-text", safeHandler(shopController.rebuildSearchableText));
router.post("/shops/:id/clean-tags", safeHandler(shopController.cleanTags));
router.post("/shops/:id/clean-keywords", safeHandler(shopController.cleanKeywords));
router.post("/shops/:id/sanitize", safeHandler(shopController.sanitizeAll));
router.post("/shops/:id/recalculate", safeHandler(shopController.recalculate));
router.post("/shops/:id/hot", safeHandler(shopController.updateHotFlag));
router.post("/shops/:id/reservable", safeHandler(shopController.updateReservable));
router.post("/shops/:id/report/resolve", safeHandler(shopController.resolveReport));

/* =====================================================
🔥 RESERVATION ADMIN
===================================================== */
router.get("/reservations", safeHandler(reservationController.adminList || reservationController.getAll));
router.get("/reservations/logs", safeHandler(reservationController.logs || reservationController.adminLog));
router.get("/reservations/stats", safeHandler(reservationController.stats));
router.get("/reservations/today", safeHandler(reservationController.todayList));
router.get("/reservations/upcoming", safeHandler(reservationController.upcomingList));
router.get("/reservations/completed", safeHandler(reservationController.completedList));
router.get("/reservations/expired", safeHandler(reservationController.expiredList));
router.get("/reservations/by-user/:userId", safeHandler(reservationController.byUser));
router.get("/reservations/by-place/:placeId", safeHandler(reservationController.byPlace));

router.post("/reservations/expire-run", safeHandler(reservationController.expireRun));
router.post("/reservations/bulk-cancel", safeHandler(reservationController.bulkCancel));
router.post("/reservations/bulk-approve", safeHandler(reservationController.bulkApprove));
router.post("/reservations/bulk-complete", safeHandler(reservationController.bulkComplete));
router.post("/reservations/:id/approve", safeHandler(reservationController.approve));
router.post("/reservations/:id/reject", safeHandler(reservationController.reject));
router.post("/reservations/:id/check-in", safeHandler(reservationController.checkIn));
router.post("/reservations/:id/check-out", safeHandler(reservationController.checkOut));
router.post("/reservations/:id/complete", safeHandler(reservationController.complete));
router.post("/reservations/:id/no-show", safeHandler(reservationController.noShow));
router.post("/reservations/:id/force-cancel", safeHandler(reservationController.forceCancel));
router.post("/reservations/:id/force-complete", safeHandler(reservationController.forceComplete));
router.post("/reservations/:id/admin-memo", safeHandler(reservationController.adminMemo));

/* =====================================================
🔥 PAYMENT ADMIN
===================================================== */
router.get("/payments", safeHandler(paymentController.getAll || paymentController.adminList));
router.get("/payments/stats", safeHandler(paymentController.stats));
router.get("/payments/revenue", safeHandler(paymentController.revenue));
router.get("/payments/refunds", safeHandler(paymentController.refundedList || paymentController.refunds));
router.get("/payments/failed", safeHandler(paymentController.failedList || paymentController.failed));
router.get("/payments/recent", safeHandler(paymentController.recent));
router.get("/payments/by-user/:userId", safeHandler(paymentController.byUser));
router.get("/payments/by-order/:orderId", safeHandler(paymentController.byOrderId));
router.get("/payments/by-reservation/:reservationId", safeHandler(paymentController.byReservation));

router.post("/payments/:id/approve", safeHandler(paymentController.approve));
router.post("/payments/:id/fail", safeHandler(paymentController.fail));
router.post("/payments/:id/cancel", safeHandler(paymentController.cancel));
router.post("/payments/:id/refund", safeHandler(paymentController.refund));
router.post("/payments/:id/verify", safeHandler(paymentController.verify));
router.post("/payments/:id/soft-delete", safeHandler(paymentController.softDelete));

/* =====================================================
🔥 NOTIFICATION ADMIN
===================================================== */
router.get("/notifications/health", safeHandler(notificationController.health));
router.get("/notifications/logs", safeHandler(notificationController.logs));
router.get("/notifications/metrics", safeHandler(notificationController.metrics));
router.get("/notifications/templates", safeHandler(notificationController.templates));
router.get("/notifications/debug", safeHandler(notificationController.debug));

router.post("/notifications/alert", safeHandler(notificationController.adminAlert));
router.post("/notifications/system-alert", safeHandler(notificationController.systemAlert));
router.post("/notifications/send", safeHandler(notificationController.send));
router.post("/notifications/send-multi", safeHandler(notificationController.sendMulti));
router.post("/notifications/send-bulk", safeHandler(notificationController.sendBulk));
router.post("/notifications/templates", safeHandler(notificationController.addTemplate));
router.post("/notifications/metrics/reset", safeHandler(notificationController.resetMetrics));
router.delete("/notifications/logs", safeHandler(notificationController.clearLogs));

/* =====================================================
🔥 CACHE ADMIN
===================================================== */
router.get("/cache", safeAsync(async (req, res) => {
  if (!cacheService || typeof cacheService.getStats !== "function") {
    return fail(res, 501, "CACHE SERVICE NOT AVAILABLE");
  }

  return ok(res, {
    stats: cacheService.getStats(),
    health: typeof cacheService.getHealth === "function"
      ? cacheService.getHealth()
      : null
  }, "CACHE STATUS");
}));

router.post("/cache/clear", safeAsync(async (req, res) => {
  if (!cacheService || typeof cacheService.clear !== "function") {
    return fail(res, 501, "CACHE SERVICE NOT AVAILABLE");
  }

  const cleared = cacheService.clear();
  return ok(res, { cleared }, "CACHE CLEARED");
}));

router.post("/cache/delete-pattern", safeAsync(async (req, res) => {
  if (!cacheService || typeof cacheService.delByPattern !== "function") {
    return fail(res, 501, "CACHE SERVICE NOT AVAILABLE");
  }

  const pattern = String(req.body.pattern || "*");
  const deleted = cacheService.delByPattern(pattern);
  return ok(res, { pattern, deleted }, "CACHE PATTERN CLEARED");
}));

router.get("/cache/keys", safeAsync(async (req, res) => {
  if (!cacheService || typeof cacheService.keys !== "function") {
    return fail(res, 501, "CACHE SERVICE NOT AVAILABLE");
  }

  const pattern = String(req.query.pattern || "*");
  const keys = cacheService.keys(pattern);
  return ok(res, { keys, count: keys.length }, "CACHE KEYS");
}));

/* =====================================================
🔥 QUEUE ADMIN
===================================================== */
router.get("/queues", safeAsync(async (req, res) => {
  if (!queue || typeof queue.getAllStats !== "function") {
    return fail(res, 501, "QUEUE SERVICE NOT AVAILABLE");
  }

  return ok(res, queue.getAllStats(), "QUEUE STATS");
}));

router.get("/queues/:name", safeAsync(async (req, res) => {
  if (!queue || typeof queue.getQueueStats !== "function") {
    return fail(res, 501, "QUEUE SERVICE NOT AVAILABLE");
  }

  const data = queue.getQueueStats(req.params.name);
  if (!data) return fail(res, 404, "QUEUE NOT FOUND");

  return ok(res, { queue: data }, "QUEUE STATUS");
}));

router.post("/queues/:name/clear", safeAsync(async (req, res) => {
  if (!queue || typeof queue.clearQueue !== "function") {
    return fail(res, 501, "QUEUE SERVICE NOT AVAILABLE");
  }

  queue.clearQueue(req.params.name);
  return ok(res, { queue: req.params.name }, "QUEUE CLEARED");
}));

router.post("/queues/:name/pause", safeAsync(async (req, res) => {
  if (!queue || typeof queue.pauseQueue !== "function") {
    return fail(res, 501, "QUEUE SERVICE NOT AVAILABLE");
  }

  queue.pauseQueue(req.params.name);
  return ok(res, { queue: req.params.name }, "QUEUE PAUSED");
}));

router.post("/queues/:name/resume", safeAsync(async (req, res) => {
  if (!queue || typeof queue.resumeQueue !== "function") {
    return fail(res, 501, "QUEUE SERVICE NOT AVAILABLE");
  }

  const concurrency = safeNum(req.body.concurrency, 2);
  queue.resumeQueue(req.params.name, concurrency);
  return ok(res, { queue: req.params.name, concurrency }, "QUEUE RESUMED");
}));

/* =====================================================
🔥 BULK SYSTEM ACTIONS
===================================================== */
router.post("/system/reload-cache", safeAsync(async (req, res) => {
  if (!queue || typeof queue.addJob !== "function") {
    return fail(res, 501, "QUEUE SERVICE NOT AVAILABLE");
  }

  queue.addJob("cache", { action: "warm_all" }, { priority: 10 });
  return ok(res, { queued: true }, "CACHE WARM QUEUED");
}));

router.post("/system/recalc-ranking", safeAsync(async (req, res) => {
  if (!queue || typeof queue.addJob !== "function") {
    return fail(res, 501, "QUEUE SERVICE NOT AVAILABLE");
  }

  queue.addJob("ranking", { action: "recalc_all" }, { priority: 10 });
  return ok(res, { queued: true }, "RANKING RECALC QUEUED");
}));

router.post("/system/test-notification", safeHandler(notificationController.test));

/* =====================================================
🔥 404
===================================================== */
router.use((req, res) => {
  return fail(res, 404, "ADMIN ROUTE NOT FOUND", {
    path: req.originalUrl
  });
});

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
if (!global.__ADMIN_ROUTE_CLEAN__) {
  global.__ADMIN_ROUTE_CLEAN__ = true;

  setInterval(() => {
    try {
      if (RATE_MAP.size > 5000) RATE_MAP.clear();
    } catch (_) {}
  }, 30000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 ADMIN ROUTES READY");

module.exports = router;