"use strict";

/* =====================================================
🔥 STRIPE SERVICE
👉 Stripe 결제 연동
👉 ready / approve / cancel
👉 pgService 호환
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
let Stripe = null;

try {
  Stripe = require("stripe");
} catch (_) {
  console.warn("[stripe] stripe package not installed");
}

/* =====================================================
🔥 CONFIG
===================================================== */
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

/* =====================================================
🔥 INIT
===================================================== */
const stripe = Stripe && STRIPE_SECRET
  ? new Stripe(STRIPE_SECRET)
  : null;

/* =====================================================
🔥 HELPER
===================================================== */
function assertStripe() {
  if (!stripe) {
    throw new Error("STRIPE_NOT_INITIALIZED");
  }
}

/* =====================================================
🔥 SERVICE
===================================================== */
class StripeService {
  /* =====================================================
  🔥 READY (PaymentIntent 생성)
  ===================================================== */
  async ready(payload = {}) {
    assertStripe();

    const {
      amount,
      currency = "usd",
      metadata = {},
    } = payload;

    if (!amount) throw new Error("AMOUNT_REQUIRED");

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount)), // cents
      currency,
      metadata,
    });

    return {
      provider: "stripe",
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  }

  /* =====================================================
  🔥 APPROVE (결제 확인)
  ===================================================== */
  async approve(payload = {}) {
    assertStripe();

    const { paymentIntentId } = payload;

    if (!paymentIntentId) {
      throw new Error("PAYMENT_INTENT_ID_REQUIRED");
    }

    const intent = await stripe.paymentIntents.retrieve(
      paymentIntentId
    );

    if (intent.status !== "succeeded") {
      throw new Error("PAYMENT_NOT_COMPLETED");
    }

    return {
      provider: "stripe",
      status: "paid",
      amount: intent.amount,
      currency: intent.currency,
      paymentIntentId: intent.id,
    };
  }

  /* =====================================================
  🔥 CANCEL (환불)
  ===================================================== */
  async cancel(payload = {}) {
    assertStripe();

    const { paymentIntentId, amount } = payload;

    if (!paymentIntentId) {
      throw new Error("PAYMENT_INTENT_ID_REQUIRED");
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amount ? { amount: Math.round(amount) } : {}),
    });

    return {
      provider: "stripe",
      status: "refunded",
      refundId: refund.id,
      amount: refund.amount,
    };
  }

  /* =====================================================
  🔥 WEBHOOK VERIFY (옵션)
  ===================================================== */
  verifyWebhook(payload, signature, secret) {
    if (!stripe) throw new Error("STRIPE_NOT_INITIALIZED");

    return stripe.webhooks.constructEvent(
      payload,
      signature,
      secret
    );
  }
}

module.exports = new StripeService();