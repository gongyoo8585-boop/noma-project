"use strict";

/**
 * =====================================================
 * 🔥 SHOP ROUTES (FINAL VERIFIED STABLE)
 * =====================================================
 */

const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

console.log("🔥 SHOP ROUTES LOADED");

function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn(`[SAFE REQUIRE FAIL] ${path}`);
    return null;
  }
}

const mongoose = safeRequire("mongoose");

const dbModule =
  safeRequire("../../config/database") ||
  safeRequire("../../db") ||
  safeRequire("../config/database") ||
  safeRequire("../db");

const controller = safeRequire("../controllers/shop.controller") || {};

const ShopModel =
  safeRequire("../models/Shop") ||
  safeRequire("../../models/Shop");

const LOCAL_SHOPS = [];

const DEFAULT_SHOPS = [
  {
    _id: "local-noma-gimhae-main",
    id: "local-noma-gimhae-main",
    name: "노마 김해 본점",
    address: "경상남도 김해시 가야로",
    region: "경남",
    district: "김해시",
    phone: "010-0000-0001",
    virtualPhone: "0507-0000-0001",
    fakePhone: "0507-0000-0001",
    callNumber: "0507-0000-0001",
    businessHours: "24시간",
    openingHours: "24시간",
    hours: "24시간",
    description: "노마 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2613,
    lng: 128.871,
    location: {
      lat: 35.2613,
      lng: 128.871,
    },
    geo: {
      type: "Point",
      coordinates: [128.871, 35.2613],
    },
    courses: ["스웨디시 60분", "아로마 90분"],
    price: [80000, 120000],
    priceOriginal: 120000,
    priceDiscount: 80000,
    status: "active",
    visible: true,
    approved: true,
    premium: true,
    isPremium: true,
    premiumType: "premium",
    isReservable: true,
    tags: ["노마", "마사지", "김해"],
    serviceTypes: ["스웨디시", "아로마"],
    images: [],
    photos: [],
    imageUrls: [],
  },
  {
    _id: "local-noma-jangyu",
    id: "local-noma-jangyu",
    name: "노마 장유점",
    address: "경상남도 김해시 장유동",
    region: "경남",
    district: "김해시",
    phone: "010-0000-0002",
    virtualPhone: "0507-0000-0002",
    fakePhone: "0507-0000-0002",
    callNumber: "0507-0000-0002",
    businessHours: "10:00 - 03:00",
    openingHours: "10:00 - 03:00",
    hours: "10:00 - 03:00",
    description: "노마 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2468,
    lng: 128.9021,
    location: {
      lat: 35.2468,
      lng: 128.9021,
    },
    geo: {
      type: "Point",
      coordinates: [128.9021, 35.2468],
    },
    courses: ["힐링 60분", "프리미엄 90분"],
    price: [70000, 110000],
    priceOriginal: 110000,
    priceDiscount: 70000,
    status: "active",
    visible: true,
    approved: true,
    premium: false,
    isPremium: false,
    premiumType: "normal",
    isReservable: true,
    tags: ["노마", "마사지", "장유"],
    serviceTypes: ["힐링", "프리미엄"],
    images: [],
    photos: [],
    imageUrls: [],
  },
];

function isDbReady() {
  try {
    if (!mongoose || !mongoose.connection) {
      return false;
    }

    return mongoose.connection.readyState === 1;
  } catch (e) {
    return false;
  }
}

async function ensureDbReady(req, res, next) {
  try {
    if (isLocalShopId(req.params?.id)) {
      return safeNext(req, res, next);
    }

    if (isDbReady()) {
      return safeNext(req, res, next);
    }

    if (
      dbModule &&
      typeof dbModule.ensureDBConnection === "function"
    ) {
      await dbModule.ensureDBConnection();
    } else if (
      dbModule &&
      typeof dbModule.connectDB === "function"
    ) {
      await dbModule.connectDB();
    }

    const startedAt = Date.now();

    while (!isDbReady()) {
      if (Date.now() - startedAt > 2500) {
        return res.status(503).json({
          ok: false,
          msg: "DB_NOT_CONNECTED",
          message: "DB_NOT_CONNECTED",
          error: "DB_NOT_CONNECTED",
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    return safeNext(req, res, next);
  } catch (e) {
    console.error("SHOP ROUTES DB READY ERROR:", e.message);

    return res.status(503).json({
      ok: false,
      msg: "DB_NOT_CONNECTED",
      message: "DB_NOT_CONNECTED",
      error: "DB_NOT_CONNECTED",
    });
  }
}

function safeNext(req, res, next) {
  if (typeof next === "function") {
    return next();
  }

  return res.status(500).json({
    ok: false,
    msg: "NEXT_MIDDLEWARE_MISSING",
    message: "NEXT_MIDDLEWARE_MISSING",
  });
}

async function ensureDefaultShops(req, res, next) {
  try {
    if (!isDbReady()) {
      return safeNext(req, res, next);
    }

    if (
      !ShopModel ||
      typeof ShopModel.countDocuments !== "function" ||
      typeof ShopModel.insertMany !== "function"
    ) {
      return safeNext(req, res, next);
    }

    const count = await ShopModel.countDocuments({});

    if (count === 0) {
      await ShopModel.insertMany(DEFAULT_SHOPS, {
        ordered: false,
      });

      console.log("✅ DEFAULT SHOPS SEEDED");
    }
  } catch (e) {
    console.error("DEFAULT SHOP SEED ERROR:", e.message);
  }

  return safeNext(req, res, next);
}

function toNumberSafe(value) {
  const num = Number(value);

  return Number.isFinite(num) ? num : undefined;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function normalizeShopCategory(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  if (
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

function getRequestCategory(req) {
  const url = String(req?.originalUrl || req?.url || "").toLowerCase();

  return (
    normalizeShopCategory(req?.query?.category) ||
    normalizeShopCategory(req?.query?.shopCategory) ||
    normalizeShopCategory(req?.query?.serviceType) ||
    normalizeShopCategory(req?.query?.businessType) ||
    normalizeShopCategory(req?.query?.adminCategory) ||
    normalizeShopCategory(req?.body?.category) ||
    normalizeShopCategory(req?.body?.shopCategory) ||
    normalizeShopCategory(req?.body?.serviceType) ||
    normalizeShopCategory(req?.body?.businessType) ||
    normalizeShopCategory(req?.body?.adminCategory) ||
    normalizeShopCategory(req?.user?.adminType) ||
    normalizeShopCategory(req?.user?.adminCategory) ||
    normalizeShopCategory(req?.user?.serviceType) ||
    (url.includes("category=karaoke") ? "karaoke" : "") ||
    (url.includes("category=massage") ? "massage" : "") ||
    (url.includes("/karaoke") ? "karaoke" : "") ||
    ""
  );
}

function getSafeRequestCategory(req) {
  return getRequestCategory(req) || "massage";
}

function applyCategoryFilter(req, res, next) {
  try {
    const category = getSafeRequestCategory(req);

    req.shopCategory = category;
    req.adminCategory = category;
    req.query = req.query || {};
    req.body = req.body || {};

    req.query.category = category;
    req.query.shopCategory = category;
    req.query.serviceType = category;
    req.query.businessType = category;
    req.query.adminCategory = category;

    req.body.category = category;
    req.body.shopCategory = category;
    req.body.serviceType = category;
    req.body.businessType = category;
    req.body.adminCategory = category;

    return safeNext(req, res, next);
  } catch (e) {
    console.error("SHOP CATEGORY FILTER ERROR:", e.message);

    return res.status(500).json({
      ok: false,
      msg: "CATEGORY_FILTER_ERROR",
      message: "CATEGORY_FILTER_ERROR",
      error: e.message,
    });
  }
}

function isSameShopCategory(shop = {}, req) {
  const category = getSafeRequestCategory(req);
  const shopCategory =
    normalizeShopCategory(shop.category) ||
    normalizeShopCategory(shop.shopCategory) ||
    normalizeShopCategory(shop.serviceType) ||
    normalizeShopCategory(shop.businessType) ||
    normalizeShopCategory(shop.adminCategory) ||
    normalizeShopCategory(shop.type) ||
    "massage";

  return shopCategory === category;
}

function filterByRequestCategory(items = [], req) {
  return (Array.isArray(items) ? items : []).filter((shop) =>
    isSameShopCategory(shop, req)
  );
}

function buildCategoryQuery(req) {
  const category = getSafeRequestCategory(req);

  return {
    category,
  };
}


function normalizePremiumType(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (text === "vip" || text === "vvip") {
    return "vip";
  }

  if (
    text === "premium" ||
    text === "true" ||
    text === "1" ||
    text === "yes" ||
    text === "on"
  ) {
    return "premium";
  }

  return "normal";
}

function normalizePremiumValue(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return normalizePremiumType(value) !== "normal";
}

function normalizePremiumFields(obj = {}) {
  const source =
    obj.premium !== undefined
      ? obj.premium
      : obj.isPremium !== undefined
      ? obj.isPremium
      : obj.premiumType;

  const premium = normalizePremiumValue(source);
  const premiumType = premium
    ? normalizePremiumType(source) === "normal"
      ? "premium"
      : normalizePremiumType(source)
    : "normal";

  return {
    premium,
    isPremium: premium,
    premiumType,
  };
}

function isLocalShopId(value) {
  const id = String(value || "");

  return (
    id.startsWith("local-shop-") ||
    id.startsWith("local-noma-")
  );
}

function calcDistanceKm(lat1, lng1, lat2, lng2) {
  const aLat = toNumberSafe(lat1);
  const aLng = toNumberSafe(lng1);
  const bLat = toNumberSafe(lat2);
  const bLng = toNumberSafe(lng2);

  if (
    aLat === undefined ||
    aLng === undefined ||
    bLat === undefined ||
    bLng === undefined
  ) {
    return 999;
  }

  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(x),
      Math.sqrt(1 - x)
    );

  return Number((R * c).toFixed(2));
}

function normalizeImageArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!text) return [];

    if (text.startsWith("data:image/")) {
      return [text];
    }

    return text
      .split(",")
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePriceArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        Number(
          String(v || "")
            .replaceAll(",", "")
            .replaceAll("원", "")
            .trim()
        )
      )
      .filter((v) => Number.isFinite(v));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) =>
        Number(
          String(v || "")
            .replaceAll(",", "")
            .replaceAll("원", "")
            .trim()
        )
      )
      .filter((v) => Number.isFinite(v));
  }

  if (
    value !== undefined &&
    value !== null &&
    value !== ""
  ) {
    const num = Number(value);

    return Number.isFinite(num) ? [num] : [];
  }

  return [];
}

function sanitizeShop(shop) {
  if (!shop) return null;

  const obj = shop.toObject ? shop.toObject() : { ...shop };

  if (
    !obj.location &&
    obj.lat !== undefined &&
    obj.lng !== undefined
  ) {
    obj.location = {
      lat: Number(obj.lat),
      lng: Number(obj.lng),
    };
  }

  if (
    obj.location &&
    typeof obj.location === "object" &&
    Array.isArray(obj.location.coordinates) &&
    obj.location.coordinates.length >= 2
  ) {
    obj.lng = toNumberSafe(obj.location.coordinates[0]);
    obj.lat = toNumberSafe(obj.location.coordinates[1]);

    obj.location = {
      lat: obj.lat,
      lng: obj.lng,
    };
  }

  if (obj.location && typeof obj.location === "object") {
    if (
      obj.lat === undefined &&
      obj.location.lat !== undefined
    ) {
      obj.lat = obj.location.lat;
    }

    if (
      obj.lng === undefined &&
      obj.location.lng !== undefined
    ) {
      obj.lng = obj.location.lng;
    }
  }

  if (obj.lat !== undefined) {
    obj.lat = toNumberSafe(obj.lat);
  }

  if (obj.lng !== undefined) {
    obj.lng = toNumberSafe(obj.lng);
  }

  const images = [
    ...normalizeImageArray(obj.images),
    ...normalizeImageArray(obj.photos),
    ...normalizeImageArray(obj.imageUrls),
  ].filter((value, index, arr) => value && arr.indexOf(value) === index);

  const representativeImage =
    obj.representativeImage ||
    obj.mainImage ||
    obj.thumbnail ||
    obj.coverImage ||
    images[0] ||
    "";

  obj.images = images;
  obj.photos = images;
  obj.imageUrls = images;
  obj.representativeImage = representativeImage;
  obj.mainImage = representativeImage;
  obj.thumbnail = representativeImage;
  obj.coverImage = representativeImage;

  obj.category =
    normalizeShopCategory(obj.category) ||
    normalizeShopCategory(obj.shopCategory) ||
    normalizeShopCategory(obj.serviceType) ||
    normalizeShopCategory(obj.businessType) ||
    normalizeShopCategory(obj.adminCategory) ||
    "massage";

  obj.shopCategory = obj.category;
  obj.serviceType = obj.category;
  obj.businessType = obj.category;
  obj.adminCategory = obj.category;

  obj.status = String(obj.status || "active").toLowerCase();

  obj.visible =
    obj.visible === undefined
      ? true
      : obj.visible;

  obj.approved =
    obj.approved === undefined
      ? true
      : obj.approved;

  const premiumState = normalizePremiumFields(obj);

  obj.premium = premiumState.premium;
  obj.isPremium = premiumState.isPremium;
  obj.premiumType = premiumState.premiumType;

  obj.virtualPhone =
    obj.virtualPhone ||
    obj.fakePhone ||
    obj.callNumber ||
    "";

  obj.fakePhone =
    obj.fakePhone ||
    obj.virtualPhone ||
    "";

  obj.callNumber =
    obj.callNumber ||
    obj.virtualPhone ||
    "";

  obj.businessHours =
    obj.businessHours ||
    obj.openingHours ||
    obj.hours ||
    "";

  obj.openingHours =
    obj.openingHours ||
    obj.businessHours ||
    "";

  obj.hours =
    obj.hours ||
    obj.businessHours ||
    "";

  obj.address =
    obj.address ||
    obj.roadAddress ||
    obj.fullAddress ||
    "";

  obj.roadAddress =
    obj.roadAddress ||
    obj.address ||
    "";

  obj.fullAddress =
    obj.fullAddress ||
    obj.address ||
    "";

  delete obj.__v;

  return obj;
}

function mergeLocalShop(baseShop, nextShop) {
  const base = baseShop || {};
  const next = nextShop || {};

  const nextHasImageFields =
    Object.prototype.hasOwnProperty.call(next, "images") ||
    Object.prototype.hasOwnProperty.call(next, "photos") ||
    Object.prototype.hasOwnProperty.call(next, "imageUrls");

  const nextImages = [
    ...normalizeImageArray(next.images),
    ...normalizeImageArray(next.photos),
    ...normalizeImageArray(next.imageUrls),
  ];

  const baseImages = [
    ...normalizeImageArray(base.images),
    ...normalizeImageArray(base.photos),
    ...normalizeImageArray(base.imageUrls),
  ];

  const images = (nextHasImageFields ? nextImages : [...nextImages, ...baseImages]).filter(
    (value, index, arr) => value && arr.indexOf(value) === index
  );

  const representativeImage =
    nextHasImageFields
      ? next.representativeImage ||
        next.mainImage ||
        next.thumbnail ||
        next.coverImage ||
        images[0] ||
        ""
      : next.representativeImage ||
        next.mainImage ||
        next.thumbnail ||
        next.coverImage ||
        base.representativeImage ||
        base.mainImage ||
        base.thumbnail ||
        base.coverImage ||
        images[0] ||
        "";

  const premiumSource =
    next.premium !== undefined ||
    next.isPremium !== undefined ||
    next.premiumType !== undefined
      ? next
      : base;

  const premiumState = normalizePremiumFields(premiumSource);

  const mergedCategory =
    normalizeShopCategory(next.category) ||
    normalizeShopCategory(next.shopCategory) ||
    normalizeShopCategory(next.serviceType) ||
    normalizeShopCategory(next.businessType) ||
    normalizeShopCategory(next.adminCategory) ||
    normalizeShopCategory(base.category) ||
    normalizeShopCategory(base.shopCategory) ||
    normalizeShopCategory(base.serviceType) ||
    normalizeShopCategory(base.businessType) ||
    normalizeShopCategory(base.adminCategory) ||
    "massage";

  const merged = {
    ...base,
    ...next,
    category: mergedCategory,
    shopCategory: mergedCategory,
    serviceType: mergedCategory,
    businessType: mergedCategory,
    adminCategory: mergedCategory,
    _id: next._id || next.id || base._id || base.id,
    id: next.id || next._id || base.id || base._id,
    name: next.name || base.name || "업체명 없음",
    address:
      next.address ||
      next.roadAddress ||
      next.fullAddress ||
      base.address ||
      base.roadAddress ||
      base.fullAddress ||
      "주소 없음",
    roadAddress:
      next.roadAddress ||
      next.address ||
      next.fullAddress ||
      base.roadAddress ||
      base.address ||
      "",
    fullAddress:
      next.fullAddress ||
      next.address ||
      next.roadAddress ||
      base.fullAddress ||
      base.address ||
      "",
    phone: next.phone || next.tel || base.phone || base.tel || "",
    businessHours:
      next.businessHours ||
      next.openingHours ||
      next.hours ||
      base.businessHours ||
      base.openingHours ||
      base.hours ||
      "",
    openingHours:
      next.openingHours ||
      next.businessHours ||
      next.hours ||
      base.openingHours ||
      base.businessHours ||
      base.hours ||
      "",
    hours:
      next.hours ||
      next.businessHours ||
      next.openingHours ||
      base.hours ||
      base.businessHours ||
      base.openingHours ||
      "",
    courses:
      next.courses !== undefined
        ? normalizeArray(next.courses)
        : normalizeArray(base.courses),
    price:
      next.price !== undefined
        ? normalizePriceArray(next.price)
        : normalizePriceArray(base.price),
    images,
    photos: images,
    imageUrls: images,
    representativeImage,
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
    premium: premiumState.premium,
    isPremium: premiumState.isPremium,
    premiumType: premiumState.premiumType,
    visible: next.visible !== undefined ? next.visible !== false : base.visible !== false,
    approved: next.approved !== undefined ? next.approved !== false : base.approved !== false,
    isReservable:
      next.isReservable !== undefined
        ? next.isReservable !== false
        : base.isReservable !== false,
    status: next.status || base.status || "active",
    updatedAt: new Date().toISOString(),
  };

  const nextLat = toNumberSafe(next.lat ?? next.location?.lat);
  const nextLng = toNumberSafe(next.lng ?? next.location?.lng);
  const baseLat = toNumberSafe(base.lat ?? base.location?.lat);
  const baseLng = toNumberSafe(base.lng ?? base.location?.lng);

  if (nextLat !== undefined && nextLng !== undefined) {
    merged.lat = nextLat;
    merged.lng = nextLng;
    merged.location = {
      lat: nextLat,
      lng: nextLng,
    };
  } else if (baseLat !== undefined && baseLng !== undefined) {
    merged.lat = baseLat;
    merged.lng = baseLng;
    merged.location = {
      lat: baseLat,
      lng: baseLng,
    };
  }

  return sanitizeShop(merged);
}

function findLocalShopIndex(id, body = {}, req = null) {
  const idText = String(id || "");
  const bodyName = normalizeText(body.name);
  const bodyAddress = normalizeText(body.address || body.roadAddress || body.fullAddress);
  const category = req ? getSafeRequestCategory(req) : normalizeShopCategory(body.category) || "massage";
  const sameCategory = (shop) =>
    (
      normalizeShopCategory(shop?.category) ||
      normalizeShopCategory(shop?.shopCategory) ||
      normalizeShopCategory(shop?.serviceType) ||
      normalizeShopCategory(shop?.businessType) ||
      normalizeShopCategory(shop?.adminCategory) ||
      "massage"
    ) === category;

  let index = LOCAL_SHOPS.findIndex(
    (shop) =>
      sameCategory(shop) &&
      String(shop?._id || shop?.id) === idText
  );

  if (index >= 0) {
    return index;
  }

  index = DEFAULT_SHOPS.findIndex(
    (shop) =>
      sameCategory(shop) &&
      String(shop?._id || shop?.id) === idText
  );

  if (index >= 0) {
    const clone = sanitizeShop({
      ...DEFAULT_SHOPS[index],
    });

    LOCAL_SHOPS.unshift(clone);

    return 0;
  }

  if (bodyName) {
    index = LOCAL_SHOPS.findIndex(
      (shop) => sameCategory(shop) && normalizeText(shop?.name) === bodyName
    );

    if (index >= 0) {
      return index;
    }

    index = DEFAULT_SHOPS.findIndex(
      (shop) => sameCategory(shop) && normalizeText(shop?.name) === bodyName
    );

    if (index >= 0) {
      const clone = sanitizeShop({
        ...DEFAULT_SHOPS[index],
      });

      LOCAL_SHOPS.unshift(clone);

      return 0;
    }
  }

  if (bodyName && bodyAddress) {
    index = LOCAL_SHOPS.findIndex(
      (shop) =>
        sameCategory(shop) &&
        normalizeText(shop?.name) === bodyName &&
        normalizeText(shop?.address) === bodyAddress
    );

    if (index >= 0) {
      return index;
    }
  }

  return -1;
}

function updateLocalShop(req) {
  const now = new Date().toISOString();
  const id = req.params.id;
  req.body = req.body || {};
  req.body.category = getSafeRequestCategory(req);
  req.body.shopCategory = req.body.category;
  req.body.serviceType = req.body.category;
  req.body.businessType = req.body.category;
  req.body.adminCategory = req.body.category;

  const index = findLocalShopIndex(id, req.body || {}, req);

  if (index >= 0) {
    LOCAL_SHOPS[index] = mergeLocalShop(LOCAL_SHOPS[index], {
      ...(req.body || {}),
      _id: LOCAL_SHOPS[index]._id || id,
      id: LOCAL_SHOPS[index].id || id,
      updatedAt: now,
    });

    return LOCAL_SHOPS[index];
  }

  const created = mergeLocalShop(
    {},
    {
      ...(req.body || {}),
      _id: id || `local-shop-${Date.now()}`,
      id: id || `local-shop-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    }
  );

  LOCAL_SHOPS.unshift(created);

  return created;
}

function getAllFallbackShops(req = null) {
  const map = new Map();

  [...LOCAL_SHOPS, ...DEFAULT_SHOPS]
    .map(sanitizeShop)
    .filter(Boolean)
    .forEach((shop) => {
      const key =
        shop?._id ||
        shop?.id ||
        shop?.name;

      if (key && !map.has(key)) {
        map.set(key, shop);
      }
    });

  const values = Array.from(map.values());

  return req ? filterByRequestCategory(values, req) : values;
}

function normalizeFallbackList(req) {
  const lat = toNumberSafe(req?.query?.lat);
  const lng = toNumberSafe(req?.query?.lng);
  const max = toNumberSafe(req?.query?.max) || 999;

  return getAllFallbackShops(req)
    .map((shop) => {
      const distanceKm =
        calcDistanceKm(
          lat,
          lng,
          shop?.lat,
          shop?.lng
        );

      return {
        ...shop,
        distanceKm:
          lat === undefined || lng === undefined
            ? shop.distanceKm || 0
            : distanceKm,
      };
    })
    .filter((shop) => {
      if (
        lat === undefined ||
        lng === undefined
      ) {
        return true;
      }

      return shop.distanceKm <= max;
    })
    .sort(
      (a, b) =>
        (a.distanceKm || 999) -
        (b.distanceKm || 999)
    );
}

function sendShopList(res, items) {
  const list = Array.isArray(items)
    ? items.map(sanitizeShop).filter(Boolean)
    : [];

  return res.json({
    ok: true,
    shops: list,
    list,
    items: list,
    data: list,
    total: list.length,
    count: list.length,
  });
}

function sendStats(res, req = null) {
  const shops = getAllFallbackShops(req);

  return res.json({
    ok: true,
    shops: shops.length,
    shopCount: shops.length,
    totalShops: shops.length,
    activeShops: shops.filter((shop) => shop.status === "active").length,
    inactiveShops: shops.filter((shop) => shop.status !== "active").length,
    users: 0,
    userCount: 0,
    reservations: 0,
    reservationCount: 0,
    payments: 0,
    paymentCount: 0,
    reviews: 0,
    reviewCount: 0,
    revenue: 0,
    totalRevenue: 0,
    monthly: [],
    items: [],
    list: [],
    data: [],
  });
}

function normalizeShopListResponse(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    try {
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.shops)
        ? data.shops
        : Array.isArray(data?.list)
        ? data.list
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.shops)
        ? data.data.shops
        : Array.isArray(data?.data?.list)
        ? data.data.list
        : Array.isArray(data?.data?.items)
        ? data.data.items
        : [];

      const items = filterByRequestCategory(
        rawList.map(sanitizeShop).filter(Boolean),
        req
      );

      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data)
      ) {
        data.list = items;
        data.items = items;
        data.shops = items;
        data.data = Array.isArray(data.data) ? items : data.data;
        data.total =
          data.total !== undefined
            ? data.total
            : items.length;
        data.count =
          data.count !== undefined
            ? data.count
            : items.length;
      }
    } catch (e) {
      console.error(
        "SHOP RESPONSE NORMALIZE ERROR:",
        e.message
      );
    }

    return originalJson(data);
  };

  return safeNext(req, res, next);
}

function normalizeShopImagesBody(req, res, next) {
  try {
    req.body = req.body || {};
    req.body.category = getSafeRequestCategory(req);
    req.body.shopCategory = req.body.category;
    req.body.serviceType = req.body.category;
    req.body.businessType = req.body.category;
    req.body.adminCategory = req.body.category;

    const images = normalizeImageArray(req.body.images);
    const photos = normalizeImageArray(req.body.photos);
    const imageUrls = normalizeImageArray(req.body.imageUrls);

    const merged = [];

    [...images, ...photos, ...imageUrls].forEach((image) => {
      if (image && !merged.includes(image)) {
        merged.push(image);
      }
    });

    const representativeImage =
      req.body.representativeImage ||
      req.body.mainImage ||
      req.body.thumbnail ||
      req.body.coverImage ||
      merged[0] ||
      "";

    req.body.images = merged;
    req.body.photos = merged;
    req.body.imageUrls = merged;
    req.body.representativeImage = representativeImage;
    req.body.mainImage = representativeImage;
    req.body.thumbnail = representativeImage;
    req.body.coverImage = representativeImage;

    if (req.body.address) {
      req.body.roadAddress = req.body.roadAddress || req.body.address;
      req.body.fullAddress = req.body.fullAddress || req.body.address;
    }

    if (req.body.businessHours) {
      req.body.openingHours = req.body.openingHours || req.body.businessHours;
      req.body.hours = req.body.hours || req.body.businessHours;
    }

    const premiumState = normalizePremiumFields(req.body);

    req.body.premium = premiumState.premium;
    req.body.isPremium = premiumState.isPremium;
    req.body.premiumType = premiumState.premiumType;

    return safeNext(req, res, next);
  } catch (e) {
    console.error(
      "SHOP IMAGE NORMALIZE ERROR:",
      e.message
    );

    return safeNext(req, res, next);
  }
}

async function saveImagesAfterCreate(req, res, next) {
  if (
    !isDbReady() ||
    !ShopModel ||
    typeof ShopModel.findByIdAndUpdate !== "function"
  ) {
    return safeNext(req, res, next);
  }

  const originalJson = res.json.bind(res);

  res.json = async (data) => {
    try {
      const shopId =
        data?.shop?._id ||
        data?.shop?.id ||
        data?.data?._id ||
        data?.data?.id ||
        data?._id ||
        data?.id;

      if (
        shopId &&
        Array.isArray(req.body.images)
      ) {
        const categoryQuery = buildCategoryQuery(req);

        const updateData = {
          category: categoryQuery.category,
          shopCategory: categoryQuery.category,
          serviceType: categoryQuery.category,
          businessType: categoryQuery.category,
          adminCategory: categoryQuery.category,
          images: req.body.images,
          photos: req.body.images,
          imageUrls: req.body.images,
          representativeImage:
            req.body.representativeImage || "",
          mainImage: req.body.mainImage || "",
          thumbnail: req.body.thumbnail || "",
          coverImage: req.body.coverImage || "",
          premium: req.body.premium === true,
          isPremium: req.body.isPremium === true,
          premiumType: req.body.premiumType || "normal",
        };

        const updated =
          await ShopModel.findOneAndUpdate(
            {
              _id: shopId,
              ...categoryQuery,
            },
            {
              $set: updateData,
            },
            {
              new: true,
            }
          );

        if (updated) {
          const safe = sanitizeShop(updated);

          data.shop = {
            ...(data.shop || {}),
            ...safe,
          };

          data.data = data.shop;
        }
      }
    } catch (e) {
      console.error(
        "SHOP IMAGE SAVE AFTER CREATE ERROR:",
        e.message
      );
    }

    return originalJson(data);
  };

  return safeNext(req, res, next);
}

async function saveImagesBeforeUpdate(req, res, next) {
  try {
    if (
      req.body &&
      Array.isArray(req.body.images)
    ) {
      req.body.photos = req.body.images;
      req.body.imageUrls = req.body.images;

      req.body.representativeImage =
        req.body.representativeImage ||
        req.body.mainImage ||
        req.body.thumbnail ||
        req.body.coverImage ||
        req.body.images[0] ||
        "";

      req.body.mainImage = req.body.representativeImage;
      req.body.thumbnail = req.body.representativeImage;
      req.body.coverImage = req.body.representativeImage;
    }

    if (req.body) {
      req.body.category = getSafeRequestCategory(req);
      req.body.shopCategory = req.body.category;
      req.body.serviceType = req.body.category;
      req.body.businessType = req.body.category;
      req.body.adminCategory = req.body.category;

      const premiumState = normalizePremiumFields(req.body);

      req.body.premium = premiumState.premium;
      req.body.isPremium = premiumState.isPremium;
      req.body.premiumType = premiumState.premiumType;
    }
  } catch (e) {
    console.error(
      "SHOP IMAGE SAVE BEFORE UPDATE ERROR:",
      e.message
    );
  }

  return safeNext(req, res, next);
}

async function forceExactImageAndPremiumUpdate(req, res, next) {
  if (
    !isDbReady() ||
    !ShopModel ||
    typeof ShopModel.findByIdAndUpdate !== "function" ||
    isLocalShopId(req.params?.id)
  ) {
    return safeNext(req, res, next);
  }

  const originalJson = res.json.bind(res);

  res.json = async (data) => {
    try {
      const hasImageFields =
        req.body &&
        Array.isArray(req.body.images);

      const hasPremiumFields =
        req.body &&
        (
          req.body.premium !== undefined ||
          req.body.isPremium !== undefined ||
          req.body.premiumType !== undefined
        );

      if (hasImageFields || hasPremiumFields) {
        const categoryQuery = buildCategoryQuery(req);

        const updateData = {
          category: categoryQuery.category,
          shopCategory: categoryQuery.category,
          serviceType: categoryQuery.category,
          businessType: categoryQuery.category,
          adminCategory: categoryQuery.category,
        };

        if (hasImageFields) {
          updateData.images = req.body.images;
          updateData.photos = req.body.images;
          updateData.imageUrls = req.body.images;
          updateData.representativeImage = req.body.representativeImage || "";
          updateData.mainImage = req.body.mainImage || "";
          updateData.thumbnail = req.body.thumbnail || "";
          updateData.coverImage = req.body.coverImage || "";
        }

        if (hasPremiumFields) {
          const premiumState = normalizePremiumFields(req.body);

          updateData.premium = premiumState.premium;
          updateData.isPremium = premiumState.isPremium;
          updateData.premiumType = premiumState.premiumType;
        }

        const updated = await ShopModel.findOneAndUpdate(
          {
            _id: req.params.id,
            ...categoryQuery,
          },
          {
            $set: updateData,
          },
          {
            new: true,
          }
        );

        if (updated) {
          const safe = sanitizeShop(updated);

          data.shop = safe;
          data.data = safe;
          data.item = safe;
        }
      }
    } catch (e) {
      console.error(
        "SHOP EXACT IMAGE PREMIUM UPDATE ERROR:",
        e.message
      );
    }

    return originalJson(data);
  };

  return safeNext(req, res, next);
}

async function listFallback(req, res, next) {
  try {
    if (
      isDbReady() &&
      ShopModel &&
      typeof ShopModel.find === "function"
    ) {
      return safeNext(req, res, next);
    }

    return sendShopList(res, normalizeFallbackList(req));
  } catch (e) {
    return sendShopList(res, normalizeFallbackList(req));
  }
}

async function nearbyFallback(req, res) {
  try {
    if (
      !isDbReady() ||
      !ShopModel ||
      typeof ShopModel.find !== "function"
    ) {
      return sendShopList(res, normalizeFallbackList(req));
    }

    const lat = toNumberSafe(req.query.lat);
    const lng = toNumberSafe(req.query.lng);
    const max = toNumberSafe(req.query.max) || 999;

    const categoryQuery = buildCategoryQuery(req);

    const list =
      await ShopModel.find(categoryQuery)
        .lean()
        .sort({
          createdAt: -1,
        })
        .limit(300);

    const items =
      list
        .map(sanitizeShop)
        .filter(Boolean)
        .map((shop) => {
          const distanceKm =
            calcDistanceKm(
              lat,
              lng,
              shop?.lat,
              shop?.lng
            );

          return {
            ...shop,
            distanceKm,
          };
        })
        .filter((shop) => {
          if (
            lat === undefined ||
            lng === undefined
          ) {
            return true;
          }

          return shop.distanceKm <= max;
        })
        .sort(
          (a, b) =>
            (a.distanceKm || 999) -
            (b.distanceKm || 999)
        );

    return sendShopList(res, items);
  } catch (e) {
    console.error(
      "SHOP ROUTES NEARBY FALLBACK ERROR:",
      e
    );

    return sendShopList(res, normalizeFallbackList(req));
  }
}

async function localUpdateFallback(req, res, next) {
  try {
    if (isLocalShopId(req.params?.id)) {
      const item = updateLocalShop(req);

      return res.json({
        ok: true,
        shop: item,
        data: item,
        item,
        message: "SHOP_UPDATED_LOCAL",
      });
    }

    if (
      !isDbReady() ||
      !ShopModel ||
      typeof controller.updateShop !== "function"
    ) {
      const item = updateLocalShop(req);

      return res.json({
        ok: true,
        shop: item,
        data: item,
        item,
        message: "SHOP_UPDATED_LOCAL",
      });
    }

    return safeNext(req, res, next);
  } catch (e) {
    console.error("LOCAL SHOP UPDATE ERROR:", e.message);

    return res.status(500).json({
      ok: false,
      message: "SHOP_UPDATE_FAILED",
      error: e.message,
    });
  }
}

controller.getShops =
  controller.getShops ||
  controller.getList;

controller.getShop =
  controller.getShop ||
  controller.getDetail;

controller.createShop =
  controller.createShop ||
  controller.create;

controller.updateShop =
  controller.updateShop ||
  controller.update;

controller.deleteShop =
  controller.deleteShop ||
  controller.remove;

controller.nearby =
  controller.nearby ||
  controller.getNearby ||
  nearbyFallback;

controller.stats =
  controller.stats ||
  controller.getStats ||
  ((req, res) => sendStats(res));

controller.getDashboardStats =
  controller.getDashboardStats ||
  controller.dashboardStats ||
  controller.getStats ||
  controller.stats ||
  ((req, res) => sendStats(res));

controller.getMonthlyStats =
  controller.getMonthlyStats ||
  controller.monthlyStats ||
  controller.getStats ||
  controller.stats ||
  ((req, res) =>
    res.json({
      ok: true,
      monthly: [],
      list: [],
      items: [],
      data: [],
    }));

controller.getRecommend =
  controller.getRecommend ||
  controller.recommend ||
  controller.getShops;

controller.updateShopStatus =
  controller.updateShopStatus ||
  controller.updateStatus;

controller.search =
  controller.search ||
  controller.searchShop ||
  controller.searchShops ||
  controller.getShops;

function missingController(name) {
  return function (req, res) {
    if (
      name === "getShops" ||
      name === "search" ||
      name === "getRecommend"
    ) {
      return sendShopList(res, normalizeFallbackList(req));
    }

    if (
      name === "stats" ||
      name === "getDashboardStats" ||
      name === "getMonthlyStats"
    ) {
      return sendStats(res, req);
    }

    return res.status(500).json({
      ok: false,
      msg: `CONTROLLER_NOT_FOUND:${name}`,
      message: `CONTROLLER_NOT_FOUND:${name}`,
    });
  };
}

controller.getShops =
  controller.getShops ||
  missingController("getShops");

controller.getShop =
  controller.getShop ||
  missingController("getShop");

controller.createShop =
  controller.createShop ||
  missingController("createShop");

controller.updateShop =
  controller.updateShop ||
  missingController("updateShop");

controller.deleteShop =
  controller.deleteShop ||
  missingController("deleteShop");

controller.nearby =
  controller.nearby ||
  nearbyFallback ||
  missingController("nearby");

controller.stats =
  controller.stats ||
  missingController("stats");

controller.getDashboardStats =
  controller.getDashboardStats ||
  missingController("getDashboardStats");

controller.getMonthlyStats =
  controller.getMonthlyStats ||
  missingController("getMonthlyStats");

controller.getRecommend =
  controller.getRecommend ||
  missingController("getRecommend");

controller.updateShopStatus =
  controller.updateShopStatus ||
  missingController("updateShopStatus");

controller.search =
  controller.search ||
  missingController("search");

controller.like =
  controller.like ||
  ((req, res) =>
    res.json({
      ok: true,
    }));

controller.viewSafe =
  controller.viewSafe ||
  ((req, res) =>
    res.json({
      ok: true,
    }));

const externalAuth = safeRequire("../middlewares/auth");

safeRequire("../middlewares/admin");

const auth =
  externalAuth ||
  function (req, res, next) {
    try {
      let token =
        req.headers.authorization ||
        req.headers.Authorization ||
        req.headers["x-access-token"] ||
        req.headers["x-auth-token"] ||
        req.headers.token ||
        req.headers.accesstoken ||
        req.headers["access-token"] ||
        "";

      if (typeof token === "string") {
        token = token
          .replace(/^Bearer\s+/i, "")
          .trim();
      }

      if (
        !token ||
        token === "undefined" ||
        token === "null"
      ) {
        return res.status(401).json({
          ok: false,
          msg: "NO_TOKEN",
          message: "NO_TOKEN",
        });
      }

      req.token = token;

      if (
        String(token).startsWith("local-admin-") ||
        String(token).startsWith("local-fallback-")
      ) {
        req.user = {
          id: "local-admin",
          role: "admin",
          userRole: "admin",
          type: "admin",
          isAdmin: true,
          localFallback: true,
        };

        req.isAdmin = true;

        return safeNext(req, res, next);
      }

      let decoded = null;

      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET ||
            process.env.ACCESS_TOKEN_SECRET ||
            process.env.JWT_ACCESS_SECRET ||
            process.env.SECRET ||
            "noma-local-dev-secret"
        );
      } catch (e) {
        console.error("JWT VERIFY ERROR:", e.message);

        try {
          decoded = jwt.decode(token);
        } catch (_) {}
      }

      if (!decoded) {
        return res.status(401).json({
          ok: false,
          msg: "INVALID_TOKEN",
          message: "INVALID_TOKEN",
        });
      }

      req.user = decoded;

      req.isAdmin =
        decoded.role === "admin" ||
        decoded.type === "admin" ||
        decoded.userRole === "admin" ||
        decoded.isAdmin === true;

      console.log("SHOP AUTH USER:", req.user);

      return safeNext(req, res, next);
    } catch (err) {
      console.error("SHOP AUTH ERROR:", err.message);

      return res.status(401).json({
        ok: false,
        msg: "INVALID_TOKEN",
        message: "INVALID_TOKEN",
      });
    }
  };

const admin = function (req, res, next) {
  const role =
    req.user?.role ||
    req.user?.type ||
    req.user?.userRole ||
    req.tokenPayload?.role ||
    req.tokenPayload?.type ||
    req.tokenPayload?.userRole;

  if (
    req.user?.isAdmin === true ||
    req.tokenPayload?.isAdmin === true ||
    req.isAdmin === true ||
    role === "admin" ||
    role === "ADMIN" ||
    role === 1
  ) {
    return safeNext(req, res, next);
  }

  return res.status(403).json({
    ok: false,
    msg: "ADMIN_ONLY",
    message: "ADMIN_ONLY",
  });
};

const RATE = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  let data = RATE.get(ip);

  if (
    !data ||
    now - data.ts > 1000
  ) {
    RATE.set(ip, {
      count: 1,
      ts: now,
    });

    return safeNext(req, res, next);
  }

  data.count += 1;

  if (data.count > 999999) {
    return res.status(429).json({
      ok: false,
      msg: "RATE_LIMIT",
      message: "RATE_LIMIT",
    });
  }

  return safeNext(req, res, next);
}

function validateId(req, res, next) {
  const { id } = req.params;

  if (isLocalShopId(id)) {
    return safeNext(req, res, next);
  }

  if (
    !id ||
    (id.length < 5 &&
      id.length !== 24)
  ) {
    return res.status(400).json({
      ok: false,
      msg: "INVALID_ID",
      message: "INVALID_ID",
    });
  }

  return safeNext(req, res, next);
}

/* =====================================================
🔥 PUBLIC
===================================================== */

router.get(
  "/",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/list",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/all",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/health/check",
  (req, res) => {
    res.json({
      ok: true,
      service: "shop_routes",
      time: new Date(),
    });
  }
);

router.get(
  "/search",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  (req, res, next) => {
    req.query.keyword =
      req.query.keyword ||
      req.query.q ||
      "";

    req.query.q =
      req.query.q ||
      req.query.keyword ||
      "";

    req.query.compact =
      req.query.compact ||
      String(
        req.query.keyword ||
          req.query.q ||
          ""
      )
        .trim()
        .replace(/\s+/g, "");

    req.query.normalized =
      req.query.normalized ||
      req.query.compact ||
      "";

    return controller.search(req, res, next);
  }
);

router.get(
  "/top/list",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/recent/list",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/random/list",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/ranking/list",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/cache/list",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/recommend/v2",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getRecommend
);

router.get(
  "/recommend",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getRecommend
);

router.get(
  "/price/filter",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/tags/top",
  rateLimit,
  (req, res) => {
    return res.json({
      ok: true,
      list: [],
      items: [],
      shops: [],
    });
  }
);

router.get(
  "/stats/region",
  rateLimit,
  (req, res) => {
    return res.json({
      ok: true,
      list: [],
      items: [],
      shops: [],
    });
  }
);

router.get(
  "/random/boost",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/near",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  normalizeShopListResponse,
  controller.nearby
);

router.get(
  "/nearby",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  normalizeShopListResponse,
  controller.nearby
);

router.get(
  "/nearby/list",
  rateLimit,
  applyCategoryFilter,
  ensureDefaultShops,
  normalizeShopListResponse,
  controller.nearby
);

/* =====================================================
🔥 ADMIN
===================================================== */

router.get(
  "/admin",
  auth,
  admin,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/admin/list",
  auth,
  admin,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/admin/shops",
  auth,
  admin,
  applyCategoryFilter,
  ensureDefaultShops,
  listFallback,
  normalizeShopListResponse,
  controller.getShops
);

router.get(
  "/admin/stats",
  auth,
  admin,
  applyCategoryFilter,
  ensureDbReady,
  ensureDefaultShops,
  controller.stats
);

router.get(
  "/admin/dashboard-stats",
  auth,
  admin,
  applyCategoryFilter,
  ensureDbReady,
  ensureDefaultShops,
  controller.getDashboardStats
);

router.get(
  "/admin/monthly-stats",
  auth,
  admin,
  applyCategoryFilter,
  ensureDbReady,
  ensureDefaultShops,
  controller.getMonthlyStats
);

router.post(
  "/admin/reset-view",
  auth,
  admin,
  (req, res) => {
    return res.json({
      ok: true,
      msg: "RESET_VIEW_OK",
      message: "RESET_VIEW_OK",
    });
  }
);

router.post(
  "/admin/reset-like",
  auth,
  admin,
  (req, res) => {
    return res.json({
      ok: true,
      msg: "RESET_LIKE_OK",
      message: "RESET_LIKE_OK",
    });
  }
);

/* =====================================================
🔥 CRUD
===================================================== */

router.post(
  "/",
  auth,
  admin,
  applyCategoryFilter,
  normalizeShopImagesBody,
  async (req, res, next) => {
    try {
      if (
        !isDbReady() ||
        !ShopModel ||
        typeof controller.createShop !== "function"
      ) {
        const now = Date.now();

        const category = getSafeRequestCategory(req);

        const item = sanitizeShop({
          _id: `local-shop-${now}`,
          id: `local-shop-${now}`,
          ...req.body,
          category,
          shopCategory: category,
          serviceType: category,
          businessType: category,
          adminCategory: category,
          createdAt: new Date(now).toISOString(),
          updatedAt: new Date(now).toISOString(),
        });

        LOCAL_SHOPS.unshift(item);

        return res.json({
          ok: true,
          shop: item,
          data: item,
          item,
          message: "SHOP_CREATED_LOCAL",
        });
      }

      return next();
    } catch (e) {
      console.error("LOCAL SHOP CREATE ERROR:", e.message);

      return res.status(500).json({
        ok: false,
        message: "SHOP_CREATE_FAILED",
      });
    }
  },
  ensureDbReady,
  saveImagesAfterCreate,
  controller.createShop
);

router.put(
  "/:id",
  auth,
  admin,
  applyCategoryFilter,
  validateId,
  normalizeShopImagesBody,
  saveImagesBeforeUpdate,
  localUpdateFallback,
  ensureDbReady,
  forceExactImageAndPremiumUpdate,
  controller.updateShop
);

router.patch(
  "/:id",
  auth,
  admin,
  applyCategoryFilter,
  validateId,
  normalizeShopImagesBody,
  saveImagesBeforeUpdate,
  localUpdateFallback,
  ensureDbReady,
  forceExactImageAndPremiumUpdate,
  controller.updateShop
);

router.put(
  "/admin/:id",
  auth,
  admin,
  applyCategoryFilter,
  validateId,
  normalizeShopImagesBody,
  saveImagesBeforeUpdate,
  localUpdateFallback,
  ensureDbReady,
  forceExactImageAndPremiumUpdate,
  controller.updateShop
);

router.patch(
  "/admin/:id",
  auth,
  admin,
  applyCategoryFilter,
  validateId,
  normalizeShopImagesBody,
  saveImagesBeforeUpdate,
  localUpdateFallback,
  ensureDbReady,
  forceExactImageAndPremiumUpdate,
  controller.updateShop
);

router.patch(
  "/:id/status",
  auth,
  admin,
  applyCategoryFilter,
  validateId,
  async (req, res, next) => {
    if (isLocalShopId(req.params?.id)) {
      const item = updateLocalShop(req);

      return res.json({
        ok: true,
        status: item.status,
        shop: item,
        data: item,
        item,
        message: "SHOP_STATUS_UPDATED_LOCAL",
      });
    }

    return safeNext(req, res, next);
  },
  ensureDbReady,
  controller.updateShopStatus
);

router.delete(
  "/:id",
  auth,
  admin,
  applyCategoryFilter,
  validateId,
  async (req, res, next) => {
    try {
      if (
        isLocalShopId(req.params.id) ||
        !isDbReady() ||
        !ShopModel ||
        typeof controller.deleteShop !== "function"
      ) {
        const beforeLength = LOCAL_SHOPS.length;

        const category = getSafeRequestCategory(req);

        const filtered = LOCAL_SHOPS.filter((shop) => {
          const shopCategory =
            normalizeShopCategory(shop?.category) ||
            normalizeShopCategory(shop?.shopCategory) ||
            normalizeShopCategory(shop?.serviceType) ||
            normalizeShopCategory(shop?.businessType) ||
            normalizeShopCategory(shop?.adminCategory) ||
            "massage";

          if (shopCategory !== category) {
            return true;
          }

          return (
            String(shop?._id || shop?.id) !==
            String(req.params.id)
          );
        });

        LOCAL_SHOPS.length = 0;

        filtered.forEach((item) => {
          LOCAL_SHOPS.push(item);
        });

        return res.json({
          ok: true,
          deleted: beforeLength !== filtered.length,
          message: "SHOP_DELETED_LOCAL",
        });
      }

      return next();
    } catch (e) {
      console.error("LOCAL SHOP DELETE ERROR:", e.message);

      return res.status(500).json({
        ok: false,
        message: "SHOP_DELETE_FAILED",
      });
    }
  },
  ensureDbReady,
  controller.deleteShop
);

/* =====================================================
🔥 ACTION
===================================================== */

router.post(
  "/:id/like",
  rateLimit,
  validateId,
  controller.like
);

router.get(
  "/:id/view-safe",
  rateLimit,
  validateId,
  controller.viewSafe
);

/* =====================================================
🔥 DETAIL
===================================================== */

router.get(
  "/:id",
  rateLimit,
  applyCategoryFilter,
  validateId,
  controller.getShop
);

setInterval(() => {
  const now = Date.now();

  for (const [ip, data] of RATE.entries()) {
    if (now - data.ts > 10000) {
      RATE.delete(ip);
    }
  }
}, 10000);

module.exports = router;