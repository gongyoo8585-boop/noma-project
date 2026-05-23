"use strict";

// modules/payment/services/payment.service.js

const Payment = require("../models/Payment");

// 🔥 FIX: 잘못된 경로 수정
const kakaoPay = require("./kakao.service");

/* ============================================
🔥 RESERVATION SAFE LOAD
============================================ */
let Reservation = null;
try {
  Reservation = require("../../reservation/models/Reservation");
} catch (e) {
  console.warn("[payment] Reservation model not found");
}

/* ============================================
🔥 HELPER
============================================ */
function assertStatus(payment, allowed = []) {
  if (!allowed.includes(payment.status)) {
    throw new Error("INVALID_PAYMENT_STATUS");
  }
}

function getRefundableAmount(payment) {
  return Number(payment.paidAmount || 0) - Number(payment.refundedAmount || 0);
}

/* ============================================
🔥 SERVICE
============================================ */
class PaymentService {
  async createKakaoPayment({
    user,
    reservation,
    title,
    amount,
    clientUrls,
  }) {
    try {
      if (reservation) {
        const existing = await Payment.findOne({
          reservation,
          status: { $in: ["pending", "ready", "paid"] },
          isDeleted: false,
        });

        if (existing) {
          return {
            paymentId: existing.paymentId,
            redirectUrl: existing.metadata?.next_redirect_pc_url || null,
          };
        }
      }

      const payment = await Payment.create({
        user,
        reservation,
        title,
        amount,
        paidAmount: amount,
        method: "kakao_pay",
        provider: "kakao",
        status: "pending",
      });

      const orderId = payment.paymentId;
      const urls = clientUrls || {};

      const ready = await kakaoPay.ready({
        orderId,
        userId: String(user),
        itemName: title,
        quantity: 1,
        totalAmount: amount,
        vatAmount: Math.floor(amount / 11),
        taxFreeAmount: 0,
        approvalUrl: `${urls.approval || ""}?orderId=${orderId}`,
        cancelUrl: `${urls.cancel || ""}?orderId=${orderId}`,
        failUrl: `${urls.fail || ""}?orderId=${orderId}`,
      });

      await payment.markReady({
        transactionId: ready.tid,
        metadata: ready,
      });

      return {
        paymentId: payment.paymentId,
        redirectUrl: ready.next_redirect_pc_url || null,
      };
    } catch (err) {
      console.error("createKakaoPayment error:", err.message);
      throw err;
    }
  }

  async approveKakaoPayment({ orderId, pgToken, userId }) {
    try {
      const payment = await Payment.findActiveByPaymentId(orderId);
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      assertStatus(payment, ["ready"]);

      const approve = await kakaoPay.approve({
        tid: payment.transactionId,
        orderId,
        userId: String(userId),
        pgToken,
      });

      await payment.markPaid({
        paidAmount: approve.amount.total,
        metadata: approve,
      });

      if (payment.reservation && Reservation) {
        try {
          await Reservation.findByIdAndUpdate(payment.reservation, {
            status: "paid",
            paidAt: new Date(),
            paymentId: payment.paymentId,
          });
        } catch (e) {
          console.error("reservation sync error:", e.message);
        }
      }

      return payment;
    } catch (err) {
      console.error("approveKakaoPayment error:", err.message);
      throw err;
    }
  }

  async failPayment({ orderId, reason }) {
    try {
      const payment = await Payment.findActiveByPaymentId(orderId);
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      assertStatus(payment, ["pending", "ready"]);

      await payment.markFailed(reason);
      return payment;
    } catch (err) {
      console.error("failPayment error:", err.message);
      throw err;
    }
  }

  async cancelPayment({ paymentId, reason }) {
    try {
      const payment = await Payment.findActiveByPaymentId(paymentId);
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      assertStatus(payment, ["paid"]);

      if (!payment.transactionId) {
        throw new Error("INVALID_TRANSACTION");
      }

      const cancel = await kakaoPay.cancel({
        tid: payment.transactionId,
        cancelAmount: payment.paidAmount,
      });

      await payment.markCancelled(reason, {
        metadata: cancel,
      });

      if (payment.reservation && Reservation) {
        try {
          await Reservation.findByIdAndUpdate(payment.reservation, {
            status: "cancelled",
            cancelledAt: new Date(),
          });
        } catch (e) {
          console.error("reservation cancel error:", e.message);
        }
      }

      return payment;
    } catch (err) {
      console.error("cancelPayment error:", err.message);
      throw err;
    }
  }

  async refundPayment({ paymentId, amount, reason }) {
    try {
      const payment = await Payment.findActiveByPaymentId(paymentId);
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");

      assertStatus(payment, ["paid", "partial_refunded"]);

      if (!payment.transactionId) {
        throw new Error("INVALID_TRANSACTION");
      }

      const maxRefundable = getRefundableAmount(payment);
      if (maxRefundable <= 0) throw new Error("NO_REFUND_AVAILABLE");

      const refundAmount = amount ? Number(amount) : maxRefundable;
      if (refundAmount > maxRefundable) {
        throw new Error("REFUND_EXCEEDS_LIMIT");
      }

      const cancel = await kakaoPay.cancel({
        tid: payment.transactionId,
        cancelAmount: refundAmount,
      });

      await payment.markRefunded(refundAmount, reason, {
        metadata: cancel,
      });

      if (payment.reservation && Reservation) {
        try {
          await Reservation.findByIdAndUpdate(payment.reservation, {
            status: "refunded",
            refundedAt: new Date(),
          });
        } catch (e) {
          console.error("reservation refund error:", e.message);
        }
      }

      return payment;
    } catch (err) {
      console.error("refundPayment error:", err.message);
      throw err;
    }
  }

  async getPayment(paymentId) {
    const payment = await Payment.findActiveByPaymentId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    return payment;
  }

  async getUserPayments(userId, options = {}) {
    return Payment.findUserPayments(userId, options);
  }
}

module.exports = new PaymentService();