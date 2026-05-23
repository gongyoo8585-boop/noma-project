"use strict";

/* =====================================================
🔥 RESERVATION SERVICE (FINAL MASTER - NO LOSS + EXPANDED)
기존 기능 유지 + 안정성 + 확장 (예약 핵심 로직)
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); }
  catch (e) {
    console.warn("[reservation.service] require fail:", path);
    return null;
  }
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
const cacheService =
  safeRequire("./cacheService") ||
  safeRequire("../../services/cacheService");

const queueService =
  safeRequire("./queue.service") ||
  safeRequire("../../services/queue.service");

const notifyService =
  safeRequire("../../services/notifyService");

const analyticsService =
  safeRequire("./analyticsService");

/* =====================================================
🔥 CONSTANTS
===================================================== */
const CACHE_TTL = 1000 * 10;

/* =====================================================
🔥 MEMORY CACHE
===================================================== */
const CACHE = new Map();

function cacheSet(key, data, ttl = CACHE_TTL) {
  CACHE.set(key, {
    data,
    expire: Date.now() + ttl
  });
}

function cacheGet(key) {
  const v = CACHE.get(key);
  if (!v) return null;
  if (Date.now() > v.expire) {
    CACHE.delete(key);
    return null;
  }
  return v.data;
}

/* =====================================================
🔥 UTILS
===================================================== */
function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function now() {
  return new Date();
}

/* =====================================================
🔥 LOCK (중복 예약 방지)
===================================================== */
const CREATE_LOCK = new Map();

function acquireLock(key) {
  if (CREATE_LOCK.get(key)) return false;
  CREATE_LOCK.set(key, true);

  setTimeout(() => CREATE_LOCK.delete(key), 3000);
  return true;
}

/* =====================================================
🔥 SERVICE CLASS
===================================================== */
class ReservationService {

  /* =====================================================
  🔥 CREATE RESERVATION
  ===================================================== */
  async create({ userId, shopId, date, time, people = 1 }) {

    if (!isValidId(userId)) throw new Error("INVALID_USER");
    if (!isValidId(shopId)) throw new Error("INVALID_SHOP");

    const lockKey = `${shopId}_${date}_${time}`;
    if (!acquireLock(lockKey)) {
      throw new Error("DUPLICATE_REQUEST");
    }

    const reserveTime = new Date(`${date} ${time}`);
    if (!reserveTime || isNaN(reserveTime.getTime())) {
      throw new Error("INVALID_TIME");
    }

    const conflict = await Reservation.exists({
      shopId,
      time: reserveTime,
      status: { $in: ["pending", "confirmed"] }
    });

    if (conflict) {
      throw new Error("TIME_CONFLICT");
    }

    const reservation = await Reservation.create({
      userId,
      shopId,
      time: reserveTime,
      people: Math.max(1, safeNum(people, 1)),
      status: "pending",
      createdAt: now()
    });

    cacheService?.del?.("reservation:list");

    notifyService?.pushAsync?.({
      userId,
      type: "reservation_created",
      message: "예약이 생성되었습니다."
    });

    analyticsService?.track?.("reservation_create", {
      userId,
      shopId
    });

    return reservation;
  }

  /* =====================================================
  🔥 GET USER RESERVATIONS
  ===================================================== */
  async getUserReservations(userId, { page = 1, limit = 20 } = {}) {

    const cacheKey = `user:${userId}:${page}:${limit}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const list = await Reservation.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    cacheSet(cacheKey, list);

    return list;
  }

  /* =====================================================
  🔥 GET ONE
  ===================================================== */
  async getById(id) {
    if (!isValidId(id)) throw new Error("INVALID_ID");

    return Reservation.findById(id);
  }

  /* =====================================================
  🔥 CANCEL
  ===================================================== */
  async cancel(reservationId, userId) {

    const r = await Reservation.findById(reservationId);
    if (!r) throw new Error("NOT_FOUND");

    if (String(r.userId) !== String(userId)) {
      throw new Error("FORBIDDEN");
    }

    r.status = "cancelled";
    r.cancelledAt = now();

    await r.save();

    notifyService?.pushAsync?.({
      userId,
      type: "reservation_cancel",
      message: "예약이 취소되었습니다."
    });

    return r;
  }

  /* =====================================================
  🔥 ADMIN APPROVE
  ===================================================== */
  async approve(reservationId) {

    const r = await Reservation.findById(reservationId);
    if (!r) throw new Error("NOT_FOUND");

    r.status = "confirmed";
    await r.save();

    return r;
  }

  /* =====================================================
  🔥 ADMIN REJECT
  ===================================================== */
  async reject(reservationId) {

    const r = await Reservation.findById(reservationId);
    if (!r) throw new Error("NOT_FOUND");

    r.status = "rejected";
    await r.save();

    return r;
  }

  /* =====================================================
  🔥 RESCHEDULE
  ===================================================== */
  async reschedule(reservationId, { date, time }) {

    const r = await Reservation.findById(reservationId);
    if (!r) throw new Error("NOT_FOUND");

    const newTime = new Date(`${date} ${time}`);
    if (!newTime || isNaN(newTime.getTime())) {
      throw new Error("INVALID_TIME");
    }

    r.time = newTime;
    await r.save();

    return r;
  }

  /* =====================================================
  🔥 ADMIN LIST
  ===================================================== */
  async list({ page = 1, limit = 50 } = {}) {
    return Reservation.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
  }

  /* =====================================================
  🔥 STATS
  ===================================================== */
  async getStats() {

    const total = await Reservation.countDocuments();
    const confirmed = await Reservation.countDocuments({ status: "confirmed" });
    const cancelled = await Reservation.countDocuments({ status: "cancelled" });

    return {
      total,
      confirmed,
      cancelled
    };
  }

  /* =====================================================
  🔥 ADVANCED ANALYTICS
  ===================================================== */
  async getAdvancedStats() {

    const result = await Reservation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    return result;
  }

  /* =====================================================
  🔥 BULK CANCEL
  ===================================================== */
  async bulkCancel(ids = []) {

    const result = await Reservation.updateMany(
      { _id: { $in: ids } },
      { $set: { status: "cancelled" } }
    );

    return result.modifiedCount || 0;
  }

  /* =====================================================
  🔥 CLEANUP (EXPIRED)
  ===================================================== */
  async cleanupExpired() {

    const nowTime = new Date();

    const result = await Reservation.updateMany(
      {
        time: { $lt: nowTime },
        status: "pending"
      },
      {
        $set: { status: "expired" }
      }
    );

    return result.modifiedCount || 0;
  }

  /* =====================================================
  🔥 SYSTEM HEALTH
  ===================================================== */
  getHealth() {
    return {
      cacheSize: CACHE.size,
      lockSize: CREATE_LOCK.size,
      time: now()
    };
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = new ReservationService();