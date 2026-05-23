"use strict";

/* =====================================================
🔥 FINAL PAYMENT SERVICE
👉 결제 최종 처리 (오케스트레이터)
👉 PG 승인 → DB 반영 → 영수증 → 알림 → analytics
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Payment = null;

let pgService = null;
let receiptService = null;
let notifyService = null;
let analyticsService = null;
let cacheService = null;

try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}

try { pgService = require("./pgService"); } catch (_) {}
try { receiptService = require("./receiptService"); } catch (_) {}
try { notifyService = require("./notifyService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
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
class PaymentFinalService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 결제 승인 (핵심)
  ===================================================== */
  async approve(data = {}) {
    const {
      provider,
      paymentId,
      payload = {},
    } = data;

    assert(provider, "PROVIDER_REQUIRED");
    assert(paymentId, "PAYMENT_ID_REQUIRED");

    if (!Payment) throw new Error("PAYMENT_MODEL_MISSING");

    /* 1️⃣ 결제 조회 */
    const payment = await Payment.findActiveByPaymentId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    /* 2️⃣ PG 승인 */
    const result = await pgService.approve(provider, payload);

    /* 3️⃣ DB 업데이트 */
    payment.status = "paid";
    payment.paidAmount = result.amount || payment.amount;
    payment.pgData = result;

    if (typeof payment.markPaid === "function") {
      await payment.markPaid(result);
    } else {
      await payment.save();
    }

    /* 4️⃣ 영수증 생성 */
    let receipt = null;
    if (receiptService) {
      try {
        receipt = await receiptService.create(paymentId);
      } catch (_) {}
    }

    /* 5️⃣ 알림 */
    if (notifyService) {
      notifyService.pushAsync({
        userId: payment.user,
        type: "payment_success",
        message: "결제가 완료되었습니다.",
        payload: { paymentId },
      });
    }

    /* 6️⃣ analytics */
    if (analyticsService) {
      analyticsService.track({
        type: "payment",
        userId: payment.user,
        payload: {
          paymentId,
          amount: payment.paidAmount,
          status: "paid",
          provider,
        },
      });
    }

    /* 7️⃣ cache */
    if (cacheService) {
      cacheService.set(`payment:${paymentId}`, payment, 60);
    }

    const response = {
      payment,
      receipt,
      pg: result,
    };

    this.last = response;

    return response;
  }

  /* =====================================================
  🔥 결제 취소
  ===================================================== */
  async cancel(data = {}) {
    const {
      provider,
      paymentId,
      payload = {},
    } = data;

    assert(provider, "PROVIDER_REQUIRED");
    assert(paymentId, "PAYMENT_ID_REQUIRED");

    const payment = await Payment.findActiveByPaymentId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    /* PG 취소 */
    const result = await pgService.cancel(provider, payload);

    /* DB 반영 */
    payment.status = "cancelled";

    if (typeof payment.markCancelled === "function") {
      await payment.markCancelled("USER_CANCEL");
    } else {
      await payment.save();
    }

    /* 알림 */
    if (notifyService) {
      notifyService.pushAsync({
        userId: payment.user,
        type: "payment_cancel",
        message: "결제가 취소되었습니다.",
        payload: { paymentId },
      });
    }

    /* analytics */
    if (analyticsService) {
      analyticsService.track({
        type: "payment_cancel",
        userId: payment.user,
        payload: {
          paymentId,
          provider,
        },
      });
    }

    return {
      payment,
      pg: result,
    };
  }

  /* =====================================================
  🔥 결제 실패 처리
  ===================================================== */
  async fail(paymentId, reason = "UNKNOWN") {
    assert(paymentId, "PAYMENT_ID_REQUIRED");

    const payment = await Payment.findActiveByPaymentId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    payment.status = "failed";
    payment.failReason = reason;

    await payment.save();

    if (notifyService) {
      notifyService.pushAsync({
        userId: payment.user,
        type: "payment_fail",
        message: "결제가 실패했습니다.",
        payload: { paymentId, reason },
      });
    }

    if (analyticsService) {
      analyticsService.track({
        type: "payment_fail",
        userId: payment.user,
        payload: { paymentId, reason },
      });
    }

    return payment;
  }

  /* =====================================================
  🔥 결제 상태 조회
  ===================================================== */
  async get(paymentId) {
    assert(paymentId, "PAYMENT_ID_REQUIRED");

    if (cacheService) {
      const cached = cacheService.get(`payment:${paymentId}`);
      if (cached) return cached;
    }

    const payment = await Payment.findActiveByPaymentId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    return payment;
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

module.exports = new PaymentFinalService();