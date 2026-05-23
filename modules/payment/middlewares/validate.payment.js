"use strict";

/* =====================================================
🔥 COMMON UTILS
===================================================== */
function isValidString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isPositiveNumber(v) {
  return typeof v === "number" && v > 0;
}

function fail(res, message, code = 400) {
  return res.status(code).json({
    ok: false,
    message,
  });
}

/* =====================================================
🔥 PAYMENT CREATE
===================================================== */
exports.validateCreatePayment = (req, res, next) => {
  try {
    let { title, amount, reservationId } = req.body;

    // title
    if (!isValidString(title)) {
      return fail(res, "INVALID_TITLE");
    }

    // amount (string → number 변환 지원)
    amount = toNumber(amount);

    if (!isPositiveNumber(amount)) {
      return fail(res, "INVALID_AMOUNT");
    }

    req.body.amount = amount;

    // reservationId (optional)
    if (reservationId !== undefined && reservationId !== null) {
      if (!isValidString(reservationId)) {
        return fail(res, "INVALID_RESERVATION_ID");
      }
    }

    next();
  } catch (err) {
    console.error("validateCreatePayment error:", err.message);
    return fail(res, "VALIDATION_ERROR", 500);
  }
};

/* =====================================================
🔥 REFUND
===================================================== */
exports.validateRefund = (req, res, next) => {
  try {
    let { amount, reason } = req.body;

    // amount (부분 환불 지원)
    if (amount !== undefined && amount !== null) {
      amount = toNumber(amount);

      if (!isPositiveNumber(amount)) {
        return fail(res, "INVALID_REFUND_AMOUNT");
      }

      req.body.amount = amount;
    }

    // reason
    if (reason !== undefined && reason !== null) {
      if (!isValidString(reason)) {
        return fail(res, "INVALID_REFUND_REASON");
      }
    }

    next();
  } catch (err) {
    console.error("validateRefund error:", err.message);
    return fail(res, "VALIDATION_ERROR", 500);
  }
};

/* =====================================================
🔥 CANCEL
===================================================== */
exports.validateCancel = (req, res, next) => {
  try {
    const { reason } = req.body;

    if (reason !== undefined && reason !== null) {
      if (!isValidString(reason)) {
        return fail(res, "INVALID_CANCEL_REASON");
      }
    }

    next();
  } catch (err) {
    console.error("validateCancel error:", err.message);
    return fail(res, "VALIDATION_ERROR", 500);
  }
};

/* =====================================================
🔥 PARAM VALIDATION (추가 - 핵심)
===================================================== */
exports.validatePaymentIdParam = (req, res, next) => {
  try {
    const { paymentId } = req.params;

    if (!isValidString(paymentId)) {
      return fail(res, "INVALID_PAYMENT_ID");
    }

    next();
  } catch (err) {
    console.error("validatePaymentIdParam error:", err.message);
    return fail(res, "VALIDATION_ERROR", 500);
  }
};

/* =====================================================
🔥 QUERY VALIDATION
===================================================== */
exports.validateQuery = (req, res, next) => {
  try {
    let { limit, skip } = req.query;

    if (limit !== undefined) {
      limit = toNumber(limit);

      if (!isPositiveNumber(limit) || limit > 100) {
        return fail(res, "INVALID_LIMIT");
      }

      req.query.limit = limit;
    }

    if (skip !== undefined) {
      skip = toNumber(skip);

      if (skip === null || skip < 0) {
        return fail(res, "INVALID_SKIP");
      }

      req.query.skip = skip;
    }

    next();
  } catch (err) {
    console.error("validateQuery error:", err.message);
    return fail(res, "VALIDATION_ERROR", 500);
  }
};