"use strict";

/* =====================================================
🔥 ANALYTICS SERVICE
👉 이벤트 트래킹
👉 통계 집계
👉 payment / reservation 분석
👉 cache / queue 연동
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let queueService = null;

try {
  cacheService = require("./cacheService");
} catch (_) {}

try {
  queueService = require("./queueService");
} catch (_) {}

/* =====================================================
🔥 SERVICE
===================================================== */
class AnalyticsService {
  constructor() {
    this.events = [];
    this.maxEvents = Number(process.env.ANALYTICS_MAX || 10000);
  }

  /* =====================================================
  🔥 TRACK EVENT
  ===================================================== */
  track(event = {}) {
    const data = {
      type: event.type || "unknown",
      payload: event.payload || {},
      userId: event.userId || null,
      createdAt: new Date(),
    };

    this.events.push(data);

    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // cache 저장
    if (cacheService) {
      try {
        cacheService.set("analytics:last", data, 60);
      } catch (_) {}
    }

    return data;
  }

  /* =====================================================
  🔥 BULK TRACK
  ===================================================== */
  trackMany(events = []) {
    const results = [];

    for (const e of Array.isArray(events) ? events : []) {
      results.push(this.track(e));
    }

    return results;
  }

  /* =====================================================
  🔥 GET EVENTS
  ===================================================== */
  getEvents(limit = 50) {
    return this.events.slice(-limit).reverse();
  }

  /* =====================================================
  🔥 FILTER EVENTS
  ===================================================== */
  filterByType(type) {
    return this.events.filter(e => e.type === type);
  }

  filterByUser(userId) {
    return this.events.filter(e => String(e.userId) === String(userId));
  }

  /* =====================================================
  🔥 PAYMENT ANALYTICS
  ===================================================== */
  getPaymentStats() {
    const payments = this.filterByType("payment");

    let total = 0;
    let count = payments.length;

    for (const p of payments) {
      total += Number(p.payload.amount || 0);
    }

    return {
      count,
      totalAmount: total,
      avgAmount: count ? Math.round(total / count) : 0,
    };
  }

  /* =====================================================
  🔥 RESERVATION ANALYTICS
  ===================================================== */
  getReservationStats() {
    const reservations = this.filterByType("reservation");

    return {
      total: reservations.length,
      completed: reservations.filter(r => r.payload.status === "completed").length,
      cancelled: reservations.filter(r => r.payload.status === "cancelled").length,
    };
  }

  /* =====================================================
  🔥 DAILY STATS
  ===================================================== */
  getDailyStats() {
    const map = {};

    for (const e of this.events) {
      const day = e.createdAt.toISOString().slice(0, 10);

      if (!map[day]) {
        map[day] = {
          total: 0,
          payment: 0,
          reservation: 0,
        };
      }

      map[day].total += 1;

      if (e.type === "payment") map[day].payment += 1;
      if (e.type === "reservation") map[day].reservation += 1;
    }

    return map;
  }

  /* =====================================================
  🔥 QUEUE INTEGRATION (비동기 분석)
  ===================================================== */
  async trackAsync(event) {
    if (!queueService) return this.track(event);

    return queueService.add({
      type: "analytics",
      payload: event,
      handler: async (payload) => this.track(payload),
    });
  }

  /* =====================================================
  🔥 CLEAR
  ===================================================== */
  clear() {
    const count = this.events.length;
    this.events = [];
    return count;
  }

  /* =====================================================
  🔥 STATS
  ===================================================== */
  getStats() {
    return {
      totalEvents: this.events.length,
      maxEvents: this.maxEvents,
    };
  }
}

module.exports = new AnalyticsService();