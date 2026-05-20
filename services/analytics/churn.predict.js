"use strict";

/* =====================================================
🔥 CHURN PREDICTION SERVICE
👉 사용자 이탈 예측
👉 행동 기반 scoring 모델
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let User = null;
let Reservation = null;
let Payment = null;

let cacheService = null;
let analyticsService = null;

try { User = require("../modules/user/models/User"); } catch (_) {}
try { Reservation = require("../modules/reservation/models/Reservation"); } catch (_) {}
try { Payment = require("../modules/payment/models/Payment"); } catch (_) {}

try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function daysBetween(date) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class ChurnPredictService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 USER ACTIVITY 분석
  ===================================================== */
  async analyzeUser(userId) {
    assert(userId, "USER_ID_REQUIRED");

    const user = await User.findById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    const reservations = await Reservation.find({
      userId,
      isDeleted: false,
    });

    const payments = await Payment.find({
      user: userId,
      isDeleted: false,
    });

    const lastActivity = Math.max(
      user.updatedAt ? new Date(user.updatedAt).getTime() : 0,
      ...reservations.map(r => new Date(r.createdAt).getTime()),
      ...payments.map(p => new Date(p.createdAt).getTime())
    );

    return {
      reservationCount: reservations.length,
      paymentCount: payments.length,
      lastActivity,
    };
  }

  /* =====================================================
  🔥 SCORE 계산
  ===================================================== */
  computeScore(data) {
    let score = 0;

    const daysInactive = daysBetween(data.lastActivity);

    /* 🔥 활동 없음 */
    if (daysInactive > 30) score += 40;
    else if (daysInactive > 14) score += 25;
    else if (daysInactive > 7) score += 10;

    /* 🔥 사용 빈도 */
    if (data.reservationCount < 2) score += 20;
    if (data.paymentCount < 2) score += 20;

    /* 🔥 총 점수 제한 */
    return Math.min(score, 100);
  }

  /* =====================================================
  🔥 등급 분류
  ===================================================== */
  classify(score) {
    if (score >= 70) return "high_risk";
    if (score >= 40) return "medium_risk";
    return "low_risk";
  }

  /* =====================================================
  🔥 MAIN PREDICT
  ===================================================== */
  async predict(userId) {
    const cacheKey = `churn:${userId}`;

    if (cacheService) {
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const data = await this.analyzeUser(userId);

    const score = this.computeScore(data);
    const risk = this.classify(score);

    const result = {
      userId,
      score,
      risk,
      lastActivity: data.lastActivity,
    };

    analyticsService?.track({
      type: "churn_predict",
      userId,
      payload: { score, risk },
    });

    cacheService?.set(cacheKey, result, 300);

    this.last = result;

    return result;
  }

  /* =====================================================
  🔥 BULK PREDICT
  ===================================================== */
  async predictBulk(limit = 100) {
    const users = await User.find({ isDeleted: false })
      .limit(limit);

    const results = [];

    for (const u of users) {
      try {
        const res = await this.predict(u._id);
        results.push(res);
      } catch (_) {}
    }

    return results;
  }

  /* =====================================================
  🔥 HIGH RISK USERS
  ===================================================== */
  async highRiskUsers(limit = 50) {
    const list = await this.predictBulk(limit);

    return list.filter(u => u.risk === "high_risk");
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

module.exports = new ChurnPredictService();