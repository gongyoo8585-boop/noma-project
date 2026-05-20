"use strict";

const express = require("express");
const router = express.Router();

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn("RESERVATION ROUTE REQUIRE FAIL:", path);
    return null;
  }
}

/* =====================================================
🔥 CONTROLLER
===================================================== */
const reservationController = safeRequire(
  "../controllers/reservation.controller"
);

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
const auth =
  safeRequire("../../middlewares/auth") ||
  safeRequire("../../middlewares/auth.middleware");

/* =====================================================
🔥 VALIDATION (옵션)
===================================================== */
const validate = safeRequire("../middlewares/validate.reservation");

/* =====================================================
🔥 HELPER
===================================================== */
const noop = (req, res, next) => next();

/* =====================================================
🔥 ROUTES
===================================================== */

/**
 * 📌 예약 생성
 * POST /reservations
 */
router.post(
  "/",
  ...(auth ? [auth] : []),
  ...(validate?.create ? [validate.create] : []),
  reservationController?.createReservation || noop
);

/**
 * 📌 내 예약 목록
 * GET /reservations/my
 */
router.get(
  "/my",
  ...(auth ? [auth] : []),
  reservationController?.getMyReservations || noop
);

/**
 * 📌 예약 단건 조회
 * GET /reservations/:id
 */
router.get(
  "/:id",
  ...(auth ? [auth] : []),
  reservationController?.getReservation || noop
);

/**
 * 📌 예약 취소
 * POST /reservations/:id/cancel
 */
router.post(
  "/:id/cancel",
  ...(auth ? [auth] : []),
  reservationController?.cancelReservation || noop
);

/**
 * 📌 예약 확정
 * POST /reservations/:id/confirm
 */
router.post(
  "/:id/confirm",
  ...(auth ? [auth] : []),
  reservationController?.confirmReservation || noop
);

/**
 * 📌 예약 완료
 * POST /reservations/:id/complete
 */
router.post(
  "/:id/complete",
  ...(auth ? [auth] : []),
  reservationController?.completeReservation || noop
);

/**
 * 📌 환불
 * POST /reservations/:id/refund
 */
router.post(
  "/:id/refund",
  ...(auth ? [auth] : []),
  reservationController?.refundReservation || noop
);

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = router;