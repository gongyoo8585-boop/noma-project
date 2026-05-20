"use strict";

/* =====================================================
🔥 REVENUE PREDICTION SERVICE
👉 매출 예측 (기본 ML-lite)
👉 과거 데이터 기반 예측
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Payment = null;

let cacheService = null;
let analyticsService = null;

try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}

try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* 날짜 그룹 */
function groupByDay(payments) {
  const map = {};

  for (const p of payments) {
    const date = new Date(p.createdAt).toISOString().slice(0, 10);

    const amount = Number(p.paidAmount || p.amount || 0);

    map[date] = (map[date] || 0) + amount;
  }

  return map;
}

/* 이동 평균 */
function movingAverage(arr, window = 7) {
  const result = [];

  for (let i = 0; i < arr.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = arr.slice(start, i + 1);

    const avg =
      slice.reduce((a, b) => a + b, 0) / slice.length;

    result.push(avg);
  }

  return result;
}

/* =====================================================
🔥 SERVICE
===================================================== */
class RevenuePredictService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 LOAD DATA
  ===================================================== */
  async loadData(days = 30) {
    assert(Payment, "PAYMENT_MODEL_MISSING");

    const since = new Date();
    since.setDate(since.getDate() - days);

    const payments = await Payment.find({
      createdAt: { $gte: since },
      status: { $in: ["paid", "partial_refunded"] },
      isDeleted: false,
    });

    return payments;
  }

  /* =====================================================
  🔥 PREPARE DATA
  ===================================================== */
  prepare(payments) {
    const grouped = groupByDay(payments);

    const dates = Object.keys(grouped).sort();

    const series = dates.map(d => grouped[d]);

    return { dates, series };
  }

  /* =====================================================
  🔥 PREDICT (핵심)
  ===================================================== */
  predictSeries(series, days = 7) {
    const ma = movingAverage(series, 7);

    const last = ma[ma.length - 1] || 0;

    const trend =
      series.length > 1
        ? (series[series.length - 1] - series[0]) /
          series.length
        : 0;

    const predictions = [];

    for (let i = 1; i <= days; i++) {
      const value = Math.max(0, last + trend * i);
      predictions.push(Math.round(value));
    }

    return predictions;
  }

  /* =====================================================
  🔥 MAIN PREDICT
  ===================================================== */
  async predict({ days = 7 } = {}) {
    const cacheKey = `revenue:predict:${days}`;

    if (cacheService) {
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const payments = await this.loadData();

    const { dates, series } = this.prepare(payments);

    const forecast = this.predictSeries(series, days);

    const result = {
      history: series,
      forecast,
      lastDate: dates[dates.length - 1],
    };

    analyticsService?.track({
      type: "revenue_predict",
      payload: { days },
    });

    cacheService?.set(cacheKey, result, 300);

    this.last = result;

    return result;
  }

  /* =====================================================
  🔥 TOTAL FORECAST
  ===================================================== */
  async totalForecast(days = 7) {
    const data = await this.predict({ days });

    const sum = data.forecast.reduce((a, b) => a + b, 0);

    return {
      total: sum,
      daily: data.forecast,
    };
  }

  /* =====================================================
  🔥 GROWTH RATE
  ===================================================== */
  async growthRate() {
    const payments = await this.loadData(14);

    const { series } = this.prepare(payments);

    if (series.length < 2) return 0;

    const mid = Math.floor(series.length / 2);

    const first =
      series.slice(0, mid).reduce((a, b) => a + b, 0);

    const second =
      series.slice(mid).reduce((a, b) => a + b, 0);

    if (!first) return 0;

    return ((second - first) / first).toFixed(2);
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

module.exports = new RevenuePredictService();