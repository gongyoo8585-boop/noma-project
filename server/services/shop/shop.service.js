"use strict";

/**
 * =====================================================
 * 🔥 SHOP SERVICE (FINAL VERIFIED SAFE PATCH)
 * ✔ 기존 기능 100% 유지
 * ✔ 업체 리스트 normalize 추가
 * ✔ images/photos/imageUrls 동기화
 * ✔ representativeImage 보강
 * ✔ lat/lng/location 보강
 * ✔ status normalize
 * ✔ shops/list/items 응답 대응
 * ✔ 관리자 통계 유지
 * ✔ 기존 함수 유지
 * ✔ 기존 export 유지
 * ✔ create/update normalize 추가
 * ✔ 관리자 업체 생성 오류 수정
 * ✔ 생성 후 유저관리 이동 방지 대응 데이터 보강
 * ✔ mongoose buffering timeout 대응 추가
 * ✔ DB 연결 대기 안정화 추가
 * =====================================================
 */

const mongoose = require("mongoose");

const User = require("../../models/User");
const Shop = require("../../models/Shop");
const Reservation = require("../../models/Reservation");
const Payment = require("../../models/Payment");

let Review = null;
let dbModule = null;

try {
  Review = require("../../models/Review");
} catch (e) {
  Review = null;
}

try {
  dbModule =
    require("../../../config/database") ||
    require("../../../db");
} catch (e) {
  try {
    dbModule = require("../../../db");
  } catch (err) {
    dbModule = null;
  }
}

/* =========================
🔥 최소 추가
========================= */

mongoose.set(
  "bufferCommands",
  false
);

mongoose.set(
  "strictQuery",
  false
);

const toNumberSafe = (
  value
) => {
  const num =
    Number(
      String(value ?? "")
        .replaceAll(",", "")
        .replaceAll("원", "")
        .trim()
    );

  return Number.isFinite(num)
    ? num
    : 0;
};

const normalizeArray = (
  value
) => {
  if (
    Array.isArray(value)
  ) {
    return value
      .map((v) =>
        String(v || "").trim()
      )
      .filter(Boolean);
  }

  if (
    typeof value === "string"
  ) {
    return value
      .split(",")
      .map((v) =>
        v.trim()
      )
      .filter(Boolean);
  }

  return [];
};

const normalizePriceArray = (
  value
) => {
  if (
    Array.isArray(value)
  ) {
    return value
      .map((v) =>
        toNumberSafe(v)
      )
      .filter(
        (v) =>
          Number.isFinite(v)
      );
  }

  if (
    typeof value === "string"
  ) {
    return value
      .split(",")
      .map((v) =>
        toNumberSafe(v.trim())
      )
      .filter(
        (v) =>
          Number.isFinite(v)
      );
  }

  if (
    value !== undefined &&
    value !== null
  ) {
    return [
      toNumberSafe(value),
    ];
  }

  return [];
};

const normalizeDateKey = (
  value
) => {
  const date =
    value
      ? new Date(value)
      : new Date();

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date
    .toISOString()
    .slice(0, 10);
};

/* =====================================================
🔥 DB SAFE
===================================================== */

const waitForMongoConnection = async () => {
  const started =
    Date.now();

  try {
    if (
      mongoose.connection.readyState !== 1 &&
      dbModule &&
      typeof dbModule.ensureDBConnection === "function"
    ) {
      await dbModule.ensureDBConnection();
    }

    if (
      mongoose.connection.readyState !== 1 &&
      dbModule &&
      typeof dbModule.connectDB === "function"
    ) {
      await dbModule.connectDB();
    }
  } catch (e) {
    console.error(
      "SHOP SERVICE DB CONNECT ERROR:",
      e.message
    );
  }

  while (
    mongoose.connection.readyState !== 1
  ) {
    if (
      Date.now() -
        started >
      15000
    ) {
      throw new Error(
        "DATABASE_CONNECTION_TIMEOUT"
      );
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          300
        )
    );
  }

  return true;
};

/* =====================================================
🔥 IMAGE NORMALIZE
===================================================== */

const normalizeImageArray = (
  value
) => {
  if (
    Array.isArray(value)
  ) {
    return value
      .map((v) =>
        String(v || "").trim()
      )
      .filter(Boolean);
  }

  if (
    typeof value === "string"
  ) {
    const text =
      value.trim();

    if (!text) {
      return [];
    }

    if (
      text.startsWith(
        "data:image/"
      )
    ) {
      return [text];
    }

    return text
      .split(",")
      .map((v) =>
        String(v || "").trim()
      )
      .filter(Boolean);
  }

  return [];
};

/* =====================================================
🔥 핵심 추가
===================================================== */

const normalizeShopItem = (
  shop = {}
) => {
  const images = [
    ...normalizeImageArray(
      shop.images
    ),
    ...normalizeImageArray(
      shop.photos
    ),
    ...normalizeImageArray(
      shop.imageUrls
    ),
  ].filter(
    (
      value,
      index,
      arr
    ) =>
      value &&
      arr.indexOf(value) ===
        index
  );

  const representativeImage =
    shop.representativeImage ||
    shop.mainImage ||
    shop.thumbnail ||
    shop.coverImage ||
    images[0] ||
    "";

  const lat =
    shop.lat ||
    shop.latitude ||
    shop?.location?.lat ||
    shop?.location?.y ||
    0;

  const lng =
    shop.lng ||
    shop.longitude ||
    shop?.location?.lng ||
    shop?.location?.x ||
    0;

  return {
    ...shop,

    _id:
      shop._id ||
      shop.id,

    id:
      shop.id ||
      shop._id,

    name:
      shop.name ||
      shop.shopName ||
      shop.title ||
      "업체명 없음",

    address:
      shop.address ||
      "",

    description:
      shop.description ||
      "",

    status:
      String(
        shop.status ||
          "active"
      ).toLowerCase(),

    lat:
      toNumberSafe(lat),

    lng:
      toNumberSafe(lng),

    location: {
      lat:
        toNumberSafe(lat),
      lng:
        toNumberSafe(lng),
    },

    images,

    photos: images,

    imageUrls: images,

    representativeImage,

    mainImage:
      representativeImage,

    thumbnail:
      representativeImage,

    coverImage:
      representativeImage,

    virtualPhone:
      shop.virtualPhone ||
      shop.fakePhone ||
      shop.callNumber ||
      "",

    businessHours:
      shop.businessHours ||
      shop.openingHours ||
      shop.hours ||
      "",

    visible:
      shop.visible !== false,

    approved:
      shop.approved !==
      false,

    premium:
      shop.premium ===
      true,

    isReservable:
      shop.isReservable !==
      false,
  };
};

const attachCoursePricePairs = (
  shop
) => {
  if (!shop) {
    return shop;
  }

  const normalizedShop =
    normalizeShopItem(
      shop
    );

  const courses =
    normalizeArray(
      normalizedShop.courses
    );

  const prices =
    normalizePriceArray(
      normalizedShop.price
    );

  return {
    ...normalizedShop,

    courses,

    price: prices,

    coursePricePairs:
      courses.map(
        (
          course,
          index
        ) => ({
          course,
          price:
            prices[index] || 0,
        })
      ),
  };
};

/* =========================
🔥 업체 생성
========================= */

async function createShop(
  payload = {}
) {
  await waitForMongoConnection();

  const normalizedCourses =
    normalizeArray(
      payload.courses
    );

  const normalizedPrices =
    normalizePriceArray(
      payload.price
    );

  const images = [
    ...normalizeImageArray(
      payload.images
    ),
    ...normalizeImageArray(
      payload.photos
    ),
    ...normalizeImageArray(
      payload.imageUrls
    ),
  ].filter(
    (
      value,
      index,
      arr
    ) =>
      value &&
      arr.indexOf(value) ===
        index
  );

  const representativeImage =
    payload.representativeImage ||
    payload.mainImage ||
    payload.thumbnail ||
    payload.coverImage ||
    images[0] ||
    "";

  const lat =
    toNumberSafe(
      payload.lat ||
        payload?.location
          ?.lat
    );

  const lng =
    toNumberSafe(
      payload.lng ||
        payload?.location
          ?.lng
    );

  const createData = {
    ...payload,

    name:
      payload.name ||
      payload.shopName ||
      "",

    address:
      payload.address ||
      "",

    courses:
      normalizedCourses,

    price:
      normalizedPrices,

    images,

    photos: images,

    imageUrls: images,

    representativeImage,

    mainImage:
      representativeImage,

    thumbnail:
      representativeImage,

    coverImage:
      representativeImage,

    lat,

    lng,

    location: {
      lat,
      lng,
    },

    visible:
      payload.visible !==
      false,

    approved:
      payload.approved !==
      false,

    premium:
      payload.premium ===
      true,

    isReservable:
      payload.isReservable !==
      false,

    status:
      payload.status ||
      "active",

    createdAt:
      new Date(),

    updatedAt:
      new Date(),
  };

  const shop =
    await Shop.create(
      createData
    );

  return attachCoursePricePairs(
    normalizeShopItem(
      shop.toObject
        ? shop.toObject()
        : shop
    )
  );
}

/* =========================
🔥 업체 수정
========================= */

async function updateShop(
  id,
  payload = {}
) {
  await waitForMongoConnection();

  const existingShop =
    await Shop.findById(id);

  if (!existingShop) {
    throw new Error(
      "SHOP_NOT_FOUND"
    );
  }

  const normalizedCourses =
    payload.courses !==
    undefined
      ? normalizeArray(
          payload.courses
        )
      : existingShop.courses;

  const normalizedPrices =
    payload.price !==
    undefined
      ? normalizePriceArray(
          payload.price
        )
      : existingShop.price;

  const images = [
    ...normalizeImageArray(
      payload.images
    ),
    ...normalizeImageArray(
      payload.photos
    ),
    ...normalizeImageArray(
      payload.imageUrls
    ),
    ...normalizeImageArray(
      existingShop.images
    ),
  ].filter(
    (
      value,
      index,
      arr
    ) =>
      value &&
      arr.indexOf(value) ===
        index
  );

  const representativeImage =
    payload.representativeImage ||
    payload.mainImage ||
    payload.thumbnail ||
    payload.coverImage ||
    existingShop.representativeImage ||
    images[0] ||
    "";

  const lat =
    toNumberSafe(
      payload.lat ||
        payload?.location
          ?.lat ||
        existingShop.lat
    );

  const lng =
    toNumberSafe(
      payload.lng ||
        payload?.location
          ?.lng ||
        existingShop.lng
    );

  Object.assign(
    existingShop,
    {
      ...payload,

      courses:
        normalizedCourses,

      price:
        normalizedPrices,

      images,

      photos: images,

      imageUrls: images,

      representativeImage,

      mainImage:
        representativeImage,

      thumbnail:
        representativeImage,

      coverImage:
        representativeImage,

      lat,

      lng,

      location: {
        lat,
        lng,
      },

      updatedAt:
        new Date(),
    }
  );

  await existingShop.save();

  return attachCoursePricePairs(
    normalizeShopItem(
      existingShop.toObject
        ? existingShop.toObject()
        : existingShop
    )
  );
}

/* =========================
🔥 통계
========================= */

async function getStats(
  options = {}
) {
  await waitForMongoConnection();

  const {
    startDate,
    endDate,
  } = options;

  const start =
    startDate
      ? new Date(startDate)
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          1,
          0,
          0,
          0,
          0
        );

  const end =
    endDate
      ? new Date(endDate)
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        );

  const [
    shopCount,
    userCount,
    reservationCount,
    payments,
    shops,
    reservations,
    reviews,
  ] =
    await Promise.all([
      Shop.countDocuments({
        isDeleted: false,
      }),

      User.countDocuments({}),

      Reservation.countDocuments(
        {}
      ),

      Payment.find(
        {
          createdAt: {
            $gte: start,
            $lte: end,
          },
        },
        {
          amount: 1,
          createdAt: 1,
          shop: 1,
        }
      ).lean(),

      Shop.find({
        isDeleted: false,
      }).lean(),

      Reservation.find({
        createdAt: {
          $gte: start,
          $lte: end,
        },
      }).lean(),

      Review
        ? Review.find({
            createdAt: {
              $gte: start,
              $lte: end,
            },
          }).lean()
        : [],
    ]);

  const totalRevenue =
    (payments || []).reduce(
      (sum, p) =>
        sum +
        toNumberSafe(
          p.amount
        ),
      0
    );

  const shopStatsMap =
    {};

  (shops || []).forEach(
    (shop) => {
      const normalizedShop =
        normalizeShopItem(
          shop
        );

      const shopId =
        String(
          normalizedShop._id
        );

      shopStatsMap[
        shopId
      ] = {
        shopId,

        name:
          normalizedShop.name || "",

        phone:
          normalizedShop.phone || "",

        virtualPhone:
          normalizedShop.virtualPhone ||
          "",

        businessHours:
          normalizedShop.businessHours ||
          "",

        dailyCalls: {},

        dailyClicks: {},

        dailyConversions: {},

        dailyReviews: {},

        callCount: 0,

        clickCount:
          toNumberSafe(
            normalizedShop.viewCount ||
              normalizedShop.views ||
              0
          ),

        conversionCount: 0,

        reviewCount: 0,
      };

      const todayKey =
        normalizeDateKey(
          new Date()
        );

      shopStatsMap[
        shopId
      ].dailyClicks[
        todayKey
      ] =
        toNumberSafe(
          normalizedShop.viewCount ||
            normalizedShop.views ||
            0
        );

      shopStatsMap[
        shopId
      ].dailyCalls[
        todayKey
      ] = 0;
    }
  );

  (reservations || []).forEach(
    (reservation) => {
      const shopId =
        String(
          reservation.shop ||
            reservation.shopId ||
            reservation.shop_id ||
            ""
        );

      const dateKey =
        normalizeDateKey(
          reservation.createdAt
        );

      if (
        shopStatsMap[shopId] &&
        dateKey
      ) {
        shopStatsMap[
          shopId
        ].dailyConversions[
          dateKey
        ] =
          toNumberSafe(
            shopStatsMap[
              shopId
            ].dailyConversions[
              dateKey
            ]
          ) + 1;

        shopStatsMap[
          shopId
        ].conversionCount =
          toNumberSafe(
            shopStatsMap[
              shopId
            ].conversionCount
          ) + 1;
      }
    }
  );

  (reviews || []).forEach(
    (review) => {
      const shopId =
        String(
          review.shop ||
            review.shopId ||
            review.shop_id ||
            ""
        );

      const dateKey =
        normalizeDateKey(
          review.createdAt
        );

      if (
        shopStatsMap[shopId] &&
        dateKey
      ) {
        shopStatsMap[
          shopId
        ].dailyReviews[
          dateKey
        ] =
          toNumberSafe(
            shopStatsMap[
              shopId
            ].dailyReviews[
              dateKey
            ]
          ) + 1;

        shopStatsMap[
          shopId
        ].reviewCount =
          toNumberSafe(
            shopStatsMap[
              shopId
            ].reviewCount
          ) + 1;
      }
    }
  );

  return {
    shops: shopCount,

    shopCount,

    totalShops:
      shopCount,

    users: userCount,

    userCount,

    reservations:
      reservationCount,

    reservationCount,

    revenue:
      totalRevenue,

    totalRevenue,

    startDate:
      start,

    endDate:
      end,

    shopStats:
      Object.values(
        shopStatsMap
      ),

    list:
      Object.values(
        shopStatsMap
      ),

    items:
      Object.values(
        shopStatsMap
      ),

    data:
      Object.values(
        shopStatsMap
      ),
  };
}

/* =========================
🔥 업체 리스트
========================= */

async function getShopList() {
  await waitForMongoConnection();

  const shops =
    await Shop.find({
      isDeleted: false,
    })
      .lean()
      .sort({
        premium: -1,
        createdAt: -1,
      });

  return shops
    .map(
      attachCoursePricePairs
    )
    .map(
      normalizeShopItem
    )
    .filter(Boolean);
}

module.exports = {
  getStats,

  getShopList,

  createShop,

  updateShop,
};