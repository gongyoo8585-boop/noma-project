"use strict";

// modules/payment/middlewares/payment.guard.js

const Payment = require("../models/Payment");

/* =====================================================
🔥 COMMON
===================================================== */
function fail(res, message, code = 400, extra = {}) {
  return res.status(code).json({
    ok: false,
    message,
    ...extra,
  });
}

function isValidString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/* =====================================================
🔥 중복 결제 방지
- 같은 reservation에 대해
- pending / ready / paid 상태 있으면 차단
===================================================== */
exports.preventDuplicatePayment = async (req, res, next) => {
  try {
    const { reservationId } = req.body;

    // reservation 없으면 패스 (단순 결제 케이스)
    if (!isValidString(reservationId)) {
      return next();
    }

    const existing = await Payment.findOne({
      reservation: reservationId,
      status: { $in: ["pending", "ready", "paid"] },
      isDeleted: false,
    });

    if (existing) {
      return fail(res, "PAYMENT_ALREADY_EXISTS", 400, {
        paymentId: existing.paymentId,
        status: existing.status,
      });
    }

    next();
  } catch (err) {
    console.error("preventDuplicatePayment error:", err.message);
    return fail(res, "MIDDLEWARE_ERROR", 500);
  }
};

/* =====================================================
🔥 결제 취소 가능 상태 체크
===================================================== */
exports.ensureCancelable = (req, res, next) => {
  try {
    const payment = req.payment;

    if (!payment) {
      return fail(res, "PAYMENT_CONTEXT_MISSING");
    }

    // paid 상태만 취소 가능
    if (payment.status !== "paid") {
      return fail(res, "NOT_CANCELABLE_STATUS", 400, {
        status: payment.status,
      });
    }

    next();
  } catch (err) {
    console.error("ensureCancelable error:", err.message);
    return fail(res, "MIDDLEWARE_ERROR", 500);
  }
};

/* =====================================================
🔥 환불 가능 상태 체크
===================================================== */
exports.ensureRefundable = (req, res, next) => {
  try {
    const payment = req.payment;

    if (!payment) {
      return fail(res, "PAYMENT_CONTEXT_MISSING");
    }

    // paid 또는 partial_refunded만 허용
    if (!["paid", "partial_refunded"].includes(payment.status)) {
      return fail(res, "NOT_REFUNDABLE_STATUS", 400, {
        status: payment.status,
      });
    }

    next();
  } catch (err) {
    console.error("ensureRefundable error:", err.message);
    return fail(res, "MIDDLEWARE_ERROR", 500);
  }
};

/* =====================================================
🔥 결제 진행 가능 상태 체크
- approve 시 사용
===================================================== */
exports.ensureApprovable = (req, res, next) => {
  try {
    const payment = req.payment;

    if (!payment) {
      return fail(res, "PAYMENT_CONTEXT_MISSING");
    }

    // ready 상태만 승인 가능
    if (payment.status !== "ready") {
      return fail(res, "NOT_APPROVABLE_STATUS", 400, {
        status: payment.status,
      });
    }

    next();
  } catch (err) {
    console.error("ensureApprovable error:", err.message);
    return fail(res, "MIDDLEWARE_ERROR", 500);
  }
};

/* =====================================================
🔥 결제 존재 체크 (공용)
===================================================== */
exports.ensurePaymentExists = async (req, res, next) => {
  try {
    const paymentId = req.params.paymentId || req.query.orderId;

    if (!isValidString(paymentId)) {
      return fail(res, "PAYMENT_ID_REQUIRED");
    }

    const payment = await Payment.findActiveByPaymentId(paymentId);

    if (!payment) {
      return fail(res, "PAYMENT_NOT_FOUND", 404);
    }

    req.payment = payment;

    next();
  } catch (err) {
    console.error("ensurePaymentExists error:", err.message);
    return fail(res, "MIDDLEWARE_ERROR", 500);
  }
};