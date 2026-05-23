"use strict";

// modules/payment/middlewares/payment.owner.js

const Payment = require("../models/Payment");

/* =====================================================
🔥 COMMON
===================================================== */
function fail(res, message, code = 400) {
  return res.status(code).json({
    ok: false,
    message,
  });
}

function isValidString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isSameUser(a, b) {
  if (!a || !b) return false;
  return String(a) === String(b);
}

/* =====================================================
🔥 결제 소유자 검증 + payment 주입
===================================================== */
exports.checkPaymentOwner = async (req, res, next) => {
  try {
    const paymentId = req.params.paymentId || req.query.orderId;
    const userId = req.user?.id || req.user?._id;

    if (!isValidString(paymentId)) {
      return fail(res, "PAYMENT_ID_REQUIRED");
    }

    if (!userId) {
      return fail(res, "UNAUTHORIZED", 401);
    }

    // 🔥 이미 앞단에서 주입된 경우 재사용
    let payment = req.payment;

    if (!payment) {
      payment = await Payment.findActiveByPaymentId(paymentId);

      if (!payment) {
        return fail(res, "PAYMENT_NOT_FOUND", 404);
      }
    }

    // 🔥 소유자 체크
    if (!isSameUser(payment.user, userId)) {
      return fail(res, "FORBIDDEN", 403);
    }

    req.payment = payment;

    next();
  } catch (err) {
    console.error("checkPaymentOwner error:", err.message);
    return fail(res, "MIDDLEWARE_ERROR", 500);
  }
};

/* =====================================================
🔥 관리자 또는 소유자 허용
===================================================== */
exports.checkOwnerOrAdmin = async (req, res, next) => {
  try {
    const paymentId = req.params.paymentId || req.query.orderId;
    const userId = req.user?.id || req.user?._id;
    const role = req.user?.role;

    if (!isValidString(paymentId)) {
      return fail(res, "PAYMENT_ID_REQUIRED");
    }

    if (!userId) {
      return fail(res, "UNAUTHORIZED", 401);
    }

    let payment = req.payment;

    if (!payment) {
      payment = await Payment.findActiveByPaymentId(paymentId);

      if (!payment) {
        return fail(res, "PAYMENT_NOT_FOUND", 404);
      }
    }

    // 🔥 관리자 우선 통과
    if (role === "admin") {
      req.payment = payment;
      return next();
    }

    // 🔥 소유자 체크
    if (!isSameUser(payment.user, userId)) {
      return fail(res, "FORBIDDEN", 403);
    }

    req.payment = payment;

    next();
  } catch (err) {
    console.error("checkOwnerOrAdmin error:", err.message);
    return fail(res, "MIDDLEWARE_ERROR", 500);
  }
};