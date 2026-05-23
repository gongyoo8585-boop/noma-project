"use strict";

/* =====================================================
🔥 ADVANCED RESERVATION SERVICE
👉 예약 고급 처리 (비즈니스 로직 통합)
👉 충돌 방지 / 가격 계산 / 결제 연결 / 알림
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Reservation = null;
let Payment = null;

let pricingService = null;
let queueService = null;
let cacheService = null;
let notifyService = null;

try { Reservation = require("../modules/reservation/models/Reservation"); } catch (_) {}
try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}

try { pricingService = require("./pricingService"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { notifyService = require("./notifyService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function buildCacheKey(data) {
  return `reservation:${data.userId}:${data.date}:${data.time}`;
}

/* =====================================================
🔥 SERVICE
===================================================== */
class AdvancedReservationService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 충돌 체크
  ===================================================== */
  async checkConflict({ shopId, reservationDate, reservationTime }) {
    if (!Reservation) return false;

    const exists = await Reservation.findOne({
      shopId,
      reservationDate,
      reservationTime,
      status: { $in: ["pending", "paid", "confirmed"] },
      isDeleted: false,
    });

    return !!exists;
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

    // 🔥 cache 중복 방지
    const key = buildCacheKey({
      userId,
      date: reservationDate,
      time: reservationTime,
    });

    if (cacheService && cacheService.has(key)) {
      throw new Error("DUPLICATE_REQUEST");
    }

    if (cacheService) {
      cacheService.set(key, true, 5);
    }

    // 🔥 충돌 체크
    const conflict = await this.checkConflict(data);
    if (conflict) {
      throw new Error("RESERVATION_CONFLICT");
    }

    // 🔥 가격 계산
    let pricing = { finalAmount: basePrice };

    if (pricingService) {
      pricing = pricingService.calculate({
        basePrice,
        duration,
        date: reservationDate,
      });
    }

    // 🔥 예약 생성
    const reservation = await Reservation.create({
      userId,
      shopId,
      reservationDate,
      reservationTime,
      amount: pricing.finalAmount,
      status: "pending",
    });

    // 🔥 알림
    if (notifyService) {
      notifyService.pushAsync({
        userId,
        type: "reservation",
        title: "예약 생성",
        message: "예약이 생성되었습니다.",
        payload: { reservationId: reservation._id },
      });
    }

    this.last = reservation;

    return {
      reservation,
      pricing,
    };
  }

  /* =====================================================
  🔥 결제 연결
  ===================================================== */
  async attachPayment(reservationId, paymentId) {
    if (!Reservation) throw new Error("RESERVATION_MODEL_MISSING");

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.paymentId = paymentId;
    await reservation.save();

    return reservation;
  }

  /* =====================================================
  🔥 상태 변경
  ===================================================== */
  async updateStatus(reservationId, status) {
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.status = status;
    await reservation.save();

    // 🔥 알림
    if (notifyService) {
      notifyService.pushAsync({
        userId: reservation.userId,
        type: "reservation_status",
        message: `예약 상태 변경: ${status}`,
      });
    }

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

    // 🔥 결제 취소 연동
    if (Payment && reservation.paymentId) {
      try {
        const payment = await Payment.findActiveByPaymentId(reservation.paymentId);
        if (payment && payment.status === "paid") {
          await payment.markCancelled("RESERVATION_CANCEL");
        }
      } catch (_) {}
    }

    return reservation;
  }

  /* =====================================================
  🔥 자동 예약 (queue)
  ===================================================== */
  async createAsync(data) {
    if (!queueService) {
      return this.create(data);
    }

    return queueService.add({
      type: "reservation",
      payload: data,
      handler: async (payload) => this.create(payload),
    });
  }

  /* =====================================================
  🔥 조회
  ===================================================== */
  async get(reservationId) {
    return Reservation.findById(reservationId);
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

module.exports = new AdvancedReservationService();