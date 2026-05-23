"use strict";

/* =====================================================
🔥 FINAL RESERVATION SERVICE
👉 예약 최종 처리 (오케스트레이터)
👉 lock → 생성 → 가격 → 결제 → 알림 → analytics
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Reservation = null;
let Payment = null;

let pricingService = null;
let notifyService = null;
let analyticsService = null;
let queueService = null;
let lockService = null;

try { Reservation = require("../modules/reservation/models/Reservation"); } catch (_) {}
try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}

try { pricingService = require("./pricingService"); } catch (_) {}
try { notifyService = require("./notifyService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}
try { lockService = require("./redis.lock"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class ReservationFinalService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 예약 생성 (핵심)
  ===================================================== */
  async create(data = {}) {
    const {
      userId,
      shopId,
      reservationDate,
      reservationTime,
      basePrice,
      duration,
    } = data;

    assert(userId, "USER_REQUIRED");
    assert(shopId, "SHOP_REQUIRED");

    const lockKey = `reservation:${shopId}:${reservationDate}:${reservationTime}`;

    const exec = async () => {
      /* 충돌 체크 */
      const exists = await Reservation.findOne({
        shopId,
        reservationDate,
        reservationTime,
        status: { $in: ["pending", "paid", "confirmed"] },
        isDeleted: false,
      });

      if (exists) {
        throw new Error("RESERVATION_CONFLICT");
      }

      /* 가격 계산 */
      let pricing = { finalAmount: basePrice };

      if (pricingService) {
        pricing = pricingService.calculate({
          basePrice,
          duration,
          date: reservationDate,
        });
      }

      /* 예약 생성 */
      const reservation = await Reservation.create({
        userId,
        shopId,
        reservationDate,
        reservationTime,
        amount: pricing.finalAmount,
        status: "pending",
      });

      /* 알림 */
      notifyService?.pushAsync({
        userId,
        type: "reservation_created",
        message: "예약이 생성되었습니다.",
        payload: { reservationId: reservation._id },
      });

      /* analytics */
      analyticsService?.track({
        type: "reservation",
        userId,
        payload: {
          reservationId: reservation._id,
          amount: pricing.finalAmount,
        },
      });

      this.last = reservation;

      return {
        reservation,
        pricing,
      };
    };

    /* 🔥 LOCK 적용 */
    if (lockService) {
      return lockService.withLock(lockKey, exec);
    }

    return exec();
  }

  /* =====================================================
  🔥 결제 연결
  ===================================================== */
  async attachPayment(reservationId, paymentId) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.paymentId = paymentId;
    await reservation.save();

    return reservation;
  }

  /* =====================================================
  🔥 결제 완료 처리
  ===================================================== */
  async markPaid(reservationId) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.status = "paid";
    await reservation.save();

    notifyService?.pushAsync({
      userId: reservation.userId,
      type: "reservation_paid",
      message: "예약 결제가 완료되었습니다.",
    });

    return reservation;
  }

  /* =====================================================
  🔥 예약 취소
  ===================================================== */
  async cancel(reservationId, reason = "") {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.status = "cancelled";
    reservation.cancelReason = reason;
    await reservation.save();

    /* 결제 취소 연동 */
    if (Payment && reservation.paymentId) {
      try {
        const payment = await Payment.findActiveByPaymentId(reservation.paymentId);
        if (payment && payment.status === "paid") {
          await payment.markCancelled("RESERVATION_CANCEL");
        }
      } catch (_) {}
    }

    notifyService?.pushAsync({
      userId: reservation.userId,
      type: "reservation_cancel",
      message: "예약이 취소되었습니다.",
    });

    return reservation;
  }

  /* =====================================================
  🔥 예약 완료 처리
  ===================================================== */
  async complete(reservationId) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.status = "completed";
    await reservation.save();

    notifyService?.pushAsync({
      userId: reservation.userId,
      type: "reservation_complete",
      message: "예약이 완료되었습니다.",
    });

    return reservation;
  }

  /* =====================================================
  🔥 실패 처리
  ===================================================== */
  async fail(reservationId, reason = "UNKNOWN") {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.status = "failed";
    reservation.failReason = reason;
    await reservation.save();

    notifyService?.pushAsync({
      userId: reservation.userId,
      type: "reservation_fail",
      message: "예약 처리 실패",
    });

    return reservation;
  }

  /* =====================================================
  🔥 조회
  ===================================================== */
  async get(reservationId) {
    return Reservation.findById(reservationId);
  }

  /* =====================================================
  🔥 비동기 생성
  ===================================================== */
  async createAsync(data) {
    if (!queueService) {
      return this.create(data);
    }

    return queueService.add({
      type: "reservation_final",
      payload: data,
      handler: async (payload) => this.create(payload),
    });
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.last;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.last = null;
    return true;
  }
}

module.exports = new ReservationFinalService();