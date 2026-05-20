"use strict";

/* =====================================================
🔥 TOSS PAYMENTS PG SERVICE
👉 Toss Payments 연동
👉 ready / approve / cancel
👉 pgService 호환 구조
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const axios = require("axios");

/* =====================================================
🔥 CONFIG
===================================================== */
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || "";
const TOSS_API = "https://api.tosspayments.com/v1";

/* =====================================================
🔥 AXIOS INSTANCE
===================================================== */
const client = axios.create({
  baseURL: TOSS_API,
  headers: {
    Authorization:
      "Basic " +
      Buffer.from(TOSS_SECRET_KEY + ":").toString("base64"),
    "Content-Type": "application/json",
  },
});

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class TossPGService {
  /* =====================================================
  🔥 READY (클라이언트 결제 준비용 데이터 반환)
  👉 Toss는 서버에서 ready 호출 X
  👉 클라이언트 SDK 사용
  ===================================================== */
  async ready(payload = {}) {
    const {
      orderId,
      amount,
      orderName,
      customerName,
    } = payload;

    assert(orderId, "ORDER_ID_REQUIRED");
    assert(amount, "AMOUNT_REQUIRED");

    return {
      provider: "toss",
      orderId,
      amount,
      orderName,
      customerName,
      message: "READY_ON_CLIENT",
    };
  }

  /* =====================================================
  🔥 APPROVE (결제 승인)
  ===================================================== */
  async approve(payload = {}) {
    assert(TOSS_SECRET_KEY, "TOSS_SECRET_KEY_MISSING");

    const { paymentKey, orderId, amount } = payload;

    assert(paymentKey, "PAYMENT_KEY_REQUIRED");
    assert(orderId, "ORDER_ID_REQUIRED");
    assert(amount, "AMOUNT_REQUIRED");

    const res = await client.post("/payments/confirm", {
      paymentKey,
      orderId,
      amount,
    });

    return {
      provider: "toss",
      status: "paid",
      paymentKey: res.data.paymentKey,
      orderId: res.data.orderId,
      amount: res.data.totalAmount,
      approvedAt: res.data.approvedAt,
    };
  }

  /* =====================================================
  🔥 CANCEL (환불)
  ===================================================== */
  async cancel(payload = {}) {
    assert(TOSS_SECRET_KEY, "TOSS_SECRET_KEY_MISSING");

    const { paymentKey, cancelReason = "user_request" } = payload;

    assert(paymentKey, "PAYMENT_KEY_REQUIRED");

    const res = await client.post(
      `/payments/${paymentKey}/cancel`,
      {
        cancelReason,
      }
    );

    return {
      provider: "toss",
      status: "cancelled",
      paymentKey: res.data.paymentKey,
      cancelledAt: new Date(),
      cancelAmount: res.data.cancels?.[0]?.cancelAmount,
    };
  }

  /* =====================================================
  🔥 GET PAYMENT (조회)
  ===================================================== */
  async getPayment(paymentKey) {
    assert(paymentKey, "PAYMENT_KEY_REQUIRED");

    const res = await client.get(`/payments/${paymentKey}`);

    return res.data;
  }

  /* =====================================================
  🔥 WEBHOOK VERIFY (간단)
  ===================================================== */
  verifyWebhook(body) {
    // Toss는 별도 서명 검증 없음 (2025 기준)
    return body;
  }
}

module.exports = new TossPGService();