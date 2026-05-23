"use strict";

/* =====================================================
🔥 PAYMENT ANALYZER
👉 결제 데이터 분석
👉 매출 / 환불 / 성공률 / 시간대 분석
👉 analytics / cache / queue 연동
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let analyticsService = null;
let cacheService = null;
let queueService = null;

try { analyticsService = require("./analyticsService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}

/* =====================================================
🔥 SERVICE
===================================================== */
class PaymentAnalyzer {
  constructor() {
    this.lastReport = null;
  }

  /* =====================================================
  🔥 LOAD DATA
  ===================================================== */
  getPaymentEvents() {
    if (!analyticsService) return [];

    try {
      return analyticsService.filterByType("payment");
    } catch (_) {
      return [];
    }
  }

  /* =====================================================
  🔥 BASIC STATS
  ===================================================== */
  getSummary() {
    const events = this.getPaymentEvents();

    let total = 0;
    let success = 0;
    let failed = 0;
    let refunded = 0;

    for (const e of events) {
      const status = e.payload?.status;
      const amount = Number(e.payload?.amount || 0);

      total += amount;

      if (status === "paid") success++;
      else if (status === "failed") failed++;
      else if (status === "refunded") refunded++;
    }

    return {
      totalAmount: total,
      totalCount: events.length,
      success,
      failed,
      refunded,
      successRate: events.length
        ? Math.round((success / events.length) * 100)
        : 0,
    };
  }

  /* =====================================================
  🔥 HOURLY ANALYSIS
  ===================================================== */
  getHourlyStats() {
    const events = this.getPaymentEvents();
    const map = {};

    for (let i = 0; i < 24; i++) {
      map[i] = 0;
    }

    for (const e of events) {
      const hour = new Date(e.createdAt).getHours();
      map[hour] += 1;
    }

    return map;
  }

  /* =====================================================
  🔥 USER ANALYSIS
  ===================================================== */
  getTopUsers(limit = 5) {
    const events = this.getPaymentEvents();
    const map = {};

    for (const e of events) {
      const user = e.userId || "unknown";
      const amount = Number(e.payload?.amount || 0);

      if (!map[user]) map[user] = 0;
      map[user] += amount;
    }

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, total]) => ({ userId, total }));
  }

  /* =====================================================
  🔥 REPORT GENERATION
  ===================================================== */
  generateReport() {
    const report = {
      summary: this.getSummary(),
      hourly: this.getHourlyStats(),
      topUsers: this.getTopUsers(),
      generatedAt: new Date(),
    };

    this.lastReport = report;

    // cache 저장
    if (cacheService) {
      try {
        cacheService.set("payment:report", report, 60);
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
      type: "payment_analyzer",
      payload: {},
      handler: async () => this.generateReport(),
    });
  }

  /* =====================================================
  🔥 GET LAST REPORT
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

module.exports = new PaymentAnalyzer();