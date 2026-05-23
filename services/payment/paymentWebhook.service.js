"use strict";

/* =====================================================
🔥 PAYMENT WEBHOOK SERVICE
👉 PG Webhook 통합 처리
👉 Kakao / Toss / Stripe 지원
👉 payment.final 연동 (핵심)
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let paymentFinalService = null;
let stripeService = null;
let analyticsService = null;
let cacheService = null;
let notifyService = null;

try { paymentFinalService = require("./payment.final"); } catch (_) {}
try { stripeService = require("./stripe"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { notifyService = require("./notifyService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const WEBHOOK_CACHE_TTL = 60; // 중복 방지

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function getCacheKey(provider, id) {
  return `webhook:${provider}:${id}`;
}

/* =====================================================
🔥 SERVICE
===================================================== */
class PaymentWebhookService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 MAIN HANDLER
  ===================================================== */
  async handle(provider, payload, headers = {}) {
    assert(provider, "PROVIDER_REQUIRED");
    assert(payload, "PAYLOAD_REQUIRED");

    switch (provider) {
      case "stripe":
        return this.handleStripe(payload, headers);

      case "toss":
        return this.handleToss(payload);

      case "kakao":
        return this.handleKakao(payload);

      default:
        throw new Error("UNKNOWN_PROVIDER");
    }
  }

  /* =====================================================
  🔥 STRIPE WEBHOOK
  ===================================================== */
  async handleStripe(payload, headers) {
    const signature = headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      if (stripeService?.verifyWebhook) {
        event = stripeService.verifyWebhook(
          payload,
          signature,
          secret
        );
      } else {
        event = payload;
      }
    } catch (err) {
      throw new Error("INVALID_STRIPE_SIGNATURE");
    }

    const type = event.type;

    if (type === "payment_intent.succeeded") {
      const intent = event.data.object;

      const key = getCacheKey("stripe", intent.id);

      if (cacheService?.get(key)) return { skipped: true };

      await paymentFinalService.approve({
        provider: "stripe",
        paymentId: intent.metadata?.paymentId,
        payload: {
          paymentIntentId: intent.id,
        },
      });

      cacheService?.set(key, true, WEBHOOK_CACHE_TTL);
    }

    return { ok: true };
  }

  /* =====================================================
  🔥 TOSS WEBHOOK
  ===================================================== */
  async handleToss(payload) {
    const { paymentKey, orderId, status } = payload;

    assert(paymentKey, "PAYMENT_KEY_REQUIRED");

    const key = getCacheKey("toss", paymentKey);

    if (cacheService?.get(key)) return { skipped: true };

    if (status === "DONE") {
      await paymentFinalService.approve({
        provider: "toss",
        paymentId: orderId,
        payload: {
          paymentKey,
          orderId,
          amount: payload.totalAmount,
        },
      });
    }

    cacheService?.set(key, true, WEBHOOK_CACHE_TTL);

    return { ok: true };
  }

  /* =====================================================
  🔥 KAKAO WEBHOOK (간접 처리)
  👉 카카오는 보통 redirect 기반이라 제한적
  ===================================================== */
  async handleKakao(payload) {
    const { tid, partner_order_id } = payload;

    if (!tid) return { ignored: true };

    const key = getCacheKey("kakao", tid);

    if (cacheService?.get(key)) return { skipped: true };

    await paymentFinalService.approve({
      provider: "kakao",
      paymentId: partner_order_id,
      payload: payload,
    });

    cacheService?.set(key, true, WEBHOOK_CACHE_TTL);

    return { ok: true };
  }

  /* =====================================================
  🔥 LOGGING
  ===================================================== */
  log(provider, payload) {
    if (analyticsService) {
      analyticsService.track({
        type: "webhook",
        payload: {
          provider,
          payload,
        },
      });
    }
  }

  /* =====================================================
  🔥 FAIL SAFE
  ===================================================== */
  async handleSafe(provider, payload, headers) {
    try {
      const res = await this.handle(provider, payload, headers);

      this.log(provider, payload);

      this.last = res;

      return res;
    } catch (err) {
      console.error("[webhook error]", err.message);

      if (notifyService) {
        notifyService.pushAsync({
          userId: "admin",
          type: "webhook_error",
          message: err.message,
          payload: { provider },
        });
      }

      throw err;
    }
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

module.exports = new PaymentWebhookService();