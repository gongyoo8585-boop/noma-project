"use strict";

// modules/reservation/services/reservation.service.js

const Reservation = require("../models/Reservation");

/* =====================================================
🔥 SAFE REQUIRE (payment 연동)
===================================================== */
let Payment = null;
try {
  Payment = require("../../payment/models/Payment");
} catch (e) {
  console.warn("[reservation] Payment model not found");
}

/* =====================================================
🔥 HELPER
===================================================== */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStatus(reservation, allowed = []) {
  if (!allowed.includes(reservation.status)) {
    throw new Error("INVALID_RESERVATION_STATUS");
  }
}

/* =====================================================
🔥 SERVICE
===================================================== */
class ReservationService {
  async createReservation(data = {}) {
    try {
      const {
        userId,
        shopId,
        reservationDate,
        reservationTime,
      } = data;

      assert(userId, "USER_ID_REQUIRED");
      assert(shopId, "SHOP_ID_REQUIRED");

      // 🔥 FIX: shopId 추가
      const exists = await Reservation.findOne({
        userId,
        shopId,
        reservationDate,
        reservationTime,
        status: { $in: ["pending", "paid", "confirmed"] },
        isDeleted: false,
      });

      if (exists) {
        throw new Error("RESERVATION_ALREADY_EXISTS");
      }

      const reservation = await Reservation.create({
        ...data,
        status: "pending",
      });

      return reservation;
    } catch (err) {
      console.error("createReservation error:", err.message);
      throw err;
    }
  }

  async linkPayment(reservationId, paymentId) {
    try {
      const reservation = await Reservation.findActiveById(reservationId);
      if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

      reservation.paymentId = paymentId;
      await reservation.save();

      return reservation;
    } catch (err) {
      console.error("linkPayment error:", err.message);
      throw err;
    }
  }

  async markPaid(reservationId, paymentId = null) {
    try {
      const reservation = await Reservation.findActiveById(reservationId);
      if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

      assertStatus(reservation, ["pending", "confirmed"]);

      await reservation.markPaid(paymentId);

      return reservation;
    } catch (err) {
      console.error("markPaid error:", err.message);
      throw err;
    }
  }

  async confirmReservation(reservationId) {
    try {
      const reservation = await Reservation.findActiveById(reservationId);
      if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

      assertStatus(reservation, ["paid"]);

      await reservation.markConfirmed();

      return reservation;
    } catch (err) {
      console.error("confirmReservation error:", err.message);
      throw err;
    }
  }

  async cancelReservation(reservationId, reason = null) {
    try {
      const reservation = await Reservation.findActiveById(reservationId);
      if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

      assertStatus(reservation, ["pending", "paid", "confirmed"]);

      await reservation.markCancelled(reason);

      if (reservation.paymentId && Payment) {
        try {
          const payment = await Payment.findActiveByPaymentId(reservation.paymentId);

          if (payment && payment.status === "paid") {
            await payment.markCancelled("RESERVATION_CANCEL");
          }
        } catch (e) {
          console.error("payment sync cancel error:", e.message);
        }
      }

      return reservation;
    } catch (err) {
      console.error("cancelReservation error:", err.message);
      throw err;
    }
  }

  async completeReservation(reservationId) {
    try {
      const reservation = await Reservation.findActiveById(reservationId);
      if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

      assertStatus(reservation, ["confirmed"]);

      await reservation.markCompleted();

      return reservation;
    } catch (err) {
      console.error("completeReservation error:", err.message);
      throw err;
    }
  }

  async refundReservation(reservationId, reason = null) {
    try {
      const reservation = await Reservation.findActiveById(reservationId);
      if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

      assertStatus(reservation, ["paid", "confirmed"]);

      await reservation.markRefunded(reason);

      if (reservation.paymentId && Payment) {
        try {
          const payment = await Payment.findActiveByPaymentId(reservation.paymentId);

          if (payment && ["paid", "partial_refunded"].includes(payment.status)) {
            await payment.markRefunded(null, reason || "RESERVATION_REFUND");
          }
        } catch (e) {
          console.error("payment sync refund error:", e.message);
        }
      }

      return reservation;
    } catch (err) {
      console.error("refundReservation error:", err.message);
      throw err;
    }
  }

  async expireReservation(reservationId) {
    try {
      const reservation = await Reservation.findActiveById(reservationId);
      if (!reservation) return null;

      if (reservation.status !== "pending") return reservation;

      await reservation.markExpired();

      return reservation;
    } catch (err) {
      console.error("expireReservation error:", err.message);
      return null;
    }
  }

  async getReservationById(reservationId) {
    const reservation = await Reservation.findActiveById(reservationId);
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");
    return reservation;
  }

  async getUserReservations(userId, options = {}) {
    return Reservation.findUserReservations(userId, options);
  }

  async getShopReservations(shopId, options = {}) {
    const limit = Number(options.limit || 20);
    const skip = Number(options.skip || 0);

    return Reservation.find({
      shopId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }
}

module.exports = new ReservationService();