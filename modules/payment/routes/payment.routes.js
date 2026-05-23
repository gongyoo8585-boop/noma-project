"use strict";

// modules/payment/routes/payment.routes.js

const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/payment.controller");

/* =====================================================
🔥 SAFE REQUIRE (middleware)
===================================================== */
let auth = (req, res, next) => next();
let middlewares = {};

try {
  auth = require("../../../middlewares/auth.middleware");
} catch (e) {
  console.warn("[payment routes] auth middleware not found");
}

try {
  middlewares = require("../middlewares");
} catch (e) {
  console.warn("[payment routes] custom middlewares not found");
}

/* =====================================================
🔥 MIDDLEWARES
===================================================== */
const {
  validateCreatePayment,
  validateRefund,
  validateCancel,
  preventDuplicatePayment,
  ensureCancelable,
  ensureRefundable,
  ensurePaymentExists,
  checkPaymentOwner,
} = middlewares || {};

const noop = (req, res, next) => next();

/* =====================================================
🔥 KAKAO PAYMENT
===================================================== */

/**
 * 결제 시작
 * POST /payments/kakao/ready
 */
router.post(
  "/kakao/ready",
  auth,
  validateCreatePayment || noop,
  preventDuplicatePayment || noop,
  paymentController.createKakaoPayment
);

/**
 * 결제 승인 (카카오 redirect)
 * GET /payments/kakao/approve
 */
router.get(
  "/kakao/approve",
  paymentController.approveKakaoPayment
);

/**
 * 결제 실패
 * GET /payments/kakao/fail
 */
router.get(
  "/kakao/fail",
  paymentController.failKakaoPayment
);

/* =====================================================
🔥 QUERY
===================================================== */

/**
 * 내 결제 리스트
 * GET /payments/my/list
 * ⚠️ 반드시 :paymentId 라우트보다 위에 있어야 함
 */
router.get(
  "/my/list",
  auth,
  paymentController.getMyPayments
);

/* =====================================================
🔥 PAYMENT ACTION
===================================================== */

/**
 * 결제 취소
 * POST /payments/:paymentId/cancel
 */
router.post(
  "/:paymentId/cancel",
  auth,
  ensurePaymentExists || noop,
  checkPaymentOwner || noop,
  ensureCancelable || noop,
  validateCancel || noop,
  paymentController.cancelPayment
);

/**
 * 환불
 * POST /payments/:paymentId/refund
 */
router.post(
  "/:paymentId/refund",
  auth,
  ensurePaymentExists || noop,
  checkPaymentOwner || noop,
  ensureRefundable || noop,
  validateRefund || noop,
  paymentController.refundPayment
);

/**
 * 단건 조회
 * GET /payments/:paymentId
 */
router.get(
  "/:paymentId",
  auth,
  ensurePaymentExists || noop,
  checkPaymentOwner || noop,
  paymentController.getPayment
);

module.exports = router;