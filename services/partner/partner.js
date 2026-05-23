"use strict";

/* =====================================================
🔥 PARTNER SERVICE
👉 파트너(샵/가맹점) 관리
👉 예약 / 결제 / 매출 / 정산 / 통계
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Reservation = null;
let Payment = null;

let analyticsService = null;
let notifyService = null;
let cacheService = null;

try { Reservation = require("../modules/reservation/models/Reservation"); } catch (_) {}
try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}

try { analyticsService = require("./analyticsService"); } catch (_) {}
try { notifyService = require("./notifyService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class PartnerService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 예약 조회 (파트너 기준)
  ===================================================== */
  async getReservations(shopId, { limit = 20, skip = 0 } = {}) {
    assert(shopId, "SHOP_ID_REQUIRED");

    if (!Reservation) return [];

    return Reservation.find({
      shopId,
      isDeleted: false,
    })
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });
  }

  /* =====================================================
  🔥 결제 조회
  ===================================================== */
  async getPayments(shopId, { limit = 20, skip = 0 } = {}) {
    assert(shopId, "SHOP_ID_REQUIRED");

    if (!Payment) return [];

    return Payment.find({
      shopId,
      isDeleted: false,
    })
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });
  }

  /* =====================================================
  🔥 매출 집계
  ===================================================== */
  async getRevenue(shopId) {
    assert(shopId, "SHOP_ID_REQUIRED");

    const cacheKey = `partner:revenue:${shopId}`;

    if (cacheService) {
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;
    }

    if (!Payment) return { total: 0 };

    const payments = await Payment.find({
      shopId,
      isDeleted: false,
      status: { $in: ["paid", "partial_refunded"] },
    });

    let total = 0;
    let refunded = 0;

    for (const p of payments) {
      const paid = Number(p.paidAmount || p.amount || 0);
      const refund = Number(p.refundedAmount || 0);

      total += paid;
      refunded += refund;
    }

    const result = {
      total,
      refunded,
      net: total - refunded,
      count: payments.length,
    };

    this.last = result;

    if (cacheService) {
      cacheService.set(cacheKey, result, 60);
    }

    return result;
  }

  /* =====================================================
  🔥 예약 상태 변경
  ===================================================== */
  async updateReservationStatus(reservationId, status) {
    assert(reservationId, "RESERVATION_ID_REQUIRED");

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    reservation.status = status;
    await reservation.save();

    /* notify */
    if (notifyService) {
      notifyService.pushAsync({
        userId: reservation.userId,
        type: "reservation_update",
        message: `예약 상태 변경: ${status}`,
      });
    }

    return reservation;
  }

  /* =====================================================
  🔥 정산 (간단 계산)
  ===================================================== */
  async calculateSettlement(shopId, rate = 0.9) {
    const revenue = await this.getRevenue(shopId);

    const settlement = Math.round(revenue.net * rate);

    return {
      shopId,
      gross: revenue.net,
      rate,
      payout: settlement,
      calculatedAt: new Date(),
    };
  }

  /* =====================================================
  🔥 통계
  ===================================================== */
  async getStats(shopId) {
    const [reservations, payments, revenue] = await Promise.all([
      this.getReservations(shopId, { limit: 100 }),
      this.getPayments(shopId, { limit: 100 }),
      this.getRevenue(shopId),
    ]);

    return {
      reservations: reservations.length,
      payments: payments.length,
      revenue,
    };
  }

  /* =====================================================
  🔥 파트너 알림
  ===================================================== */
  notifyPartner(userId, message) {
    if (!notifyService) return false;

    notifyService.pushAsync({
      userId,
      type: "partner",
      message,
    });

    return true;
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

module.exports = new PartnerService();