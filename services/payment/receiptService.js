"use strict";

/* =====================================================
🔥 RECEIPT SERVICE
👉 결제 영수증 생성 / 조회
👉 payment 연동
👉 cache / analytics / queue 확장 가능
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Payment = null;
let cacheService = null;
let analyticsService = null;
let queueService = null;

try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function generateReceiptId() {
  return `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* =====================================================
🔥 SERVICE
===================================================== */
class ReceiptService {
  constructor() {
    this.store = new Map(); // in-memory
  }

  /* =====================================================
  🔥 CREATE RECEIPT
  ===================================================== */
  async create(paymentId) {
    if (!paymentId) throw new Error("PAYMENT_ID_REQUIRED");

    // cache 먼저 확인
    if (cacheService) {
      const cached = cacheService.get(`receipt:${paymentId}`);
      if (cached) return cached;
    }

    if (!Payment) throw new Error("PAYMENT_MODEL_MISSING");

    const payment = await Payment.findActiveByPaymentId(paymentId);
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");

    const receipt = {
      receiptId: generateReceiptId(),
      paymentId: payment.paymentId,
      user: payment.user,
      amount: payment.paidAmount || payment.amount,
      method: payment.method,
      status: payment.status,
      title: payment.title,
      createdAt: new Date(),
    };

    this.store.set(receipt.receiptId, receipt);

    // cache 저장
    if (cacheService) {
      cacheService.set(`receipt:${paymentId}`, receipt, 300);
    }

    // analytics 기록
    if (analyticsService) {
      analyticsService.track({
        type: "receipt",
        payload: receipt,
        userId: payment.user,
      });
    }

    return receipt;
  }

  /* =====================================================
  🔥 GET RECEIPT
  ===================================================== */
  getById(receiptId) {
    return this.store.get(receiptId) || null;
  }

  getByPayment(paymentId) {
    for (const r of this.store.values()) {
      if (r.paymentId === paymentId) return r;
    }
    return null;
  }

  /* =====================================================
  🔥 VERIFY RECEIPT
  ===================================================== */
  verify(receiptId) {
    const receipt = this.getById(receiptId);
    if (!receipt) return false;

    return {
      valid: true,
      paymentId: receipt.paymentId,
      amount: receipt.amount,
    };
  }

  /* =====================================================
  🔥 EXPORT (확장용)
  ===================================================== */
  export(receiptId) {
    const receipt = this.getById(receiptId);
    if (!receipt) throw new Error("RECEIPT_NOT_FOUND");

    // 현재 JSON 반환 (PDF 확장 가능)
    return {
      ...receipt,
      exportedAt: new Date(),
    };
  }

  /* =====================================================
  🔥 ASYNC CREATE
  ===================================================== */
  async createAsync(paymentId) {
    if (!queueService) {
      return this.create(paymentId);
    }

    return queueService.add({
      type: "receipt",
      payload: { paymentId },
      handler: async (payload) => this.create(payload.paymentId),
    });
  }

  /* =====================================================
  🔥 STATS
  ===================================================== */
  getStats() {
    return {
      total: this.store.size,
    };
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.store.clear();
    return true;
  }
}

module.exports = new ReceiptService();