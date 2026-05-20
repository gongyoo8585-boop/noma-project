"use strict";

const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");
const Shop = require("../../models/Shop"); // 기존 구조 유지
const auth = require("../../middlewares/auth");

/* =====================================================
🔥 RESPONSE
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({ ok: true, message, data });
}

function fail(res, message = "ERROR", code = 400) {
  return res.status(code).json({ ok: false, message });
}

/* =====================================================
🔥 UTILS
===================================================== */
function now() {
  return new Date();
}

/* =====================================================
🔥 VALIDATION
===================================================== */
async function validateReservation({ placeId, time }) {
  if (!placeId) throw new Error("placeId 필요");
  if (!time) throw new Error("time 필요");

  const date = new Date(time);
  if (date < now()) throw new Error("과거 예약 불가");

  const conflict = await Reservation.checkConflictFinal(placeId, time);
  if (conflict) throw new Error("이미 예약 존재");
}

/* =====================================================
🔥 SHOP SYNC
===================================================== */
async function syncShopOnReserve(shopId, session) {
  const shop = await Shop.findById(shopId).session(session);
  if (!shop) return;

  shop.reservationCount = (shop.reservationCount || 0) + 1;
  shop.lastActiveAt = now();

  if (shop.viewCount > 0) {
    shop.conversionRate = shop.reservationCount / shop.viewCount;
  }

  shop.calculateScore?.();
  shop.calcAiScoreV2?.();
  shop.calcRankScoreV2?.();

  await shop.save({ session });
}

async function syncShopOnCancel(shopId, session) {
  const shop = await Shop.findById(shopId).session(session);
  if (!shop) return;

  shop.reservationCount = Math.max(0, (shop.reservationCount || 0) - 1);
  await shop.save({ session });
}

/* =====================================================
🔥 CREATE
===================================================== */
exports.create = [
  auth,
  async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = auth.getUserId(req);

      const {
        placeId,
        time,
        people = 1,
        memo = "",
        contactPhone = "",
        tags = [],
        price = 0,
        serviceId = null
      } = req.body;

      await validateReservation({ placeId, time });

      const limit = await Reservation.limitPerUserStrict(userId);
      if (!limit.allowed) throw new Error("예약 제한 초과");

      const [reservation] = await Reservation.create([{
        userId,
        placeId,
        time,
        people,
        memo,
        contactPhone,
        tags,
        price,
        serviceId,
        status: "pending",
        createdAt: now()
      }], { session });

      await syncShopOnReserve(placeId, session);

      await session.commitTransaction();
      session.endSession();

      return ok(res, reservation, "예약 완료");
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const r = await Reservation.findById(req.params.id).session(session);
      if (!r) throw new Error("예약 없음");

      if (!auth.isOwner(req, r.userId) && !auth.isAdmin(req)) {
        throw new Error("권한 없음");
      }

      await r.cancelSafe("user_cancel");
      await syncShopOnCancel(r.placeId, session);

      await session.commitTransaction();
      session.endSession();

      return ok(res, true, "취소 완료");
    } catch (e) {
      await session.abortTransaction();
      session.endSession();
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 CONFIRM
===================================================== */
exports.confirm = [
  auth,
  async (req, res) => {
    try {
      const r = await Reservation.findById(req.params.id);
      if (!r) return fail(res, "예약 없음", 404);

      if (!auth.isAdmin(req)) return fail(res, "관리자만", 403);

      await r.confirm(auth.getUserId(req));
      return ok(res, r, "확정 완료");
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

      await r.checkIn?.();
      return ok(res, true, "입실 완료");
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

      await r.checkOut?.();
      return ok(res, true, "퇴실 완료");
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

      await validateReservation({ placeId: r.placeId, time: newTime });

      await r.reschedule(newTime);

      return ok(res, true, "변경 완료");
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 LIST
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
  async (req, res) => {
    try {
      if (!auth.isAdmin(req)) return fail(res, "관리자만", 403);

      const { status, limit = 50 } = req.query;

      const list = status
        ? await Reservation.findByStatus(status, Number(limit))
        : await Reservation.findRecent(Number(limit));

      return ok(res, list);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 ANALYTICS
===================================================== */
exports.dailyStats = async (req, res) => {
  try {
    const data = await Reservation.aggregate([
      { $group: { _id: { $dayOfMonth: "$createdAt" }, count: { $sum: 1 } } }
    ]);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message);
  }
};

exports.topShops = async (req, res) => {
  try {
    const data = await Reservation.aggregate([
      { $group: { _id: "$placeId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message);
  }
};

exports.heatmap = async (req, res) => {
  try {
    const data = await Reservation.aggregate([
      { $group: { _id: { hour: { $hour: "$time" } }, count: { $sum: 1 } } }
    ]);
    return ok(res, data);
  } catch (e) {
    return fail(res, e.message);
  }
};

/* =====================================================
🔥 BULK
===================================================== */
exports.bulkCancel = [
  auth,
  async (req, res) => {
    try {
      if (!auth.isAdmin(req)) return fail(res, "관리자만", 403);

      await Reservation.bulkCancel(req.body.ids || []);
      return ok(res, true);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

exports.bulkConfirm = [
  auth,
  async (req, res) => {
    try {
      if (!auth.isAdmin(req)) return fail(res, "관리자만", 403);

      await Reservation.bulkConfirm(req.body.ids || []);
      return ok(res, true);
    } catch (e) {
      return fail(res, e.message);
    }
  }
];

/* =====================================================
🔥 AUTO JOB
===================================================== */
setInterval(async () => {
  try {
    await Reservation.expireOld?.();
    await Reservation.markNoShow?.();
  } catch (_) {}
}, 60000);

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 reservation.controller READY");

module.exports = exports;