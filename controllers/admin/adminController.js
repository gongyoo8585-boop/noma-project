"use strict";

/* =====================================================
🔥 기존 코드 100% 유지 (절대 삭제 금지)
===================================================== */

const User = require("../../models/User");
const Shop = require("../../models/Shop");
const Reservation = require("../../models/Reservation");

let Review = null;
let Inquiry = null;

try { Review = require("../../models/Review"); } catch (_) {}
try { Inquiry = require("../../models/Inquiry"); } catch (_) {}

const ADMIN_CACHE = {
  dashboard: null,
  dashboardAt: 0,
  users: null,
  usersAt: 0,
  shops: null,
  shopsAt: 0,
  reservations: null,
  reservationsAt: 0,
  logs: [],
  logsAt: 0,
  revenue: null,
  revenueAt: 0
};

const CACHE_TTL = 1000 * 20;

function now() { return Date.now(); }
function isFresh(ts) { return ts && now() - ts < CACHE_TTL; }
function safeNum(v, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function safeStr(v) { return String(v || "").trim(); }
function escapeRegex(v) { return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function normalizeAdminCategory(value) {
  const text = safeStr(value).toLowerCase();

  if (
    text === "karaoke" ||
    text === "노래방" ||
    text === "가라오케" ||
    text === "coin-karaoke" ||
    text === "coin_karaoke" ||
    text === "nora-karaoke" ||
    text === "nora_karaoke"
  ) {
    return "karaoke";
  }

  if (
    text === "massage" ||
    text === "마사지" ||
    text === "shop" ||
    text === "nora-massage" ||
    text === "nora_massage"
  ) {
    return "massage";
  }

  if (
    text.includes("karaoke") ||
    text.includes("노래방") ||
    text.includes("가라오케") ||
    text.includes("코인")
  ) {
    return "karaoke";
  }

  if (
    text.includes("massage") ||
    text.includes("마사지") ||
    text.includes("테라피") ||
    text.includes("아로마") ||
    text.includes("스웨디시")
  ) {
    return "massage";
  }

  return "";
}

function getRequestAdminCategory(req) {
  const explicitCategory =
    normalizeAdminCategory(req.query?.category) ||
    normalizeAdminCategory(req.query?.shopCategory) ||
    normalizeAdminCategory(req.query?.serviceType) ||
    normalizeAdminCategory(req.query?.businessType) ||
    normalizeAdminCategory(req.query?.adminCategory) ||
    normalizeAdminCategory(req.body?.category) ||
    normalizeAdminCategory(req.body?.shopCategory) ||
    normalizeAdminCategory(req.body?.serviceType) ||
    normalizeAdminCategory(req.body?.businessType) ||
    normalizeAdminCategory(req.body?.adminCategory);

  if (explicitCategory) return explicitCategory;

  const requestPath = safeStr(
    req.originalUrl ||
    req.url ||
    req.path ||
    ""
  ).toLowerCase();

  if (
    requestPath.includes("/karaoke") ||
    requestPath.includes("category=karaoke") ||
    requestPath.includes("shopcategory=karaoke") ||
    requestPath.includes("servicetype=karaoke") ||
    requestPath.includes("businesstype=karaoke") ||
    requestPath.includes("admincategory=karaoke")
  ) {
    return "karaoke";
  }

  if (
    requestPath.includes("/massage") ||
    requestPath.includes("category=massage") ||
    requestPath.includes("shopcategory=massage") ||
    requestPath.includes("servicetype=massage") ||
    requestPath.includes("businesstype=massage") ||
    requestPath.includes("admincategory=massage")
  ) {
    return "massage";
  }

  return "all";
}

function getShopCategoryQuery(category) {
  const normalizedCategory = normalizeAdminCategory(category);

  const categoryFields = [
    "category",
    "shopCategory",
    "serviceType",
    "businessType",
    "adminCategory",
    "categoryGroup",
    "shopType",
    "mainCategory",
    "service",
  ];

  const karaokeValues = [
    "karaoke",
    "노래방",
    "가라오케",
    "coin-karaoke",
    "coin_karaoke",
    "nora-karaoke",
    "nora_karaoke",
  ];

  const massageValues = [
    "massage",
    "마사지",
    "shop",
    "nora-massage",
    "nora_massage",
  ];

  const karaokeRegex = /(karaoke|노래방|가라오케|코인)/i;
  const massageRegex = /(massage|마사지|테라피|아로마|스웨디시)/i;

  if (!normalizedCategory) {
    return {};
  }

  if (normalizedCategory === "karaoke") {
    return {
      $or: [
        ...categoryFields.map((field) => ({
          [field]: { $in: karaokeValues },
        })),
        ...categoryFields.map((field) => ({
          [field]: karaokeRegex,
        })),
      ],
    };
  }

  if (normalizedCategory === "massage") {
    return {
      $or: [
        ...categoryFields.map((field) => ({
          [field]: { $in: massageValues },
        })),
        ...categoryFields.map((field) => ({
          [field]: massageRegex,
        })),
      ],
    };
  }

  return {};
}
function ok(res, data = {}) { return res.json({ ok: true, ...data }); }
function fail(res, status = 400, msg = "ERROR") { return res.status(status).json({ ok: false, msg }); }

function log(action, meta = {}) {
  ADMIN_CACHE.logs.unshift({ action, time: new Date(), meta });
  if (ADMIN_CACHE.logs.length > 1000) ADMIN_CACHE.logs = ADMIN_CACHE.logs.slice(0, 1000);
}

function normalizeUser(u) {
  return {
    _id: u._id,
    email: u.email || "",
    name: u.nickname || "",
    role: u.role || "user",
    point: safeNum(u.point),
    isActive: u.isActive !== false,
    isDeleted: !!u.isDeleted,
    createdAt: u.createdAt
  };
}

function normalizeShop(s) {
  return {
    _id: s._id,
    name: s.name || "",
    region: s.region || "",
    rating: safeNum(s.ratingAvg),
    reservationCount: safeNum(s.reservationCount),
    category: s.category || "",
    shopCategory: s.shopCategory || "",
    serviceType: s.serviceType || "",
    businessType: s.businessType || "",
    adminCategory: s.adminCategory || "",
    visible: s.visible !== false,
    status: s.status || "active",
    isDeleted: !!s.isDeleted
  };
}

function normalizeReservation(r) {
  return {
    _id: r._id,
    userId: r.userId,
    placeId: r.placeId,
    status: r.status,
    paymentAmount: safeNum(r.paymentAmount),
    time: r.time
  };
}

function safe(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) {
      console.error(e);
      return fail(res, 500, e.message || "SERVER_ERROR");
    }
  };
}

/* =====================================================
🔥 기존 기능 유지
===================================================== */

exports.getFull = safe(async (req, res) => {
  const adminCategory = getRequestAdminCategory(req);
  const cacheKey = `dashboard_${adminCategory}`;
  const cacheAtKey = `dashboardAt_${adminCategory}`;

  if (ADMIN_CACHE[cacheKey] && isFresh(ADMIN_CACHE[cacheAtKey])) {
    log("dashboard.cache", { category: adminCategory });
    return ok(res, ADMIN_CACHE[cacheKey]);
  }

  const dashboardShopBaseQuery = {
    isDeleted: { $ne: true },
    visible: { $ne: false },
    status: {
      $nin: [
        "deleted",
        "inactive",
        "disabled",
        "hidden",
        "closed",
      ],
    },
  };

  const dashboardShopQuery = {
    $and: [
      dashboardShopBaseQuery,
      getShopCategoryQuery(adminCategory),
    ],
  };

  const [users, shops, reservations, reviews, inquiries, recentShops] = await Promise.all([
    User.countDocuments({
      isDeleted: false
    }),

    Shop.countDocuments(dashboardShopQuery),

    Reservation.countDocuments({
      isDeleted: false
    }),

    Review ? Review.countDocuments({ isDeleted: { $ne: true } }) : 0,

    Inquiry ? Inquiry.countDocuments({ isDeleted: { $ne: true } }) : 0,

    Shop.find(dashboardShopQuery)
      .sort({ createdAt: -1, _id: -1 })
      .limit(10)
      .lean()
  ]);

  const revenue = await Reservation.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $group: { _id: null, total: { $sum: "$paymentAmount" } } }
  ]);

  const normalizedRecentShops = Array.isArray(recentShops)
    ? recentShops.map(normalizeShop)
    : [];

  const payload = {
    category: adminCategory,
    summary: {
      totalUsers: users,
      totalShops: shops,
      totalReservations: reservations,
      totalPayments: 0,
      totalRevenue: revenue?.[0]?.total || 0
    },
    stats: {
      users,
      shops,
      reservations,
      reviews,
      inquiries,
      revenue: revenue?.[0]?.total || 0
    },
    recent: {
      shops: normalizedRecentShops,
      users: [],
      reservations: []
    },
    shops: normalizedRecentShops
  };

  ADMIN_CACHE[cacheKey] = payload;
  ADMIN_CACHE[cacheAtKey] = now();
  ADMIN_CACHE.dashboard = payload;
  ADMIN_CACHE.dashboardAt = ADMIN_CACHE[cacheAtKey];

  log("dashboard", { category: adminCategory });
  return ok(res, payload);
});

/* =====================================================
🔥 🔥 여기부터 확장 (기존 코드 절대 건드리지 않음)
===================================================== */

/* =====================================================
🔥 실시간 통계 (신규)
===================================================== */
exports.getLiveStats = safe(async (req, res) => {
  const [users, reservations, revenue] = await Promise.all([
    User.countDocuments(),
    Reservation.countDocuments(),
    Reservation.aggregate([
      { $group: { _id: null, total: { $sum: "$paymentAmount" } } }
    ])
  ]);

  return ok(res, {
    users,
    reservations,
    revenue: revenue?.[0]?.total || 0,
    time: new Date()
  });
});

/* =====================================================
🔥 유저 상세 조회 (신규)
===================================================== */
exports.getUserDetail = safe(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) return fail(res, 404, "NOT_FOUND");

  const reservationCount = await Reservation.countDocuments({ userId: user._id });

  return ok(res, {
    user: normalizeUser(user),
    reservationCount
  });
});

/* =====================================================
🔥 매출 상세 (신규)
===================================================== */
exports.getRevenueDetail = safe(async (req, res) => {
  const data = await Reservation.aggregate([
    {
      $group: {
        _id: "$status",
        total: { $sum: "$paymentAmount" },
        count: { $sum: 1 }
      }
    }
  ]);

  return ok(res, { breakdown: data });
});

/* =====================================================
🔥 예약 상세 조회 (신규)
===================================================== */
exports.getReservationDetail = safe(async (req, res) => {
  const item = await Reservation.findById(req.params.id).lean();
  if (!item) return fail(res, 404, "NOT_FOUND");

  return ok(res, { reservation: item });
});

/* =====================================================
🔥 관리자 강제 상태 변경 (확장)
===================================================== */
exports.forceReservationStatus = safe(async (req, res) => {
  const r = await Reservation.findById(req.params.id);
  if (!r) return fail(res, 404, "NOT_FOUND");

  r.status = req.body.status || r.status;
  r.adminModified = true;

  await r.save();

  log("force.status", { id: r._id });

  return ok(res, r);
});

/* =====================================================
🔥 사용자 포인트 수정 (신규)
===================================================== */
exports.adjustUserPoint = safe(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return fail(res, 404, "NOT_FOUND");

  const amount = safeNum(req.body.amount, 0);
  user.point = safeNum(user.point) + amount;

  await user.save();

  log("point.adjust", { id: user._id, amount });

  return ok(res, user);
});

/* =====================================================
🔥 활동 로그 검색 (신규)
===================================================== */
exports.searchLogs = safe(async (req, res) => {
  const q = safeStr(req.query.q);

  const filtered = ADMIN_CACHE.logs.filter(l =>
    JSON.stringify(l).toLowerCase().includes(q.toLowerCase())
  );

  return ok(res, { logs: filtered.slice(0, 200) });
});

/* =====================================================
🔥 시스템 상태 확장 (신규)
===================================================== */
exports.getSystemStatus = safe(async (req, res) => {
  return ok(res, {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cacheSize: Object.keys(ADMIN_CACHE).length,
    logs: ADMIN_CACHE.logs.length
  });
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 adminController FINAL EXPANDED (NO LOSS)");

module.exports = exports;
