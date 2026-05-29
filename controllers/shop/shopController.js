"use strict";

/* =========================================================
   NORA SHOP CONTROLLER
   SAFE / PRODUCTION / NO CRASH VERSION
========================================================= */

const mongoose = require("mongoose");

function safeRequire(modulePath, options = {}) {
  const { silent = false } = options;

  try {
    return require(modulePath);
  } catch (error) {
    if (!silent) {
      console.error("[SAFE REQUIRE FAIL]", modulePath, error.message);
    }

    return null;
  }
}

const Shop =
  safeRequire("../../models/Shop", { silent: true }) ||
  safeRequire("../../models/shop", { silent: true }) ||
  safeRequire("../../server/models/Shop", { silent: true }) ||
  safeRequire("../../modules/shop/models/Shop", { silent: true });

const analyticsService =
  safeRequire("../../services/analytics/analyticsService", { silent: true }) || {};

const revenueService =
  safeRequire("../../services/analytics/revenueService", { silent: true }) || {};

const rankingService =
  safeRequire("../../services/shop/shop.ranking.service", { silent: true }) ||
  safeRequire("../../services/shop.ranking.service", { silent: true }) ||
  {};

const FALLBACK_SHOPS = [
  {
    _id: "local-nora-gimhae-main",
    id: "local-nora-gimhae-main",
    name: "노라 김해 본점",
    shopName: "노라 김해 본점",
    title: "노라 김해 본점",
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
    description: "노라 마사지 플랫폼 등록 업체",
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
    isReservable: true,
    tags: ["노라", "마사지", "김해"],
    serviceTypes: ["스웨디시", "아로마"],
    images: [],
    photos: [],
    imageUrls: [],
    distanceKm: 0,
  },
];

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
    message,
    ...extra,
  });
}

function safeAsync(fn) {
  return async (req, res, next) => {
    try {
      return await fn(req, res, next);
    } catch (error) {
      console.error("SHOP CONTROLLER ERROR:", error);

      return fail(
        res,
        500,
        error?.message || "SHOP_CONTROLLER_ERROR"
      );
    }
  };
}

function safeString(value = "") {
  return String(value || "").trim();
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeBoolean(value) {
  if (typeof value === "boolean") return value;

  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return ["true", "1", "yes", "y"].includes(
      value.toLowerCase().trim()
    );
  }

  return false;
}

function safeArray(value) {
  if (!Array.isArray(value)) return [];

  return value.filter(Boolean);
}

function normalizeShop(shop = {}) {
  const item = shop && typeof shop.toObject === "function" ? shop.toObject() : shop || {};

  const images = safeArray(item.images);

  const thumbnail =
    item.thumbnail ||
    item.mainImage ||
    item.representativeImage ||
    images[0] ||
    "";

  return {
    ...item,
    id: String(item._id || item.id || ""),
    _id: item._id,
    images,
    imageUrls: safeArray(item.imageUrls).length
      ? safeArray(item.imageUrls)
      : images,
    photos: safeArray(item.photos).length
      ? safeArray(item.photos)
      : images,
    thumbnail,
    mainImage: item.mainImage || thumbnail,
    representativeImage:
      item.representativeImage || thumbnail,
    visible: item.visible !== false,
    approved: item.approved !== false,
    isReservable: item.isReservable !== false,
    reviewCount: safeNumber(item.reviewCount, 0),
    likeCount: safeNumber(item.likeCount, 0),
    viewCount: safeNumber(item.viewCount, 0),
    rating: safeNumber(item.rating, 0),
    ratingAvg: safeNumber(item.ratingAvg, 0),
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
  };
}

function normalizeList(items = []) {
  return safeArray(items)
    .map(normalizeShop)
    .filter(Boolean);
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function isShopModelReady() {
  return !!(
    Shop &&
    typeof Shop.find === "function" &&
    typeof Shop.countDocuments === "function"
  );
}

function isMongoConnected() {
  return !!(
    mongoose &&
    mongoose.connection &&
    mongoose.connection.readyState === 1
  );
}

function withTimeout(promise, timeoutMs = 3000, message = "SHOP_QUERY_TIMEOUT") {
  let timer;

  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

function fallbackShopList(extra = {}) {
  return {
    items: [],
    list: [],
    shops: [],
    data: [],
    total: 0,
    count: 0,
    page: 1,
    limit: 0,
    hasMore: false,
    source: "empty",
    ...extra,
  };
}

function normalizeShopCategory(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

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

function getRequestCategory(req = {}) {
  return (
    normalizeShopCategory(req.query?.category) ||
    normalizeShopCategory(req.query?.shopCategory) ||
    normalizeShopCategory(req.query?.serviceType) ||
    normalizeShopCategory(req.query?.businessType) ||
    normalizeShopCategory(req.query?.adminCategory) ||
    normalizeShopCategory(req.body?.category) ||
    normalizeShopCategory(req.body?.shopCategory) ||
    normalizeShopCategory(req.body?.serviceType) ||
    normalizeShopCategory(req.body?.businessType) ||
    normalizeShopCategory(req.body?.adminCategory) ||
    ""
  );
}

function buildBaseQuery(req = {}) {
  const query = {
    isDeleted: { $ne: true },
    visible: { $ne: false },
    status: {
      $nin: [
        "deleted",
        "inactive",
        "disabled",
        "hidden",
        "closed",
      ],
    },
  };

  const category = getRequestCategory(req);

  if (category) {
    query.$or = [
      { category },
      { shopCategory: category },
      { serviceType: category },
      { businessType: category },
      { adminCategory: category },
      { categoryGroup: category },
      { shopType: category },
      { mainCategory: category },
      { service: category },
    ];
  }

  return query;
}

function buildSort(sort = "") {
  switch (safeString(sort)) {
    case "latest":
    case "recent":
      return { createdAt: -1 };

    case "rating":
      return {
        ratingAvg: -1,
        reviewCount: -1,
      };

    case "popular":
      return {
        likeCount: -1,
        viewCount: -1,
      };

    case "view":
      return {
        viewCount: -1,
      };

    default:
      return {
        createdAt: -1,
      };
  }
}

async function fetchList(req = {}) {
  if (!isShopModelReady()) {
    return fallbackShopList({
      modelReady: false,
    });
  }

  if (!isMongoConnected()) {
    return fallbackShopList({
      dbConnected: false,
      dbState: mongoose.connection ? mongoose.connection.readyState : 0,
    });
  }

  const query = buildBaseQuery(req);

  const page = Math.max(
    parseInt(req.query?.page || 1, 10),
    1
  );

  const limit = Math.min(
    Math.max(parseInt(req.query?.limit || 20, 10), 1),
    100
  );

  const skip = (page - 1) * limit;

  const keyword = safeString(
    req.query?.keyword ||
      req.query?.search ||
      req.query?.q
  );

  if (keyword) {
    const regex = new RegExp(
      keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );

    const keywordQuery = {
      $or: [
        { name: regex },
        { address: regex },
        { roadAddress: regex },
        { region: regex },
        { district: regex },
        { tags: regex },
      ],
    };

    if (Array.isArray(query.$and)) {
      query.$and.push(keywordQuery);
    } else {
      query.$and = [keywordQuery];
    }
  }

  const sort = buildSort(req.query?.sort);

  try {
    const items = await withTimeout(
      Shop.find(query)
        .select({
          image: 0,
          images: 0,
          photos: 0,
          imageUrls: 0,
          representativeImage: 0,
          mainImage: 0,
          thumbnail: 0,
          coverImage: 0,
          description: 0,
          content: 0,
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .maxTimeMS(3000)
        .lean(),
      3000
    );

    const total = items.length;

    const normalized = normalizeList(items);

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
    };
  } catch (error) {
    console.error("SHOP FETCH LIST ERROR:", error.message);

    return fallbackShopList({
      dbError: true,
      reason: error.message,
    });
  }
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

/* =========================================================
   DETAIL
========================================================= */

exports.publicDetail = safeAsync(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return fail(res, 400, "INVALID_SHOP_ID");
  }

  if (!Shop || typeof Shop.findOne !== "function") {
    return fail(res, 503, "SHOP_MODEL_NOT_READY");
  }

  const shop = await Shop.findOne({
    _id: id,
    isDeleted: { $ne: true },
  });

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

/* =========================================================
   RECOMMENDED
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

/* =========================================================
   POPULAR
========================================================= */

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

/* =========================================================
   NEW
========================================================= */

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

/* =========================================================
   PREMIUM
========================================================= */

exports.premium = safeAsync(async (req, res) => {
  if (!Shop || typeof Shop.find !== "function") {
    return ok(res, fallbackShopList({ modelReady: false }));
  }

  const query = buildBaseQuery(req);

  query.premium = true;

  const items = await Shop.find(query)
    .sort({
      priority: -1,
      createdAt: -1,
    })
    .limit(50)
    .lean();

  const normalized = normalizeList(items);

  return ok(res, {
    items: normalized,
    list: normalized,
    shops: normalized,
    data: normalized,
    total: normalized.length,
  });
});

exports.getPremiumShops = exports.premium;

/* =========================================================
   SEARCH
========================================================= */

exports.search = safeAsync(async (req, res) => {
  const result = await fetchList(req);

  return ok(res, result);
});

/* =========================================================
   VIEW COUNT
========================================================= */

exports.increaseView = safeAsync(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return fail(res, 400, "INVALID_SHOP_ID");
  }

  if (!Shop || typeof Shop.findById !== "function") {
    return fail(res, 503, "SHOP_MODEL_NOT_READY");
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
  if (!Shop || typeof Shop.create !== "function") {
    return fail(res, 503, "SHOP_MODEL_NOT_READY");
  }

  const body = req.body || {};

  if (!safeString(body.name)) {
    return fail(res, 400, "SHOP_NAME_REQUIRED");
  }

  const category = getRequestCategory(req) || "massage";

  const payload = {
    name: safeString(body.name),
    address: safeString(body.address),
    roadAddress: safeString(body.roadAddress),
    region: safeString(body.region),
    district: safeString(body.district),
    phone: safeString(body.phone),
    description: safeString(body.description),
    thumbnail: safeString(body.thumbnail),
    images: safeArray(body.images),
    imageUrls: safeArray(body.imageUrls),
    tags: safeArray(body.tags),
    serviceTypes: safeArray(body.serviceTypes),
    category,
    shopCategory: category,
    serviceType: category,
    businessType: category,
    adminCategory: category,
    visible:
      typeof body.visible === "undefined"
        ? true
        : safeBoolean(body.visible),
    approved:
      typeof body.approved === "undefined"
        ? true
        : safeBoolean(body.approved),
    premium: safeBoolean(body.premium),
    lat: safeNumber(body.lat),
    lng: safeNumber(body.lng),
  };

  const created = await Shop.create(payload);

  const normalized = normalizeShop(created);

  return ok(res, {
    item: normalized,
    shop: normalized,
    data: normalized,
  });
});

/* =========================================================
   UPDATE
========================================================= */

exports.update = safeAsync(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return fail(res, 400, "INVALID_SHOP_ID");
  }

  if (!Shop || typeof Shop.findByIdAndUpdate !== "function") {
    return fail(res, 503, "SHOP_MODEL_NOT_READY");
  }

  const body = req.body || {};

  const category = getRequestCategory(req);

  const payload = {
    name: safeString(body.name),
    address: safeString(body.address),
    roadAddress: safeString(body.roadAddress),
    region: safeString(body.region),
    district: safeString(body.district),
    phone: safeString(body.phone),
    description: safeString(body.description),
    thumbnail: safeString(body.thumbnail),
    images: safeArray(body.images),
    imageUrls: safeArray(body.imageUrls),
    tags: safeArray(body.tags),
    serviceTypes: safeArray(body.serviceTypes),
    ...(category
      ? {
          category,
          shopCategory: category,
          serviceType: category,
          businessType: category,
          adminCategory: category,
        }
      : {}),
    visible:
      typeof body.visible === "undefined"
        ? true
        : safeBoolean(body.visible),
    approved:
      typeof body.approved === "undefined"
        ? true
        : safeBoolean(body.approved),
    premium: safeBoolean(body.premium),
    lat: safeNumber(body.lat),
    lng: safeNumber(body.lng),
  };

  const updated = await Shop.findByIdAndUpdate(
    id,
    {
      $set: payload,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updated) {
    return fail(res, 404, "SHOP_NOT_FOUND");
  }

  const normalized = normalizeShop(updated);

  return ok(res, {
    item: normalized,
    shop: normalized,
    data: normalized,
  });
});

/* =========================================================
   DELETE
========================================================= */

exports.adminDelete = safeAsync(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return fail(res, 400, "INVALID_SHOP_ID");
  }

  if (!Shop || typeof Shop.findById !== "function") {
    return fail(res, 503, "SHOP_MODEL_NOT_READY");
  }

  const shop = await Shop.findById(id);

  if (!shop) {
    return fail(res, 404, "SHOP_NOT_FOUND");
  }

  shop.isDeleted = true;
  shop.visible = false;
  shop.status = "deleted";

  await shop.save();

  return ok(res, {
    deleted: true,
    id,
  });
});

exports.remove = exports.adminDelete;
exports.delete = exports.adminDelete;

/* =========================================================
   HOT
========================================================= */

exports.hot = safeAsync(async (req, res) => {
  let result = [];

  if (
    rankingService &&
    typeof rankingService.getHot === "function"
  ) {
    result = await rankingService.getHot();
  }

  const normalized = normalizeList(result);

  return ok(res, {
    items: normalized,
    list: normalized,
    data: normalized,
    total: normalized.length,
  });
});

/* =========================================================
   SUGGEST
========================================================= */

exports.suggest = safeAsync(async (req, res) => {
  const keyword = safeString(
    req.query?.keyword || req.query?.q
  );

  if (!keyword) {
    return ok(res, {
      items: [],
      list: [],
      data: [],
      total: 0,
    });
  }

  if (!Shop || typeof Shop.find !== "function") {
    return ok(res, {
      items: [],
      list: [],
      data: [],
      total: 0,
      modelReady: false,
    });
  }

  const regex = new RegExp(
    "^" + keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i"
  );

  const items = await Shop.find({
    ...buildBaseQuery(req),
    name: regex,
  })
    .limit(10)
    .lean();

  const normalized = normalizeList(items);

  return ok(res, {
    items: normalized,
    list: normalized,
    data: normalized,
    total: normalized.length,
  });
});

/* =========================================================
   ANALYTICS SAFE
========================================================= */

exports.analytics = safeAsync(async (req, res) => {
  let analytics = {};

  if (
    analyticsService &&
    typeof analyticsService.getAnalytics === "function"
  ) {
    analytics =
      (await analyticsService.getAnalytics()) || {};
  }

  return ok(res, {
    analytics,
  });
});

/* =========================================================
   REVENUE SAFE
========================================================= */

exports.revenue = safeAsync(async (req, res) => {
  let revenue = {};

  if (
    revenueService &&
    typeof revenueService.getRevenue === "function"
  ) {
    revenue =
      (await revenueService.getRevenue()) || {};
  }

  return ok(res, {
    revenue,
  });
});

/* =========================================================
   ADMIN ALIASES
========================================================= */
exports.adminList = exports.publicList;
exports.adminSearch = exports.search;
exports.adminDetail = exports.publicDetail;
exports.publicSearch = exports.search;
exports.getShops = exports.publicList;

console.log(
  "🔥 SHOP CONTROLLER READY"
);
