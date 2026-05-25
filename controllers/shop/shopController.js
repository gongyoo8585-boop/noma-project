"use strict";

/* =========================================================
   NORA SHOP CONTROLLER
   SAFE / PRODUCTION / NO CRASH VERSION
   기존 기능 유지 + 업체 지도 노출 안정화 + DB 미연결 fallback
========================================================= */

const mongoose = require("mongoose");

let Shop = null;

try {
  Shop = require("../../models/Shop");
} catch (error) {
  try {
    Shop = require("../models/Shop");
  } catch (fallbackError) {
    Shop = null;
  }
}

function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    console.error("[SAFE REQUIRE FAIL]", modulePath, error?.message || error);
    return null;
  }
}

const analyticsService =
  safeRequire("../../services/analytics/analyticsService") || {};

const revenueService =
  safeRequire("../../services/analytics/revenueService") || {};

const rankingService =
  safeRequire("../../services/shop/shop.ranking.service") ||
  safeRequire("../../services/shop.ranking.service") ||
  {};

const DEFAULT_SHOPS = [
  {
    _id: "local-nora-gimhae-main",
    id: "local-nora-gimhae-main",
    name: "노라 김해 본점",
    shopName: "노라 김해 본점",
    title: "노라 김해 본점",
    businessName: "노라 김해 본점",
    storeName: "노라 김해 본점",
    address: "경상남도 김해시 가야로",
    roadAddress: "경상남도 김해시 가야로",
    fullAddress: "경상남도 김해시 가야로",
    locationText: "경상남도 김해시 가야로",
    region: "경상남도",
    sido: "경상남도",
    province: "경상남도",
    district: "김해시",
    sigungu: "김해시",
    city: "김해시",
    dong: "",
    phone: "010-0000-0001",
    tel: "010-0000-0001",
    virtualPhone: "0507-0000-0001",
    fakePhone: "0507-0000-0001",
    callNumber: "0507-0000-0001",
    businessHours: "24시간",
    openingHours: "24시간",
    hours: "24시간",
    openInfo: "24시간",
    description: "노라 마사지 플랫폼 등록 업체",
    category: "massage",
    shopCategory: "massage",
    serviceType: "massage",
    businessType: "massage",
    adminCategory: "massage",
    lat: 35.2613,
    lng: 128.871,
    latitude: 35.2613,
    longitude: 128.871,
    location: {
      lat: 35.2613,
      lng: 128.871,
    },
    geo: {
      type: "Point",
      coordinates: [128.871, 35.2613],
    },
    courses: ["스웨디시 60분", "아로마 90분"],
    courseList: ["스웨디시 60분", "아로마 90분"],
    price: [80000, 120000],
    originalPrice: [120000],
    priceOriginal: 120000,
    priceDiscount: 80000,
    status: "active",
    visible: true,
    approved: true,
    premium: true,
    isPremium: true,
    premiumActive: true,
    premiumType: "premium",
    isReservable: true,
    tags: ["노라", "마사지", "김해"],
    serviceTypes: ["스웨디시", "아로마"],
    images: [],
    photos: [],
    imageUrls: [],
    gallery: [],
    distanceKm: 0,
  },
];

const CREATED_SHOPS_MEMORY = [];

function ok(res, data = {}) {
  if (res.headersSent) return;

  return res.json({
    ok: true,
    success: true,
    ...data,
  });
}

function fail(res, status = 500, message = "SERVER_ERROR", extra = {}) {
  if (res.headersSent) return;

  return res.status(status).json({
    ok: false,
    success: false,
    msg: message,
    message,
    error: message,
    ...extra,
  });
}

function safeAsync(fn) {
  return async (req, res, next) => {
    try {
      return await fn(req, res, next);
    } catch (error) {
      console.error("SHOP CONTROLLER ERROR:", error && error.stack ? error.stack : error);

      if (req && req.method === "GET") {
        return sendPublicShops(res, DEFAULT_SHOPS, "local-fallback", req);
      }

      return fail(res, 500, error?.message || "SHOP_CONTROLLER_ERROR");
    }
  };
}

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

function safeString(value = "") {
  return String(value == null ? "" : value).trim();
}

function safeNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(String(value).replace(/,/g, "").replace(/원/g, "").trim());

  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeNumberOrEmpty(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const parsed = Number(String(value).replace(/,/g, "").replace(/원/g, "").trim());

  return Number.isFinite(parsed) ? parsed : "";
}

function safeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const text = String(value).toLowerCase().trim();

  if (["true", "1", "yes", "y", "active", "open", "visible"].includes(text)) return true;
  if (["false", "0", "no", "n", "inactive", "disabled", "hidden", "deleted", "closed"].includes(text)) return false;

  return fallback;
}

function safeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function safePriceArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => safeNumber(item, null))
      .filter((item) => Number.isFinite(item));
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => safeNumber(item, null))
      .filter((item) => Number.isFinite(item));
  }

  if (Number.isFinite(Number(value))) {
    return [Number(value)];
  }

  return [];
}

function escapeRegexText(value = "") {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRegionAliases(value = "") {
  const key = safeString(value);

  const aliases = {
    경남: ["경남", "경상남도", "김해"],
    경상남도: ["경남", "경상남도", "김해"],
    서울: ["서울", "서울특별시"],
    서울특별시: ["서울", "서울특별시"],
    부산: ["부산", "부산광역시"],
    부산광역시: ["부산", "부산광역시"],
    대구: ["대구", "대구광역시"],
    대구광역시: ["대구", "대구광역시"],
    인천: ["인천", "인천광역시"],
    인천광역시: ["인천", "인천광역시"],
    광주: ["광주", "광주광역시"],
    광주광역시: ["광주", "광주광역시"],
    대전: ["대전", "대전광역시"],
    대전광역시: ["대전", "대전광역시"],
    울산: ["울산", "울산광역시"],
    울산광역시: ["울산", "울산광역시"],
    세종: ["세종", "세종특별자치시"],
    세종특별자치시: ["세종", "세종특별자치시"],
    경기: ["경기", "경기도"],
    경기도: ["경기", "경기도"],
    강원: ["강원", "강원도", "강원특별자치도"],
    강원도: ["강원", "강원도", "강원특별자치도"],
    충북: ["충북", "충청북도"],
    충청북도: ["충북", "충청북도"],
    충남: ["충남", "충청남도"],
    충청남도: ["충남", "충청남도"],
    전북: ["전북", "전라북도", "전북특별자치도"],
    전라북도: ["전북", "전라북도", "전북특별자치도"],
    전남: ["전남", "전라남도"],
    전라남도: ["전남", "전라남도"],
    경북: ["경북", "경상북도"],
    경상북도: ["경북", "경상북도"],
    제주: ["제주", "제주도", "제주특별자치도"],
    제주도: ["제주", "제주도", "제주특별자치도"],
  };

  return aliases[key] || (key ? [key] : []);
}

function getRegionFromAddress(address = "") {
  const text = safeString(address);

  if (
    text.includes("경상남도") ||
    text.includes("경남") ||
    text.includes("김해시") ||
    text.includes("김해")
  ) {
    return "경상남도";
  }

  if (text.includes("서울")) return "서울";
  if (text.includes("부산")) return "부산";
  if (text.includes("대구")) return "대구";
  if (text.includes("인천")) return "인천";
  if (text.includes("광주")) return "광주";
  if (text.includes("대전")) return "대전";
  if (text.includes("울산")) return "울산";
  if (text.includes("세종")) return "세종";
  if (text.includes("경기")) return "경기도";
  if (text.includes("강원")) return "강원도";
  if (text.includes("충북") || text.includes("충청북도")) return "충청북도";
  if (text.includes("충남") || text.includes("충청남도")) return "충청남도";
  if (text.includes("전북") || text.includes("전라북도") || text.includes("전북특별자치도")) return "전라북도";
  if (text.includes("전남") || text.includes("전라남도")) return "전라남도";
  if (text.includes("경북") || text.includes("경상북도")) return "경상북도";
  if (text.includes("제주")) return "제주도";

  return "";
}

function getDistrictFromAddress(address = "") {
  const text = safeString(address);

  if (text.includes("김해시") || text.includes("김해")) {
    return "김해시";
  }

  const match = text.match(/[가-힣]+(시|군|구)/);

  return match ? match[0] : "";
}

function getDongFromAddress(address = "") {
  const text = safeString(address);
  const match = text.match(/[가-힣]+(동|읍|면)/);

  return match ? match[0] : "";
}

function getFallbackCoords(address = "", region = "", district = "") {
  const text = `${address || ""} ${region || ""} ${district || ""}`;

  if (text.includes("삼계동")) {
    return {
      lat: 35.2613,
      lng: 128.871,
    };
  }

  if (text.includes("김해시") || text.includes("김해")) {
    return {
      lat: 35.2281,
      lng: 128.8896,
    };
  }

  return {
    lat: "",
    lng: "",
  };
}

function normalizeStatus(value) {
  const status = safeString(value);

  if (!status || status === "영업중" || status.toLowerCase() === "open") {
    return "active";
  }

  return status;
}

function normalizeVisible(value, fallback = true) {
  return safeBoolean(value, fallback);
}

function getCategoryFromShop(shop = {}) {
  return safeString(
    shop.category ||
      shop.shopCategory ||
      shop.serviceType ||
      shop.businessType ||
      shop.adminCategory ||
      "massage"
  );
}

function isShopDeletedOrHidden(shop = {}) {
  const status = safeString(shop.status || "active").toLowerCase();

  return (
    shop.isDeleted === true ||
    shop.deleted === true ||
    shop.visible === false ||
    shop.approved === false ||
    status === "deleted" ||
    status === "inactive" ||
    status === "disabled" ||
    status === "hidden" ||
    status === "closed"
  );
}

function hasValidCoord(lat, lng) {
  return (
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng)) &&
    Number(lat) !== 0 &&
    Number(lng) !== 0
  );
}

function calcDistanceKm(fromLat, fromLng, toLat, toLng) {
  const lat1 = Number(fromLat);
  const lng1 = Number(fromLng);
  const lat2 = Number(toLat);
  const lng2 = Number(toLng);

  if (!hasValidCoord(lat1, lng1) || !hasValidCoord(lat2, lng2)) {
    return Number.POSITIVE_INFINITY;
  }

  const radiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) *
      Math.cos(rLat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) {
    return "";
  }

  return `${Math.max(0.1, distanceKm).toFixed(1)}km`;
}

function isPremiumShop(shop = {}) {
  const premiumType = safeString(shop.premiumType).toLowerCase();

  return (
    shop.premium === true ||
    shop.isPremium === true ||
    shop.premiumActive === true ||
    premiumType === "premium" ||
    premiumType === "vip"
  );
}

function getDistanceBase(req = {}) {
  return {
    lat: safeNumberOrEmpty(
      req.query?.lat ||
        req.query?.userLat ||
        req.query?.latitude ||
        req.query?.currentLat ||
        req.query?.mapLat
    ),
    lng: safeNumberOrEmpty(
      req.query?.lng ||
        req.query?.userLng ||
        req.query?.longitude ||
        req.query?.currentLng ||
        req.query?.mapLng
    ),
  };
}

function normalizeShop(shop = {}) {
  const item = shop && typeof shop.toObject === "function" ? shop.toObject() : shop || {};

  const address =
    safeString(item.address) ||
    safeString(item.roadAddress) ||
    safeString(item.fullAddress) ||
    safeString(item.locationText) ||
    safeString(item.addr) ||
    safeString(item.addressName);

  const region =
    safeString(item.region) ||
    safeString(item.sido) ||
    safeString(item.province) ||
    getRegionFromAddress(address);

  const district =
    safeString(item.district) ||
    safeString(item.sigungu) ||
    safeString(item.city) ||
    getDistrictFromAddress(address);

  const dong =
    safeString(item.dong) ||
    safeString(item.neighborhood) ||
    safeString(item.town) ||
    getDongFromAddress(address);

  const fallbackCoords = getFallbackCoords(address, region, district);

  const lat =
    safeNumberOrEmpty(item.lat) ||
    safeNumberOrEmpty(item.latitude) ||
    safeNumberOrEmpty(item.y) ||
    safeNumberOrEmpty(item.location?.lat) ||
    safeNumberOrEmpty(item.location?.y) ||
    safeNumberOrEmpty(item.geo?.coordinates?.[1]) ||
    fallbackCoords.lat;

  const lng =
    safeNumberOrEmpty(item.lng) ||
    safeNumberOrEmpty(item.longitude) ||
    safeNumberOrEmpty(item.x) ||
    safeNumberOrEmpty(item.location?.lng) ||
    safeNumberOrEmpty(item.location?.x) ||
    safeNumberOrEmpty(item.geo?.coordinates?.[0]) ||
    fallbackCoords.lng;

  const images = Array.from(
    new Set(
      []
        .concat(Array.isArray(item.images) ? item.images : [])
        .concat(Array.isArray(item.photos) ? item.photos : [])
        .concat(Array.isArray(item.imageUrls) ? item.imageUrls : [])
        .concat(Array.isArray(item.gallery) ? item.gallery : [])
        .concat(
          [
            item.representativeImage,
            item.mainImage,
            item.thumbnail,
            item.coverImage,
            item.image,
            item.imageUrl,
            item.photo,
            item.picture,
          ].filter(Boolean)
        )
        .map((image) => String(image || "").trim())
        .filter(Boolean)
    )
  );

  const representativeImage =
    item.representativeImage ||
    item.mainImage ||
    item.thumbnail ||
    item.coverImage ||
    item.image ||
    item.imageUrl ||
    images[0] ||
    "";

  const category = getCategoryFromShop(item);
  const status = normalizeStatus(item.status);
  const premium = isPremiumShop(item);

  return {
    ...item,
    _id: item._id || item.id,
    id: String(item.id || item._id || ""),
    name:
      safeString(item.name) ||
      safeString(item.shopName) ||
      safeString(item.title) ||
      safeString(item.businessName) ||
      safeString(item.storeName) ||
      "이름 없음",
    shopName:
      safeString(item.shopName) ||
      safeString(item.name) ||
      safeString(item.title) ||
      safeString(item.businessName) ||
      safeString(item.storeName) ||
      "이름 없음",
    title:
      safeString(item.title) ||
      safeString(item.name) ||
      safeString(item.shopName) ||
      safeString(item.businessName) ||
      safeString(item.storeName) ||
      "이름 없음",
    businessName:
      safeString(item.businessName) ||
      safeString(item.name) ||
      safeString(item.shopName) ||
      safeString(item.title) ||
      "이름 없음",
    storeName:
      safeString(item.storeName) ||
      safeString(item.name) ||
      safeString(item.shopName) ||
      safeString(item.title) ||
      "이름 없음",
    address,
    roadAddress: safeString(item.roadAddress) || address,
    fullAddress: safeString(item.fullAddress) || address,
    locationText: safeString(item.locationText) || address,
    region,
    sido: safeString(item.sido) || region,
    province: safeString(item.province) || region,
    district,
    sigungu: safeString(item.sigungu) || district,
    city: safeString(item.city) || district,
    dong,
    category,
    shopCategory: safeString(item.shopCategory) || category,
    serviceType: safeString(item.serviceType) || category,
    businessType: safeString(item.businessType) || category,
    adminCategory: safeString(item.adminCategory) || category,
    phone: safeString(item.phone) || safeString(item.tel),
    tel: safeString(item.tel) || safeString(item.phone),
    virtualPhone:
      safeString(item.virtualPhone) ||
      safeString(item.fakePhone) ||
      safeString(item.callNumber),
    fakePhone:
      safeString(item.fakePhone) ||
      safeString(item.virtualPhone) ||
      safeString(item.callNumber),
    callNumber:
      safeString(item.callNumber) ||
      safeString(item.virtualPhone) ||
      safeString(item.fakePhone) ||
      safeString(item.phone),
    businessHours:
      safeString(item.businessHours) ||
      safeString(item.openingHours) ||
      safeString(item.hours) ||
      safeString(item.openInfo),
    openingHours:
      safeString(item.openingHours) ||
      safeString(item.businessHours) ||
      safeString(item.hours) ||
      safeString(item.openInfo),
    hours:
      safeString(item.hours) ||
      safeString(item.businessHours) ||
      safeString(item.openingHours) ||
      safeString(item.openInfo),
    openInfo:
      safeString(item.openInfo) ||
      safeString(item.businessHours) ||
      safeString(item.openingHours) ||
      safeString(item.hours),
    description: safeString(item.description) || safeString(item.desc),
    status,
    visible: normalizeVisible(item.visible, true),
    approved: normalizeVisible(item.approved, true),
    isReservable: normalizeVisible(item.isReservable, true),
    isDeleted: item.isDeleted === true || item.deleted === true,
    premium,
    isPremium: premium,
    premiumActive: premium,
    premiumType: safeString(item.premiumType) || (premium ? "premium" : "normal"),
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    location:
      item.location && typeof item.location === "object"
        ? {
            ...item.location,
            lat: lat || item.location.lat || "",
            lng: lng || item.location.lng || "",
          }
        : {
            lat,
            lng,
          },
    geo:
      item.geo ||
      (lat !== "" && lng !== ""
        ? {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          }
        : undefined),
    courses: safeArray(item.courses),
    courseList: safeArray(item.courseList || item.courses),
    serviceTypes: safeArray(item.serviceTypes || item.tags),
    tags: safeArray(item.tags),
    price: safePriceArray(item.price),
    originalPrice: safePriceArray(item.originalPrice),
    images,
    photos: images,
    imageUrls: images,
    gallery: images,
    representativeImage,
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
    reviewCount: safeNumber(item.reviewCount, 0),
    likeCount: safeNumber(item.likeCount, 0),
    viewCount: safeNumber(item.viewCount, 0),
    rating: safeNumber(item.rating, 0),
    ratingAvg: safeNumber(item.ratingAvg, 0),
    distanceKm: Number.isFinite(Number(item.distanceKm)) ? Number(item.distanceKm) : undefined,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function normalizeList(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(normalizeShop)
    .filter((item) => item && !isShopDeletedOrHidden(item));
}

function sortByPremiumAndDistance(items = [], req = {}) {
  const base = getDistanceBase(req);
  const hasBase = hasValidCoord(base.lat, base.lng);

  return normalizeList(items)
    .map((shop, index) => {
      const lat = safeNumberOrEmpty(shop.lat || shop.location?.lat);
      const lng = safeNumberOrEmpty(shop.lng || shop.location?.lng);
      const distanceKm = hasBase
        ? calcDistanceKm(base.lat, base.lng, lat, lng)
        : Number.isFinite(Number(shop.distanceKm))
          ? Number(shop.distanceKm)
          : Number.POSITIVE_INFINITY;

      return {
        ...shop,
        premium: isPremiumShop(shop),
        isPremium: isPremiumShop(shop),
        premiumActive: isPremiumShop(shop),
        distanceKm,
        distance: Number.isFinite(distanceKm)
          ? formatDistance(distanceKm)
          : shop.distance || "",
        sortIndex: index,
      };
    })
    .sort((a, b) => {
      const aPremiumRank = isPremiumShop(a) ? 0 : 1;
      const bPremiumRank = isPremiumShop(b) ? 0 : 1;

      if (aPremiumRank !== bPremiumRank) {
        return aPremiumRank - bPremiumRank;
      }

      const aDistance = Number.isFinite(Number(a.distanceKm))
        ? Number(a.distanceKm)
        : Number.POSITIVE_INFINITY;
      const bDistance = Number.isFinite(Number(b.distanceKm))
        ? Number(b.distanceKm)
        : Number.POSITIVE_INFINITY;

      if (aDistance !== bDistance) {
        return aDistance - bDistance;
      }

      return Number(a.sortIndex || 0) - Number(b.sortIndex || 0);
    });
}

function sendPublicShops(res, items, source = "db", req = null, extra = {}) {
  const memoryItems = Array.isArray(CREATED_SHOPS_MEMORY) ? CREATED_SHOPS_MEMORY : [];
  const sourceItems =
    Array.isArray(items) && items.length > 0
      ? [...memoryItems, ...items]
      : memoryItems.length > 0
        ? memoryItems
        : DEFAULT_SHOPS;

  const uniqueMap = new Map();

  sourceItems.forEach((shop) => {
    const normalized = normalizeShop(shop);
    const key =
      String(normalized._id || normalized.id || "").trim() ||
      `${normalized.name || ""}_${normalized.address || ""}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, normalized);
    } else {
      uniqueMap.set(key, {
        ...uniqueMap.get(key),
        ...normalized,
      });
    }
  });

  const shops = sortByPremiumAndDistance(Array.from(uniqueMap.values()), req || {});

  return ok(res, {
    items: shops,
    list: shops,
    shops,
    data: shops,
    total: shops.length,
    count: shops.length,
    source:
      Array.isArray(items) && items.length > 0
        ? source
        : memoryItems.length > 0
          ? "memory"
          : "local-fallback",
    ...extra,
  });
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id || ""));
}

function buildBaseQuery() {
  return {
    isDeleted: { $ne: true },
    status: {
      $nin: ["deleted", "inactive", "disabled", "hidden", "closed"],
    },
  };
}

function buildSort(sort = "") {
  switch (safeString(sort)) {
    case "latest":
    case "recent":
      return { createdAt: -1, updatedAt: -1, _id: -1 };

    case "rating":
      return {
        ratingAvg: -1,
        rating: -1,
        reviewCount: -1,
        createdAt: -1,
      };

    case "popular":
      return {
        likeCount: -1,
        viewCount: -1,
        reviewCount: -1,
        createdAt: -1,
      };

    case "view":
      return {
        viewCount: -1,
        createdAt: -1,
      };

    default:
      return {
        premium: -1,
        isPremium: -1,
        premiumActive: -1,
        priority: -1,
        updatedAt: -1,
        createdAt: -1,
        _id: -1,
      };
  }
}

function buildPublicShopQuery(req = {}) {
  const query = buildBaseQuery();
  const andConditions = [];

  const rawRegion = safeString(req.query?.region || req.query?.sido || req.query?.province);
  const rawDistrict = safeString(req.query?.district || req.query?.sigungu || req.query?.city);
  const rawDong = safeString(req.query?.dong || req.query?.neighborhood || req.query?.town);
  const rawKeyword = safeString(req.query?.keyword || req.query?.q || req.query?.search);
  const rawCategory = safeString(
    req.query?.category ||
      req.query?.shopCategory ||
      req.query?.serviceType ||
      req.query?.businessType ||
      req.query?.adminCategory
  );

  if (rawCategory && rawCategory !== "전체" && rawCategory !== "all") {
    andConditions.push({
      $or: [
        { category: rawCategory },
        { shopCategory: rawCategory },
        { serviceType: rawCategory },
        { businessType: rawCategory },
        { adminCategory: rawCategory },
      ],
    });
  }

  if (rawRegion && rawRegion !== "지역" && rawRegion !== "전체" && rawRegion !== "all") {
    const values = getRegionAliases(rawRegion);
    const pattern = values.map(escapeRegexText).join("|");

    if (pattern) {
      andConditions.push({
        $or: [
          { region: { $in: values } },
          { sido: { $in: values } },
          { province: { $in: values } },
          { address: { $regex: pattern, $options: "i" } },
          { roadAddress: { $regex: pattern, $options: "i" } },
          { fullAddress: { $regex: pattern, $options: "i" } },
          { locationText: { $regex: pattern, $options: "i" } },
        ],
      });
    }
  }

  if (rawDistrict && rawDistrict !== "구" && rawDistrict !== "전체" && rawDistrict !== "all") {
    const escapedDistrict = escapeRegexText(rawDistrict);

    andConditions.push({
      $or: [
        { district: rawDistrict },
        { sigungu: rawDistrict },
        { city: rawDistrict },
        { address: { $regex: escapedDistrict, $options: "i" } },
        { roadAddress: { $regex: escapedDistrict, $options: "i" } },
        { fullAddress: { $regex: escapedDistrict, $options: "i" } },
        { locationText: { $regex: escapedDistrict, $options: "i" } },
      ],
    });
  }

  if (rawDong && rawDong !== "동" && rawDong !== "전체" && rawDong !== "all") {
    const escapedDong = escapeRegexText(rawDong);

    andConditions.push({
      $or: [
        { dong: rawDong },
        { neighborhood: rawDong },
        { town: rawDong },
        { address: { $regex: escapedDong, $options: "i" } },
        { roadAddress: { $regex: escapedDong, $options: "i" } },
        { fullAddress: { $regex: escapedDong, $options: "i" } },
        { locationText: { $regex: escapedDong, $options: "i" } },
      ],
    });
  }

  if (rawKeyword) {
    const escapedKeyword = escapeRegexText(rawKeyword);

    andConditions.push({
      $or: [
        { name: { $regex: escapedKeyword, $options: "i" } },
        { shopName: { $regex: escapedKeyword, $options: "i" } },
        { title: { $regex: escapedKeyword, $options: "i" } },
        { businessName: { $regex: escapedKeyword, $options: "i" } },
        { storeName: { $regex: escapedKeyword, $options: "i" } },
        { address: { $regex: escapedKeyword, $options: "i" } },
        { roadAddress: { $regex: escapedKeyword, $options: "i" } },
        { fullAddress: { $regex: escapedKeyword, $options: "i" } },
        { locationText: { $regex: escapedKeyword, $options: "i" } },
        { region: { $regex: escapedKeyword, $options: "i" } },
        { district: { $regex: escapedKeyword, $options: "i" } },
        { dong: { $regex: escapedKeyword, $options: "i" } },
      ],
    });
  }

  if (andConditions.length) {
    query.$and = andConditions;
  }

  return query;
}

async function fetchList(req = {}) {
  if (!Shop || !isDbReady()) {
    return {
      items: sortByPremiumAndDistance(DEFAULT_SHOPS, req),
      list: sortByPremiumAndDistance(DEFAULT_SHOPS, req),
      shops: sortByPremiumAndDistance(DEFAULT_SHOPS, req),
      data: sortByPremiumAndDistance(DEFAULT_SHOPS, req),
      total: DEFAULT_SHOPS.length,
      count: DEFAULT_SHOPS.length,
      page: 1,
      limit: DEFAULT_SHOPS.length,
      hasMore: false,
      source: "local-fallback",
    };
  }

  const page = Math.max(parseInt(req.query?.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query?.limit || 300, 10), 1), 1000);
  const skip = (page - 1) * limit;
  const query = buildPublicShopQuery(req);
  const sort = buildSort(req.query?.sort);

  let [items, total] = await Promise.all([
    Shop.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Shop.countDocuments(query),
  ]);

  if (!items.length && query.$and) {
    const baseQuery = buildBaseQuery();

    [items, total] = await Promise.all([
      Shop.find(baseQuery).sort(sort).skip(skip).limit(limit).lean(),
      Shop.countDocuments(baseQuery),
    ]);
  }

  if (!items.length) {
    const fallback = sortByPremiumAndDistance(DEFAULT_SHOPS, req);

    return {
      items: fallback,
      list: fallback,
      shops: fallback,
      data: fallback,
      total: fallback.length,
      count: fallback.length,
      page,
      limit,
      hasMore: false,
      source: "local-fallback",
    };
  }

  const normalized = sortByPremiumAndDistance(items, req);

  return {
    items: normalized,
    list: normalized,
    shops: normalized,
    data: normalized,
    total,
    count: normalized.length,
    page,
    limit,
    hasMore: page * limit < total,
    source: "db",
  };
}

function normalizeCreatedShopPayload(body = {}) {
  const source = body && typeof body === "object" ? body : {};

  const name =
    safeString(source.name) ||
    safeString(source.shopName) ||
    safeString(source.title) ||
    safeString(source.businessName) ||
    safeString(source.storeName) ||
    "업체명 없음";

  const address =
    safeString(source.address) ||
    safeString(source.roadAddress) ||
    safeString(source.fullAddress) ||
    safeString(source.locationText) ||
    safeString(source.addr) ||
    safeString(source.addressName);

  const region =
    safeString(source.region) ||
    safeString(source.sido) ||
    safeString(source.province) ||
    safeString(source.state) ||
    safeString(source.area) ||
    getRegionFromAddress(address);

  const district =
    safeString(source.district) ||
    safeString(source.sigungu) ||
    safeString(source.city) ||
    safeString(source.gu) ||
    safeString(source.county) ||
    getDistrictFromAddress(address);

  const dong =
    safeString(source.dong) ||
    safeString(source.neighborhood) ||
    safeString(source.town) ||
    safeString(source.eupmyeondong) ||
    safeString(source.areaDong) ||
    getDongFromAddress(address);

  const fallbackCoords = getFallbackCoords(address, region, district);

  const lat =
    safeNumberOrEmpty(source.lat) ||
    safeNumberOrEmpty(source.latitude) ||
    safeNumberOrEmpty(source.y) ||
    safeNumberOrEmpty(source.location?.lat) ||
    safeNumberOrEmpty(source.location?.y) ||
    safeNumberOrEmpty(source.geo?.coordinates?.[1]) ||
    fallbackCoords.lat ||
    0;

  const lng =
    safeNumberOrEmpty(source.lng) ||
    safeNumberOrEmpty(source.longitude) ||
    safeNumberOrEmpty(source.x) ||
    safeNumberOrEmpty(source.location?.lng) ||
    safeNumberOrEmpty(source.location?.x) ||
    safeNumberOrEmpty(source.geo?.coordinates?.[0]) ||
    fallbackCoords.lng ||
    0;

  const images = Array.from(
    new Set(
      []
        .concat(Array.isArray(source.images) ? source.images : [])
        .concat(Array.isArray(source.photos) ? source.photos : [])
        .concat(Array.isArray(source.imageUrls) ? source.imageUrls : [])
        .concat(Array.isArray(source.gallery) ? source.gallery : [])
        .concat(
          [
            source.representativeImage,
            source.mainImage,
            source.thumbnail,
            source.coverImage,
            source.image,
            source.imageUrl,
            source.photo,
            source.picture,
          ].filter(Boolean)
        )
        .map((image) => String(image || "").trim())
        .filter(Boolean)
    )
  );

  const representativeImage =
    source.representativeImage ||
    source.mainImage ||
    source.thumbnail ||
    source.coverImage ||
    source.image ||
    source.imageUrl ||
    images[0] ||
    "";

  const category = getCategoryFromShop(source);
  const premium = isPremiumShop(source);

  return {
    ...source,
    name,
    shopName: safeString(source.shopName) || name,
    title: safeString(source.title) || name,
    businessName: safeString(source.businessName) || name,
    storeName: safeString(source.storeName) || name,
    address,
    roadAddress: safeString(source.roadAddress) || address,
    fullAddress: safeString(source.fullAddress) || address,
    locationText: safeString(source.locationText) || address,
    region,
    sido: safeString(source.sido) || region,
    province: safeString(source.province) || region,
    district,
    sigungu: safeString(source.sigungu) || district,
    city: safeString(source.city) || district,
    dong,
    category,
    shopCategory: safeString(source.shopCategory) || category,
    serviceType: safeString(source.serviceType) || category,
    businessType: safeString(source.businessType) || category,
    adminCategory: safeString(source.adminCategory) || category,
    phone: safeString(source.phone) || safeString(source.tel),
    tel: safeString(source.tel) || safeString(source.phone),
    virtualPhone:
      safeString(source.virtualPhone) ||
      safeString(source.fakePhone) ||
      safeString(source.callNumber),
    fakePhone:
      safeString(source.fakePhone) ||
      safeString(source.virtualPhone) ||
      safeString(source.callNumber),
    callNumber:
      safeString(source.callNumber) ||
      safeString(source.virtualPhone) ||
      safeString(source.fakePhone) ||
      safeString(source.phone),
    businessHours:
      safeString(source.businessHours) ||
      safeString(source.openingHours) ||
      safeString(source.hours) ||
      safeString(source.openInfo),
    openingHours:
      safeString(source.openingHours) ||
      safeString(source.businessHours) ||
      safeString(source.hours) ||
      safeString(source.openInfo),
    hours:
      safeString(source.hours) ||
      safeString(source.businessHours) ||
      safeString(source.openingHours) ||
      safeString(source.openInfo),
    openInfo:
      safeString(source.openInfo) ||
      safeString(source.businessHours) ||
      safeString(source.openingHours) ||
      safeString(source.hours),
    description: safeString(source.description) || safeString(source.desc),
    courses: safeArray(source.courses),
    courseList: safeArray(source.courseList || source.courses),
    serviceTypes: safeArray(source.serviceTypes || source.tags),
    tags: safeArray(source.tags),
    price: safePriceArray(source.price),
    originalPrice: safePriceArray(source.originalPrice),
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    location:
      source.location && typeof source.location === "object"
        ? {
            ...source.location,
            lat,
            lng,
          }
        : {
            lat,
            lng,
          },
    geo:
      source.geo ||
      (lat !== "" && lng !== ""
        ? {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          }
        : undefined),
    status: normalizeStatus(source.status || "active"),
    visible: normalizeVisible(source.visible, true),
    approved: normalizeVisible(source.approved, true),
    isReservable: normalizeVisible(source.isReservable, true),
    isDeleted: source.isDeleted === true || source.deleted === true,
    premium,
    isPremium: premium,
    premiumActive: premium,
    premiumType: safeString(source.premiumType) || (premium ? "premium" : "normal"),
    images,
    photos: images,
    imageUrls: images,
    gallery: images,
    representativeImage,
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
    searchableText: [name, address, region, district, dong, category, source.phone || source.tel || ""]
      .filter(Boolean)
      .join(" "),
  };
}

function buildSchemaSafeShopPayload(payload = {}) {
  if (!Shop || !Shop.schema || !Shop.schema.paths) {
    return payload;
  }

  const paths = Shop.schema.paths;
  const safePayload = {};

  Object.keys(paths).forEach((key) => {
    if (["_id", "__v", "createdAt", "updatedAt"].includes(key)) {
      return;
    }

    if (payload[key] !== undefined) {
      safePayload[key] = payload[key];
    }
  });

  Object.keys(paths).forEach((key) => {
    if (safePayload[key] !== undefined || ["_id", "__v", "createdAt", "updatedAt"].includes(key)) {
      return;
    }

    const schemaType = paths[key];
    const isRequired =
      schemaType &&
      typeof schemaType.isRequired === "boolean" &&
      schemaType.isRequired === true;

    if (!isRequired) {
      return;
    }

    const lowerKey = key.toLowerCase();

    if (lowerKey.includes("name") || lowerKey.includes("title")) {
      safePayload[key] = payload.name || payload.shopName || "업체명 없음";
      return;
    }

    if (lowerKey.includes("address") || lowerKey.includes("addr")) {
      safePayload[key] = payload.address || "";
      return;
    }

    if (lowerKey.includes("phone") || lowerKey.includes("tel")) {
      safePayload[key] = payload.phone || "";
      return;
    }

    if (lowerKey.includes("category") || lowerKey.includes("type")) {
      safePayload[key] = payload.category || "massage";
      return;
    }

    if (lowerKey.includes("status")) {
      safePayload[key] = payload.status || "active";
      return;
    }

    if (schemaType.instance === "Boolean") {
      safePayload[key] = false;
      return;
    }

    if (schemaType.instance === "Number") {
      safePayload[key] = 0;
      return;
    }

    if (schemaType.instance === "Array") {
      safePayload[key] = [];
      return;
    }

    if (schemaType.instance === "ObjectID") {
      return;
    }

    safePayload[key] = "";
  });

  return Object.keys(safePayload).length ? safePayload : payload;
}

function makeLocalShopPayload(payload = {}, message = "SHOP_CREATED_LOCAL") {
  const id = `local-shop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const shop = normalizeShop({
    _id: id,
    id,
    ...payload,
    localFallback: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  CREATED_SHOPS_MEMORY.unshift(shop);

  if (CREATED_SHOPS_MEMORY.length > 300) {
    CREATED_SHOPS_MEMORY.length = 300;
  }

  return {
    shop,
    data: shop,
    item: shop,
    shops: CREATED_SHOPS_MEMORY,
    items: CREATED_SHOPS_MEMORY,
    list: CREATED_SHOPS_MEMORY,
    total: CREATED_SHOPS_MEMORY.length,
    count: CREATED_SHOPS_MEMORY.length,
    source: "local-fallback",
    message,
  };
}

/* =========================================================
   PUBLIC LIST
========================================================= */

exports.publicList = safeAsync(async (req, res) => {
  const result = await fetchList(req);

  return ok(res, result);
});

exports.list = exports.publicList;
exports.getPublicShops = exports.publicList;
exports.getShops = exports.publicList;
exports.getAllShops = exports.publicList;
exports.search = exports.publicList;

/* =========================================================
   DETAIL
========================================================= */

exports.publicDetail = safeAsync(async (req, res) => {
  const id = safeString(req.params?.id);

  if (!Shop || !isDbReady()) {
    const fallback = DEFAULT_SHOPS.find(
      (shop) => String(shop._id) === id || String(shop.id) === id
    );

    if (!fallback) {
      return fail(res, 404, "SHOP_NOT_FOUND");
    }

    const normalized = normalizeShop(fallback);

    return ok(res, {
      item: normalized,
      shop: normalized,
      data: normalized,
    });
  }

  const objectIdQuery = isValidObjectId(id) ? { _id: id } : null;

  const shop = await Shop.findOne({
    $or: [
      ...(objectIdQuery ? [objectIdQuery] : []),
      { id },
      { slug: id },
    ],
    isDeleted: { $ne: true },
  }).lean();

  if (!shop) {
    return fail(res, 404, "SHOP_NOT_FOUND");
  }

  const normalized = normalizeShop(shop);

  return ok(res, {
    item: normalized,
    shop: normalized,
    data: normalized,
  });
});

exports.detail = exports.publicDetail;
exports.getOne = exports.publicDetail;
exports.getShop = exports.publicDetail;
exports.getShopById = exports.publicDetail;

/* =========================================================
   RECOMMENDED / POPULAR / NEW / PREMIUM
========================================================= */

exports.recommended = safeAsync(async (req, res) => {
  req.query = {
    ...(req.query || {}),
    sort: "rating",
  };

  const result = await fetchList(req);

  return ok(res, result);
});

exports.getRecommended = exports.recommended;
exports.getRecommendedShops = exports.recommended;

exports.popular = safeAsync(async (req, res) => {
  req.query = {
    ...(req.query || {}),
    sort: "popular",
  };

  const result = await fetchList(req);

  return ok(res, result);
});

exports.getPopular = exports.popular;
exports.getPopularShops = exports.popular;

exports.newShops = safeAsync(async (req, res) => {
  req.query = {
    ...(req.query || {}),
    sort: "latest",
  };

  const result = await fetchList(req);

  return ok(res, result);
});

exports.getNewShops = exports.newShops;
exports.latest = exports.newShops;

exports.premium = safeAsync(async (req, res) => {
  if (!Shop || !isDbReady()) {
    const normalized = sortByPremiumAndDistance(DEFAULT_SHOPS.filter(isPremiumShop), req);

    return ok(res, {
      items: normalized,
      list: normalized,
      shops: normalized,
      data: normalized,
      total: normalized.length,
      count: normalized.length,
      source: "local-fallback",
    });
  }

  const query = buildBaseQuery();

  query.$or = [
    { premium: true },
    { isPremium: true },
    { premiumActive: true },
    { premiumType: { $in: ["premium", "vip"] } },
  ];

  const items = await Shop.find(query)
    .sort({
      priority: -1,
      updatedAt: -1,
      createdAt: -1,
      _id: -1,
    })
    .limit(100)
    .lean();

  const normalized = sortByPremiumAndDistance(items, req);

  return ok(res, {
    items: normalized,
    list: normalized,
    shops: normalized,
    data: normalized,
    total: normalized.length,
    count: normalized.length,
    source: "db",
  });
});

exports.getPremiumShops = exports.premium;

/* =========================================================
   VIEW COUNT
========================================================= */

exports.increaseView = safeAsync(async (req, res) => {
  const id = safeString(req.params?.id);

  if (!Shop || !isDbReady()) {
    return exports.publicDetail(req, res);
  }

  if (!isValidObjectId(id)) {
    return fail(res, 400, "INVALID_SHOP_ID");
  }

  const shop = await Shop.findById(id);

  if (!shop) {
    return fail(res, 404, "SHOP_NOT_FOUND");
  }

  shop.viewCount = safeNumber(shop.viewCount, 0) + 1;

  await shop.save();

  const normalized = normalizeShop(shop);

  return ok(res, {
    item: normalized,
    shop: normalized,
    data: normalized,
  });
});

exports.view = exports.increaseView;
exports.trackView = exports.increaseView;

/* =========================================================
   CREATE
========================================================= */

exports.create = safeAsync(async (req, res) => {
  const payload = normalizeCreatedShopPayload(req.body || {});

  if (!payload.name || payload.name === "업체명 없음") {
    payload.name = `노라 등록 업체 ${new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
    })}`;
    payload.shopName = payload.shopName || payload.name;
    payload.title = payload.title || payload.name;
  }

  if (!Shop || !isDbReady()) {
    return ok(res, makeLocalShopPayload(payload, "SHOP_CREATED_LOCAL_DB_NOT_READY"));
  }

  let created = null;

  try {
    created = await Shop.create(payload);
  } catch (primaryError) {
    console.error(
      "SHOP CREATE PRIMARY ERROR:",
      primaryError && primaryError.stack ? primaryError.stack : primaryError
    );

    try {
      created = await Shop.create(buildSchemaSafeShopPayload(payload));
    } catch (fallbackError) {
      console.error(
        "SHOP CREATE SCHEMA SAFE ERROR:",
        fallbackError && fallbackError.stack ? fallbackError.stack : fallbackError
      );

      return ok(
        res,
        makeLocalShopPayload(
          payload,
          fallbackError?.message || "SHOP_CREATED_LOCAL_AFTER_DB_ERROR"
        )
      );
    }
  }

  const shop = normalizeShop(created);

  CREATED_SHOPS_MEMORY.unshift(shop);

  if (CREATED_SHOPS_MEMORY.length > 300) {
    CREATED_SHOPS_MEMORY.length = 300;
  }

  return ok(res, {
    item: shop,
    shop,
    data: shop,
    shops: CREATED_SHOPS_MEMORY,
    items: CREATED_SHOPS_MEMORY,
    list: CREATED_SHOPS_MEMORY,
    total: CREATED_SHOPS_MEMORY.length,
    count: CREATED_SHOPS_MEMORY.length,
    source: "db",
    message: "SHOP_CREATED",
  });
});

exports.createShop = exports.create;
exports.adminCreate = exports.create;

/* =========================================================
   UPDATE
========================================================= */

exports.update = safeAsync(async (req, res) => {
  if (!Shop || !isDbReady()) {
    return fail(res, 503, "DB_NOT_CONNECTED");
  }

  const id = safeString(req.params?.id);
  const payload = normalizeCreatedShopPayload(req.body || {});
  const updatePayload = buildSchemaSafeShopPayload(payload);

  const objectIdQuery = isValidObjectId(id) ? { _id: id } : null;

  const updated = await Shop.findOneAndUpdate(
    {
      $or: [
        ...(objectIdQuery ? [objectIdQuery] : []),
        { id },
        { slug: id },
      ],
    },
    {
      $set: updatePayload,
    },
    {
      new: true,
      runValidators: true,
    }
  ).lean();

  if (!updated) {
    return fail(res, 404, "SHOP_NOT_FOUND");
  }

  const normalized = normalizeShop(updated);

  return ok(res, {
    item: normalized,
    shop: normalized,
    data: normalized,
    message: "SHOP_UPDATED",
  });
});

exports.updateShop = exports.update;
exports.adminUpdate = exports.update;

/* =========================================================
   DELETE
========================================================= */

exports.adminDelete = safeAsync(async (req, res) => {
  if (!Shop || !isDbReady()) {
    return fail(res, 503, "DB_NOT_CONNECTED");
  }

  const id = safeString(req.params?.id);
  const objectIdQuery = isValidObjectId(id) ? { _id: id } : null;

  const shop = await Shop.findOneAndUpdate(
    {
      $or: [
        ...(objectIdQuery ? [objectIdQuery] : []),
        { id },
        { slug: id },
      ],
    },
    {
      $set: {
        isDeleted: true,
        visible: false,
        status: "inactive",
      },
    },
    {
      new: true,
    }
  ).lean();

  if (!shop) {
    return fail(res, 404, "SHOP_NOT_FOUND");
  }

  const normalized = normalizeShop(shop);

  return ok(res, {
    deleted: true,
    id,
    item: normalized,
    shop: normalized,
    data: normalized,
    message: "SHOP_DELETED",
  });
});

exports.remove = exports.adminDelete;
exports.delete = exports.adminDelete;
exports.deleteShop = exports.adminDelete;

/* =========================================================
   HOT / SUGGEST
========================================================= */

exports.hot = safeAsync(async (req, res) => {
  let result = [];

  if (rankingService && typeof rankingService.getHot === "function") {
    result = await rankingService.getHot();
  }

  if (!Array.isArray(result) || !result.length) {
    const list = await fetchList({
      ...req,
      query: {
        ...(req.query || {}),
        sort: "popular",
        limit: req.query?.limit || 50,
      },
    });

    return ok(res, list);
  }

  const normalized = sortByPremiumAndDistance(result, req);

  return ok(res, {
    items: normalized,
    list: normalized,
    data: normalized,
    shops: normalized,
    total: normalized.length,
    count: normalized.length,
  });
});

exports.suggest = safeAsync(async (req, res) => {
  const keyword = safeString(req.query?.keyword || req.query?.q);

  if (!keyword) {
    return ok(res, {
      items: [],
      list: [],
      data: [],
      total: 0,
      count: 0,
    });
  }

  if (!Shop || !isDbReady()) {
    const regex = new RegExp("^" + escapeRegexText(keyword), "i");
    const normalized = normalizeList(DEFAULT_SHOPS).filter((shop) => regex.test(shop.name));

    return ok(res, {
      items: normalized,
      list: normalized,
      data: normalized,
      total: normalized.length,
      count: normalized.length,
      source: "local-fallback",
    });
  }

  const regex = new RegExp("^" + escapeRegexText(keyword), "i");

  const items = await Shop.find({
    ...buildBaseQuery(),
    $or: [
      { name: regex },
      { shopName: regex },
      { title: regex },
      { address: regex },
    ],
  })
    .limit(10)
    .lean();

  const normalized = normalizeList(items);

  return ok(res, {
    items: normalized,
    list: normalized,
    data: normalized,
    total: normalized.length,
    count: normalized.length,
    source: "db",
  });
});

/* =========================================================
   ANALYTICS / REVENUE SAFE
========================================================= */

exports.analytics = safeAsync(async (req, res) => {
  let analytics = {};

  if (analyticsService && typeof analyticsService.getAnalytics === "function") {
    analytics = (await analyticsService.getAnalytics()) || {};
  }

  return ok(res, {
    analytics,
  });
});

exports.revenue = safeAsync(async (req, res) => {
  let revenue = {};

  if (revenueService && typeof revenueService.getRevenue === "function") {
    revenue = (await revenueService.getRevenue()) || {};
  }

  return ok(res, {
    revenue,
  });
});

exports.health = safeAsync(async (req, res) => {
  return ok(res, {
    status: "UP",
    db: mongoose.connection.readyState,
    dbReady: isDbReady(),
    shopModel: !!Shop,
    fallbackCount: DEFAULT_SHOPS.length,
  });
});

console.log("🔥 SHOP CONTROLLER READY");

module.exports = exports;
