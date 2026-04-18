const User = require("../models/User");
const Shop = require("../models/Shop");
const Reservation = require("../models/Reservation");
let Review = null;
let Inquiry = null;

try {
  Review = require("../models/Review");
} catch (_) {}

try {
  Inquiry = require("../models/Inquiry");
} catch (_) {}

/* =====================================================
🔥 NOMA ADMIN CONTROLLER - FINAL COMPLETE
👉 /controllers/adminController.js
👉 기존 구조 유지 + 관리자 대시보드용 API 완성형
===================================================== */

/* =========================
공통 유틸
========================= */
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
  logsAt: 0
};

const CACHE_TTL = 1000 * 20;

function now() {
  return Date.now();
}

function isFresh(ts) {
  return ts && now() - ts < CACHE_TTL;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeStr(v) {
  return String(v || "").trim();
}

function escapeRegex(v) {
  return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pushLog(action, meta = {}) {
  ADMIN_CACHE.logs.unshift({
    action,
    path: meta.path || "",
    message: meta.message || "",
    time: new Date(),
    meta
  });

  if (ADMIN_CACHE.logs.length > 500) {
    ADMIN_CACHE.logs = ADMIN_CACHE.logs.slice(0, 500);
  }

  ADMIN_CACHE.logsAt = now();
}

function ok(res, data = {}) {
  return res.json({ ok: true, ...data });
}

function fail(res, status = 400, msg = "ERROR") {
  return res.status(status).json({ ok: false, msg });
}

function normalizeUser(user) {
  if (!user) return null;

  return {
    _id: user._id,
    id: user.id || "",
    email: user.email || user.id || "",
    name: user.nickname || "",
    nickname: user.nickname || "",
    role: user.role || "user",
    point: safeNum(user.point),
    isActive: user.isActive !== false,
    isDeleted: !!user.isDeleted,
    phone: user.phone || "",
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
    lastLoginAt: user.lastLoginAt || null,
    loginCount: safeNum(user.loginCount)
  };
}

function normalizeShop(shop) {
  if (!shop) return null;

  return {
    _id: shop._id,
    name: shop.name || "",
    slug: shop.slug || "",
    region: shop.region || "",
    district: shop.district || "",
    address: shop.address || "",
    status: shop.status || "",
    businessStatus: shop.businessStatus || "",
    likeCount: safeNum(shop.likeCount),
    viewCount: safeNum(shop.viewCount),
    reviewCount: safeNum(shop.reviewCount),
    ratingAvg: safeNum(shop.ratingAvg),
    reservationCount: safeNum(shop.reservationCount),
    score: safeNum(shop.score),
    adScore: safeNum(shop.adScore),
    premium: !!shop.premium,
    bestBadge: !!shop.bestBadge,
    approved: shop.approved !== false,
    visible: shop.visible !== false,
    isDeleted: !!shop.isDeleted,
    createdAt: shop.createdAt || null,
    updatedAt: shop.updatedAt || null
  };
}

function normalizeReservation(r) {
  if (!r) return null;

  return {
    _id: r._id,
    userId: typeof r.userId === "object" && r.userId?._id ? String(r.userId._id) : String(r.userId || ""),
    placeId:
      typeof r.placeId === "object" && r.placeId?._id
        ? String(r.placeId._id)
        : String(r.placeId || r.shopId || ""),
    shopId:
      typeof r.placeId === "object" && r.placeId?._id
        ? String(r.placeId._id)
        : String(r.placeId || r.shopId || ""),
    status: r.status || "pending",
    people: safeNum(r.people, 1),
    paymentStatus: r.paymentStatus || "none",
    paymentAmount: safeNum(r.paymentAmount),
    reserveCode: r.reserveCode || "",
    isVisited: !!r.isVisited,
    isReviewed: !!r.isReviewed,
    isNoShow: !!r.isNoShow,
    createdAt: r.createdAt || null,
    updatedAt: r.updatedAt || null,
    time: r.time || null
  };
}

async function getRevenueSafe() {
  try {
    if (typeof Reservation.getRevenue === "function") {
      const total = await Reservation.getRevenue();
      return safeNum(total);
    }

    const rows = await Reservation.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$paymentAmount" } } }
    ]);

    return safeNum(rows?.[0]?.total);
  } catch (_) {
    return 0;
  }
}

async function getInquiryCountSafe() {
  try {
    if (!Inquiry) return 0;
    return await Inquiry.countDocuments();
  } catch (_) {
    return 0;
  }
}

async function getReviewCountSafe() {
  try {
    if (!Review) return 0;
    return await Review.countDocuments();
  } catch (_) {
    return 0;
  }
}

async function getTopShopsSafe(limit = 10) {
  try {
    const shops = await Shop.find({ isDeleted: false })
      .sort({ score: -1, likeCount: -1, viewCount: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return shops.map(normalizeShop);
  } catch (_) {
    return [];
  }
}

async function getTopAdsSafe(limit = 10) {
  try {
    const shops = await Shop.find({ isDeleted: false })
      .sort({ adScore: -1, score: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    return shops.map(normalizeShop);
  } catch (_) {
    return [];
  }
}

/* =========================
대시보드 FULL
GET /api/admin/full
========================= */
exports.getFull = async (req, res) => {
  try {
    if (ADMIN_CACHE.dashboard && isFresh(ADMIN_CACHE.dashboardAt)) {
      pushLog("admin.full.cache", { path: req.originalUrl });
      return ok(res, ADMIN_CACHE.dashboard);
    }

    const [
      userCount,
      shopCount,
      reservationCount,
      inquiryCount,
      reviewCount,
      revenue,
      recentUsers,
      recentReservations,
      topShops,
      topAds
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      Shop.countDocuments({ isDeleted: false }),
      Reservation.countDocuments(),
      getInquiryCountSafe(),
      getReviewCountSafe(),
      getRevenueSafe(),
      User.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Reservation.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      getTopShopsSafe(10),
      getTopAdsSafe(10)
    ]);

    const payload = {
      stats: {
        users: userCount,
        shops: shopCount,
        reservations: reservationCount,
        inquiries: inquiryCount,
        reviews: reviewCount,
        revenue
      },
      recent: {
        users: recentUsers.map(normalizeUser),
        reservations: recentReservations.map(normalizeReservation),
        inquiries: []
      },
      topShops,
      topAds
    };

    ADMIN_CACHE.dashboard = payload;
    ADMIN_CACHE.dashboardAt = now();

    pushLog("admin.full", { path: req.originalUrl });
    return ok(res, payload);
  } catch (e) {
    console.error("getFull error:", e);
    return fail(res, 500, "ADMIN_FULL_ERROR");
  }
};

/* =========================
실시간 통계
GET /api/admin/stats/live
========================= */
exports.getLiveStats = async (req, res) => {
  try {
    const [users, shops, reservations, revenue] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      Shop.countDocuments({ isDeleted: false }),
      Reservation.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }
      }),
      getRevenueSafe()
    ]);

    pushLog("admin.stats.live", { path: req.originalUrl });

    return ok(res, {
      stats: {
        users,
        shops,
        reservations,
        revenue
      }
    });
  } catch (e) {
    console.error("getLiveStats error:", e);
    return fail(res, 500, "LIVE_STATS_ERROR");
  }
};

/* =========================
유저 목록
GET /api/admin/users
========================= */
exports.getUsers = async (req, res) => {
  try {
    if (ADMIN_CACHE.users && isFresh(ADMIN_CACHE.usersAt)) {
      pushLog("admin.users.cache", { path: req.originalUrl });
      return ok(res, { items: ADMIN_CACHE.users });
    }

    const items = await User.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const normalized = items.map(normalizeUser);

    ADMIN_CACHE.users = normalized;
    ADMIN_CACHE.usersAt = now();

    pushLog("admin.users", { path: req.originalUrl, count: normalized.length });
    return ok(res, { items: normalized });
  } catch (e) {
    console.error("getUsers error:", e);
    return fail(res, 500, "USERS_ERROR");
  }
};

/* =========================
유저 검색
GET /api/admin/users/search?q=
========================= */
exports.searchUsers = async (req, res) => {
  try {
    const q = safeStr(req.query.q);
    if (!q) return ok(res, { items: [] });

    const regex = new RegExp(escapeRegex(q), "i");

    const items = await User.find({
      $or: [
        { id: regex },
        { email: regex },
        { nickname: regex },
        { phone: regex }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const normalized = items.map(normalizeUser);

    pushLog("admin.users.search", {
      path: req.originalUrl,
      q,
      count: normalized.length
    });

    return ok(res, { items: normalized });
  } catch (e) {
    console.error("searchUsers error:", e);
    return fail(res, 500, "USER_SEARCH_ERROR");
  }
};

/* =========================
유저 역할 변경
POST /api/admin/users/:id/role
========================= */
exports.toggleUserRole = async (req, res) => {
  try {
    const id = safeStr(req.params.id);
    const user = await User.findById(id);

    if (!user) return fail(res, 404, "USER_NOT_FOUND");

    if (user.role === "user") user.role = "admin";
    else if (user.role === "admin") user.role = "user";
    else if (user.role === "superAdmin") {
      return fail(res, 400, "SUPER_ADMIN_ROLE_LOCKED");
    }

    await user.save();

    ADMIN_CACHE.users = null;
    ADMIN_CACHE.dashboard = null;

    pushLog("admin.users.role", {
      path: req.originalUrl,
      userId: id,
      role: user.role
    });

    return ok(res, {
      item: normalizeUser(user)
    });
  } catch (e) {
    console.error("toggleUserRole error:", e);
    return fail(res, 500, "USER_ROLE_ERROR");
  }
};

/* =========================
유저 소프트 삭제
DELETE /api/admin/users/:id/safe
========================= */
exports.safeDeleteUser = async (req, res) => {
  try {
    const id = safeStr(req.params.id);
    const user = await User.findById(id);

    if (!user) return fail(res, 404, "USER_NOT_FOUND");

    user.isDeleted = true;
    user.isActive = false;

    if (typeof user.softDelete === "function") {
      await user.softDelete();
    } else {
      await user.save();
    }

    ADMIN_CACHE.users = null;
    ADMIN_CACHE.dashboard = null;

    pushLog("admin.users.safeDelete", {
      path: req.originalUrl,
      userId: id
    });

    return ok(res, {
      item: normalizeUser(user)
    });
  } catch (e) {
    console.error("safeDeleteUser error:", e);
    return fail(res, 500, "USER_DELETE_ERROR");
  }
};

/* =========================
업체 목록
GET /api/admin/shops
========================= */
exports.getShops = async (req, res) => {
  try {
    if (ADMIN_CACHE.shops && isFresh(ADMIN_CACHE.shopsAt)) {
      pushLog("admin.shops.cache", { path: req.originalUrl });
      return ok(res, { items: ADMIN_CACHE.shops });
    }

    const items = await Shop.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const normalized = items.map(normalizeShop);

    ADMIN_CACHE.shops = normalized;
    ADMIN_CACHE.shopsAt = now();

    pushLog("admin.shops", { path: req.originalUrl, count: normalized.length });
    return ok(res, { items: normalized });
  } catch (e) {
    console.error("getShops error:", e);
    return fail(res, 500, "SHOPS_ERROR");
  }
};

/* =========================
업체 검색
GET /api/admin/shops/search?q=
========================= */
exports.searchShops = async (req, res) => {
  try {
    const q = safeStr(req.query.q);
    if (!q) return ok(res, { items: [] });

    const regex = new RegExp(escapeRegex(q), "i");

    const items = await Shop.find({
      $or: [
        { name: regex },
        { region: regex },
        { district: regex },
        { address: regex },
        { slug: regex }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const normalized = items.map(normalizeShop);

    pushLog("admin.shops.search", {
      path: req.originalUrl,
      q,
      count: normalized.length
    });

    return ok(res, { items: normalized });
  } catch (e) {
    console.error("searchShops error:", e);
    return fail(res, 500, "SHOP_SEARCH_ERROR");
  }
};

/* =========================
업체 소프트 삭제
DELETE /api/admin/shops/:id/safe
========================= */
exports.safeDeleteShop = async (req, res) => {
  try {
    const id = safeStr(req.params.id);
    const shop = await Shop.findById(id);

    if (!shop) return fail(res, 404, "SHOP_NOT_FOUND");

    if (typeof shop.softDelete === "function") {
      await shop.softDelete();
    } else {
      shop.isDeleted = true;
      await shop.save();
    }

    ADMIN_CACHE.shops = null;
    ADMIN_CACHE.dashboard = null;

    pushLog("admin.shops.safeDelete", {
      path: req.originalUrl,
      shopId: id
    });

    return ok(res, {
      item: normalizeShop(shop)
    });
  } catch (e) {
    console.error("safeDeleteShop error:", e);
    return fail(res, 500, "SHOP_DELETE_ERROR");
  }
};

/* =========================
예약 목록
GET /api/admin/reservations
========================= */
exports.getReservations = async (req, res) => {
  try {
    if (ADMIN_CACHE.reservations && isFresh(ADMIN_CACHE.reservationsAt)) {
      pushLog("admin.reservations.cache", { path: req.originalUrl });
      return ok(res, { items: ADMIN_CACHE.reservations });
    }

    const items = await Reservation.find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const normalized = items.map(normalizeReservation);

    ADMIN_CACHE.reservations = normalized;
    ADMIN_CACHE.reservationsAt = now();

    pushLog("admin.reservations", {
      path: req.originalUrl,
      count: normalized.length
    });

    return ok(res, { items: normalized });
  } catch (e) {
    console.error("getReservations error:", e);
    return fail(res, 500, "RESERVATIONS_ERROR");
  }
};

/* =========================
예약 상태 필터
GET /api/admin/reservations/filter?status=
========================= */
exports.filterReservations = async (req, res) => {
  try {
    const status = safeStr(req.query.status);
    const query = {};

    if (status) query.status = status;

    const items = await Reservation.find(query)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const normalized = items.map(normalizeReservation);

    pushLog("admin.reservations.filter", {
      path: req.originalUrl,
      status,
      count: normalized.length
    });

    return ok(res, { items: normalized });
  } catch (e) {
    console.error("filterReservations error:", e);
    return fail(res, 500, "RESERVATION_FILTER_ERROR");
  }
};

/* =========================
예약 상태 변경
POST /api/admin/reservations/:id/status
body: { status }
========================= */
exports.updateReservationStatus = async (req, res) => {
  try {
    const id = safeStr(req.params.id);
    const status = safeStr(req.body?.status);

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return fail(res, 400, "INVALID_STATUS");
    }

    const item = await Reservation.findById(id);
    if (!item) return fail(res, 404, "RESERVATION_NOT_FOUND");

    if (typeof item.updateStatus === "function") {
      await item.updateStatus(status);
    } else {
      item.status = status;
      if (status === "confirmed") item.confirmedAt = new Date();
      if (status === "cancelled") item.cancelledAt = new Date();
      await item.save();
    }

    ADMIN_CACHE.reservations = null;
    ADMIN_CACHE.dashboard = null;

    pushLog("admin.reservations.status", {
      path: req.originalUrl,
      reservationId: id,
      status
    });

    return ok(res, {
      item: normalizeReservation(item)
    });
  } catch (e) {
    console.error("updateReservationStatus error:", e);
    return fail(res, 500, "RESERVATION_STATUS_ERROR");
  }
};

/* =========================
로그
GET /api/admin/logs
========================= */
exports.getLogs = async (req, res) => {
  try {
    pushLog("admin.logs", { path: req.originalUrl });
    return ok(res, {
      logs: ADMIN_CACHE.logs.slice(0, 300)
    });
  } catch (e) {
    console.error("getLogs error:", e);
    return fail(res, 500, "LOGS_ERROR");
  }
};

/* =========================
유저 export
GET /api/admin/export/users
========================= */
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .sort({ createdAt: -1 })
      .lean();

    const normalized = users.map(normalizeUser);

    pushLog("admin.export.users", {
      path: req.originalUrl,
      count: normalized.length
    });

    return ok(res, { users: normalized });
  } catch (e) {
    console.error("exportUsers error:", e);
    return fail(res, 500, "EXPORT_USERS_ERROR");
  }
};

/* =========================
캐시 초기화
POST /api/admin/cache-clear
========================= */
exports.clearCache = async (req, res) => {
  try {
    ADMIN_CACHE.dashboard = null;
    ADMIN_CACHE.dashboardAt = 0;
    ADMIN_CACHE.users = null;
    ADMIN_CACHE.usersAt = 0;
    ADMIN_CACHE.shops = null;
    ADMIN_CACHE.shopsAt = 0;
    ADMIN_CACHE.reservations = null;
    ADMIN_CACHE.reservationsAt = 0;
    ADMIN_CACHE.logs = [];

    pushLog("admin.cache.clear", { path: req.originalUrl });

    return ok(res, { message: "cache cleared" });
  } catch (e) {
    console.error("clearCache error:", e);
    return fail(res, 500, "CACHE_CLEAR_ERROR");
  }
};