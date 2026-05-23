"use strict";

/* =====================================================
🔥 PRICING SERVICE
👉 가격 계산 엔진
👉 기본가 + 시간가 + 할인 + 쿠폰
👉 동적 가격 (시간대 / 수요 기반)
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let cacheService = null;
let analyticsService = null;

try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const PEAK_HOURS = (process.env.PEAK_HOURS || "18,19,20,21").split(",").map(Number);
const PEAK_MULTIPLIER = Number(process.env.PEAK_MULTIPLIER || 1.2);
const OFFPEAK_DISCOUNT = Number(process.env.OFFPEAK_DISCOUNT || 0.9);

/* =====================================================
🔥 HELPER
===================================================== */
function getHour(date) {
  return new Date(date).getHours();
}

function applyDiscount(amount, percent) {
  if (!percent) return amount;
  return Math.max(0, Math.round(amount * (1 - percent / 100)));
}

function applyCoupon(amount, coupon) {
  if (!coupon) return amount;

  if (coupon.type === "percent") {
    return applyDiscount(amount, coupon.value);
  }

  if (coupon.type === "fixed") {
    return Math.max(0, amount - Number(coupon.value || 0));
  }

  return amount;
}

/* =====================================================
🔥 SERVICE
===================================================== */
class PricingService {
  constructor() {
    this.lastCalc = null;
  }

  /* =====================================================
  🔥 BASE PRICE
  ===================================================== */
  calculateBase({ basePrice = 0, duration = 1 }) {
    return Math.round(basePrice * duration);
  }

  /* =====================================================
  🔥 TIME PRICING
  ===================================================== */
  applyTimePricing(amount, date) {
    const hour = getHour(date);

    if (PEAK_HOURS.includes(hour)) {
      return Math.round(amount * PEAK_MULTIPLIER);
    }

    return Math.round(amount * OFFPEAK_DISCOUNT);
  }

  /* =====================================================
  🔥 FINAL PRICE
  ===================================================== */
  calculate(data = {}) {
    const {
      basePrice = 0,
      duration = 1,
      date = new Date(),
      discount = 0,
      coupon = null,
      extra = 0,
    } = data;

    // cache key
    const key = `pricing:${JSON.stringify(data)}`;
    if (cacheService) {
      const cached = cacheService.get(key);
      if (cached) return cached;
    }

    let amount = this.calculateBase({ basePrice, duration });

    // 시간대 반영
    amount = this.applyTimePricing(amount, date);

    // 추가 비용
    amount += Number(extra || 0);

    // 할인
    amount = applyDiscount(amount, discount);

    // 쿠폰
    amount = applyCoupon(amount, coupon);

    const result = {
      basePrice,
      duration,
      finalAmount: amount,
      applied: {
        peak: PEAK_HOURS.includes(getHour(date)),
        discount,
        coupon,
        extra,
      },
      calculatedAt: new Date(),
    };

    this.lastCalc = result;

    /* cache */
    if (cacheService) {
      try {
        cacheService.set(key, result, 60);
      } catch (_) {}
    }

    /* analytics */
    if (analyticsService) {
      try {
        analyticsService.track({
          type: "pricing",
          payload: result,
        });
      } catch (_) {}
    }

    return result;
  }

  /* =====================================================
  🔥 BULK CALC
  ===================================================== */
  calculateMany(list = []) {
    return (Array.isArray(list) ? list : []).map((item) =>
      this.calculate(item)
    );
  }

  /* =====================================================
  🔥 ESTIMATE (간단 계산)
  ===================================================== */
  estimate(basePrice, duration) {
    return this.calculate({ basePrice, duration });
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.lastCalc;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.lastCalc = null;
    return true;
  }
}

module.exports = new PricingService();