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
  if (isFresh(ADMIN_CACHE.dashboardAt)) {
    log("dashboard.cache");
    return ok(res, ADMIN_CACHE.dashboard);
  }

  const [users, shops, reservations, reviews, inquiries] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    Shop.countDocuments({ isDeleted: false }),
    Reservation.countDocuments(),
    Review ? Review.countDocuments() : 0,
    Inquiry ? Inquiry.countDocuments() : 0
  ]);

  const revenue = await Reservation.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $group: { _id: null, total: { $sum: "$paymentAmount" } } }
  ]);

  const payload = {
    stats: {
      users,
      shops,
      reservations,
      reviews,
      inquiries,
      revenue: revenue?.[0]?.total || 0
    }
  };

  ADMIN_CACHE.dashboard = payload;
  ADMIN_CACHE.dashboardAt = now();

  log("dashboard");
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