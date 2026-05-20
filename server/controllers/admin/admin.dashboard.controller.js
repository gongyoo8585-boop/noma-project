"use strict";

/**
 * =====================================================
 * 🔥 ADMIN DASHBOARD CONTROLLER (FINAL SAFE PATCH)
 * ✔ 기존 코드 100% 유지
 * ✔ aggregate undefined 크래시 방지
 * ✔ lean undefined 크래시 방지
 * ✔ cache layer null 안전 처리
 * ✔ ObjectId/Model 오류 방지
 * ✔ admin dashboard 데이터 0 문제 수정
 * ✔ 배열 응답 구조 추가
 * ✔ 프론트 summary/recent 동시 호환
 * ✔ 기존 흐름 유지
 * =====================================================
 */

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn("SAFE REQUIRE FAIL:", path);
    return null;
  }
}

const Shop = safeRequire("../../models/Shop");
const User = safeRequire("../../models/User");
const Reservation = safeRequire("../../models/Reservation");
const Payment = safeRequire("../../models/Payment");

const cacheLayer = safeRequire("../../services/cache/cache.layer");

/* =========================
UTIL
========================= */
function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ok(res, data = {}) {
  return res.json({
    ok: true,
    ...data,
  });
}

function fail(
  res,
  msg = "ERROR",
  code = 500
) {
  return res
    .status(code)
    .json({
      ok: false,
      msg,
    });
}

/* =========================
COUNT SAFE
========================= */
async function safeCount(model) {
  try {
    if (!model) return 0;

    if (
      typeof model.countDocuments !==
      "function"
    ) {
      return 0;
    }

    return await model.countDocuments();

  } catch (e) {
    console.error(
      "COUNT ERROR:",
      e.message
    );

    return 0;
  }
}

/* =========================
SUM SAFE
========================= */
async function safeSum(
  model,
  field
) {
  try {
    if (!model) return 0;

    if (
      typeof model.aggregate !==
      "function"
    ) {
      return 0;
    }

    const res =
      await model.aggregate([
        {
          $group: {
            _id: null,
            total: {
              $sum: `$${field}`,
            },
          },
        },
      ]);

    return toNumber(
      res?.[0]?.total,
      0
    );

  } catch (e) {
    console.error(
      "SUM ERROR:",
      e.message
    );

    return 0;
  }
}

/* =========================
RECENT LIST
========================= */
async function getRecent(
  model,
  limit = 5
) {
  try {
    if (!model) return [];

    if (
      typeof model.find !==
      "function"
    ) {
      return [];
    }

    const query = model
      .find()
      .sort({
        createdAt: -1,
      })
      .limit(limit);

    if (
      query &&
      typeof query.lean ===
        "function"
    ) {
      return await query.lean();
    }

    return await query;

  } catch (e) {
    console.error(
      "RECENT ERROR:",
      e.message
    );

    return [];
  }
}

/* =====================================================
🔥 DASHBOARD MAIN
===================================================== */
async function getDashboard(
  req,
  res
) {
  try {
    const cacheKey =
      "admin:dashboard";

    /* =========================
    🔥 캐시 조회
    ========================= */
    if (
      cacheLayer &&
      typeof cacheLayer.get ===
        "function"
    ) {
      try {
        const cached =
          await cacheLayer.get(
            cacheKey
          );

        if (cached) {
          return ok(res, cached);
        }

      } catch (e) {
        console.warn(
          "CACHE GET FAIL:",
          e.message
        );
      }
    }

    /* =========================
    🔥 COUNT
    ========================= */
    const [
      totalShops,
      totalUsers,
      totalReservations,
      totalPayments,
    ] = await Promise.all([
      safeCount(Shop),
      safeCount(User),
      safeCount(Reservation),
      safeCount(Payment),
    ]);

    /* =========================
    🔥 SUM
    ========================= */
    const totalRevenue =
      await safeSum(
        Payment,
        "amount"
      );

    /* =========================
    🔥 RECENT
    ========================= */
    const [
      recentShops,
      recentUsers,
      recentReservations,
    ] = await Promise.all([
      getRecent(Shop),
      getRecent(User),
      getRecent(Reservation),
    ]);

    /* =========================
    🔥 RESPONSE
    ========================= */
    const response = {

      /* 🔥 기존 summary 유지 */
      summary: {
        totalShops:
          toNumber(totalShops),

        totalUsers:
          toNumber(totalUsers),

        totalReservations:
          toNumber(
            totalReservations
          ),

        totalPayments:
          toNumber(totalPayments),

        totalRevenue:
          toNumber(totalRevenue),
      },

      /* 🔥 기존 recent 유지 */
      recent: {
        shops:
          recentShops || [],

        users:
          recentUsers || [],

        reservations:
          recentReservations ||
          [],
      },

      /* =====================================================
      🔥 최소 추가
      ✔ 프론트 호환용 직접 키 추가
      ===================================================== */
      shops:
        recentShops || [],

      users:
        recentUsers || [],

      reservations:
        recentReservations ||
        [],

      totalShops:
        toNumber(totalShops),

      totalUsers:
        toNumber(totalUsers),

      totalReservations:
        toNumber(
          totalReservations
        ),

      totalPayments:
        toNumber(totalPayments),

      totalRevenue:
        toNumber(totalRevenue),

      stats: {
        shops:
          toNumber(totalShops),

        users:
          toNumber(totalUsers),

        reservations:
          toNumber(
            totalReservations
          ),

        payments:
          toNumber(totalPayments),

        revenue:
          toNumber(totalRevenue),
      },

      meta: {
        generatedAt:
          new Date(),
      },
    };

    /* =========================
    🔥 캐시 저장
    ========================= */
    if (
      cacheLayer &&
      typeof cacheLayer.set ===
        "function"
    ) {
      try {
        await cacheLayer.set(
          cacheKey,
          response,
          30
        );

      } catch (e) {
        console.warn(
          "CACHE SET FAIL:",
          e.message
        );
      }
    }

    return ok(res, response);

  } catch (e) {
    console.error(
      "ADMIN DASHBOARD ERROR:",
      e.message
    );

    return fail(
      res,
      e.message ||
        "DASHBOARD_ERROR"
    );
  }
}

/* =====================================================
🔥 최소 추가: routes 호환 alias
===================================================== */
const getStats =
  getDashboard;

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  getDashboard,
  getStats,
};