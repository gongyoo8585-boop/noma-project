"use strict";

/* =====================================================
🔥 PAYMENT CONTROLLER (FINAL ULTRA COMPLETE MASTER)
👉 payment.service.js 완전 연동
👉 생성 / 승인 / 실패 / 취소 / 환불 / 목록 / 영수증 / webhook
👉 Reservation 결제 흐름과 바로 연결 가능
👉 통째로 교체 가능한 완성형
===================================================== */

const paymentService = require("../services/payment.service");

let Reservation = null;
try {
  Reservation = require("../models/Reservation");
} catch (_) {
  Reservation = null;
}

/* =====================================================
🔥 COMMON UTIL
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({
    ok: true,
    message,
    ...data
  });
}

function fail(res, status = 500, message = "SERVER ERROR", extra = {}) {
  return res.status(status).json({
    ok: false,
    message,
    ...extra
  });
}

function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("PAYMENT CONTROLLER ERROR:", e);
      return fail(res, e.status || 500, e.message || "SERVER ERROR");
    });
  };
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes", "y"].includes(v.toLowerCase());
  return false;
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function pickUserId(req) {
  return String(req.user?.id || req.user?._id || "");
}

function pickUserRole(req) {
  return String(req.user?.role || "");
}

function isAdmin(req) {
  return ["admin", "superAdmin"].includes(pickUserRole(req));
}

function normalizePage(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function normalizeLimit(v) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n) || n < 1) return 20;
  return Math.min(n, 100);
}

function parseArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function filterReservationOwner(req, reservation) {
  if (!reservation) return false;
  if (isAdmin(req)) return true;
  return String(reservation.userId || "") === pickUserId(req);
}

async function findReservationSafe(id) {
  if (!Reservation || !isValidId(id)) return null;
  return Reservation.findById(id);
}

/* =====================================================
🔥 HELPER: RESERVATION PRICE
===================================================== */
async function buildCheckoutPayloadFromReservation(req) {
  const reservationId = safeStr(req.body.reservationId || req.params.reservationId);
  let reservation = null;

  if (reservationId && Reservation) {
    reservation = await findReservationSafe(reservationId);
    if (!reservation) {
      const err = new Error("reservation not found");
      err.status = 404;
      throw err;
    }

    if (!filterReservationOwner(req, reservation)) {
      const err = new Error("forbidden");
      err.status = 403;
      throw err;
    }
  }

  const amount =
    req.body.amount != null
      ? safeNum(req.body.amount, 0)
      : paymentService.calculateReservationAmount({
          basePrice: req.body.basePrice ?? reservation?.priceSnapshot ?? reservation?.paymentAmount ?? 0,
          people: req.body.people ?? reservation?.people ?? 1,
          extraPricePerPerson: req.body.extraPricePerPerson ?? 0,
          discountAmount: req.body.discountAmount ?? reservation?.discountSnapshot ?? 0,
          discountRate: req.body.discountRate ?? 0
        });

  return {
    reservationId: reservation ? String(reservation._id) : reservationId,
    userId: pickUserId(req) || safeStr(req.body.userId),
    shopId: safeStr(req.body.shopId || reservation?.shopId || reservation?.placeId),
    orderId: safeStr(req.body.orderId),
    title:
      safeStr(req.body.title) ||
      (reservation ? `Reservation ${reservation.reserveCode || reservation._id}` : "Reservation Payment"),
    amount,
    currency: safeStr(req.body.currency || "KRW"),
    method: safeStr(req.body.method || "card"),
    successUrl: safeStr(req.body.successUrl),
    failUrl: safeStr(req.body.failUrl),
    metadata: {
      ...(req.body.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {}),
      source: safeStr(req.body.source || "api"),
      clientIp: safeStr(req.ip || ""),
      userAgent: safeStr(req.headers["user-agent"] || "")
    }
  };
}

/* =====================================================
🔥 1. CHECKOUT SESSION CREATE
POST /payments/checkout
===================================================== */
exports.createCheckout = safeAsync(async (req, res) => {
  const payload = await buildCheckoutPayloadFromReservation(req);
  const result = await paymentService.createCheckoutSession(payload);

  return ok(
    res,
    {
      payment: result.payment,
      checkoutUrl: result.checkoutUrl,
      orderId: result.orderId,
      paymentKey: result.paymentKey
    },
    "PAYMENT CHECKOUT CREATED"
  );
});

/* =====================================================
🔥 2. DIRECT PAYMENT CREATE
POST /payments
===================================================== */
exports.createPayment = safeAsync(async (req, res) => {
  const payload = await buildCheckoutPayloadFromReservation(req);
  const payment = await paymentService.createPayment(payload);

  return ok(res, { payment }, "PAYMENT CREATED");
});

/* =====================================================
🔥 3. APPROVE PAYMENT
POST /payments/approve
===================================================== */
exports.approvePayment = safeAsync(async (req, res) => {
  const payment = await paymentService.approvePayment({
    paymentId: req.body.paymentId,
    paymentKey: req.body.paymentKey,
    orderId: req.body.orderId,
    amount: req.body.amount,
    approvedBy: pickUserId(req) || "system",
    receiptUrl: req.body.receiptUrl
  });

  return ok(res, { payment }, "PAYMENT APPROVED");
});

/* =====================================================
🔥 4. FAIL PAYMENT
POST /payments/fail
===================================================== */
exports.failPayment = safeAsync(async (req, res) => {
  const payment = await paymentService.failPayment({
    paymentId: req.body.paymentId,
    orderId: req.body.orderId,
    reason: req.body.reason || "payment failed"
  });

  return ok(res, { payment }, "PAYMENT FAILED");
});

/* =====================================================
🔥 5. CANCEL PAYMENT
POST /payments/cancel
===================================================== */
exports.cancelPayment = safeAsync(async (req, res) => {
  const payment = await paymentService.cancelPayment({
    paymentId: req.body.paymentId,
    orderId: req.body.orderId,
    reason: req.body.reason || "cancelled by user",
    cancelledBy: pickUserId(req) || "system"
  });

  return ok(res, { payment }, "PAYMENT CANCELLED");
});

/* =====================================================
🔥 6. REFUND PAYMENT
POST /payments/refund
===================================================== */
exports.refundPayment = safeAsync(async (req, res) => {
  const payment = await paymentService.refundPayment({
    paymentId: req.body.paymentId,
    orderId: req.body.orderId,
    reason: req.body.reason || "refund",
    refundedBy: pickUserId(req) || "system",
    partialAmount: req.body.partialAmount
  });

  return ok(res, { payment }, "PAYMENT REFUNDED");
});

/* =====================================================
🔥 7. GET PAYMENT BY ID
GET /payments/:paymentId
===================================================== */
exports.getPayment = safeAsync(async (req, res) => {
  const payment = await paymentService.getPaymentById(req.params.paymentId);
  return ok(res, { payment });
});

/* =====================================================
🔥 8. GET PAYMENT BY ORDER ID
GET /payments/order/:orderId
===================================================== */
exports.getPaymentByOrderId = safeAsync(async (req, res) => {
  const payment = await paymentService.getPaymentByOrderId(req.params.orderId);
  return ok(res, { payment });
});

/* =====================================================
🔥 9. GET PAYMENT BY KEY
GET /payments/key/:paymentKey
===================================================== */
exports.getPaymentByKey = safeAsync(async (req, res) => {
  const payment = await paymentService.getPaymentByPaymentKey(req.params.paymentKey);
  return ok(res, { payment });
});

/* =====================================================
🔥 10. PAYMENT RECEIPT
GET /payments/:paymentId/receipt
===================================================== */
exports.getReceipt = safeAsync(async (req, res) => {
  const receipt = await paymentService.getReceipt(req.params.paymentId);
  return ok(res, { receipt });
});

/* =====================================================
🔥 11. LIST PAYMENTS
GET /payments
===================================================== */
exports.listPayments = safeAsync(async (req, res) => {
  const page = normalizePage(req.query.page);
  const limit = normalizeLimit(req.query.limit);

  const result = await paymentService.listPayments({
    userId: isAdmin(req) ? safeStr(req.query.userId) : pickUserId(req),
    reservationId: safeStr(req.query.reservationId),
    shopId: safeStr(req.query.shopId),
    status: safeStr(req.query.status),
    page,
    limit
  });

  return ok(res, result);
});

/* =====================================================
🔥 12. MY PAYMENTS
GET /payments/me
===================================================== */
exports.myPayments = safeAsync(async (req, res) => {
  const page = normalizePage(req.query.page);
  const limit = normalizeLimit(req.query.limit);

  const result = await paymentService.listPayments({
    userId: pickUserId(req),
    reservationId: safeStr(req.query.reservationId),
    status: safeStr(req.query.status),
    page,
    limit
  });

  return ok(res, result);
});

/* =====================================================
🔥 13. WEBHOOK VERIFY + PROCESS
POST /payments/webhook
===================================================== */
exports.webhook = safeAsync(async (req, res) => {
  paymentService.verifyWebhook(req.headers, req.body);
  const result = await paymentService.processWebhook(req.body);

  return ok(res, { result }, "WEBHOOK PROCESSED");
});

/* =====================================================
🔥 14. SIGN WEBHOOK PAYLOAD (DEBUG/ADMIN)
POST /payments/webhook/sign
===================================================== */
exports.signWebhookPayload = safeAsync(async (req, res) => {
  const signature = paymentService.signPayload(req.body || {});
  return ok(res, { signature });
});

/* =====================================================
🔥 15. VERIFY SIGNATURE
POST /payments/webhook/verify
===================================================== */
exports.verifySignature = safeAsync(async (req, res) => {
  const valid = paymentService.verifySignature(
    req.body.payload || {},
    req.body.signature || ""
  );

  return ok(res, { valid });
});

/* =====================================================
🔥 16. CALCULATE AMOUNT
POST /payments/calculate
===================================================== */
exports.calculateAmount = safeAsync(async (req, res) => {
  const amount = paymentService.calculateReservationAmount({
    basePrice: req.body.basePrice,
    people: req.body.people,
    extraPricePerPerson: req.body.extraPricePerPerson,
    discountAmount: req.body.discountAmount,
    discountRate: req.body.discountRate
  });

  return ok(res, { amount });
});

/* =====================================================
🔥 17. VALIDATE CHECKOUT PAYLOAD
POST /payments/validate
===================================================== */
exports.validateCheckout = safeAsync(async (req, res) => {
  paymentService.validateCheckoutPayload(req.body || {});
  return ok(res, { valid: true });
});

/* =====================================================
🔥 18. ADMIN LOGS
GET /payments/admin/logs
===================================================== */
exports.getLogs = safeAsync(async (req, res) => {
  const limit = normalizeLimit(req.query.limit || 100);
  const logs = paymentService.getLogs(limit);
  return ok(res, { logs });
});

/* =====================================================
🔥 19. ADMIN METRICS
GET /payments/admin/metrics
===================================================== */
exports.getMetrics = safeAsync(async (req, res) => {
  const metrics = paymentService.getMetrics();
  return ok(res, { metrics });
});

/* =====================================================
🔥 20. ADMIN HEALTH
GET /payments/admin/health
===================================================== */
exports.getHealth = safeAsync(async (req, res) => {
  const health = paymentService.getHealth();
  return ok(res, { health });
});

/* =====================================================
🔥 21. ADMIN STORE SIZE
GET /payments/admin/store-size
===================================================== */
exports.getStoreSize = safeAsync(async (req, res) => {
  const size = paymentService.getStoreSize();
  return ok(res, { size });
});

/* =====================================================
🔥 22. ADMIN CLEAR LOGS
POST /payments/admin/logs/clear
===================================================== */
exports.clearLogs = safeAsync(async (req, res) => {
  paymentService.clearLogs();
  return ok(res, {}, "PAYMENT LOGS CLEARED");
});

/* =====================================================
🔥 23. ADMIN CLEAR EXPIRED
POST /payments/admin/clear-expired
===================================================== */
exports.clearExpired = safeAsync(async (req, res) => {
  const count = paymentService.clearExpiredPayments();
  return ok(res, { count }, "EXPIRED PAYMENTS CLEARED");
});

/* =====================================================
🔥 24. RESERVATION PAYMENT SUMMARY
GET /payments/reservation/:reservationId
===================================================== */
exports.getReservationPayments = safeAsync(async (req, res) => {
  const page = normalizePage(req.query.page);
  const limit = normalizeLimit(req.query.limit);

  const result = await paymentService.listPayments({
    reservationId: req.params.reservationId,
    page,
    limit
  });

  return ok(res, result);
});

/* =====================================================
🔥 25. USER PAYMENT SUMMARY
GET /payments/user/:userId
===================================================== */
exports.getUserPayments = safeAsync(async (req, res) => {
  if (!isAdmin(req) && pickUserId(req) !== String(req.params.userId)) {
    return fail(res, 403, "forbidden");
  }

  const page = normalizePage(req.query.page);
  const limit = normalizeLimit(req.query.limit);

  const result = await paymentService.listPayments({
    userId: req.params.userId,
    status: safeStr(req.query.status),
    page,
    limit
  });

  return ok(res, result);
});

/* =====================================================
🔥 26. SHOP PAYMENT SUMMARY
GET /payments/shop/:shopId
===================================================== */
exports.getShopPayments = safeAsync(async (req, res) => {
  const page = normalizePage(req.query.page);
  const limit = normalizeLimit(req.query.limit);

  const result = await paymentService.listPayments({
    shopId: req.params.shopId,
    status: safeStr(req.query.status),
    page,
    limit
  });

  return ok(res, result);
});

/* =====================================================
🔥 27. QUICK MOCK SUCCESS
POST /payments/mock/success
===================================================== */
exports.mockSuccess = safeAsync(async (req, res) => {
  const payment = await paymentService.approvePayment({
    paymentId: req.body.paymentId,
    orderId: req.body.orderId,
    paymentKey: req.body.paymentKey,
    amount: req.body.amount,
    approvedBy: "mock_success"
  });

  return ok(res, { payment }, "MOCK PAYMENT APPROVED");
});

/* =====================================================
🔥 28. QUICK MOCK CANCEL
POST /payments/mock/cancel
===================================================== */
exports.mockCancel = safeAsync(async (req, res) => {
  const payment = await paymentService.cancelPayment({
    paymentId: req.body.paymentId,
    orderId: req.body.orderId,
    reason: req.body.reason || "mock cancel",
    cancelledBy: "mock_cancel"
  });

  return ok(res, { payment }, "MOCK PAYMENT CANCELLED");
});

/* =====================================================
🔥 29. QUICK MOCK FAIL
POST /payments/mock/fail
===================================================== */
exports.mockFail = safeAsync(async (req, res) => {
  const payment = await paymentService.failPayment({
    paymentId: req.body.paymentId,
    orderId: req.body.orderId,
    reason: req.body.reason || "mock fail"
  });

  return ok(res, { payment }, "MOCK PAYMENT FAILED");
});

/* =====================================================
🔥 30. PAYMENT DEBUG
GET /payments/debug/final
===================================================== */
exports.debugFinal = safeAsync(async (req, res) => {
  return ok(res, {
    serviceReady: !!paymentService,
    reservationModelLoaded: !!Reservation,
    now: Date.now()
  });
});

console.log("🔥 PAYMENT CONTROLLER FINAL MASTER READY");

module.exports = exports;