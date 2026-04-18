"use strict";

/* =====================================================
🔥 PAYMENT ROUTES (FINAL ULTRA COMPLETE MASTER)
👉 /routes/payment.routes.js
👉 payment.controller.js 완전 연동
👉 auth / admin 보호 포함
👉 통째로 교체 가능한 완성형
===================================================== */

const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/payment.controller");
const auth = require("../middlewares/auth");

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("PAYMENT ROUTE ERROR:", e);
      return res.status(e.status || 500).json({
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
        res.status(501).json({
          ok: false,
          message: "NOT IMPLEMENTED"
        });
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function validateObjectIdParam(paramName) {
  return (req, res, next) => {
    const value = String(req.params?.[paramName] || "");
    if (!isValidId(value)) {
      return res.status(400).json({
        ok: false,
        message: `invalid ${paramName}`
      });
    }
    return next();
  };
}

function adminOnly(req, res, next) {
  if (typeof auth.adminOnly === "function") {
    return auth.adminOnly(req, res, next);
  }

  if (!req.user) {
    return res.status(401).json({ ok: false, message: "로그인 필요" });
  }

  if (!["admin", "superAdmin"].includes(req.user.role)) {
    return res.status(403).json({ ok: false, message: "관리자만 접근 가능" });
  }

  return next();
}

function optionalAuth(req, res, next) {
  if (typeof auth.optional === "function") {
    return auth.optional(req, res, next);
  }
  return next();
}

/* =====================================================
🔥 RATE LIMIT
===================================================== */
const PAYMENT_RATE_MAP = new Map();

function paymentRateLimit(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const now = Date.now();
  const arr = PAYMENT_RATE_MAP.get(ip) || [];

  const filtered = arr.filter((t) => now - t < 1000);
  filtered.push(now);
  PAYMENT_RATE_MAP.set(ip, filtered);

  if (filtered.length > 80) {
    return res.status(429).json({
      ok: false,
      message: "Too many requests"
    });
  }

  return next();
}

/* =====================================================
🔥 REQUEST LOG
===================================================== */
const PAYMENT_ROUTE_LOGS = [];

function appendRouteLog(type, payload = {}) {
  PAYMENT_ROUTE_LOGS.push({
    type,
    payload,
    time: Date.now()
  });

  if (PAYMENT_ROUTE_LOGS.length > 3000) {
    PAYMENT_ROUTE_LOGS.shift();
  }
}

/* =====================================================
🔥 GLOBAL MIDDLEWARE
===================================================== */
router.use(paymentRateLimit);

router.use((req, res, next) => {
  appendRouteLog("request", {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });
  return next();
});

/* =====================================================
🔥 PUBLIC / OPTIONAL
===================================================== */

/* health */
router.get("/health", (req, res) => {
  return res.json({
    ok: true,
    message: "PAYMENT ROUTES HEALTHY",
    time: Date.now()
  });
});

/* ping */
router.get("/ping", (req, res) => {
  return res.json({
    ok: true,
    pong: true,
    time: Date.now()
  });
});

/* debug final */
router.get("/debug/final", optionalAuth, safeHandler(paymentController.debugFinal));

/* webhook sign (개발/운영용) */
router.post("/webhook/sign", optionalAuth, safeHandler(paymentController.signWebhookPayload));

/* webhook verify */
router.post("/webhook/verify", optionalAuth, safeHandler(paymentController.verifySignature));

/* webhook receive */
router.post("/webhook", safeHandler(paymentController.webhook));

/* amount calculate */
router.post("/calculate", optionalAuth, safeHandler(paymentController.calculateAmount));

/* checkout payload validate */
router.post("/validate", optionalAuth, safeHandler(paymentController.validateCheckout));

/* =====================================================
🔥 AUTH REQUIRED
===================================================== */

/* create checkout */
router.post("/checkout", auth, safeHandler(paymentController.createCheckout));

/* direct create */
router.post("/", auth, safeHandler(paymentController.createPayment));

/* approve */
router.post("/approve", auth, safeHandler(paymentController.approvePayment));

/* fail */
router.post("/fail", auth, safeHandler(paymentController.failPayment));

/* cancel */
router.post("/cancel", auth, safeHandler(paymentController.cancelPayment));

/* refund */
router.post("/refund", auth, safeHandler(paymentController.refundPayment));

/* my payments */
router.get("/me", auth, safeHandler(paymentController.myPayments));

/* list payments */
router.get("/", auth, safeHandler(paymentController.listPayments));

/* reservation payments */
router.get(
  "/reservation/:reservationId",
  auth,
  validateObjectIdParam("reservationId"),
  safeHandler(paymentController.getReservationPayments)
);

/* user payments */
router.get(
  "/user/:userId",
  auth,
  safeHandler(paymentController.getUserPayments)
);

/* shop payments */
router.get(
  "/shop/:shopId",
  auth,
  validateObjectIdParam("shopId"),
  safeHandler(paymentController.getShopPayments)
);

/* payment by order id */
router.get("/order/:orderId", auth, safeHandler(paymentController.getPaymentByOrderId));

/* payment by key */
router.get("/key/:paymentKey", auth, safeHandler(paymentController.getPaymentByKey));

/* payment receipt */
router.get(
  "/:paymentId/receipt",
  auth,
  safeHandler(paymentController.getReceipt)
);

/* payment by id */
router.get(
  "/:paymentId",
  auth,
  safeHandler(paymentController.getPayment)
);

/* =====================================================
🔥 MOCK / QA
===================================================== */

/* mock success */
router.post("/mock/success", auth, safeHandler(paymentController.mockSuccess));

/* mock cancel */
router.post("/mock/cancel", auth, safeHandler(paymentController.mockCancel));

/* mock fail */
router.post("/mock/fail", auth, safeHandler(paymentController.mockFail));

/* =====================================================
🔥 ADMIN ONLY
===================================================== */

/* admin logs */
router.get("/admin/logs", auth, adminOnly, safeHandler(paymentController.getLogs));

/* admin metrics */
router.get("/admin/metrics", auth, adminOnly, safeHandler(paymentController.getMetrics));

/* admin health */
router.get("/admin/health", auth, adminOnly, safeHandler(paymentController.getHealth));

/* admin store size */
router.get("/admin/store-size", auth, adminOnly, safeHandler(paymentController.getStoreSize));

/* admin clear logs */
router.post("/admin/logs/clear", auth, adminOnly, safeHandler(paymentController.clearLogs));

/* admin clear expired */
router.post("/admin/clear-expired", auth, adminOnly, safeHandler(paymentController.clearExpired));

/* =====================================================
🔥 ROUTE LOCAL ADMIN DEBUG
===================================================== */
router.get("/admin/route-logs", auth, adminOnly, (req, res) => {
  return res.json({
    ok: true,
    logs: PAYMENT_ROUTE_LOGS.slice(-200)
  });
});

router.post("/admin/route-logs/clear", auth, adminOnly, (req, res) => {
  PAYMENT_ROUTE_LOGS.length = 0;
  return res.json({
    ok: true,
    message: "ROUTE LOGS CLEARED"
  });
});

router.get("/admin/rate", auth, adminOnly, (req, res) => {
  return res.json({
    ok: true,
    size: PAYMENT_RATE_MAP.size
  });
});

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
if (!global.__PAYMENT_ROUTE_INTERVAL__) {
  global.__PAYMENT_ROUTE_INTERVAL__ = true;

  setInterval(() => {
    try {
      if (PAYMENT_RATE_MAP.size > 5000) {
        PAYMENT_RATE_MAP.clear();
      }

      if (PAYMENT_ROUTE_LOGS.length > 3000) {
        PAYMENT_ROUTE_LOGS.splice(0, PAYMENT_ROUTE_LOGS.length - 1500);
      }
    } catch (_) {}
  }, 30000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 PAYMENT ROUTES FINAL MASTER READY");

module.exports = router;