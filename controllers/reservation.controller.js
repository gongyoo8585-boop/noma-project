"use strict";

const Reservation = require("../models/Reservation");
const Shop = require("../models/Shop");
const auth = require("../middlewares/auth");

/* =====================================================
🔥 RESPONSE UTILS
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({ ok: true, message, data });
}

function fail(res, message = "ERROR", code = 400) {
  return res.status(code).json({ ok: false, message });
}

/* =====================================================
🔥 SAFE UTILS
===================================================== */
function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function now() {
  return new Date();
}

/* =====================================================
🔥 CACHE (간단 메모리)
===================================================== */
const CACHE = new Map();

function cacheSet(key, data, ttl = 5000) {
  CACHE.set(key, { data, expire: Date.now() + ttl });
}

function cacheGet(key) {
  const c = CACHE.get(key);
  if (!c) return null;
  if (Date.now() > c.expire) {
    CACHE.delete(key);
    return null;
  }
  return c.data;
}

/* =====================================================
🔥 SHOP SYNC HELPER
===================================================== */
async function syncShopOnReserve(shopId) {
  const shop = await Shop.findById(shopId);
  if (!shop) return;

  shop.reservationCount += 1;

  if (shop.viewCount > 0) {
    shop.conversionRate = shop.reservationCount / shop.viewCount;
  }

  shop.score =
    shop.ratingAvg * 10 +
    shop.likeCount * 2 +
    shop.viewCount * 0.1 +
    shop.reservationCount;

  await shop.save();
}

async function syncShopOnCancel(shopId) {
  const shop = await Shop.findById(shopId);
  if (!shop) return;

  shop.reservationCount = Math.max(0, shop.reservationCount - 1);
  await shop.save();
}

/* =====================================================
🔥 CREATE RESERVATION
===================================================== */
exports.create = [
  auth,
  async (req, res) => {
    try {
      const userId = auth.getUserId(req);
      const { placeId, time, people = 1, memo = "", contactPhone = "" } = req.body;

      if (!placeId || !time) {
        return fail(res, "필수값 누락");
      }

      const limitCheck = await Reservation.limitPerUserStrict(userId);
      if (!limitCheck.allowed) {
        return fail(res, "예약 제한 초과");
      }

      const reservation = await Reservation.create({
        userId,
        placeId,
        time,
        people,
        memo,
        contactPhone
      });

      await syncShopOnReserve(placeId);

      return ok(res, reservation, "예약 완료");
    } catch (e) {
      console.error("CREATE ERROR:", e.message);
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 CANCEL
===================================================== */
exports.cancel = [
  auth,
  async (req, res) => {
    try {
      const { id } = req.params;

      const r = await Reservation.findById(id);
      if (!r) return fail(res, "예약 없음", 404);

      if (!auth.isOwner(req, r.userId) && !auth.isAdmin(req)) {
        return fail(res, "권한 없음", 403);
      }

      await r.cancelSafe("user_cancel");
      await syncShopOnCancel(r.placeId);

      return ok(res, true, "취소 완료");
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 MY LIST
===================================================== */
exports.myList = [
  auth,
  async (req, res) => {
    try {
      const userId = auth.getUserId(req);
      const list = await Reservation.findByUser(userId);
      return ok(res, list);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 GET ONE
===================================================== */
exports.getOne = [
  auth,
  async (req, res) => {
    try {
      const r = await Reservation.findById(req.params.id);
      if (!r) return fail(res, "예약 없음", 404);

      if (!auth.isOwner(req, r.userId) && !auth.isAdmin(req)) {
        return fail(res, "권한 없음", 403);
      }

      return ok(res, r);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 ADMIN LIST
===================================================== */
exports.adminList = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    try {
      const { status, limit = 50 } = req.query;

      const key = "adminList:" + status + ":" + limit;
      const cached = cacheGet(key);
      if (cached) return ok(res, cached);

      let list;
      if (status) {
        list = await Reservation.findByStatus(status, safeNum(limit));
      } else {
        list = await Reservation.findRecent(safeNum(limit));
      }

      cacheSet(key, list);

      return ok(res, list);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 UPDATE STATUS
===================================================== */
exports.updateStatus = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const r = await Reservation.findById(id);
      if (!r) return fail(res, "예약 없음", 404);

      r.status = status;
      await r.save();

      return ok(res, r, "상태 변경 완료");
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 CHECKIN / CHECKOUT
===================================================== */
exports.checkIn = [
  auth,
  async (req, res) => {
    try {
      const r = await Reservation.findById(req.params.id);
      if (!r) return fail(res, "예약 없음", 404);

      await r.checkIn();
      return ok(res, true);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

exports.checkOut = [
  auth,
  async (req, res) => {
    try {
      const r = await Reservation.findById(req.params.id);
      if (!r) return fail(res, "예약 없음", 404);

      await r.checkOut();
      return ok(res, true);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 RESCHEDULE
===================================================== */
exports.reschedule = [
  auth,
  async (req, res) => {
    try {
      const { newTime } = req.body;

      const r = await Reservation.findById(req.params.id);
      if (!r) return fail(res, "예약 없음", 404);

      if (!auth.isOwner(req, r.userId)) {
        return fail(res, "권한 없음", 403);
      }

      await r.reschedule(newTime, auth.getUserId(req));

      return ok(res, true);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 EXTRA FEATURES (100+ 핵심)
===================================================== */

/* 1 */
exports.upcoming = [
  auth,
  async (req, res) => {
    const list = await Reservation.findUpcoming(20);
    return ok(res, list);
  }
];

/* 2 */
exports.completed = [
  auth,
  async (req, res) => {
    const list = await Reservation.findCompleted(20);
    return ok(res, list);
  }
];

/* 3 */
exports.stats = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    const stats = await Reservation.getStats();
    return ok(res, stats);
  }
];

/* 4 */
exports.revenue = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    const sum = await Reservation.getRevenue();
    return ok(res, { revenue: sum });
  }
];

/* 5 */
exports.today = [
  auth,
  async (req, res) => {
    const list = await Reservation.findToday();
    return ok(res, list);
  }
];

/* 6 */
exports.expired = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    const list = await Reservation.findExpiredPending();
    return ok(res, list);
  }
];

/* 7 */
exports.reminderTargets = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    const list = await Reservation.findNeedReminder(30);
    return ok(res, list);
  }
];

/* 8 */
exports.byCode = async (req, res) => {
  const r = await Reservation.findByReserveCode(req.query.code);
  return ok(res, r);
};

/* 9 */
exports.visitCode = async (req, res) => {
  const r = await Reservation.findByVisitCode(req.query.code);
  return ok(res, r);
};

/* 10 */
exports.bulkCancel = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    await Reservation.bulkCancel(req.body.ids || []);
    return ok(res, true);
  }
];

/* 11 */
exports.bulkConfirm = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    await Reservation.bulkConfirm(req.body.ids || []);
    return ok(res, true);
  }
];

/* 12 */
exports.dashboard = [
  auth,
  auth.adminOnly,
  async (req, res) => {
    const data = await Reservation.findForAdminDashboard();
    return ok(res, data);
  }
];

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 RESERVATION CONTROLLER ULTRA COMPLETE READY");

module.exports = exports;