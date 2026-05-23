"use strict";

// modules/reservation/jobs/reservation.expire.job.js

const Reservation = require("../models/Reservation");

/* =====================================================
🔥 SAFE REQUIRE (payment 연동)
===================================================== */
let Payment = null;
try {
  Payment = require("../../payment/models/Payment");
} catch (e) {
  console.warn("[reservation job] Payment model not found");
}

/* =====================================================
🔥 CONFIG
===================================================== */
const EXPIRE_MINUTES = Number(process.env.RESERVATION_EXPIRE_MINUTES || 10);
const BATCH_LIMIT = Number(process.env.RESERVATION_EXPIRE_BATCH || 100);

/* =====================================================
🔥 HELPER
===================================================== */
function getExpireCutoff() {
  return new Date(Date.now() - EXPIRE_MINUTES * 60 * 1000);
}

function isFinalPaymentStatus(status) {
  return ["cancelled", "refunded", "failed", "expired"].includes(status);
}

/* =====================================================
🔥 단건 만료 처리
===================================================== */
async function expireOneReservation(reservation) {
  try {
    if (!reservation) return null;

    // pending 상태만 만료 처리
    if (reservation.status !== "pending") {
      return reservation;
    }

    // 결제가 연결되어 있으면 상태 확인
    if (reservation.paymentId && Payment) {
      const payment = await Payment.findActiveByPaymentId(reservation.paymentId);

      // 결제 완료면 예약 만료시키면 안 됨
      if (payment && payment.status === "paid") {
        return reservation;
      }

      // ready / pending 상태 결제는 함께 expired 처리
      if (payment && !isFinalPaymentStatus(payment.status)) {
        payment.status = "expired";
        if (!payment.cancelledAt) {
          payment.cancelledAt = new Date();
        }
        await payment.save();
      }
    }

    // Reservation model method 우선 사용
    if (typeof reservation.markExpired === "function") {
      await reservation.markExpired();
    } else {
      reservation.status = "expired";
      reservation.expiredAt = new Date();
      await reservation.save();
    }

    return reservation;
  } catch (err) {
    console.error("[reservation job] expireOneReservation error:", err.message);
    return null;
  }
}

/* =====================================================
🔥 만료 대상 조회
===================================================== */
async function findExpiredReservations() {
  try {
    const cutoff = getExpireCutoff();

    return Reservation.find({
      status: "pending",
      isDeleted: false,
      createdAt: { $lte: cutoff },
    })
      .sort({ createdAt: 1 })
      .limit(BATCH_LIMIT);
  } catch (err) {
    console.error("[reservation job] findExpiredReservations error:", err.message);
    return [];
  }
}

/* =====================================================
🔥 메인 잡
===================================================== */
async function expireReservations() {
  try {
    const targets = await findExpiredReservations();

    if (!targets.length) {
      return {
        ok: true,
        checked: 0,
        expired: 0,
      };
    }

    let expiredCount = 0;

    for (const reservation of targets) {
      const result = await expireOneReservation(reservation);
      if (result && result.status === "expired") {
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`[reservation job] expired reservations: ${expiredCount}`);
    }

    return {
      ok: true,
      checked: targets.length,
      expired: expiredCount,
    };
  } catch (err) {
    console.error("[reservation job] expireReservations error:", err.message);
    return {
      ok: false,
      checked: 0,
      expired: 0,
      error: err.message,
    };
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  expireReservations,
  expireOneReservation,
  findExpiredReservations,
};