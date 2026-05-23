"use strict";

/* =====================================================
🔥 SLOT SERVICE (FINAL MASTER)
시간 슬롯 관리 / 예약 가능 여부 / 동시성 제어 / 캐시 / 확장
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

/* =====================================================
🔥 CACHE
===================================================== */
const CACHE = new Map();
const TTL = 1000 * 10;

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
🔥 LOCK (동시성 제어)
===================================================== */
const SLOT_LOCK = new Map();

function acquire(key) {
  if (SLOT_LOCK.get(key)) return false;
  SLOT_LOCK.set(key, true);

  setTimeout(() => SLOT_LOCK.delete(key), 2000);
  return true;
}

/* =====================================================
🔥 UTIL
===================================================== */
function toDate(date, time) {
  const d = new Date(`${date} ${time}`);
  if (!d || isNaN(d.getTime())) return null;
  return d;
}

function hourRange(start = 10, end = 22) {
  const list = [];
  for (let i = start; i <= end; i++) {
    list.push(i.toString().padStart(2, "0") + ":00");
  }
  return list;
}

/* =====================================================
🔥 CLASS
===================================================== */
class SlotService {

  /* =====================================================
  🔥 SLOT CHECK
  ===================================================== */
  async check({ shopId, date, time }) {
    const key = `${shopId}_${date}_${time}`;

    const cached = cacheGet(key);
    if (cached !== null) return cached;

    const d = toDate(date, time);
    if (!d) return { ok: false, reason: "INVALID_TIME" };

    const exists = await Reservation.exists({
      shopId,
      time: d,
      status: { $in: ["pending", "confirmed"] }
    });

    const result = {
      ok: !exists,
      available: !exists
    };

    cacheSet(key, result);
    return result;
  }

  /* =====================================================
  🔥 SLOT COUNT
  ===================================================== */
  async count({ shopId, date }) {
    const slots = hourRange();
    const result = [];

    for (const time of slots) {
      const check = await this.check({ shopId, date, time });
      result.push({
        time,
        available: check.available
      });
    }

    return result;
  }

  /* =====================================================
  🔥 AVAILABLE SLOTS
  ===================================================== */
  async getAvailableSlots({ shopId, date }) {
    const list = await this.count({ shopId, date });
    return list.filter(s => s.available);
  }

  /* =====================================================
  🔥 RESERVE SLOT (LOCK)
  ===================================================== */
  async reserve({ shopId, date, time }) {
    const key = `${shopId}_${date}_${time}`;

    if (!acquire(key)) {
      throw new Error("SLOT_LOCKED");
    }

    const check = await this.check({ shopId, date, time });

    if (!check.available) {
      throw new Error("SLOT_NOT_AVAILABLE");
    }

    return { ok: true };
  }

  /* =====================================================
  🔥 BULK CHECK
  ===================================================== */
  async bulkCheck({ shopId, date, times = [] }) {
    const result = {};

    for (const t of times) {
      result[t] = await this.check({ shopId, date, time: t });
    }

    return result;
  }

  /* =====================================================
  🔥 NEXT AVAILABLE
  ===================================================== */
  async getNextAvailable({ shopId, date }) {
    const list = await this.getAvailableSlots({ shopId, date });
    return list.length ? list[0] : null;
  }

  /* =====================================================
  🔥 PEAK TIME (간단 분석)
  ===================================================== */
  async getPeakTime({ shopId }) {
    const data = await Reservation.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: { $hour: "$time" },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);

    return data[0] || null;
  }

  /* =====================================================
  🔥 CLEAN CACHE
  ===================================================== */
  clearCache() {
    CACHE.clear();
    return true;
  }

  /* =====================================================
  🔥 HEALTH
  ===================================================== */
  getHealth() {
    return {
      cacheSize: CACHE.size,
      lockSize: SLOT_LOCK.size,
      time: new Date()
    };
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = new SlotService();