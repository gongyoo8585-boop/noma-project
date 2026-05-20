"use strict";

/* =====================================================
🔥 COMMON
===================================================== */
function isDefined(v) {
  return v !== undefined && v !== null;
}

function isString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isNumber(v) {
  return typeof v === "number" && !isNaN(v);
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isPositiveNumber(v) {
  return isNumber(v) && v > 0;
}

/* =====================================================
🔥 ERROR
===================================================== */
function throwError(message, code = 400) {
  const err = new Error(message);
  err.statusCode = code;
  throw err;
}

/* =====================================================
🔥 CREATE PAYMENT
===================================================== */
function validateCreatePayment(payload = {}) {
  const { user, reservation, title, amount } = payload;

  if (!isDefined(user)) {
    throwError("USER_REQUIRED");
  }

  // Mixed 타입 대응
  if (!isDefined(reservation)) {
    throwError("RESERVATION_REQUIRED");
  }

  if (!isString(title)) {
    throwError("TITLE_REQUIRED");
  }

  const numAmount = toNumber(amount);

  if (!isPositiveNumber(numAmount)) {
    throwError("INVALID_AMOUNT");
  }

  return {
    user,
    reservation,
    title: title.trim(),
    amount: numAmount
  };
}

/* =====================================================
🔥 KAKAO READY
===================================================== */
function validateKakaoReady(payload = {}) {
  const { clientUrls } = payload;

  validateCreatePayment(payload);

  if (!clientUrls || typeof clientUrls !== "object") {
    throwError("CLIENT_URLS_REQUIRED");
  }

  if (!isString(clientUrls.approval)) {
    throwError("APPROVAL_URL_REQUIRED");
  }

  if (!isString(clientUrls.cancel)) {
    throwError("CANCEL_URL_REQUIRED");
  }

  if (!isString(clientUrls.fail)) {
    throwError("FAIL_URL_REQUIRED");
  }

  return payload;
}

/* =====================================================
🔥 APPROVE PAYMENT
===================================================== */
function validateApprovePayment(payload = {}) {
  const { orderId, pgToken, userId } = payload;

  if (!isString(orderId)) {
    throwError("ORDER_ID_REQUIRED");
  }

  if (!isString(pgToken)) {
    throwError("PG_TOKEN_REQUIRED");
  }

  if (!isDefined(userId)) {
    throwError("USER_ID_REQUIRED");
  }

  return payload;
}

/* =====================================================
🔥 FAIL PAYMENT
===================================================== */
function validateFailPayment(payload = {}) {
  const { orderId } = payload;

  if (!isString(orderId)) {
    throwError("ORDER_ID_REQUIRED");
  }

  return {
    orderId,
    reason: payload.reason || "PAYMENT_FAILED"
  };
}

/* =====================================================
🔥 CANCEL PAYMENT
===================================================== */
function validateCancelPayment(payload = {}) {
  const { paymentId } = payload;

  if (!isString(paymentId)) {
    throwError("PAYMENT_ID_REQUIRED");
  }

  return {
    paymentId,
    reason: payload.reason || "USER_CANCEL"
  };
}

/* =====================================================
🔥 REFUND PAYMENT
===================================================== */
function validateRefundPayment(payment, payload = {}) {
  const { paymentId, amount } = payload;

  if (!isString(paymentId)) {
    throwError("PAYMENT_ID_REQUIRED");
  }

  // 🔥 상태 검증 (model 기준)
  if (!["paid", "partial_refunded"].includes(payment.status)) {
    throwError("INVALID_REFUND_STATUS");
  }

  const maxRefundable =
    Number(payment.paidAmount || 0) -
    Number(payment.refundedAmount || 0);

  if (maxRefundable <= 0) {
    throwError("NO_REFUND_AVAILABLE");
  }

  if (isDefined(amount)) {
    const numAmount = toNumber(amount);

    if (!isPositiveNumber(numAmount)) {
      throwError("INVALID_REFUND_AMOUNT");
    }

    if (numAmount > maxRefundable) {
      throwError("REFUND_EXCEEDS_LIMIT");
    }

    return {
      paymentId,
      amount: numAmount,
      reason: payload.reason || "REFUND"
    };
  }

  // 전체 환불
  return {
    paymentId,
    amount: maxRefundable,
    reason: payload.reason || "FULL_REFUND"
  };
}

/* =====================================================
🔥 STATUS GUARD (핵심 추가)
===================================================== */
function validateStatusTransition(payment, targetStatus) {
  const current = payment.status;

  const allowed = {
    pending: ["ready", "failed"],
    ready: ["paid", "failed", "cancelled"],
    paid: ["cancelled", "refunded", "partial_refunded"],
    partial_refunded: ["refunded"],
    failed: [],
    cancelled: [],
    refunded: []
  };

  if (!allowed[current]?.includes(targetStatus)) {
    throwError("INVALID_STATUS_TRANSITION");
  }

  return true;
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  validateCreatePayment,
  validateKakaoReady,
  validateApprovePayment,
  validateFailPayment,
  validateCancelPayment,
  validateRefundPayment,
  validateStatusTransition
};