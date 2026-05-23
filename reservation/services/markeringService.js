"use strict";

/* =====================================================
🔥 RESERVATION MARKETING SERVICE (FINAL MASTER)
프로모션 / 이벤트 / 추천 / 푸시 / 배너 / 캠페인
기존 구조 유지 + 확장형
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

const User =
  safeRequire("../../models/User");

const Shop =
  safeRequire("../../models/Shop");

/* =====================================================
🔥 SERVICES
===================================================== */
const notifyService =
  safeRequire("../../services/notifyService");

const cacheService =
  safeRequire("./cacheService");

/* =====================================================
🔥 INTERNAL CACHE
===================================================== */
const CACHE = new Map();
const TTL = 1000 * 30;

function cacheSet(key, value) {
  CACHE.set(key, { value, exp: Date.now() + TTL });
}

function cacheGet(key) {
  const v = CACHE.get(key);
  if (!v) return null;
  if (Date.now() > v.exp) {
    CACHE.delete(key);
    return null;
  }
  return v.value;
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
class MarketingService {

  /* =====================================================
  🔥 추천 매장
  ===================================================== */
  async getRecommendedShops(limit = 10) {
    const key = "recommend:shops:" + limit;
    const cached = cacheGet(key);
    if (cached) return cached;

    const result = await Reservation.aggregate([
      {
        $group: {
          _id: "$shopId",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: limit }
    ]);

    cacheSet(key, result);
    return result;
  }

  /* =====================================================
  🔥 인기 시간대
  ===================================================== */
  async getHotTimeSlots() {
    return Reservation.aggregate([
      {
        $group: {
          _id: { $hour: "$time" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
  }

  /* =====================================================
  🔥 유저 타겟 추천
  ===================================================== */
  async getUserRecommendations(userId) {
    const recent = await Reservation.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    const shopIds = recent.map(r => r.shopId);

    return Shop.find({ _id: { $in: shopIds } }).limit(10);
  }

  /* =====================================================
  🔥 이벤트 생성
  ===================================================== */
  createEvent({ title, message, discount = 0 }) {
    return {
      id: "event_" + Date.now(),
      title,
      message,
      discount,
      createdAt: now()
    };
  }

  /* =====================================================
  🔥 전체 푸시
  ===================================================== */
  async broadcast(message) {
    if (!User || !notifyService) return false;

    const users = await User.find({ isDeleted: false }).select("_id");

    for (const u of users) {
      notifyService.pushAsync?.({
        userId: u._id,
        type: "marketing",
        message
      });
    }

    return true;
  }

  /* =====================================================
  🔥 타겟 푸시
  ===================================================== */
  async targetPush(userIds = [], message) {
    if (!notifyService) return false;

    for (const id of userIds) {
      notifyService.pushAsync?.({
        userId: id,
        type: "marketing",
        message
      });
    }

    return true;
  }

  /* =====================================================
  🔥 쿠폰 생성
  ===================================================== */
  generateCoupon(userId, percent = 10) {
    return {
      code: "CP-" + Date.now(),
      userId,
      discount: percent,
      expiresAt: new Date(Date.now() + 7 * 86400000)
    };
  }

  /* =====================================================
  🔥 배너 리스트
  ===================================================== */
  getBanners() {
    return [
      { id: 1, title: "첫 예약 20% 할인", active: true },
      { id: 2, title: "주말 이벤트 진행중", active: true }
    ];
  }

  /* =====================================================
  🔥 이벤트 리스트
  ===================================================== */
  getEvents() {
    return [
      { id: 1, title: "봄 맞이 할인", discount: 15 },
      { id: 2, title: "VIP 고객 이벤트", discount: 20 }
    ];
  }

  /* =====================================================
  🔥 공지사항
  ===================================================== */
  getNotices() {
    return [
      { id: 1, title: "서비스 점검 안내" },
      { id: 2, title: "신규 매장 오픈" }
    ];
  }

  /* =====================================================
  🔥 마케팅 성과
  ===================================================== */
  async getPerformance() {
    const total = await Reservation.countDocuments();
    const confirmed = await Reservation.countDocuments({ status: "confirmed" });

    return {
      conversion: total ? confirmed / total : 0,
      total
    };
  }

  /* =====================================================
  🔥 리텐션 분석
  ===================================================== */
  async getRetention() {
    if (!User) return {};

    const total = await User.countDocuments();
    const active = await User.countDocuments({ isActive: true });

    return {
      total,
      active,
      retentionRate: total ? active / total : 0
    };
  }

  /* =====================================================
  🔥 캠페인 실행
  ===================================================== */
  async runCampaign({ message, target = "all" }) {
    if (target === "all") {
      return this.broadcast(message);
    }

    return false;
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
module.exports = new MarketingService();