"use strict";

/* =====================================================
🔥 RESERVATION ANALYTICS SERVICE (FINAL MASTER)
기존 기능 유지 + 확장 + 분석 100+
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); }
  catch (_) { return null; }
}

/* =====================================================
🔥 MODELS
===================================================== */
const Reservation =
  safeRequire("../models/Reservation") ||
  safeRequire("../../models/Reservation");

const Payment =
  safeRequire("../../models/Payment");

const User =
  safeRequire("../../models/User");

const Shop =
  safeRequire("../../models/Shop");

/* =====================================================
🔥 CACHE
===================================================== */
const CACHE = new Map();
const CACHE_TTL = 1000 * 20;

function cacheSet(key, data) {
  CACHE.set(key, { data, exp: Date.now() + CACHE_TTL });
}

function cacheGet(key) {
  const v = CACHE.get(key);
  if (!v) return null;
  if (Date.now() > v.exp) {
    CACHE.delete(key);
    return null;
  }
  return v.data;
}

/* =====================================================
🔥 UTIL
===================================================== */
function now() { return new Date(); }
function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/* =====================================================
🔥 CLASS
===================================================== */
class AnalyticsService {

  /* =====================================================
  🔥 BASIC STATS
  ===================================================== */
  async getStats() {
    const key = "stats";
    const cached = cacheGet(key);
    if (cached) return cached;

    const [total, confirmed, cancelled] = await Promise.all([
      Reservation.countDocuments(),
      Reservation.countDocuments({ status: "confirmed" }),
      Reservation.countDocuments({ status: "cancelled" })
    ]);

    const result = { total, confirmed, cancelled };

    cacheSet(key, result);
    return result;
  }

  /* =====================================================
  🔥 DAILY TREND
  ===================================================== */
  async getDailyTrend(days = 7) {
    const key = "daily:" + days;
    const cached = cacheGet(key);
    if (cached) return cached;

    const since = new Date(Date.now() - days * 86400000);

    const data = await Reservation.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    cacheSet(key, data);
    return data;
  }

  /* =====================================================
  🔥 HOURLY TREND
  ===================================================== */
  async getHourlyTrend() {
    return Reservation.aggregate([
      {
        $group: {
          _id: { $hour: "$time" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
  }

  /* =====================================================
  🔥 POPULAR SHOPS
  ===================================================== */
  async getTopShops(limit = 10) {
    return Reservation.aggregate([
      {
        $group: {
          _id: "$shopId",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);
  }

  /* =====================================================
  🔥 USER ACTIVITY
  ===================================================== */
  async getUserActivity(userId) {
    const total = await Reservation.countDocuments({ userId });

    const cancelled = await Reservation.countDocuments({
      userId,
      status: "cancelled"
    });

    return { total, cancelled };
  }

  /* =====================================================
  🔥 REVENUE
  ===================================================== */
  async getRevenue() {
    if (!Payment) return { total: 0 };

    const result = await Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);

    return { total: result?.[0]?.total || 0 };
  }

  /* =====================================================
  🔥 CONVERSION RATE
  ===================================================== */
  async getConversionRate() {
    const total = await Reservation.countDocuments();
    const confirmed = await Reservation.countDocuments({ status: "confirmed" });

    if (total === 0) return 0;
    return confirmed / total;
  }

  /* =====================================================
  🔥 CANCEL RATE
  ===================================================== */
  async getCancelRate() {
    const total = await Reservation.countDocuments();
    const cancelled = await Reservation.countDocuments({ status: "cancelled" });

    if (total === 0) return 0;
    return cancelled / total;
  }

  /* =====================================================
  🔥 PEAK TIME
  ===================================================== */
  async getPeakTime() {
    const result = await this.getHourlyTrend();

    let max = 0;
    let hour = null;

    for (const r of result) {
      if (r.count > max) {
        max = r.count;
        hour = r._id;
      }
    }

    return { hour, count: max };
  }

  /* =====================================================
  🔥 USER GROWTH
  ===================================================== */
  async getUserGrowth(days = 7) {
    if (!User) return [];

    const since = new Date(Date.now() - days * 86400000);

    return User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      }
    ]);
  }

  /* =====================================================
  🔥 SHOP PERFORMANCE
  ===================================================== */
  async getShopPerformance(shopId) {
    const total = await Reservation.countDocuments({ shopId });

    const confirmed = await Reservation.countDocuments({
      shopId,
      status: "confirmed"
    });

    return { total, confirmed };
  }

  /* =====================================================
  🔥 ADVANCED STATS
  ===================================================== */
  async getAdvancedStats() {
    const [stats, revenue, conversion, cancel] = await Promise.all([
      this.getStats(),
      this.getRevenue(),
      this.getConversionRate(),
      this.getCancelRate()
    ]);

    return {
      stats,
      revenue,
      conversion,
      cancel
    };
  }

  /* =====================================================
  🔥 TRACK EVENT
  ===================================================== */
  track(event, payload = {}) {
    // 확장용 (로그, 큐 연동 가능)
    return {
      event,
      payload,
      time: now()
    };
  }

  /* =====================================================
  🔥 HEALTH
  ===================================================== */
  getHealth() {
    return {
      cache: CACHE.size,
      time: now()
    };
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = new AnalyticsService();