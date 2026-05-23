"use strict";

/* =====================================================
🔥 COLLABORATIVE RECOMMENDATION SERVICE
👉 사용자 기반 협업 필터링
👉 예약/결제 기반 추천
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let Reservation = null;
let Payment = null;

let cacheService = null;
let analyticsService = null;

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

/* 코사인 유사도 */
function cosineSimilarity(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

  let dot = 0;
  let normA = 0;
  let normB = 0;

  keys.forEach(k => {
    const x = a[k] || 0;
    const y = b[k] || 0;

    dot += x * y;
    normA += x * x;
    normB += y * y;
  });

  if (!normA || !normB) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/* =====================================================
🔥 SERVICE
===================================================== */
class CollaborativeRecommendService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 USER VECTOR 생성
  ===================================================== */
  async buildUserVector(userId) {
    const reservations = await Reservation.find({
      userId,
      isDeleted: false,
    });

    const vector = {};

    for (const r of reservations) {
      const key = String(r.shopId || r.serviceId || "unknown");
      vector[key] = (vector[key] || 0) + 1;
    }

    return vector;
  }

  /* =====================================================
  🔥 전체 사용자 벡터 생성
  ===================================================== */
  async buildAllUsers() {
    const reservations = await Reservation.find({
      isDeleted: false,
    });

    const users = {};

    for (const r of reservations) {
      const u = String(r.userId);
      const key = String(r.shopId || "unknown");

      if (!users[u]) users[u] = {};
      users[u][key] = (users[u][key] || 0) + 1;
    }

    return users;
  }

  /* =====================================================
  🔥 유사 사용자 찾기
  ===================================================== */
  async findSimilarUsers(userId, topN = 5) {
    const cacheKey = `recommend:similar:${userId}`;

    if (cacheService) {
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const target = await this.buildUserVector(userId);
    const allUsers = await this.buildAllUsers();

    const scores = [];

    for (const [uid, vector] of Object.entries(allUsers)) {
      if (uid === String(userId)) continue;

      const sim = cosineSimilarity(target, vector);

      if (sim > 0) {
        scores.push({ userId: uid, score: sim });
      }
    }

    scores.sort((a, b) => b.score - a.score);

    const result = scores.slice(0, topN);

    cacheService?.set(cacheKey, result, 60);

    return result;
  }

  /* =====================================================
  🔥 추천 생성
  ===================================================== */
  async recommend(userId, limit = 5) {
    assert(userId, "USER_ID_REQUIRED");

    const cacheKey = `recommend:${userId}`;

    if (cacheService) {
      const cached = cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const similarUsers = await this.findSimilarUsers(userId);

    const targetVector = await this.buildUserVector(userId);

    const scores = {};

    for (const simUser of similarUsers) {
      const vector = await this.buildUserVector(simUser.userId);

      for (const [item, count] of Object.entries(vector)) {
        if (targetVector[item]) continue;

        scores[item] = (scores[item] || 0) + count * simUser.score;
      }
    }

    const ranked = Object.entries(scores)
      .map(([item, score]) => ({ item, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    analyticsService?.track({
      type: "recommend_collab",
      userId,
      payload: { count: ranked.length },
    });

    cacheService?.set(cacheKey, ranked, 60);

    this.last = ranked;

    return ranked;
  }

  /* =====================================================
  🔥 인기 기반 fallback
  ===================================================== */
  async popular(limit = 5) {
    const reservations = await Reservation.find({
      isDeleted: false,
    });

    const count = {};

    for (const r of reservations) {
      const key = String(r.shopId || "unknown");
      count[key] = (count[key] || 0) + 1;
    }

    return Object.entries(count)
      .map(([item, c]) => ({ item, score: c }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /* =====================================================
  🔥 SAFE RECOMMEND (fallback 포함)
  ===================================================== */
  async safeRecommend(userId, limit = 5) {
    try {
      const rec = await this.recommend(userId, limit);

      if (!rec.length) {
        return this.popular(limit);
      }

      return rec;
    } catch (err) {
      return this.popular(limit);
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

module.exports = new CollaborativeRecommendService();