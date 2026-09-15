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
 * ✔ 카테고리별 매장 수 불일치 수정
 * ✔ /admin/karaoke path category 인식
 * ✔ Shop 원본 필드 + 런타임 분류 동시 지원
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

function normalizeDashboardCategory(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (
    text.includes("/admin/karaoke") ||
    text.includes("category=karaoke") ||
    text.includes("shopcategory=karaoke") ||
    text.includes("servicetype=karaoke") ||
    text.includes("businesstype=karaoke") ||
    text.includes("admincategory=karaoke") ||
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
    text.includes("/admin/massage") ||
    text.includes("category=massage") ||
    text.includes("shopcategory=massage") ||
    text.includes("servicetype=massage") ||
    text.includes("businesstype=massage") ||
    text.includes("admincategory=massage") ||
    text === "massage" ||
    text === "마사지" ||
    text === "shop" ||
    text === "nora-massage" ||
    text === "nora_massage"
  ) {
    return "massage";
  }

  return "";
}

function getDashboardCategory(req) {
  const queryCategory =
    normalizeDashboardCategory(req?.query?.category) ||
    normalizeDashboardCategory(req?.query?.shopCategory) ||
    normalizeDashboardCategory(req?.query?.serviceType) ||
    normalizeDashboardCategory(req?.query?.businessType) ||
    normalizeDashboardCategory(req?.query?.adminCategory);

  if (queryCategory) {
    return queryCategory;
  }

  const originalUrlCategory =
    normalizeDashboardCategory(req?.originalUrl) ||
    normalizeDashboardCategory(req?.url) ||
    normalizeDashboardCategory(req?.path);

  if (originalUrlCategory) {
    return originalUrlCategory;
  }

  const referer =
    req?.headers?.referer ||
    req?.headers?.referrer ||
    "";

  const refererCategory =
    normalizeDashboardCategory(referer);

  if (refererCategory) {
    return refererCategory;
  }

  return "massage";
}

function createShopCategoryAliases(category) {
  const normalized =
    normalizeDashboardCategory(category);

  if (normalized === "karaoke") {
    return [
      "karaoke",
      "노래방",
      "가라오케",
      "coin-karaoke",
      "coin_karaoke",
      "nora-karaoke",
      "nora_karaoke",
    ];
  }

  if (normalized === "massage") {
    return [
      "massage",
      "마사지",
      "shop",
      "nora-massage",
      "nora_massage",
    ];
  }

  return [];
}

function createShopCategoryFilter(category) {
  const aliases =
    createShopCategoryAliases(category);

  if (!aliases.length) {
    return {};
  }

  return {
    $and: [
      {
        $or: [
          { category: { $in: aliases } },
          { shopCategory: { $in: aliases } },
          { serviceType: { $in: aliases } },
          { businessType: { $in: aliases } },
          { adminCategory: { $in: aliases } },
          { type: { $in: aliases } },
          { categoryGroup: { $in: aliases } },
          { shopType: { $in: aliases } },
          { mainCategory: { $in: aliases } },
          { service: { $in: aliases } },
        ],
      },
      {
        isDeleted: { $ne: true },
      },
    ],
  };
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim();
}

function getRuntimeShopCategory(shop = {}) {
  const joined = [
    shop.category,
    shop.shopCategory,
    shop.serviceType,
    shop.businessType,
    shop.adminCategory,
    shop.type,
    shop.categoryGroup,
    shop.shopType,
    shop.mainCategory,
    shop.service,
    shop.name,
    shop.title,
    shop.description,
    shop.address,
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(" ");

  const direct =
    normalizeDashboardCategory(shop.category) ||
    normalizeDashboardCategory(shop.shopCategory) ||
    normalizeDashboardCategory(shop.serviceType) ||
    normalizeDashboardCategory(shop.businessType) ||
    normalizeDashboardCategory(shop.adminCategory) ||
    normalizeDashboardCategory(shop.type) ||
    normalizeDashboardCategory(shop.categoryGroup) ||
    normalizeDashboardCategory(shop.shopType) ||
    normalizeDashboardCategory(shop.mainCategory) ||
    normalizeDashboardCategory(shop.service);

  if (direct) {
    return direct;
  }

  if (
    joined.includes("karaoke") ||
    joined.includes("노래방") ||
    joined.includes("가라오케") ||
    joined.includes("코인")
  ) {
    return "karaoke";
  }

  if (
    joined.includes("massage") ||
    joined.includes("마사지") ||
    joined.includes("테라피") ||
    joined.includes("아로마") ||
    joined.includes("스웨디시")
  ) {
    return "massage";
  }

  return "massage";
}

function isDeletedShop(shop = {}) {
  return (
    shop.isDeleted === true ||
    shop.deleted === true ||
    shop.removed === true
  );
}

/* =========================
COUNT SAFE
========================= */
async function safeCount(model, filter = {}) {
  try {
    if (!model) return 0;

    if (
      typeof model.countDocuments !==
      "function"
    ) {
      return 0;
    }

    return await model.countDocuments(filter);

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
  limit = 5,
  filter = {}
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
      .find(filter)
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

async function getRuntimeCategoryShops(
  category,
  limit = 5
) {
  try {
    if (
      !Shop ||
      typeof Shop.find !== "function"
    ) {
      return {
        total: 0,
        recent: [],
      };
    }

    const docsQuery = Shop
      .find({
        isDeleted: { $ne: true },
      })
      .sort({
        createdAt: -1,
      });

    const docs =
      docsQuery &&
      typeof docsQuery.lean === "function"
        ? await docsQuery.lean()
        : await docsQuery;

    const normalizedCategory =
      normalizeDashboardCategory(category) ||
      "massage";

    const filtered =
      Array.isArray(docs)
        ? docs.filter((shop) => {
            if (isDeletedShop(shop)) {
              return false;
            }

            return (
              getRuntimeShopCategory(shop) ===
              normalizedCategory
            );
          })
        : [];

    return {
      total: filtered.length,
      recent: filtered.slice(0, limit),
    };
  } catch (e) {
    console.error(
      "RUNTIME SHOP CATEGORY ERROR:",
      e.message
    );

    return {
      total: 0,
      recent: [],
    };
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
    const dashboardCategory =
      getDashboardCategory(req);

    const shopFilter =
      createShopCategoryFilter(
        dashboardCategory
      );

    const cacheKey =
      `admin:dashboard:${dashboardCategory}`;

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

    const runtimeShops =
      await getRuntimeCategoryShops(
        dashboardCategory,
        5
      );

    /* =========================
    🔥 COUNT
    ========================= */
    const [
      rawTotalShops,
      totalUsers,
      totalReservations,
      totalPayments,
    ] = await Promise.all([
      safeCount(Shop, shopFilter),
      safeCount(User),
      safeCount(Reservation),
      safeCount(Payment),
    ]);

    const totalShops =
      runtimeShops.total > 0
        ? runtimeShops.total
        : rawTotalShops;

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
      rawRecentShops,
      recentUsers,
      recentReservations,
    ] = await Promise.all([
      getRecent(Shop, 5, shopFilter),
      getRecent(User),
      getRecent(Reservation),
    ]);

    const recentShops =
      runtimeShops.recent.length > 0
        ? runtimeShops.recent
        : rawRecentShops;

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
        category:
          dashboardCategory,

        rawTotalShops:
          toNumber(rawTotalShops),

        runtimeTotalShops:
          toNumber(runtimeShops.total),

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