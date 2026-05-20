"use strict";

/**
 * =====================================================
 * 🔥 SHOP CONTROLLER (FINAL STABLE PATCH)
 * =====================================================
 */

const mongoose = require("mongoose");
const Shop = require("../models/Shop");

mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", false);

let dbModule = null;

try {
  dbModule =
    require("../../config/database") ||
    require("../../db");
} catch (e) {
  try {
    dbModule = require("../../db");
  } catch (err) {
    dbModule = null;
  }
}

let recommendService = null;
let Review = null;
let Reservation = null;
let Payment = null;

try {
  recommendService = require("../services/recommendation/recommend.service");
} catch (e) {
  console.warn("RECOMMEND SERVICE LOAD FAIL");
}

try {
  Review = require("../models/Review");
} catch (e) {
  Review = null;
}

try {
  Reservation = require("../models/Reservation");
} catch (e) {
  Reservation = null;
}

try {
  Payment = require("../models/Payment");
} catch (e) {
  Payment = null;
}

const ok = (res, data = {}) =>
  res.json({
    ok: true,
    ...data,
  });

const fail = (res, msg = "ERROR", code = 400) =>
  res.status(code).json({
    ok: false,
    msg,
    message: msg,
    error: msg,
  });

const isAdmin = (req) =>
  req.user?.role === "admin" ||
  req.user?.isAdmin === true ||
  req.user?.type === "admin" ||
  req.user?.userRole === "admin" ||
  req.isAdmin === true;

const toNumberSafe = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const normalizePremiumType = (value) => {
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
};

const normalizePremiumValue = (data = {}) => {
  const premiumType =
    normalizePremiumType(
      data.premiumType ||
        data.premiumLevel ||
        data.grade ||
        ""
    );

  return (
    data.premium === true ||
    data.isPremium === true ||
    data.premiumActive === true ||
    data.premium === "true" ||
    data.isPremium === "true" ||
    data.premiumActive === "true" ||
    data.premium === "1" ||
    data.isPremium === "1" ||
    data.premiumActive === "1" ||
    premiumType !== "normal"
  );
};

const normalizePremiumFields = (data = {}) => {
  const premiumValue = normalizePremiumValue(data);
  const premiumType = premiumValue
    ? normalizePremiumType(
        data.premiumType ||
          data.premiumLevel ||
          data.grade ||
          data.premium ||
          data.isPremium ||
          "premium"
      )
    : "normal";

  return {
    premium: premiumValue,
    isPremium: premiumValue,
    premiumActive: premiumValue,
    premiumType: premiumType === "normal" && premiumValue ? "premium" : premiumType,
  };
};

const waitForMongoConnection = async () => {
  const start = Date.now();

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

  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > 2500) {
      throw new Error("DB_NOT_CONNECTED");
    }

    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  return true;
};

const getDateRange = (query = {}) => {
  const now = new Date();

  const start = query.startDate
    ? new Date(query.startDate)
    : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const end = query.endDate
    ? new Date(query.endDate)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  if (query.endDate && !Number.isNaN(end.getTime())) {
    end.setHours(23, 59, 59, 999);
  }

  return {
    start: Number.isNaN(start.getTime())
      ? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      : start,
    end: Number.isNaN(end.getTime())
      ? new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      : end,
  };
};

const normalizeDateKey = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

const getDocShopId = (doc = {}) => {
  const value =
    doc.shop ||
    doc.shopId ||
    doc.shop_id ||
    doc.store ||
    doc.storeId ||
    doc.store_id ||
    doc.business ||
    doc.businessId ||
    doc.business_id ||
    doc.company ||
    doc.companyId ||
    doc.company_id ||
    "";

  if (value && typeof value === "object" && value._id) {
    return String(value._id);
  }

  return String(value || "");
};

const getRelatedDocs = async (Model, shopIds = [], start, end) => {
  if (!Model) {
    return [];
  }

  const query = {
    createdAt: {
      $gte: start,
      $lte: end,
    },
    $or: [
      { shop: { $in: shopIds } },
      { shopId: { $in: shopIds } },
      { shop_id: { $in: shopIds } },
      { store: { $in: shopIds } },
      { storeId: { $in: shopIds } },
      { store_id: { $in: shopIds } },
      { business: { $in: shopIds } },
      { businessId: { $in: shopIds } },
      { business_id: { $in: shopIds } },
      { company: { $in: shopIds } },
      { companyId: { $in: shopIds } },
      { company_id: { $in: shopIds } },
    ],
  };

  try {
    return await Model.find(query).lean();
  } catch (e) {
    return [];
  }
};

const normalizeArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizePriceArray = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        toNumberSafe(
          String(v)
            .replaceAll(",", "")
            .replaceAll("원", "")
            .trim()
        )
      )
      .filter((v) => v !== undefined);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) =>
        toNumberSafe(
          String(v)
            .replaceAll(",", "")
            .replaceAll("원", "")
            .trim()
        )
      )
      .filter((v) => v !== undefined);
  }

  return [];
};

const normalizeSearchText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();

const normalizeShopCategory = (value) => {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (
    text === "karaoke" ||
    text === "노래방" ||
    text === "nora-karaoke" ||
    text === "nora_karaoke" ||
    text === "coin-karaoke" ||
    text === "coin_karaoke"
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
};

const getRequestCategory = (req) => {
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
    normalizeShopCategory(req?.user?.adminCategory) ||
    normalizeShopCategory(req?.user?.adminType) ||
    normalizeShopCategory(req?.user?.serviceType) ||
    ""
  );
};

const getSafeRequestCategory = (req) => {
  return getRequestCategory(req) || "massage";
};

const buildCategoryGuard = (req) => {
  const category = getRequestCategory(req);

  if (!category) {
    return {};
  }

  return {
    category,
  };
};

const applyCategoryToData = (data = {}, req) => {
  const category = getSafeRequestCategory(req);

  return {
    ...data,
    category,
    shopCategory: category,
    serviceType: category,
    businessType: category,
    adminCategory: category,
  };
};


const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeLooseRegex = (value) => {
  const compact = normalizeSearchText(value);

  if (!compact) {
    return "";
  }

  return compact
    .split("")
    .map((char) => escapeRegex(char))
    .join("\\s*");
};

const REGION_ALIAS_MAP = {
  서울: ["서울", "서울시", "서울특별시"],
  부산: ["부산", "부산시", "부산광역시"],
  대구: ["대구", "대구시", "대구광역시"],
  인천: ["인천", "인천시", "인천광역시"],
  광주: ["광주", "광주시", "광주광역시"],
  대전: ["대전", "대전시", "대전광역시"],
  울산: ["울산", "울산시", "울산광역시"],
  세종: ["세종", "세종시", "세종특별자치시"],
  경기: ["경기", "경기도"],
  강원: ["강원", "강원도", "강원특별자치도"],
  충북: ["충북", "충청북도"],
  충남: ["충남", "충청남도"],
  전북: ["전북", "전라북도", "전북특별자치도"],
  전남: ["전남", "전라남도"],
  경북: ["경북", "경상북도"],
  경남: ["경남", "경상남도"],
  제주: ["제주", "제주도", "제주특별자치도"],
};

const buildShopSearchQuery = (params = {}) => {
  const {
    keyword,
    q,
    compact,
    normalized,
    category,
    region,
    district,
  } = params;

  const query = {};

  const searchKeyword = String(keyword || q || compact || normalized || "").trim();

  if (searchKeyword) {
    const looseKeyword = makeLooseRegex(searchKeyword);

    const keywordRegex = new RegExp(escapeRegex(searchKeyword), "i");

    const looseRegex = looseKeyword ? new RegExp(looseKeyword, "i") : keywordRegex;

    query.$or = [
      { name: keywordRegex },
      { name: looseRegex },
      { address: keywordRegex },
      { address: looseRegex },
      { region: keywordRegex },
      { region: looseRegex },
      { district: keywordRegex },
      { district: looseRegex },
      { phone: keywordRegex },
      { virtualPhone: keywordRegex },
      { fakePhone: keywordRegex },
      { callNumber: keywordRegex },
      { businessHours: keywordRegex },
      { openingHours: keywordRegex },
      { hours: keywordRegex },
      { description: keywordRegex },
      { category: keywordRegex },
      { tags: keywordRegex },
      { serviceTypes: keywordRegex },
    ];
  }

  if (category) {
    const safeCategory = normalizeShopCategory(category);

    query.category = safeCategory || new RegExp(escapeRegex(category), "i");
  }

  if (region && region !== "지역") {
    const aliases = REGION_ALIAS_MAP[region] || [region];

    query.$and = query.$and || [];

    const regionOr = aliases.flatMap((item) => {
      const regex = new RegExp(escapeRegex(item), "i");

      return [{ region: regex }, { address: regex }];
    });

    if (district && district !== "구") {
      const districtRegex = new RegExp(escapeRegex(district), "i");

      regionOr.push({ district: districtRegex }, { address: districtRegex });
    }

    query.$and.push({
      $or: regionOr,
    });
  }

  if (district && district !== "구") {
    const districtRegex = new RegExp(escapeRegex(district), "i");

    query.$and = query.$and || [];

    query.$and.push({
      $or: [{ district: districtRegex }, { address: districtRegex }],
    });
  }

  return query;
};

const normalizeImageArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();

    if (!text) {
      return [];
    }

    if (text.startsWith("data:image/")) {
      return [text];
    }

    return text
      .split(",")
      .map((v) => String(v || "").trim())
      .filter(Boolean);
  }

  return [];
};

const hasOwnImageField = (data = {}) =>
  Object.prototype.hasOwnProperty.call(data, "images") ||
  Object.prototype.hasOwnProperty.call(data, "photos") ||
  Object.prototype.hasOwnProperty.call(data, "imageUrls");

const normalizeShopImages = (data = {}, fallback = {}) => {
  const exactIncomingImages = hasOwnImageField(data);

  const images = normalizeImageArray(data.images);
  const photos = normalizeImageArray(data.photos);
  const imageUrls = normalizeImageArray(data.imageUrls);
  const fallbackImages = normalizeImageArray(fallback.images);
  const fallbackPhotos = normalizeImageArray(fallback.photos);
  const fallbackImageUrls = normalizeImageArray(fallback.imageUrls);

  const merged = [];

  const sourceImages = exactIncomingImages
    ? [
        ...images,
        ...photos,
        ...imageUrls,
      ]
    : [
        ...images,
        ...photos,
        ...imageUrls,
        ...fallbackImages,
        ...fallbackPhotos,
        ...fallbackImageUrls,
      ];

  sourceImages.forEach((image) => {
    if (image && !merged.includes(image)) {
      merged.push(image);
    }
  });

  const representativeImage = exactIncomingImages
    ? data.representativeImage ||
      data.mainImage ||
      data.thumbnail ||
      data.coverImage ||
      merged[0] ||
      ""
    : data.representativeImage ||
      data.mainImage ||
      data.thumbnail ||
      data.coverImage ||
      fallback.representativeImage ||
      fallback.mainImage ||
      fallback.thumbnail ||
      fallback.coverImage ||
      merged[0] ||
      "";

  return {
    images: merged,
    photos: merged,
    imageUrls: merged,
    representativeImage,
    mainImage: representativeImage,
    thumbnail: representativeImage,
    coverImage: representativeImage,
  };
};

const hasIncomingImageData = (data = {}) => {
  return (
    hasOwnImageField(data) ||
    Object.prototype.hasOwnProperty.call(data, "representativeImage") ||
    Object.prototype.hasOwnProperty.call(data, "mainImage") ||
    Object.prototype.hasOwnProperty.call(data, "thumbnail") ||
    Object.prototype.hasOwnProperty.call(data, "coverImage")
  );
};

const removeEmptyImageFields = (data = {}) => {
  return {
    ...data,
  };
};

const normalizeCoursePricePairs = (courses, prices) => {
  const safeCourses = normalizeArray(courses);
  const safePrices = normalizePriceArray(prices);

  return safeCourses.map((course, index) => ({
    course,
    price: safePrices[index] || 0,
  }));
};

const getShopCategoryGroup = (shop = {}) => {
  const raw = String(
    shop.category ||
      shop.type ||
      shop.shopType ||
      shop.serviceType ||
      shop.mainCategory ||
      shop.service ||
      ""
  ).toLowerCase();

  if (
    raw.includes("karaoke") ||
    raw.includes("노래") ||
    raw.includes("노래방") ||
    raw.includes("가라오케") ||
    raw.includes("코인")
  ) {
    return "karaoke";
  }

  return "massage";
};

const sortPremiumDistance = (items = []) => {
  return [...items].sort((a, b) => {
    const premiumA = normalizePremiumValue(a) ? 1 : 0;
    const premiumB = normalizePremiumValue(b) ? 1 : 0;

    if (premiumA !== premiumB) {
      return premiumB - premiumA;
    }

    return (a.distanceKm || 999) - (b.distanceKm || 999);
  });
};

const groupPremiumNearby = (items = [], limit = 3) => {
  const safeLimit = Math.max(Number(limit) || 3, 1);
  const sorted = sortPremiumDistance(items);

  const massage = sorted
    .filter((shop) => getShopCategoryGroup(shop) === "massage")
    .slice(0, safeLimit);

  const karaoke = sorted
    .filter((shop) => getShopCategoryGroup(shop) === "karaoke")
    .slice(0, safeLimit);

  return {
    massage,
    karaoke,
    all: [...massage, ...karaoke],
  };
};

const sanitize = (shop) => {
  if (!shop) return null;

  const obj = shop.toObject ? shop.toObject() : shop;

  delete obj.__v;

  const premiumState = normalizePremiumFields(obj);

  obj.premium = premiumState.premium;
  obj.isPremium = premiumState.isPremium;
  obj.premiumActive = premiumState.premiumActive;
  obj.premiumType = premiumState.premiumType;
  obj.categoryGroup = getShopCategoryGroup(obj);

  const imageData = normalizeShopImages(obj);

  obj.images = imageData.images;
  obj.photos = imageData.photos;
  obj.imageUrls = imageData.imageUrls;
  obj.representativeImage = imageData.representativeImage;
  obj.mainImage = imageData.mainImage;
  obj.thumbnail = imageData.thumbnail;
  obj.coverImage = imageData.coverImage;

  obj.virtualPhone = obj.virtualPhone || obj.fakePhone || obj.callNumber || "";
  obj.fakePhone = obj.fakePhone || obj.virtualPhone || "";
  obj.callNumber = obj.callNumber || obj.virtualPhone || "";

  obj.businessHours = obj.businessHours || obj.openingHours || obj.hours || "";
  obj.openingHours = obj.openingHours || obj.businessHours || "";
  obj.hours = obj.hours || obj.businessHours || "";

  obj.callCount = Number(obj.callCount || obj.stats?.callCount || 0);
  obj.clickCount = Number(obj.clickCount || obj.viewCount || obj.stats?.clickCount || 0);
  obj.conversionCount = Number(
    obj.conversionCount || obj.stats?.conversionCount || obj.stats?.reservationCount || 0
  );
  obj.reviewCount = Number(obj.reviewCount || obj.rating?.count || obj.stats?.reviewCount || 0);

  obj.dailyCalls = obj.dailyCalls || {};
  obj.dailyClicks = obj.dailyClicks || {};
  obj.dailyConversions = obj.dailyConversions || {};
  obj.dailyReviews = obj.dailyReviews || {};

  if (!obj.location && obj.lat !== undefined && obj.lng !== undefined) {
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
    if (obj.lat === undefined && obj.location.lat !== undefined) {
      obj.lat = obj.location.lat;
    }

    if (obj.lng === undefined && obj.location.lng !== undefined) {
      obj.lng = obj.location.lng;
    }
  }

  if (obj.lat !== undefined) {
    obj.lat = toNumberSafe(obj.lat);
  }

  if (obj.lng !== undefined) {
    obj.lng = toNumberSafe(obj.lng);
  }

  if (Array.isArray(obj.courses) && Array.isArray(obj.price)) {
    obj.coursePricePairs = normalizeCoursePricePairs(obj.courses, obj.price);
  }

  return obj;
};

const calcDistanceKm = (lat1, lng1, lat2, lng2) => {
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

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return Number((R * c).toFixed(2));
};

exports.create = async (req, res) => {
  try {
    console.log("SHOP CREATE USER:", req.user);
    console.log("SHOP CREATE BODY:", req.body);

    if (!req.user && !req.isAdmin) {
      return fail(res, "INVALID_TOKEN", 401);
    }

    if (!isAdmin(req)) {
      return fail(res, "권한 없음", 403);
    }

    await waitForMongoConnection();

    const {
      name,
      address,
      lat,
      lng,
      phone,
      virtualPhone,
      businessHours,
      description,
      category: safeCategory,
      courses,
      price,
      status,
      region,
      district,
      visible,
      approved,
      isReservable,
      serviceTypes,
      tags,
      priceOriginal,
      priceDiscount,
    } = req.body;

    const bodyLat = lat ?? req.body?.location?.lat;
    const bodyLng = lng ?? req.body?.location?.lng;

    if (!name) {
      return fail(res, "매장 이름 필요");
    }

    if (!address) {
      return fail(res, "주소 필요");
    }

    const latNumber = bodyLat !== undefined ? toNumberSafe(bodyLat) : undefined;
    const lngNumber = bodyLng !== undefined ? toNumberSafe(bodyLng) : undefined;

    const normalizedCourses = normalizeArray(courses);
    const normalizedPrices = normalizePriceArray(price);
    const imageData = normalizeShopImages(req.body);
    const premiumState = normalizePremiumFields(req.body);
    const safeCategory = getSafeRequestCategory(req);

    const createData = applyCategoryToData({
      name: String(name || "").trim(),
      address: String(address || "").trim(),
      region,
      district,
      phone,
      virtualPhone: virtualPhone || req.body.fakePhone || req.body.callNumber || "",
      fakePhone: virtualPhone || req.body.fakePhone || req.body.callNumber || "",
      callNumber: virtualPhone || req.body.fakePhone || req.body.callNumber || "",
      businessHours: businessHours || req.body.openingHours || req.body.hours || "",
      openingHours: businessHours || req.body.openingHours || req.body.hours || "",
      hours: businessHours || req.body.openingHours || req.body.hours || "",
      description,
      category,
      visible: visible !== false,
      approved: approved !== false,
      premium: premiumState.premium,
      isPremium: premiumState.isPremium,
      premiumActive: premiumState.premiumActive,
      premiumType: premiumState.premiumType,
      isReservable: isReservable !== false,
      tags: normalizeArray(tags),
      serviceTypes: normalizeArray(serviceTypes),
      priceOriginal: toNumberSafe(priceOriginal) || 0,
      priceDiscount: toNumberSafe(priceDiscount) || 0,
      courses: normalizedCourses,
      price: normalizedPrices.length > 0 ? normalizedPrices : toNumberSafe(price),
      status: status || "active",
      images: imageData.images,
      photos: imageData.photos,
      imageUrls: imageData.imageUrls,
      representativeImage: imageData.representativeImage,
      mainImage: imageData.mainImage,
      thumbnail: imageData.thumbnail,
      coverImage: imageData.coverImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, req);

    if (latNumber !== undefined && lngNumber !== undefined) {
      createData.location = {
        lat: latNumber,
        lng: lngNumber,
      };

      createData.lat = latNumber;
      createData.lng = lngNumber;
    }

    console.log("SHOP CREATE DATA:", createData);

    const shop = await Shop.create(createData);

    return ok(res, {
      shop: sanitize(shop),
      data: sanitize(shop),
    });
  } catch (e) {
    console.error("SHOP CREATE ERROR:", e);

    return fail(res, e.message || "SHOP_CREATE_ERROR", 500);
  }
};

exports.getList = async (req, res) => {
  try {
    await waitForMongoConnection();

    const { page = 1, limit = 20 } = req.query;

    const query = buildShopSearchQuery(req.query);

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 300);
    const skip = (safePage - 1) * safeLimit;

    const [list, total] = await Promise.all([
      Shop.find(query)
        .lean()
        .sort({
          premium: -1,
          isPremium: -1,
          premiumActive: -1,
          createdAt: -1,
        })
        .skip(Number(skip))
        .limit(Number(safeLimit)),

      Shop.countDocuments(query),
    ]);

    const items = list.map(sanitize);

    return ok(res, {
      list: items,
      items,
      shops: items,
      data: items,
      total,
      count: total,
      page: safePage,
      limit: safeLimit,
    });
  } catch (e) {
    console.error("SHOP LIST ERROR:", e);

    return fail(res, e.message || "SHOP_LIST_ERROR", 500);
  }
};

exports.search = async (req, res) => {
  try {
    await waitForMongoConnection();

    const query = buildShopSearchQuery(req.query);

    const list = await Shop.find(query)
      .lean()
      .sort({
        premium: -1,
        isPremium: -1,
        premiumActive: -1,
        createdAt: -1,
      })
      .limit(300);

    const items = list.map(sanitize);

    return ok(res, {
      list: items,
      items,
      shops: items,
      data: items,
      total: items.length,
      count: items.length,
    });
  } catch (e) {
    console.error("SHOP SEARCH ERROR:", e);

    return fail(res, e.message || "SHOP_SEARCH_ERROR", 500);
  }
};

exports.getDetail = async (req, res) => {
  try {
    await waitForMongoConnection();

    const { id } = req.params;

    const categoryGuard = buildCategoryGuard(req);

    const shop = await Shop.findOne({
      _id: id,
      ...categoryGuard,
    });

    if (!shop) {
      return fail(res, "매장 없음", 404);
    }

    return ok(res, {
      shop: sanitize(shop),
      data: sanitize(shop),
    });
  } catch (e) {
    console.error("SHOP DETAIL ERROR:", e);

    return fail(res, e.message, 500);
  }
};

exports.update = async (req, res) => {
  try {
    if (!req.user && !req.isAdmin) {
      return fail(res, "INVALID_TOKEN", 401);
    }

    if (!isAdmin(req)) {
      return fail(res, "권한 없음", 403);
    }

    await waitForMongoConnection();

    const { id } = req.params;

    const rawData = {
      ...(req.body || {}),
    };

    const data = applyCategoryToData(removeEmptyImageFields(rawData), req);
    const categoryGuard = buildCategoryGuard(req);

    const shop = await Shop.findOne({
      _id: id,
      ...categoryGuard,
    });

    if (!shop) {
      return fail(res, "매장 없음");
    }

    const previousImageData = normalizeShopImages(shop.toObject ? shop.toObject() : shop);

    const statusOnlyUpdate =
      Object.keys(data).length > 0 &&
      Object.keys(data).every((key) => ["status", "updatedAt"].includes(key));

    if (statusOnlyUpdate) {
      await Shop.findOneAndUpdate(
        {
          _id: id,
          ...categoryGuard,
        },
        {
          $set: {
            status: data.status || shop.status,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: false,
        }
      );

      const updatedShop = await Shop.findOne({
        _id: id,
        ...categoryGuard,
      });

      return ok(res, {
        shop: sanitize(updatedShop),
        data: sanitize(updatedShop),
        status: updatedShop?.status || data.status || shop.status,
      });
    }

    if (data.name !== undefined) {
      shop.name = String(data.name || "").trim();
    }

    if (
      data.address !== undefined ||
      data.roadAddress !== undefined ||
      data.fullAddress !== undefined
    ) {
      shop.address = String(data.address || data.roadAddress || data.fullAddress || "").trim();
    }

    if (data.region !== undefined) {
      shop.region = String(data.region || "").trim();
    }

    if (data.district !== undefined) {
      shop.district = String(data.district || "").trim();
    }

    if (data.phone !== undefined) {
      shop.phone = String(data.phone || "").trim();
    }

    if (data.description !== undefined) {
      shop.description = data.description;
    }

    if (data.category !== undefined) {
      shop.category = data.category;
    }

    if (data.status !== undefined) {
      shop.status = data.status || shop.status;
    }

    if (data.visible !== undefined) {
      shop.visible = data.visible !== false;
    }

    if (data.approved !== undefined) {
      shop.approved = data.approved !== false;
    }

    if (
      data.premium !== undefined ||
      data.isPremium !== undefined ||
      data.premiumActive !== undefined ||
      data.premiumType !== undefined
    ) {
      const premiumState = normalizePremiumFields(data);

      shop.premium = premiumState.premium;
      shop.isPremium = premiumState.isPremium;
      shop.premiumActive = premiumState.premiumActive;
      shop.premiumType = premiumState.premiumType;
    }

    if (data.isReservable !== undefined) {
      shop.isReservable = data.isReservable !== false;
    }

    if (
      data.virtualPhone !== undefined ||
      data.fakePhone !== undefined ||
      data.callNumber !== undefined
    ) {
      const nextPhone = data.virtualPhone || data.fakePhone || data.callNumber || "";

      shop.virtualPhone = nextPhone;
      shop.fakePhone = nextPhone;
      shop.callNumber = nextPhone;
    }

    if (
      data.businessHours !== undefined ||
      data.openingHours !== undefined ||
      data.hours !== undefined
    ) {
      const nextHours = data.businessHours || data.openingHours || data.hours || "";

      shop.businessHours = nextHours;
      shop.openingHours = nextHours;
      shop.hours = nextHours;
    }

    if (data.courses !== undefined) {
      shop.courses = normalizeArray(data.courses);
    }

    if (data.tags !== undefined) {
      shop.tags = normalizeArray(data.tags);
    }

    if (data.serviceTypes !== undefined) {
      shop.serviceTypes = normalizeArray(data.serviceTypes);
    }

    if (data.price !== undefined) {
      const normalizedPrices = normalizePriceArray(data.price);

      shop.price = normalizedPrices.length > 0 ? normalizedPrices : toNumberSafe(data.price);
    }

    if (data.priceOriginal !== undefined) {
      shop.priceOriginal = toNumberSafe(data.priceOriginal) || 0;
    }

    if (data.priceDiscount !== undefined) {
      shop.priceDiscount = toNumberSafe(data.priceDiscount) || 0;
    }

    if (hasIncomingImageData(data)) {
      const imageData = normalizeShopImages(data, previousImageData);

      shop.images = imageData.images;
      shop.photos = imageData.photos;
      shop.imageUrls = imageData.imageUrls;
      shop.representativeImage = imageData.representativeImage;
      shop.mainImage = imageData.mainImage;
      shop.thumbnail = imageData.thumbnail;
      shop.coverImage = imageData.coverImage;
    } else {
      shop.images = previousImageData.images;
      shop.photos = previousImageData.photos;
      shop.imageUrls = previousImageData.imageUrls;
      shop.representativeImage = previousImageData.representativeImage;
      shop.mainImage = previousImageData.mainImage;
      shop.thumbnail = previousImageData.thumbnail;
      shop.coverImage = previousImageData.coverImage;
    }

    if (
      data.lat !== undefined ||
      data.lng !== undefined ||
      data.location?.lat !== undefined ||
      data.location?.lng !== undefined
    ) {
      const nextLat = toNumberSafe(data.lat ?? data.location?.lat);
      const nextLng = toNumberSafe(data.lng ?? data.location?.lng);

      if (
        nextLat !== undefined &&
        nextLng !== undefined &&
        nextLat !== 0 &&
        nextLng !== 0
      ) {
        shop.location = {
          lat: nextLat,
          lng: nextLng,
        };

        shop.lat = nextLat;
        shop.lng = nextLng;
      }

      if (
        (nextLat === 0 && nextLng === 0) ||
        (nextLat === undefined && nextLng === undefined)
      ) {
        shop.location = undefined;
        shop.lat = undefined;
        shop.lng = undefined;
      }
    }

    shop.updatedAt = new Date();

    shop.markModified("address");
    shop.markModified("region");
    shop.markModified("district");
    shop.markModified("phone");
    shop.markModified("businessHours");
    shop.markModified("openingHours");
    shop.markModified("hours");
    shop.markModified("courses");
    shop.markModified("price");
    shop.markModified("premium");
    shop.markModified("isPremium");
    shop.markModified("premiumActive");
    shop.markModified("premiumType");
    shop.markModified("images");
    shop.markModified("photos");
    shop.markModified("imageUrls");
    shop.markModified("representativeImage");
    shop.markModified("mainImage");
    shop.markModified("thumbnail");
    shop.markModified("coverImage");

    await shop.save();

    const updatedShop = await Shop.findOne({
      _id: id,
      ...categoryGuard,
    });

    return ok(res, {
      shop: sanitize(updatedShop),
      data: sanitize(updatedShop),
    });
  } catch (e) {
    console.error("SHOP UPDATE ERROR:", e);

    return fail(res, e.message, 500);
  }
};

exports.remove = async (req, res) => {
  try {
    if (!req.user && !req.isAdmin) {
      return fail(res, "INVALID_TOKEN", 401);
    }

    if (!isAdmin(req)) {
      return fail(res, "권한 없음", 403);
    }

    await waitForMongoConnection();

    const { id } = req.params;

    const categoryGuard = buildCategoryGuard(req);

    const shop = await Shop.findOne({
      _id: id,
      ...categoryGuard,
    });

    if (!shop) {
      return fail(res, "매장 없음");
    }

    await Shop.deleteOne({
      _id: id,
      ...categoryGuard,
    });

    return ok(res);
  } catch (e) {
    console.error("SHOP DELETE ERROR:", e);

    return fail(res, e.message, 500);
  }
};

exports.updateStatus = async (req, res) => {
  try {
    if (!req.user && !req.isAdmin) {
      return fail(res, "INVALID_TOKEN", 401);
    }

    if (!isAdmin(req)) {
      return fail(res, "권한 없음", 403);
    }

    await waitForMongoConnection();

    const { id } = req.params;
    const { status } = req.body || {};

    if (!status) {
      return fail(res, "STATUS_REQUIRED");
    }

    const categoryGuard = buildCategoryGuard(req);

    const shop = await Shop.findOne({
      _id: id,
      ...categoryGuard,
    });

    if (!shop) {
      return fail(res, "매장 없음");
    }

    await Shop.findOneAndUpdate(
      {
        _id: id,
        ...categoryGuard,
      },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: false,
      }
    );

    const updatedShop = await Shop.findOne({
      _id: id,
      ...categoryGuard,
    });

    return ok(res, {
      status: updatedShop?.status || status,
      shop: sanitize(updatedShop),
      data: sanitize(updatedShop),
    });
  } catch (e) {
    console.error("SHOP STATUS ERROR:", e);

    return fail(res, e.message, 500);
  }
};

exports.getStats = async (req, res) => {
  try {
    await waitForMongoConnection();

    const { start, end } = getDateRange(req.query);

    const statsQuery = buildShopSearchQuery(req.query);

    const shops = await Shop.find(statsQuery)
      .lean()
      .sort({
        premium: -1,
        isPremium: -1,
        premiumActive: -1,
        createdAt: -1,
      })
      .limit(500);

    const shopIds = shops.map((shop) => String(shop._id));

    const reviewDocs = await getRelatedDocs(Review, shopIds, start, end);
    const reservationDocs = await getRelatedDocs(Reservation, shopIds, start, end);
    const paymentDocs = await getRelatedDocs(Payment, shopIds, start, end);

    const byShop = {};

    shops.forEach((shop) => {
      const id = String(shop._id);
      const premiumState = normalizePremiumFields(shop);

      byShop[id] = {
        shopId: id,
        _id: id,
        id,
        name: shop.name || "",
        premium: premiumState.premium,
        isPremium: premiumState.isPremium,
        premiumActive: premiumState.premiumActive,
        premiumType: premiumState.premiumType,
        phone: shop.phone || "",
        virtualPhone: shop.virtualPhone || shop.fakePhone || shop.callNumber || "",
        businessHours: shop.businessHours || shop.openingHours || shop.hours || "",
        dailyCalls: {
          ...(shop.dailyCalls || {}),
        },
        dailyClicks: {
          ...(shop.dailyClicks || {}),
        },
        dailyConversions: {
          ...(shop.dailyConversions || {}),
        },
        dailyReviews: {
          ...(shop.dailyReviews || {}),
        },
        callCount: Number(shop.callCount || shop.stats?.callCount || 0),
        clickCount: Number(
          shop.clickCount || shop.viewCount || shop.stats?.clickCount || shop.stats?.viewCount || 0
        ),
        conversionCount: Number(
          shop.conversionCount || shop.stats?.conversionCount || shop.stats?.reservationCount || 0
        ),
        reviewCount: Number(shop.reviewCount || shop.rating?.count || shop.stats?.reviewCount || 0),
      };
    });

    reviewDocs.forEach((review) => {
      const shopId = getDocShopId(review);
      const dateKey = normalizeDateKey(review.createdAt);

      if (byShop[shopId] && dateKey) {
        byShop[shopId].dailyReviews[dateKey] =
          Number(byShop[shopId].dailyReviews[dateKey] || 0) + 1;

        byShop[shopId].reviewCount = Number(byShop[shopId].reviewCount || 0) + 1;
      }
    });

    reservationDocs.forEach((reservation) => {
      const shopId = getDocShopId(reservation);
      const dateKey = normalizeDateKey(reservation.createdAt);

      if (byShop[shopId] && dateKey) {
        byShop[shopId].dailyConversions[dateKey] =
          Number(byShop[shopId].dailyConversions[dateKey] || 0) + 1;

        byShop[shopId].conversionCount =
          Number(byShop[shopId].conversionCount || 0) + 1;
      }
    });

    paymentDocs.forEach((payment) => {
      const shopId = getDocShopId(payment);
      const dateKey = normalizeDateKey(payment.createdAt);

      if (byShop[shopId] && dateKey) {
        byShop[shopId].dailyConversions[dateKey] =
          Number(byShop[shopId].dailyConversions[dateKey] || 0) + 1;

        byShop[shopId].conversionCount =
          Number(byShop[shopId].conversionCount || 0) + 1;
      }
    });

    Object.keys(byShop).forEach((shopId) => {
      const item = byShop[shopId];
      const todayKey = normalizeDateKey(new Date());

      item.dailyClicks[todayKey] = Number(item.dailyClicks[todayKey] || item.clickCount || 0);
      item.dailyCalls[todayKey] = Number(item.dailyCalls[todayKey] || item.callCount || 0);
    });

    const total = await Shop.countDocuments(statsQuery);

    const shopStats = Object.values(byShop);

    const dailyCallCount = shopStats.reduce(
      (sum, item) => sum + Number(item.callCount || 0),
      0
    );

    const dailyClickCount = shopStats.reduce(
      (sum, item) => sum + Number(item.clickCount || 0),
      0
    );

    const dailyConversionCount = shopStats.reduce(
      (sum, item) => sum + Number(item.conversionCount || 0),
      0
    );

    const dailyReviewCount = shopStats.reduce(
      (sum, item) => sum + Number(item.reviewCount || 0),
      0
    );

    return ok(res, {
      shops: total,
      users: 0,
      reservations: reservationDocs.length,
      revenue: paymentDocs.reduce(
        (sum, payment) =>
          sum + Number(payment.amount || payment.price || payment.totalPrice || 0),
        0
      ),
      dailyCallCount,
      dailyClickCount,
      dailyConversionCount,
      dailyReviewCount,
      callCount: dailyCallCount,
      clickCount: dailyClickCount,
      conversionCount: dailyConversionCount,
      reviewCount: dailyReviewCount,
      total,
      period: {
        start,
        end,
      },
      shopStats,
      list: shopStats,
      items: shopStats,
      data: shopStats,
    });
  } catch (e) {
    console.error("SHOP STATS ERROR:", e);

    return fail(res, e.message, 500);
  }
};

exports.nearby = async (req, res) => {
  try {
    await waitForMongoConnection();

    const lat = toNumberSafe(req.query.lat);
    const lng = toNumberSafe(req.query.lng);
    const max = toNumberSafe(req.query.max) || 999;

    const query = buildShopSearchQuery(req.query);

    const list = await Shop.find(query)
      .lean()
      .sort({
        premium: -1,
        isPremium: -1,
        premiumActive: -1,
        createdAt: -1,
      })
      .limit(300);

    const items = list
      .map(sanitize)
      .map((shop) => {
        const distanceKm = calcDistanceKm(lat, lng, shop?.lat, shop?.lng);

        return {
          ...shop,
          distanceKm,
        };
      })
      .filter((shop) => {
        if (lat === undefined || lng === undefined) {
          return true;
        }

        return shop.distanceKm <= max;
      });

    const sortedItems = sortPremiumDistance(items);

    return ok(res, {
      list: sortedItems,
      items: sortedItems,
      shops: sortedItems,
      data: sortedItems,
      total: sortedItems.length,
      count: sortedItems.length,
    });
  } catch (e) {
    console.error("SHOP NEARBY ERROR:", e);

    return fail(res, e.message || "SHOP_NEARBY_ERROR", 500);
  }
};

exports.getPremiumNearby = async (req, res) => {
  try {
    await waitForMongoConnection();

    const lat = toNumberSafe(req.query.lat);
    const lng = toNumberSafe(req.query.lng);
    const limit = toNumberSafe(req.query.limit) || 3;

    const query = buildShopSearchQuery(req.query);

    const list = await Shop.find(query)
      .lean()
      .sort({
        premium: -1,
        isPremium: -1,
        premiumActive: -1,
        createdAt: -1,
      })
      .limit(300);

    const items = list
      .map(sanitize)
      .map((shop) => {
        const distanceKm = calcDistanceKm(lat, lng, shop?.lat, shop?.lng);

        return {
          ...shop,
          distanceKm,
          categoryGroup: getShopCategoryGroup(shop),
        };
      });

    const grouped = groupPremiumNearby(items, limit);

    return ok(res, {
      list: grouped.all,
      items: grouped.all,
      shops: grouped.all,
      data: grouped.all,
      massage: grouped.massage,
      karaoke: grouped.karaoke,
      total: grouped.all.length,
      count: grouped.all.length,
    });
  } catch (e) {
    console.error("SHOP PREMIUM NEARBY ERROR:", e);

    return fail(res, e.message || "SHOP_PREMIUM_NEARBY_ERROR", 500);
  }
};

exports.getRecommend = async (req, res) => {
  try {
    await waitForMongoConnection();

    if (recommendService && typeof recommendService.getRecommend === "function") {
      return recommendService.getRecommend(req, res);
    }

    const query = buildShopSearchQuery(req.query);

    const list = await Shop.find(query)
      .lean()
      .sort({
        premium: -1,
        isPremium: -1,
        premiumActive: -1,
        createdAt: -1,
      })
      .limit(20);

    const items = list.map(sanitize);

    return ok(res, {
      list: items,
      items,
      shops: items,
      data: items,
      total: items.length,
      count: items.length,
    });
  } catch (e) {
    console.error("SHOP RECOMMEND ERROR:", e);

    return fail(res, e.message || "SHOP_RECOMMEND_ERROR", 500);
  }
};

exports.createShop = exports.create;
exports.getShops = exports.getList;
exports.getShop = exports.getDetail;
exports.updateShop = exports.update;
exports.deleteShop = exports.remove;
exports.updateShopStatus = exports.updateStatus;
exports.stats = exports.getStats;
exports.getDashboardStats = exports.getStats;
exports.dashboardStats = exports.getStats;
exports.getMonthlyStats = exports.getStats;
exports.monthlyStats = exports.getStats;
exports.getNearby = exports.nearby;
exports.premiumNearby = exports.getPremiumNearby;
exports.getHomePremiumNearby = exports.getPremiumNearby;
exports.getPremiumNearbyShops = exports.getPremiumNearby;
exports.recommend = exports.getRecommend;
exports.searchShop = exports.search;
exports.searchShops = exports.search;