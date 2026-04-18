const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Shop = require("../models/Shop");
const Reservation = require("../models/Reservation");
const Inquiry = require("../models/Inquiry");

let auth = null;
try {
  auth = require("../middlewares/auth");
} catch (_) {
  auth = null;
}

/* =========================
   공통 util
========================= */
function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function getPage(req) {
  return Math.max(1, parseInt(req.query.page, 10) || 1);
}

function getLimit(req, max = 100, def = 20) {
  return Math.min(max, Math.max(1, parseInt(req.query.limit, 10) || def));
}

function getSkip(page, limit) {
  return (page - 1) * limit;
}

function safeAsync(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error("ADMIN ROUTE ERROR:", e);
      res.status(500).json({
        ok: false,
        message: e.message || "server error"
      });
    }
  };
}

function normalizeRole(role) {
  return String(role || "").trim();
}

/* =========================
   fallback helpers
========================= */
async function getReservationRevenueSafe() {
  if (typeof Reservation.getRevenue === "function") {
    return await Reservation.getRevenue();
  }

  const rows = await Reservation.aggregate([
    {
      $match: {
        paymentStatus: "paid"
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$paymentAmount" }
      }
    }
  ]);

  return rows[0]?.total || 0;
}

async function getReservationStatsSafe() {
  if (typeof Reservation.getStats === "function") {
    return await Reservation.getStats();
  }

  const [total, pending, confirmed, cancelled] = await Promise.all([
    Reservation.countDocuments(),
    Reservation.countDocuments({ status: "pending" }),
    Reservation.countDocuments({ status: "confirmed" }),
    Reservation.countDocuments({ status: "cancelled" })
  ]);

  return { total, pending, confirmed, cancelled };
}

async function getInquiryStatsSafe() {
  if (typeof Inquiry.getStats === "function") {
    return await Inquiry.getStats();
  }

  const total = await Inquiry.countDocuments();
  return { total };
}

async function getTopAdsSafe() {
  if (typeof Shop.getTopAds === "function") {
    return await Shop.getTopAds();
  }

  return await Shop.find({ isDeleted: false })
    .sort({ adScore: -1, likeCount: -1, createdAt: -1 })
    .limit(10);
}

function calcShopScore(v) {
  return safeNum(v.ratingAvg) * 10 +
    safeNum(v.likeCount) * 2 +
    safeNum(v.viewCount) * 0.1 +
    safeNum(v.adScore);
}

/* =========================
   관리자 보호
========================= */
function adminOnly(req, res, next) {
  if (!auth) return next();

  return auth(req, res, function () {
    const role = normalizeRole(req.user?.role);
    if (role !== "admin" && role !== "superAdmin") {
      return res.status(403).json({
        ok: false,
        msg: "관리자만 접근"
      });
    }
    next();
  });
}

router.use(adminOnly);

/* =========================
   관리자 로그
========================= */
const ADMIN_LOG = [];

function pushAdminLog(req, extra = {}) {
  ADMIN_LOG.push({
    path: req.originalUrl,
    method: req.method,
    user: req.user?.id || req.user?._id || "unknown",
    ip: req.ip,
    time: Date.now(),
    ...extra
  });

  if (ADMIN_LOG.length > 5000) {
    ADMIN_LOG.shift();
  }
}

router.use((req, res, next) => {
  pushAdminLog(req);
  next();
});

/* =========================
   메모리 캐시
========================= */
const ADMIN_CACHE = new Map();

function setCache(key, data, ttl = 3000) {
  ADMIN_CACHE.set(key, {
    data,
    expire: Date.now() + ttl
  });
}

function getCache(key) {
  const row = ADMIN_CACHE.get(key);
  if (!row) return null;
  if (Date.now() > row.expire) {
    ADMIN_CACHE.delete(key);
    return null;
  }
  return row.data;
}

/* =========================
   LIVE_STATS
========================= */
let LIVE_STATS = {
  users: 0,
  shops: 0,
  reservations: 0,
  inquiries: 0,
  updatedAt: null
};

setInterval(async () => {
  try {
    const [users, shops, reservations, inquiries] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      Shop.countDocuments({ isDeleted: { $ne: true } }),
      Reservation.countDocuments(),
      Inquiry.countDocuments()
    ]);

    LIVE_STATS = {
      users,
      shops,
      reservations,
      inquiries,
      updatedAt: new Date()
    };
  } catch (e) {
    console.error("LIVE_STATS ERROR:", e.message);
  }
}, 5000);

/* =========================
   1. FULL DASHBOARD API
   GET /api/admin/full
========================= */
router.get("/full", safeAsync(async (req, res) => {
  const [
    usersCount,
    shopsCount,
    reservationsCount,
    inquiriesCount,
    recentUsers,
    recentReservations,
    recentInquiries,
    topAds,
    topShops,
    revenue,
    inquiryStats,
    reservationStats
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    Shop.countDocuments({ isDeleted: false }),
    Reservation.countDocuments(),
    Inquiry.countDocuments({ isDeleted: false }),
    User.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 }).limit(5),
    Reservation.find().sort({ createdAt: -1 }).limit(5),
    Inquiry.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5),
    getTopAdsSafe(),
    Shop.find({ isDeleted: false }).sort({ score: -1, createdAt: -1 }).limit(10),
    getReservationRevenueSafe(),
    getInquiryStatsSafe(),
    getReservationStatsSafe()
  ]);

  res.json({
    ok: true,
    stats: {
      users: usersCount,
      shops: shopsCount,
      reservations: reservationsCount,
      inquiries: inquiriesCount,
      revenue: revenue || 0,
      inquiry: inquiryStats,
      reservation: reservationStats
    },
    topAds,
    topShops,
    recent: {
      users: recentUsers,
      reservations: recentReservations,
      inquiries: recentInquiries
    }
  });
}));

/* =========================
   2. FULL 캐시 버전
========================= */
router.get("/full/cache", safeAsync(async (req, res) => {
  const key = "admin_full_cache";
  const cached = getCache(key);

  if (cached) {
    return res.json({
      ok: true,
      ...cached,
      cache: true
    });
  }

  const [
    users,
    shops,
    reservations,
    inquiries
  ] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    Shop.countDocuments({ isDeleted: false }),
    Reservation.countDocuments(),
    Inquiry.countDocuments({ isDeleted: false })
  ]);

  const data = {
    stats: { users, shops, reservations, inquiries }
  };

  setCache(key, data, 3000);

  res.json({
    ok: true,
    ...data
  });
}));

/* =========================
   3. 통계
========================= */
router.get("/stats", safeAsync(async (req, res) => {
  const [users, shops, reservations] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    Shop.countDocuments({ isDeleted: { $ne: true } }),
    Reservation.countDocuments()
  ]);

  res.json({
    ok: true,
    stats: { users, shops, reservations }
  });
}));

router.get("/stats/live", safeAsync(async (req, res) => {
  res.json({
    ok: true,
    stats: LIVE_STATS
  });
}));

/* =========================
   4. 유저 관리
========================= */
router.get("/users", safeAsync(async (req, res) => {
  const page = getPage(req);
  const limit = getLimit(req);
  const filter = {};

  if (req.query.deleted === "true") {
    filter.isDeleted = true;
  } else {
    filter.isDeleted = { $ne: true };
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit),
    User.countDocuments(filter)
  ]);

  res.json({
    ok: true,
    items,
    page,
    limit,
    total
  });
}));

router.get("/users/count", safeAsync(async (req, res) => {
  const count = await User.countDocuments({ isDeleted: { $ne: true } });
  res.json({ ok: true, count });
}));

router.get("/users/recent", safeAsync(async (req, res) => {
  const items = await User.find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({ ok: true, items });
}));

router.get("/users/active", safeAsync(async (req, res) => {
  const items = await User.find({ isDeleted: { $ne: true } })
    .sort({ lastLoginAt: -1, createdAt: -1 })
    .limit(10);

  res.json({ ok: true, items });
}));

router.get("/users/inactive", safeAsync(async (req, res) => {
  const items = await User.find({ isActive: false }).limit(20);
  res.json({ ok: true, items });
}));

router.get("/users/search", safeAsync(async (req, res) => {
  const q = safeStr(req.query.q);
  const regex = new RegExp(q, "i");

  const items = await User.find({
    isDeleted: { $ne: true },
    $or: [
      { email: regex },
      { id: regex },
      { nickname: regex },
      { phone: regex }
    ]
  }).limit(50);

  res.json({ ok: true, items });
}));

router.get("/users/levels", safeAsync(async (req, res) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: "$level",
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  res.json({ ok: true, stats });
}));

router.post("/users/:id/role", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ ok: false, message: "invalid id" });
  }

  const u = await User.findById(req.params.id);
  if (!u) {
    return res.status(404).json({ ok: false });
  }

  u.role = u.role === "user" ? "admin" : "user";
  await u.save();

  pushAdminLog(req, { action: "user-role-toggle", targetId: req.params.id });

  res.json({ ok: true, role: u.role });
}));

router.post("/users/ban/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.json({ ok: false });
  }

  const u = await User.findById(req.params.id);
  if (!u) return res.json({ ok: false });

  u.isActive = false;
  await u.save();

  pushAdminLog(req, { action: "user-ban", targetId: req.params.id });

  res.json({ ok: true });
}));

router.post("/users/unban/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.json({ ok: false });
  }

  const u = await User.findById(req.params.id);
  if (!u) return res.json({ ok: false });

  u.isActive = true;
  await u.save();

  pushAdminLog(req, { action: "user-unban", targetId: req.params.id });

  res.json({ ok: true });
}));

router.post("/users/reset/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.json({ ok: false });
  }

  const u = await User.findById(req.params.id);
  if (!u) return res.json({ ok: false });

  u.point = 0;
  u.exp = 0;
  u.level = 1;
  await u.save();

  pushAdminLog(req, { action: "user-reset", targetId: req.params.id });

  res.json({ ok: true });
}));

router.delete("/users/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ ok: false, message: "invalid id" });
  }

  const u = await User.findById(req.params.id);
  if (!u) {
    return res.status(404).json({ ok: false });
  }

  if ("isDeleted" in u) {
    u.isDeleted = true;
    if ("isActive" in u) u.isActive = false;
    await u.save();
  } else {
    await User.findByIdAndDelete(req.params.id);
  }

  pushAdminLog(req, { action: "user-delete", targetId: req.params.id });

  res.json({ ok: true });
}));

/* =========================
   5. 예약 관리
========================= */
router.get("/reservations", safeAsync(async (req, res) => {
  const page = getPage(req);
  const limit = getLimit(req);
  const filter = {};

  if (req.query.status) {
    filter.status = safeStr(req.query.status);
  }

  const [items, total] = await Promise.all([
    Reservation.find(filter)
      .sort({ createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit),
    Reservation.countDocuments(filter)
  ]);

  res.json({ ok: true, items, page, limit, total });
}));

router.get("/reservations/count", safeAsync(async (req, res) => {
  const count = await Reservation.countDocuments();
  res.json({ ok: true, count });
}));

router.get("/reservations/recent", safeAsync(async (req, res) => {
  const items = await Reservation.find().sort({ createdAt: -1 }).limit(10);
  res.json({ ok: true, items });
}));

router.get("/reservations/filter", safeAsync(async (req, res) => {
  const status = safeStr(req.query.status);
  const filter = status ? { status } : {};

  const items = await Reservation.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ ok: true, items });
}));

router.get("/reservations/stats/detail", safeAsync(async (req, res) => {
  const stats = await Reservation.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({ ok: true, stats });
}));

router.post("/reservations/:id/status", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ ok: false, message: "invalid id" });
  }

  const r = await Reservation.findById(req.params.id);
  if (!r) return res.status(404).json({ ok: false });

  const nextStatus = safeStr(req.body.status, "confirmed");
  r.status = nextStatus;

  if (nextStatus === "confirmed") {
    r.confirmedAt = new Date();
  }

  if (nextStatus === "cancelled") {
    r.cancelledAt = new Date();
    r.isActive = false;
  }

  await r.save();

  pushAdminLog(req, {
    action: "reservation-status",
    targetId: req.params.id,
    status: nextStatus
  });

  res.json({ ok: true });
}));

router.delete("/reservations/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.json({ ok: false });
  }

  await Reservation.findByIdAndDelete(req.params.id);

  pushAdminLog(req, { action: "reservation-delete", targetId: req.params.id });

  res.json({ ok: true });
}));

/* =========================
   6. 문의 관리
========================= */
router.get("/inquiries/count", safeAsync(async (req, res) => {
  const count = await Inquiry.countDocuments();
  res.json({ ok: true, count });
}));

router.get("/inquiries/recent", safeAsync(async (req, res) => {
  const items = await Inquiry.find()
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({ ok: true, items });
}));

router.get("/inquiries/stats/detail", safeAsync(async (req, res) => {
  const stats = await Inquiry.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({ ok: true, stats });
}));

router.post("/inquiries/:id/status", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ ok: false, message: "invalid id" });
  }

  const i = await Inquiry.findById(req.params.id);
  if (!i) return res.status(404).json({ ok: false });

  if (typeof i.setStatus === "function") {
    await i.setStatus("done");
  } else {
    i.status = "done";
    await i.save();
  }

  pushAdminLog(req, { action: "inquiry-status", targetId: req.params.id });

  res.json({ ok: true });
}));

router.delete("/inquiries/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.json({ ok: false });
  }

  await Inquiry.findByIdAndDelete(req.params.id);

  pushAdminLog(req, { action: "inquiry-delete", targetId: req.params.id });

  res.json({ ok: true });
}));

/* =========================
   7. 매장 관리
========================= */
router.get("/shops", safeAsync(async (req, res) => {
  const page = getPage(req);
  const limit = getLimit(req);
  const filter = {};

  if (req.query.deleted === "true") {
    filter.isDeleted = true;
  } else {
    filter.isDeleted = { $ne: true };
  }

  const [items, total] = await Promise.all([
    Shop.find(filter)
      .sort({ createdAt: -1 })
      .skip(getSkip(page, limit))
      .limit(limit),
    Shop.countDocuments(filter)
  ]);

  res.json({ ok: true, items, page, limit, total });
}));

router.get("/shops/count", safeAsync(async (req, res) => {
  const count = await Shop.countDocuments({ isDeleted: { $ne: true } });
  res.json({ ok: true, count });
}));

router.get("/shops/top", safeAsync(async (req, res) => {
  const items = await Shop.find({ isDeleted: false })
    .sort({ likeCount: -1, createdAt: -1 })
    .limit(10);

  res.json({ ok: true, items });
}));

router.get("/shops/top-score", safeAsync(async (req, res) => {
  let items = await Shop.find({ isDeleted: false }).lean();

  items = items
    .map(v => ({ ...v, score: calcShopScore(v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.json({ ok: true, items });
}));

router.get("/shops/search", safeAsync(async (req, res) => {
  const q = safeStr(req.query.q);
  const regex = new RegExp(q, "i");

  const items = await Shop.find({
    isDeleted: { $ne: true },
    $or: [
      { name: regex },
      { region: regex },
      { district: regex },
      { address: regex }
    ]
  }).limit(50);

  res.json({ ok: true, items });
}));

router.post("/shops", safeAsync(async (req, res) => {
  const s = await Shop.create(req.body);

  pushAdminLog(req, { action: "shop-create", targetId: s._id });

  res.json({ ok: true, shop: s });
}));

router.put("/shops/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ ok: false, message: "invalid id" });
  }

  await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });

  pushAdminLog(req, { action: "shop-update", targetId: req.params.id });

  res.json({ ok: true });
}));

router.delete("/shops/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) {
    return res.status(400).json({ ok: false, message: "invalid id" });
  }

  const s = await Shop.findById(req.params.id);
  if (!s) {
    return res.status(404).json({ ok: false });
  }

  if ("isDeleted" in s) {
    s.isDeleted = true;
    if ("visible" in s) s.visible = false;
    await s.save();
  } else {
    await Shop.findByIdAndDelete(req.params.id);
  }

  pushAdminLog(req, { action: "shop-delete", targetId: req.params.id });

  res.json({ ok: true });
}));

router.post("/shops/hide/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) return res.json({ ok: false });

  await Shop.findByIdAndUpdate(req.params.id, { visible: false });

  pushAdminLog(req, { action: "shop-hide", targetId: req.params.id });

  res.json({ ok: true });
}));

router.post("/shops/show/:id", safeAsync(async (req, res) => {
  if (!isValidId(req.params.id)) return res.json({ ok: false });

  await Shop.findByIdAndUpdate(req.params.id, { visible: true });

  pushAdminLog(req, { action: "shop-show", targetId: req.params.id });

  res.json({ ok: true });
}));

/* =========================
   8. 매출 / 시스템
========================= */
router.get("/revenue", safeAsync(async (req, res) => {
  const revenue = await getReservationRevenueSafe();
  res.json({ ok: true, revenue });
}));

router.get("/revenue/detail", safeAsync(async (req, res) => {
  const items = await Reservation.aggregate([
    {
      $group: {
        _id: {
          y: { $year: "$createdAt" },
          m: { $month: "$createdAt" },
          d: { $dayOfMonth: "$createdAt" }
        },
        total: { $sum: "$paymentAmount" }
      }
    },
    {
      $sort: { "_id.y": -1, "_id.m": -1, "_id.d": -1 }
    }
  ]);

  res.json({ ok: true, items });
}));

router.get("/system/health", safeAsync(async (req, res) => {
  res.json({
    ok: true,
    time: new Date(),
    uptime: process.uptime()
  });
}));

router.get("/system/memory", safeAsync(async (req, res) => {
  const mem = process.memoryUsage();

  res.json({
    ok: true,
    rss: mem.rss,
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external
  });
}));

router.get("/health", safeAsync(async (req, res) => {
  res.json({
    ok: true,
    status: "RUNNING"
  });
}));

router.get("/ping", safeAsync(async (req, res) => {
  res.json({ ok: true });
}));

/* =========================
   9. 로그 / 캐시 / 개발
========================= */
router.get("/logs", safeAsync(async (req, res) => {
  res.json({
    ok: true,
    logs: ADMIN_LOG.slice(-100).reverse()
  });
}));

router.post("/log-action", safeAsync(async (req, res) => {
  pushAdminLog(req, {
    action: safeStr(req.body.action, "manual-log")
  });

  res.json({ ok: true });
}));

router.get("/cache/status", safeAsync(async (req, res) => {
  res.json({
    ok: true,
    size: ADMIN_CACHE.size,
    msg: "CACHE OK"
  });
}));

router.post("/cache-clear", safeAsync(async (req, res) => {
  ADMIN_CACHE.clear();

  pushAdminLog(req, { action: "cache-clear" });

  res.json({ ok: true });
}));

router.post("/dev/reset-all", safeAsync(async (req, res) => {
  await Promise.all([
    Reservation.deleteMany({}),
    Inquiry.deleteMany({})
  ]);

  ADMIN_CACHE.clear();

  pushAdminLog(req, { action: "dev-reset-all" });

  res.json({ ok: true });
}));

/* =========================
   10. 확장 API
========================= */
router.get("/full/extended", safeAsync(async (req, res) => {
  const [
    users,
    shops,
    reservations,
    inquiries,
    revenue
  ] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    Shop.countDocuments({ isDeleted: { $ne: true } }),
    Reservation.countDocuments(),
    Inquiry.countDocuments(),
    getReservationRevenueSafe()
  ]);

  res.json({
    ok: true,
    stats: {
      users,
      shops,
      reservations,
      inquiries,
      revenue: safeNum(revenue)
    }
  });
}));

/* =========================
   fallback patch
========================= */
if (!Shop.getTopAds) {
  Shop.getTopAds = async function () {
    return this.find({ isDeleted: false })
      .sort({ adScore: -1, likeCount: -1 })
      .limit(5);
  };
}

if (!Inquiry.prototype.setStatus) {
  Inquiry.prototype.setStatus = function (status) {
    this.status = status;
    return this.save();
  };
}

if (!Reservation.getRevenue) {
  Reservation.getRevenue = async function () {
    const list = await this.find();
    return list.reduce((sum, r) => {
      return sum + Number(r.paymentAmount || r.price || 0);
    }, 0);
  };
}

if (!Reservation.getStats) {
  Reservation.getStats = async function () {
    const [total, pending, confirmed, cancelled] = await Promise.all([
      this.countDocuments(),
      this.countDocuments({ status: "pending" }),
      this.countDocuments({ status: "confirmed" }),
      this.countDocuments({ status: "cancelled" })
    ]);

    return { total, pending, confirmed, cancelled };
  };
}

if (!Inquiry.getStats) {
  Inquiry.getStats = async function () {
    const total = await this.countDocuments();
    return { total };
  };
}

console.log("🔥 ADMIN ROUTE FINAL ULTRA COMPLETE READY");

module.exports = router;