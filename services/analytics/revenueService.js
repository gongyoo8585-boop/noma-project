"use strict";

/* =====================================================
🔥 REVENUE SERVICE
👉 매출 집계 / 분석
👉 payment 기반 통계
👉 analytics / cache / queue 연동
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Payment = null;
let analyticsService = null;
let cacheService = null;
let queueService = null;

try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function toMonthKey(date) {
  return new Date(date).toISOString().slice(0, 7);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class RevenueService {
  constructor() {
    this.lastReport = null;
  }

  /* =====================================================
  🔥 LOAD PAYMENTS
  ===================================================== */
  async loadPayments() {
    if (!Payment) return [];

    try {
      return await Payment.find({ isDeleted: false }).lean();
    } catch (_) {
      return [];
    }
  }

  /* =====================================================
  🔥 SUMMARY
  ===================================================== */
  async getSummary() {
    const payments = await this.loadPayments();

    let total = 0;
    let refunded = 0;
    let count = 0;

    for (const p of payments) {
      const paid = Number(p.paidAmount || p.amount || 0);
      const refund = Number(p.refundedAmount || 0);

      if (p.status === "paid" || p.status === "partial_refunded") {
        total += paid;
        refunded += refund;
        count++;
      }
    }

    return {
      totalRevenue: total,
      totalRefunded: refunded,
      netRevenue: total - refunded,
      count,
    };
  }

  /* =====================================================
  🔥 DAILY
  ===================================================== */
  async getDailyRevenue() {
    const payments = await this.loadPayments();
    const map = {};

    for (const p of payments) {
      const key = toDateKey(p.createdAt);

      if (!map[key]) {
        map[key] = {
          total: 0,
          refunded: 0,
        };
      }

      const paid = Number(p.paidAmount || p.amount || 0);
      const refund = Number(p.refundedAmount || 0);

      map[key].total += paid;
      map[key].refunded += refund;
    }

    return map;
  }

  /* =====================================================
  🔥 MONTHLY
  ===================================================== */
  async getMonthlyRevenue() {
    const payments = await this.loadPayments();
    const map = {};

    for (const p of payments) {
      const key = toMonthKey(p.createdAt);

      if (!map[key]) {
        map[key] = {
          total: 0,
          refunded: 0,
        };
      }

      const paid = Number(p.paidAmount || p.amount || 0);
      const refund = Number(p.refundedAmount || 0);

      map[key].total += paid;
      map[key].refunded += refund;
    }

    return map;
  }

  /* =====================================================
  🔥 PROVIDER ANALYSIS
  ===================================================== */
  async getProviderStats() {
    const payments = await this.loadPayments();
    const map = {};

    for (const p of payments) {
      const provider = p.provider || "unknown";

      if (!map[provider]) {
        map[provider] = {
          total: 0,
          count: 0,
        };
      }

      const amount = Number(p.paidAmount || p.amount || 0);

      map[provider].total += amount;
      map[provider].count += 1;
    }

    return map;
  }

  /* =====================================================
  🔥 REPORT
  ===================================================== */
  async generateReport() {
    const summary = await this.getSummary();
    const daily = await this.getDailyRevenue();
    const monthly = await this.getMonthlyRevenue();
    const providers = await this.getProviderStats();

    const report = {
      summary,
      daily,
      monthly,
      providers,
      generatedAt: new Date(),
    };

    this.lastReport = report;

    /* cache */
    if (cacheService) {
      try {
        cacheService.set("revenue:report", report, 60);
      } catch (_) {}
    }

    /* analytics */
    if (analyticsService) {
      try {
        analyticsService.track({
          type: "revenue",
          payload: summary,
        });
      } catch (_) {}
    }

    return report;
  }

  /* =====================================================
  🔥 ASYNC REPORT
  ===================================================== */
  async generateAsync() {
    if (!queueService) {
      return this.generateReport();
    }

    return queueService.add({
      type: "revenue",
      payload: {},
      handler: async () => this.generateReport(),
    });
  }

  /* =====================================================
  🔥 LAST REPORT
  ===================================================== */
  getLastReport() {
    return this.lastReport;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.lastReport = null;
    return true;
  }
}

module.exports = new RevenueService();