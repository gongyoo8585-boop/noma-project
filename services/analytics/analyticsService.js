"use strict";

/* =====================================================
🔥 ANALYTICS SERVICE
👉 이벤트 트래킹
👉 통계 집계
👉 payment / reservation 분석
👉 cache / queue 연동
👉 legacy analytics require fail 방지
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (_) {
    return null;
  }
}

const cacheService =
  safeRequire("../cache/cacheService") ||
  safeRequire("../cache/cache.service") ||
  safeRequire("./cacheService") ||
  null;

const queueService =
  safeRequire("../queue/queueService") ||
  safeRequire("../queue/queue.service") ||
  safeRequire("./queueService") ||
  null;

/* =====================================================
🔥 SERVICE
===================================================== */
class AnalyticsService {
  constructor() {
    this.events = [];
    this.maxEvents = Number(process.env.ANALYTICS_MAX || 10000);
  }

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

    if (cacheService && typeof cacheService.set === "function") {
      try {
        cacheService.set("analytics:last", data, 60);
      } catch (_) {}
    }

    return data;
  }

  trackMany(events = []) {
    const results = [];

    for (const event of Array.isArray(events) ? events : []) {
      results.push(this.track(event));
    }

    return results;
  }

  getEvents(limit = 50) {
    const safeLimit = Math.max(1, Number(limit || 50));

    return this.events.slice(-safeLimit).reverse();
  }

  filterByType(type) {
    return this.events.filter((event) => event.type === type);
  }

  filterByUser(userId) {
    return this.events.filter(
      (event) => String(event.userId) === String(userId)
    );
  }

  getPaymentStats() {
    const payments = this.filterByType("payment");

    let total = 0;
    const count = payments.length;

    for (const payment of payments) {
      total += Number(payment.payload.amount || 0);
    }

    return {
      count,
      totalAmount: total,
      avgAmount: count ? Math.round(total / count) : 0,
    };
  }

  getReservationStats() {
    const reservations = this.filterByType("reservation");

    return {
      total: reservations.length,
      completed: reservations.filter(
        (reservation) => reservation.payload.status === "completed"
      ).length,
      cancelled: reservations.filter(
        (reservation) => reservation.payload.status === "cancelled"
      ).length,
    };
  }

  getDailyStats() {
    const map = {};

    for (const event of this.events) {
      const day = event.createdAt.toISOString().slice(0, 10);

      if (!map[day]) {
        map[day] = {
          total: 0,
          payment: 0,
          reservation: 0,
        };
      }

      map[day].total += 1;

      if (event.type === "payment") {
        map[day].payment += 1;
      }

      if (event.type === "reservation") {
        map[day].reservation += 1;
      }
    }

    return map;
  }

  async trackAsync(event) {
    if (!queueService || typeof queueService.add !== "function") {
      return this.track(event);
    }

    return queueService.add({
      type: "analytics",
      payload: event,
      handler: async (payload) => this.track(payload),
    });
  }

  clear() {
    const count = this.events.length;

    this.events = [];

    return count;
  }

  getStats() {
    return {
      totalEvents: this.events.length,
      maxEvents: this.maxEvents,
    };
  }

  getAnalytics() {
    return {
      events: this.getEvents(50),
      stats: this.getStats(),
      payment: this.getPaymentStats(),
      reservation: this.getReservationStats(),
      daily: this.getDailyStats(),
    };
  }

  getDashboardStats() {
    return this.getAnalytics();
  }

  getSummary() {
    return this.getAnalytics();
  }

  getShopAnalytics() {
    return {
      totalEvents: this.events.length,
      views: this.filterByType("shop_view").length,
      searches: this.filterByType("shop_search").length,
      reservations: this.filterByType("reservation").length,
    };
  }

  getCacheAnalytics() {
    return {
      enabled: !!cacheService,
      last: cacheService && typeof cacheService.get === "function"
        ? cacheService.get("analytics:last")
        : null,
    };
  }
}

module.exports = new AnalyticsService();