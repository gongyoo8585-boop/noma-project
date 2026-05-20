"use strict";

/**
 * =====================================================
 * 🔥 ADMIN ANALYTICS CONTROLLER (LOWERCASE STRUCTURE FIXED)
 * =====================================================
 */

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn("[SAFE REQUIRE FAIL]", path);
    return null;
  }
}

const realtimeService = safeRequire("../../services/analytics/realtime.analytics.service");
const revenueService = safeRequire("../../services/analytics/revenue.analytics.service");
const userService = safeRequire("../../services/analytics/user.analytics.service");
const shopService = safeRequire("../../services/analytics/shop.analytics.service");
const cacheService = safeRequire("../../services/analytics/cache.analytics.service");

const cacheLayer = safeRequire("../../services/cache/cache.layer");

/* 🔥 최소 추가 */
const User = safeRequire("../../models/User");
const Reservation = safeRequire("../../models/Reservation");
const Payment = safeRequire("../../models/Payment");
const Shop = safeRequire("../../models/Shop");

/* =========================
UTIL
========================= */
function ok(res, data = {}) {
  return res.json({ ok: true, ...data });
}

function fail(res, msg = "ERROR", code = 500) {
  return res.status(code).json({ ok: false, msg });
}

function safeNumber(val) {
  return Number(val) || 0;
}

/* =========================
SAFE EXEC
========================= */
async function safeExec(fn, fallback = {}) {
  try {
    if (!fn) return fallback;
    const res = await fn();
    return res || fallback;
  } catch {
    return fallback;
  }
}

/* =====================================================
🔥 REALTIME ANALYTICS
===================================================== */
async function getRealtime(req, res) {
  try {
    const cacheKey = "admin:analytics:realtime";

    if (cacheLayer?.get) {
      const cached = await cacheLayer.get(cacheKey);
      if (cached) return ok(res, cached);
    }

    const data = await safeExec(
      () => realtimeService?.getRealtime(),
      {
        usersOnline: 0,
        activeSessions: 0,
        requestsPerMin: 0,
      }
    );

    if (cacheLayer?.set) {
      await cacheLayer.set(cacheKey, data, 5);
    }

    return ok(res, data);
  } catch (e) {
    console.error("REALTIME ANALYTICS ERROR:", e.message);

    return ok(res, {
      usersOnline: 0,
      activeSessions: 0,
      requestsPerMin: 0,
    });
  }
}

/* =====================================================
🔥 REVENUE ANALYTICS
===================================================== */
async function getRevenue(req, res) {
  try {
    const cacheKey = "admin:analytics:revenue";

    if (cacheLayer?.get) {
      const cached = await cacheLayer.get(cacheKey);
      if (cached) return ok(res, cached);
    }

    let data = await safeExec(
      () => revenueService?.getRevenue(),
      null
    );

    /* 🔥 최소 추가: 서비스 없을 때 fallback */
    if (!data) {
      const paymentList = Payment?.find
        ? await Payment.find({})
        : [];

      const total = Array.isArray(paymentList)
        ? paymentList.reduce(
            (sum, item) =>
              sum +
              safeNumber(
                item.amount ||
                  item.price ||
                  item.totalAmount ||
                  item.paymentAmount
              ),
            0
          )
        : 0;

      data = {
        total,
        today: 0,
        monthly: [],
      };
    }

    if (cacheLayer?.set) {
      await cacheLayer.set(cacheKey, data, 30);
    }

    return ok(res, data);
  } catch (e) {
    console.error("REVENUE ANALYTICS ERROR:", e.message);

    return ok(res, {
      total: 0,
      today: 0,
      monthly: [],
    });
  }
}

/* =====================================================
🔥 USER ANALYTICS
===================================================== */
async function getUsers(req, res) {
  try {
    const cacheKey = "admin:analytics:users";

    if (cacheLayer?.get) {
      const cached = await cacheLayer.get(cacheKey);
      if (cached) return ok(res, cached);
    }

    let data = await safeExec(
      () => userService?.getUserStats(),
      null
    );

    /* 🔥 최소 추가 */
    if (!data) {
      const total = User?.countDocuments
        ? await User.countDocuments()
        : 0;

      data = {
        total,
        newUsers: 0,
        activeUsers: 0,
      };
    }

    if (cacheLayer?.set) {
      await cacheLayer.set(cacheKey, data, 30);
    }

    return ok(res, data);
  } catch (e) {
    console.error("USER ANALYTICS ERROR:", e.message);

    return ok(res, {
      total: 0,
      newUsers: 0,
      activeUsers: 0,
    });
  }
}

/* =====================================================
🔥 SHOP ANALYTICS
===================================================== */
async function getShops(req, res) {
  try {
    const cacheKey = "admin:analytics:shops";

    if (cacheLayer?.get) {
      const cached = await cacheLayer.get(cacheKey);
      if (cached) return ok(res, cached);
    }

    let data = await safeExec(
      () => shopService?.getShopStats(),
      null
    );

    /* 🔥 최소 추가 */
    if (!data) {
      const total = Shop?.countDocuments
        ? await Shop.countDocuments()
        : 0;

      const active = Shop?.countDocuments
        ? await Shop.countDocuments({
            status: "active",
          })
        : total;

      data = {
        total,
        active,
        topShops: [],
      };
    }

    if (cacheLayer?.set) {
      await cacheLayer.set(cacheKey, data, 30);
    }

    return ok(res, data);
  } catch (e) {
    console.error("SHOP ANALYTICS ERROR:", e.message);

    return ok(res, {
      total: 0,
      active: 0,
      topShops: [],
    });
  }
}

/* =====================================================
🔥 CACHE ANALYTICS
===================================================== */
async function getCache(req, res) {
  try {
    const data = await safeExec(
      () => cacheService?.getCacheStats(),
      {
        hit: 0,
        miss: 0,
        keys: 0,
      }
    );

    return ok(res, data);
  } catch (e) {
    console.error("CACHE ANALYTICS ERROR:", e.message);

    return ok(res, {
      hit: 0,
      miss: 0,
      keys: 0,
    });
  }
}

/* =====================================================
🔥 DASHBOARD ANALYTICS
===================================================== */
async function getDashboard(req, res) {
  try {
    const [
      totalUsers,
      totalReservations,
      totalShops,
      paymentList,
    ] = await Promise.all([
      User?.countDocuments
        ? User.countDocuments()
        : 0,

      Reservation?.countDocuments
        ? Reservation.countDocuments()
        : 0,

      Shop?.countDocuments
        ? Shop.countDocuments()
        : 0,

      Payment?.find
        ? Payment.find({})
        : [],
    ]);

    const totalRevenue = Array.isArray(paymentList)
      ? paymentList.reduce(
          (sum, item) =>
            sum +
            safeNumber(
              item.amount ||
                item.price ||
                item.totalAmount ||
                item.paymentAmount
            ),
          0
        )
      : 0;

    return ok(res, {
      summary: {
        totalUsers: totalUsers || 0,
        totalReservations: totalReservations || 0,
        totalPayments: Array.isArray(paymentList)
          ? paymentList.length
          : 0,
        totalRevenue,
        totalShops: totalShops || 0,
      },
    });
  } catch (e) {
    console.error("DASHBOARD ANALYTICS ERROR:", e.message);

    return ok(res, {
      summary: {
        totalUsers: 0,
        totalReservations: 0,
        totalPayments: 0,
        totalRevenue: 0,
        totalShops: 0,
      },
    });
  }
}

/* =====================================================
🔥 RESERVATION ANALYTICS
===================================================== */
async function getReservations(req, res) {
  try {
    const total = Reservation?.countDocuments
      ? await Reservation.countDocuments()
      : 0;

    return ok(res, {
      total,
      items: [],
    });
  } catch (e) {
    console.error("RESERVATION ANALYTICS ERROR:", e.message);

    return ok(res, {
      total: 0,
      items: [],
    });
  }
}

/* =====================================================
🔥 최소 추가: routes 호환 alias
===================================================== */
const getStats = getUsers;

const realtime = getRealtime;
const revenue = getRevenue;
const users = getUsers;
const shops = getShops;
const cache = getCache;

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  getRealtime,
  getRevenue,
  getUsers,
  getShops,
  getCache,
  getStats,

  realtime,
  revenue,
  users,
  shops,
  cache,

  /* 🔥 최소 추가 */
  getDashboard,
  getReservations,
};