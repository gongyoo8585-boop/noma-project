"use strict";

/* =====================================================
🔥 NOTIFICATION ROUTES (FINAL ULTRA COMPLETE MASTER)
👉 알림 API 라우팅
👉 admin 보호 + rate limit + safe handler
===================================================== */

const express = require("express");
const router = express.Router();

const notificationController = require("../controllers/notification.controller");
const auth = require("../middlewares/auth");

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("NOTIFICATION ROUTE ERROR:", e);
      return res.status(500).json({
        ok: false,
        message: e.message || "SERVER ERROR"
      });
    });
  };
}

function safeHandler(handler) {
  return typeof handler === "function"
    ? safeAsync(handler)
    : (req, res) =>
        res.status(501).json({ ok: false, message: "NOT IMPLEMENTED" });
}

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const RATE_MAP = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || "x";
  const now = Date.now();
  const arr = RATE_MAP.get(ip) || [];

  const filtered = arr.filter((t) => now - t < 1000);
  filtered.push(now);

  RATE_MAP.set(ip, filtered);

  if (filtered.length > 50) {
    return res.status(429).json({
      ok: false,
      message: "Too many requests"
    });
  }

  next();
}

/* =====================================================
🔥 ADMIN GUARD
===================================================== */
const adminOnly =
  auth.adminOnly ||
  ((req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "로그인 필요" });
    }

    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return res.status(403).json({ ok: false, message: "관리자만 접근 가능" });
    }

    next();
  });

/* =====================================================
🔥 GLOBAL
===================================================== */
router.use(rateLimit);

/* =====================================================
🔥 PUBLIC (테스트용 최소)
===================================================== */

// health
router.get("/health", safeHandler(notificationController.health));

// test
router.get("/test", safeHandler(notificationController.test));

/* =====================================================
🔥 CORE SEND (USER)
===================================================== */

// 기본 발송
router.post("/send", auth.optional || ((req,res,next)=>next()), safeHandler(notificationController.send));

// multi
router.post("/send/multi", auth.optional || ((req,res,next)=>next()), safeHandler(notificationController.sendMulti));

// bulk
router.post("/send/bulk", auth.optional || ((req,res,next)=>next()), safeHandler(notificationController.sendBulk));

/* =====================================================
🔥 RESERVATION
===================================================== */

router.post("/reservation/created", safeHandler(notificationController.reservationCreated));
router.post("/reservation/cancelled", safeHandler(notificationController.reservationCancelled));
router.post("/reservation/reminder", safeHandler(notificationController.reservationReminder));

/* =====================================================
🔥 PAYMENT
===================================================== */

router.post("/payment/paid", safeHandler(notificationController.paymentPaid));
router.post("/payment/failed", safeHandler(notificationController.paymentFailed));
router.post("/payment/refunded", safeHandler(notificationController.paymentRefunded));

/* =====================================================
🔥 DIRECT CHANNEL (TEST)
===================================================== */

router.post("/sms", safeHandler(notificationController.sms));
router.post("/email", safeHandler(notificationController.email));
router.post("/push", safeHandler(notificationController.push));
router.post("/kakao", safeHandler(notificationController.kakao));

/* =====================================================
🔥 ADMIN ONLY
===================================================== */

// 관리자 알림
router.post("/admin/alert", auth, adminOnly, safeHandler(notificationController.adminAlert));

// 시스템 알림
router.post("/system/alert", auth, adminOnly, safeHandler(notificationController.systemAlert));

// 템플릿
router.get("/templates", auth, adminOnly, safeHandler(notificationController.templates));
router.post("/templates", auth, adminOnly, safeHandler(notificationController.addTemplate));

// 로그
router.get("/logs", auth, adminOnly, safeHandler(notificationController.logs));
router.delete("/logs", auth, adminOnly, safeHandler(notificationController.clearLogs));

// 메트릭
router.get("/metrics", auth, adminOnly, safeHandler(notificationController.metrics));
router.post("/metrics/reset", auth, adminOnly, safeHandler(notificationController.resetMetrics));

// 디버그
router.get("/debug", auth, adminOnly, safeHandler(notificationController.debug));

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
setInterval(() => {
  try {
    if (RATE_MAP.size > 5000) RATE_MAP.clear();
  } catch {}
}, 30000);

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 NOTIFICATION ROUTES READY");

module.exports = router;