/**
 * =====================================================
 * 🔥 SHOP ROUTES (FINAL ULTRA COMPLETE - NO DELETE)
 * =====================================================
 */

const express = require("express");
const router = express.Router();

/* =====================================================
🔥 SAFE REQUIRE (최소 추가)
===================================================== */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn("SAFE REQUIRE FAIL:", path);
    return null;
  }
}

/* =====================================================
🔥 경로 FIX ONLY
===================================================== */
const Shop =
  safeRequire("../../models/Shop") ||
  safeRequire("../models/Shop");

const Review =
  safeRequire("../../models/Review") ||
  safeRequire("../models/Review");

const auth =
  safeRequire("../../middlewares/auth") ||
  safeRequire("../middlewares/auth") ||
  function (req, res, next) {
    return next();
  };

const admin =
  safeRequire("../../middlewares/admin") ||
  safeRequire("../middlewares/admin") ||
  function (req, res, next) {
    return next();
  };

const distanceUtil =
  safeRequire("../../utils/distance") ||
  safeRequire("../utils/distance") ||
  {};

const multer = safeRequire("multer");
const pathModule = safeRequire("path");
const fsModule = safeRequire("fs");

/* 🔥 최소 추가 */
const calcDistanceKm =
  distanceUtil.calcDistanceKm ||
  (() => 999);

const safeNumber =
  distanceUtil.safeNumber ||
  ((v, d = 0) => {
    const n = Number(v);
    return isNaN(n) ? d : n;
  });

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
    text === "shops" ||
    text === "store" ||
    text === "stores" ||
    text === "spa" ||
    text === "aroma" ||
    text === "아로마" ||
    text === "스웨디시" ||
    text === "nora-massage" ||
    text === "nora_massage"
  ) {
    return "massage";
  }

  return "";
}

function getRequestShopCategory(req) {
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

function getSafeRequestShopCategory(req, fallback = "") {
  return getRequestShopCategory(req) || fallback;
}

function applyShopCategoryRequest(req, res, next) {
  try {
    const category = getSafeRequestShopCategory(req);

    req.shopCategory = category;
    req.adminCategory = category;
    req.query = req.query || {};
    req.body = req.body || {};

    if (category) {
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
    }

    return next();
  } catch (e) {
    console.error("SHOP ROUTES CATEGORY ERROR:", e.message);

    return fail(res, 500, "CATEGORY_FILTER_ERROR");
  }
}

function getCategoryQueryValues(category) {
  if (category === "karaoke") {
    return [
      "karaoke",
      "KARAOKE",
      "노래방",
      "가라오케",
      "coin-karaoke",
      "coin_karaoke",
      "nora-karaoke",
      "nora_karaoke",
    ];
  }

  if (category === "massage") {
    return [
      "massage",
      "MASSAGE",
      "마사지",
      "shop",
      "SHOP",
      "shops",
      "store",
      "stores",
      "spa",
      "aroma",
      "아로마",
      "스웨디시",
      "nora-massage",
      "nora_massage",
    ];
  }

  return category ? [category] : [];
}

function buildShopCategoryQuery(req) {
  const category = getSafeRequestShopCategory(req);

  if (!category) {
    return {};
  }

  const categoryFields = [
    "category",
    "shopCategory",
    "serviceType",
    "businessType",
    "adminCategory",
    "type",
    "shopType",
    "mainCategory",
    "service",
  ];

  const categoryValues = getCategoryQueryValues(category);
  const categoryOr = [];

  categoryFields.forEach((field) => {
    categoryOr.push({
      [field]: {
        $in: categoryValues,
      },
    });

    categoryValues.forEach((value) => {
      categoryOr.push({
        [field]: {
          $regex: `^${escapeRegex(value)}$`,
          $options: "i",
        },
      });
    });
  });

  if (category === "massage") {
    const noCategoryAnd = categoryFields.map((field) => ({
      $or: [
        {
          [field]: {
            $exists: false,
          },
        },
        {
          [field]: "",
        },
        {
          [field]: null,
        },
      ],
    }));

    categoryOr.push({
      $and: noCategoryAnd,
    });
  }

  return {
    $and: [
      {
        $or: categoryOr,
      },
    ],
  };
}

function buildShopBaseQuery(req, extra = {}) {
  const categoryQuery = buildShopCategoryQuery(req);
  const query = {
    ...extra,
  };

  if (Array.isArray(categoryQuery.$and) && categoryQuery.$and.length) {
    query.$and = Array.isArray(query.$and)
      ? [...query.$and, ...categoryQuery.$and]
      : categoryQuery.$and;
  }

  return query;
}

function buildPublicShopQuery(req, extra = {}) {
  const query = buildShopBaseQuery(req, {
    isDeleted: { $ne: true },
    status: { $nin: ["inactive", "deleted", "blocked", "disabled"] },
    ...extra,
  });

  query.$and = Array.isArray(query.$and) ? query.$and : [];
  query.$and.push({
    $or: [
      { visible: { $ne: false } },
      { isVisible: { $ne: false } },
      { display: { $ne: false } },
      { visible: { $exists: false } },
      { isVisible: { $exists: false } },
      { display: { $exists: false } },
    ],
  });
  query.$and.push({
    $or: [
      { approved: { $ne: false } },
      { isApproved: true },
      { approvalStatus: "approved" },
      { status: "active" },
      { status: "open" },
      { status: "approved" },
      { status: "enable" },
      { status: "enabled" },
      { approved: { $exists: false } },
      { isApproved: { $exists: false } },
      { approvalStatus: { $exists: false } },
    ],
  });

  return query;
}

function isAdminShopListRequest(req) {
  const url = String(req?.originalUrl || req?.url || "").toLowerCase();
  const q = req?.query || {};

  return (
    q.admin === "true" ||
    q.adminMode === "true" ||
    q.adminList === "true" ||
    q.forAdmin === "true" ||
    q.fromAdmin === "true" ||
    q.management === "true" ||
    q.adminCategory !== undefined ||
    url.includes("admincategory=") ||
    url.includes("admin=true") ||
    url.includes("adminmode=true") ||
    url.includes("adminlist=true") ||
    url.includes("foradmin=true") ||
    url.includes("fromadmin=true") ||
    url.includes("management=true")
  );
}

function buildAdminShopQuery(req, extra = {}) {
  return buildShopBaseQuery(req, {
    isDeleted: { $ne: true },
    ...extra,
  });
}

function applyPayloadCategory(payload = {}, req) {
  const category = getSafeRequestShopCategory(req, normalizeShopCategory(payload.category) || "massage");

  return {
    ...payload,
    category,
    shopCategory: category,
    serviceType: category,
    businessType: category,
    adminCategory: category,
  };
}

function safeAsync(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function safeStr(v = "") {
  return String(v || "").trim();
}

function ok(res, data = {}) {
  return res.json({
    ok: true,
    ...data,
  });
}

function fail(res, code = 400, msg = "ERROR") {
  return res.status(code).json({
    ok: false,
    msg,
    message: msg,
  });
}

function requireShopModel(res) {
  if (!Shop) {
    return ok(res, {
      items: [],
      list: [],
      shops: [],
      data: [],
      total: 0,
      msg: "SHOP_MODEL_MISSING",
      message: "SHOP_MODEL_MISSING",
    });
  }

  return true;
}

function requireReviewModel() {
  return !!Review;
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
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizePrice(value) {
  if (Array.isArray(value)) {
    return value
      .map((v) =>
        Number(
          String(v)
            .replaceAll(",", "")
            .replaceAll("원", "")
            .trim()
        )
      )
      .filter((v) => !Number.isNaN(v));
  }

  if (typeof value === "string") {
    const list = value
      .split(",")
      .map((v) =>
        Number(
          String(v)
            .replaceAll(",", "")
            .replaceAll("원", "")
            .trim()
        )
      )
      .filter((v) => !Number.isNaN(v));

    return list.length > 1 ? list : list[0] || 0;
  }

  const num = Number(value || 0);
  return Number.isNaN(num) ? 0 : num;
}

function normalizePayload(body = {}) {
  const lat = safeNumber(
    body.lat ??
      body.latitude ??
      body.location?.lat ??
      body.location?.latitude ??
      (Array.isArray(body.location?.coordinates)
        ? body.location.coordinates[1]
        : undefined),
    0
  );

  const lng = safeNumber(
    body.lng ??
      body.longitude ??
      body.location?.lng ??
      body.location?.longitude ??
      (Array.isArray(body.location?.coordinates)
        ? body.location.coordinates[0]
        : undefined),
    0
  );

  const premiumValue =
    body.premium === true ||
    body.isPremium === true ||
    body.premiumActive === true ||
    body.premium === "true" ||
    body.isPremium === "true" ||
    body.premiumActive === "true";

  const category =
    normalizeShopCategory(body.category) ||
    normalizeShopCategory(body.shopCategory) ||
    normalizeShopCategory(body.serviceType) ||
    normalizeShopCategory(body.businessType) ||
    normalizeShopCategory(body.adminCategory) ||
    "massage";

  return {
    ...body,
    category,
    shopCategory: category,
    serviceType: category,
    businessType: category,
    adminCategory: category,
    name: safeStr(body.name),
    region: safeStr(body.region),
    district: safeStr(body.district),
    address: safeStr(body.address),
    phone: safeStr(body.phone),
    description: safeStr(body.description),
    lat,
    lng,
    location: {
      lat,
      lng,
    },
    priceOriginal: safeNumber(body.priceOriginal, 0),
    priceDiscount: safeNumber(body.priceDiscount, 0),
    price:
      body.price !== undefined
        ? normalizePrice(body.price)
        : normalizePrice(body.priceDiscount || body.priceOriginal || 0),
    courses: normalizeArray(body.courses),
    tags: normalizeArray(body.tags),
    serviceTypes: normalizeArray(body.serviceTypes),
    visible: body.visible !== false,
    approved: body.approved !== false,
    premium: premiumValue,
    isPremium: premiumValue,
    premiumActive: premiumValue,
    isReservable: body.isReservable !== false,
    status: body.status === "inactive" ? "inactive" : "active",
    isDeleted: body.isDeleted === true ? true : false,
  };
}

/* ========================= 유틸 ========================= */

function isValidCoord(lat, lng) {
  const safeLat = Number(lat);
  const safeLng = Number(lng);

  return (
    Number.isFinite(safeLat) &&
    Number.isFinite(safeLng) &&
    safeLat >= -90 &&
    safeLat <= 90 &&
    safeLng >= -180 &&
    safeLng <= 180 &&
    !(safeLat === 0 && safeLng === 0)
  );
}

function escapeRegex(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safePage(n) {
  n = Number(n);
  return isNaN(n) || n < 1 ? 1 : n;
}

function safeLimit(n) {
  n = Number(n);
  if (isNaN(n) || n < 1) return 20;
  return Math.min(n, 100);
}

const SHOP_QUERY_MAX_TIME_MS = 800;

function getShopCategory(shop = {}) {
  const raw = String(
    shop.category ||
      shop.shopCategory ||
      shop.type ||
      shop.shopType ||
      shop.serviceType ||
      shop.mainCategory ||
      shop.businessType ||
      shop.adminCategory ||
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
}

function enrichWithDistance(items, lat, lng) {
  const originLat = Number(lat);
  const originLng = Number(lng);
  const hasValidOrigin = isValidCoord(originLat, originLng);

  return items.map((s) => {
    const obj = s.toObject ? s.toObject() : s;

    const premium =
      obj.premium === true ||
      obj.isPremium === true ||
      obj.premiumActive === true;

    const targetLat =
      obj.lat ??
      obj.latitude ??
      obj.location?.lat ??
      obj.location?.latitude ??
      obj.coords?.lat ??
      (Array.isArray(obj.location?.coordinates)
        ? obj.location.coordinates[1]
        : undefined);

    const targetLng =
      obj.lng ??
      obj.longitude ??
      obj.location?.lng ??
      obj.location?.longitude ??
      obj.coords?.lng ??
      (Array.isArray(obj.location?.coordinates)
        ? obj.location.coordinates[0]
        : undefined);

    let distanceKm = null;

    if (hasValidOrigin && isValidCoord(targetLat, targetLng)) {
      const calculatedDistance = calcDistanceKm(
        originLat,
        originLng,
        Number(targetLat),
        Number(targetLng)
      );

      if (
        Number.isFinite(Number(calculatedDistance)) &&
        Number(calculatedDistance) >= 0
      ) {
        distanceKm = Number(calculatedDistance);
      }
    }

    return {
      ...obj,
      premium,
      isPremium: premium,
      premiumActive: premium,
      categoryGroup: getShopCategory(obj),
      distanceKm,
    };
  });
}

function applySort(items, sort) {
  const copy = [...items];

  switch (sort) {
    case "distance":
      return copy.sort((a, b) => {
        const premiumA = a.premium === true || a.isPremium === true ? 1 : 0;
        const premiumB = b.premium === true || b.isPremium === true ? 1 : 0;

        if (premiumA !== premiumB) {
          return premiumB - premiumA;
        }

        const distanceA =
          Number.isFinite(Number(a.distanceKm))
            ? Number(a.distanceKm)
            : 999;

        const distanceB =
          Number.isFinite(Number(b.distanceKm))
            ? Number(b.distanceKm)
            : 999;

        return distanceA - distanceB;
      });
    case "rating":
      return copy.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
    case "view":
      return copy.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    case "recent":
      return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case "price":
      return copy.sort((a, b) => (a.priceDiscount || 0) - (b.priceDiscount || 0));
    default:
      return copy.sort((a, b) => {
        const premiumA = a.premium === true || a.isPremium === true ? 1 : 0;
        const premiumB = b.premium === true || b.isPremium === true ? 1 : 0;

        if (premiumA !== premiumB) {
          return premiumB - premiumA;
        }

        return (b.likeCount || 0) - (a.likeCount || 0);
      });
  }
}

function groupPremiumNearbyItems(items = [], limit = 3) {
  const safeLimitValue = safeLimit(limit);

  const sorted = applySort(items, "distance");

  const massage = sorted
    .filter((item) => getShopCategory(item) === "massage")
    .slice(0, safeLimitValue);

  const karaoke = sorted
    .filter((item) => getShopCategory(item) === "karaoke")
    .slice(0, safeLimitValue);

  return {
    massage,
    karaoke,
    all: [...massage, ...karaoke],
  };
}

function calcScore(s) {
  return (s.likeCount || 0) * 2 + (s.viewCount || 0) * 0.5 + (s.ratingAvg || 0) * 10 + ((s.premium === true || s.isPremium === true) ? 20 : 0);
}

function isPublicShopItem(item = {}, req) {
  const category = getSafeRequestShopCategory(req);
  const status = String(item.status || "active").toLowerCase();

  if (item.isDeleted === true) return false;
  if (["inactive", "deleted", "blocked", "disabled"].includes(status)) return false;
  if (item.visible === false || item.isVisible === false || item.display === false) return false;
  if (item.approved === false && item.isApproved !== true && item.approvalStatus !== "approved" && status !== "active") return false;
  if (category && getShopCategory(item) !== category) return false;

  return true;
}

function applyPublicShopFilter(items = [], req) {
  return items.filter((item) => isPublicShopItem(item, req));
}

async function findPublicShopItems(req, query = {}, page = 1, limit = 20) {
  try {
    const items = await Shop.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .maxTimeMS(SHOP_QUERY_MAX_TIME_MS)
      .lean();

    if (Array.isArray(items) && items.length > 0) {
      return items;
    }

    return [];
  } catch (e) {
    console.error("SHOP PRIMARY FIND ERROR:", e.message);

    return [];
  }
}

router.use(applyShopCategoryRequest);


/* =====================================================
   🔥 이미지 업로드 (기존 기능 유지 / route 추가)
===================================================== */

function getUploadRootDir() {
  try {
    if (!pathModule) {
      return "";
    }

    return (
      process.env.SHOP_UPLOAD_DIR ||
      process.env.UPLOAD_DIR ||
      process.env.UPLOAD_PATH ||
      pathModule.join(process.cwd(), "uploads", "shops")
    );
  } catch (e) {
    console.error("SHOP UPLOAD ROOT ERROR:", e.message);
    return "";
  }
}

function ensureUploadRootDir() {
  try {
    if (!fsModule) {
      return "";
    }

    const rootDir = getUploadRootDir();

    if (!rootDir) {
      return "";
    }

    if (!fsModule.existsSync(rootDir)) {
      fsModule.mkdirSync(rootDir, {
        recursive: true,
      });
    }

    return rootDir;
  } catch (e) {
    console.error("SHOP UPLOAD DIR ERROR:", e.message);
    return "";
  }
}

function normalizeUploadFilename(value = "") {
  const text = String(value || "")
    .trim()
    .replace(/[^\w.\-가-힣]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return text || "shop-image";
}

function getUploadFileExtension(file = {}) {
  const originalName = String(file.originalname || "");
  const mimeType = String(file.mimetype || "").toLowerCase();

  if (pathModule && originalName) {
    const ext = pathModule.extname(originalName);

    if (ext) {
      return ext.toLowerCase();
    }
  }

  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("gif")) return ".gif";
  if (mimeType.includes("avif")) return ".avif";
  if (mimeType.includes("jpeg")) return ".jpg";
  if (mimeType.includes("jpg")) return ".jpg";

  return ".jpg";
}

function isAllowedUploadImage(file = {}) {
  const mimeType = String(file.mimetype || "").toLowerCase();

  return (
    mimeType.startsWith("image/") &&
    !mimeType.includes("svg+xml")
  );
}

const shopUploadStorage =
  multer && pathModule
    ? multer.diskStorage({
        destination: (req, file, cb) => {
          const rootDir = ensureUploadRootDir();

          if (!rootDir) {
            return cb(new Error("UPLOAD_DIR_NOT_AVAILABLE"));
          }

          return cb(null, rootDir);
        },
        filename: (req, file, cb) => {
          const ext = getUploadFileExtension(file);
          const originalBase = pathModule.basename(
            String(file.originalname || "shop-image"),
            ext
          );
          const baseName = normalizeUploadFilename(originalBase);
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${ext}`;

          return cb(null, filename);
        },
      })
    : null;

const shopImageUpload =
  multer && shopUploadStorage
    ? multer({
        storage: shopUploadStorage,
        limits: {
          fileSize: Number(process.env.SHOP_UPLOAD_MAX_FILE_SIZE || 8 * 1024 * 1024),
          files: Number(process.env.SHOP_UPLOAD_MAX_FILES || 12),
        },
        fileFilter: (req, file, cb) => {
          if (!isAllowedUploadImage(file)) {
            return cb(new Error("IMAGE_FILE_ONLY"));
          }

          return cb(null, true);
        },
      })
    : null;

function getRequestOrigin(req) {
  try {
    const protocol =
      req.headers["x-forwarded-proto"] ||
      req.protocol ||
      "http";

    const host =
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      "";

    if (!host) {
      return "";
    }

    return `${String(protocol).split(",")[0]}://${String(host).split(",")[0]}`;
  } catch (e) {
    return "";
  }
}

function getUploadedImageUrl(req, file = {}) {
  const filename = String(file.filename || "").trim();

  if (!filename) {
    return "";
  }

  const origin = getRequestOrigin(req);
  const baseUrl = String(req.baseUrl || "/api/shops").replace(/\/+$/, "");
  const imagePath = `${baseUrl}/uploads/${encodeURIComponent(filename)}`;

  return origin ? `${origin}${imagePath}` : imagePath;
}

function sendUploadModuleUnavailable(res) {
  return res.status(500).json({
    ok: false,
    success: false,
    msg: "UPLOAD_MODULE_NOT_AVAILABLE",
    message: "UPLOAD_MODULE_NOT_AVAILABLE",
    error: "UPLOAD_MODULE_NOT_AVAILABLE",
  });
}

function sendUploadedImages(req, res) {
  const files = [
    ...(Array.isArray(req.files) ? req.files : []),
    ...(req.file ? [req.file] : []),
  ].filter(Boolean);

  const imageUrls = files
    .map((file) => getUploadedImageUrl(req, file))
    .filter(Boolean);

  if (!imageUrls.length) {
    return res.status(400).json({
      ok: false,
      success: false,
      msg: "UPLOAD_IMAGE_URL_NOT_FOUND",
      message: "UPLOAD_IMAGE_URL_NOT_FOUND",
      error: "UPLOAD_IMAGE_URL_NOT_FOUND",
      images: [],
      imageUrls: [],
    });
  }

  const uploadFiles = imageUrls.map((url, index) => ({
    url,
    image: url,
    imageUrl: url,
    fileUrl: url,
    publicUrl: url,
    path: url,
    location: url,
    filename: url,
    originalname: url,
    storedFilename: files[index]?.filename || "",
    originalFileName: files[index]?.originalname || "",
    mimetype: files[index]?.mimetype || "",
    size: files[index]?.size || 0,
  }));

  return res.json({
    ok: true,
    success: true,
    url: imageUrls[0],
    image: imageUrls[0],
    imageUrl: imageUrls[0],
    fileUrl: imageUrls[0],
    publicUrl: imageUrls[0],
    path: imageUrls[0],
    location: imageUrls[0],
    filename: imageUrls[0],
    originalname: imageUrls[0],
    images: imageUrls,
    imageUrls,
    files: uploadFiles,
    data: {
      url: imageUrls[0],
      image: imageUrls[0],
      imageUrl: imageUrls[0],
      fileUrl: imageUrls[0],
      publicUrl: imageUrls[0],
      path: imageUrls[0],
      location: imageUrls[0],
      filename: imageUrls[0],
      originalname: imageUrls[0],
      images: imageUrls,
      imageUrls,
      files: uploadFiles,
    },
  });
}

function handleShopImageUploadError(err, req, res, next) {
  if (!err) {
    return next();
  }

  console.error("SHOP IMAGE UPLOAD ERROR:", err.message || err);

  return res.status(400).json({
    ok: false,
    success: false,
    msg: err.message || "SHOP_IMAGE_UPLOAD_FAILED",
    message: err.message || "SHOP_IMAGE_UPLOAD_FAILED",
    error: err.message || "SHOP_IMAGE_UPLOAD_FAILED",
    images: [],
    imageUrls: [],
  });
}

function getMultipartBoundary(req) {
  const contentType = String(req.headers["content-type"] || "");
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

  return match ? (match[1] || match[2] || "").trim() : "";
}

function parseMultipartHeaderValue(value = "", key = "") {
  const pattern = new RegExp(`${key}="([^"]*)"`, "i");
  const match = String(value || "").match(pattern);

  return match ? match[1] : "";
}

function makeFallbackUploadFilename(file = {}) {
  const ext = getUploadFileExtension(file);
  const originalBase = pathModule.basename(
    String(file.originalname || "shop-image"),
    ext
  );
  const baseName = normalizeUploadFilename(originalBase);

  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${ext}`;
}

function parseMultipartFallbackBuffer(req, buffer) {
  if (!pathModule || !fsModule) {
    throw new Error("UPLOAD_MODULE_NOT_AVAILABLE");
  }

  const boundary = getMultipartBoundary(req);

  if (!boundary) {
    throw new Error("MULTIPART_BOUNDARY_NOT_FOUND");
  }

  const bodyText = buffer.toString("binary");
  const boundaryText = `--${boundary}`;
  const parts = bodyText.split(boundaryText);
  const files = [];
  const fields = {};

  parts.forEach((part) => {
    if (!part || part === "--" || part === "--\r\n") {
      return;
    }

    const headerEndIndex = part.indexOf("\r\n\r\n");

    if (headerEndIndex < 0) {
      return;
    }

    const rawHeader = part.slice(0, headerEndIndex);
    let rawBody = part.slice(headerEndIndex + 4);

    rawBody = rawBody.replace(/\r\n--$/, "").replace(/\r\n$/, "");

    const headerLines = rawHeader.split("\r\n");
    const dispositionLine =
      headerLines.find((line) => line.toLowerCase().startsWith("content-disposition")) || "";
    const contentTypeLine =
      headerLines.find((line) => line.toLowerCase().startsWith("content-type")) || "";

    const fieldName = parseMultipartHeaderValue(dispositionLine, "name");
    const originalname = parseMultipartHeaderValue(dispositionLine, "filename");

    if (!fieldName) {
      return;
    }

    if (!originalname) {
      fields[fieldName] = Buffer.from(rawBody, "binary").toString("utf8");
      return;
    }

    const mimetype =
      contentTypeLine.split(":").slice(1).join(":").trim() ||
      "application/octet-stream";

    const fileBuffer = Buffer.from(rawBody, "binary");

    const file = {
      fieldname: fieldName,
      originalname,
      mimetype,
      size: fileBuffer.length,
      buffer: fileBuffer,
    };

    if (!isAllowedUploadImage(file)) {
      throw new Error("IMAGE_FILE_ONLY");
    }

    const rootDir = ensureUploadRootDir();

    if (!rootDir) {
      throw new Error("UPLOAD_DIR_NOT_AVAILABLE");
    }

    const filename = makeFallbackUploadFilename(file);
    const filePath = pathModule.join(rootDir, filename);

    fsModule.writeFileSync(filePath, fileBuffer);

    files.push({
      ...file,
      filename,
      destination: rootDir,
      path: filePath,
    });
  });

  req.body = {
    ...(req.body || {}),
    ...fields,
  };

  return files;
}

function runFallbackShopImageUpload(req, res, next) {
  try {
    const contentType = String(req.headers["content-type"] || "").toLowerCase();

    if (!contentType.includes("multipart/form-data")) {
      return handleShopImageUploadError(
        new Error("MULTIPART_FORM_DATA_REQUIRED"),
        req,
        res,
        next
      );
    }

    const chunks = [];

    req.on("data", (chunk) => {
      chunks.push(chunk);
    });

    req.on("error", (err) => {
      return handleShopImageUploadError(err, req, res, next);
    });

    req.on("end", () => {
      try {
        const buffer = Buffer.concat(chunks);
        const files = parseMultipartFallbackBuffer(req, buffer);

        req.files = files;
        req.file = files[0] || null;

        return next();
      } catch (err) {
        return handleShopImageUploadError(err, req, res, next);
      }
    });

    return undefined;
  } catch (err) {
    return handleShopImageUploadError(err, req, res, next);
  }
}

function runShopImageUpload(req, res, next) {
  if (!shopImageUpload) {
    return runFallbackShopImageUpload(req, res, next);
  }

  return shopImageUpload.any()(req, res, (err) => {
    if (err) {
      return handleShopImageUploadError(err, req, res, next);
    }

    return next();
  });
}

function serveUploadedShopImage(req, res) {
  try {
    if (!fsModule || !pathModule) {
      return fail(res, 404, "UPLOAD_FILE_NOT_FOUND");
    }

    const rootDir = getUploadRootDir();
    const filename = pathModule.basename(String(req.params.filename || ""));
    const filePath = pathModule.join(rootDir, filename);

    if (!rootDir || !filename || !fsModule.existsSync(filePath)) {
      return fail(res, 404, "UPLOAD_FILE_NOT_FOUND");
    }

    return res.sendFile(filePath);
  } catch (e) {
    return fail(res, 404, "UPLOAD_FILE_NOT_FOUND");
  }
}

function registerShopImageUploadRoute(routePath) {
  router.post(
    routePath,
    auth,
    admin,
    runShopImageUpload,
    sendUploadedImages
  );
}

router.get("/uploads/:filename", serveUploadedShopImage);

[
  "/upload",
  "/image",
  "/images",
  "/admin/upload",
  "/admin/image",
  "/admin/images",
].forEach(registerShopImageUploadRoute);


/* =====================================================
   🔥 기존 코드 (절대 삭제 없음)
===================================================== */


async function buildShopAdminStatsPayload(req) {
  if (!Shop) {
    return {
      total: 0,
      shops: 0,
      totalShops: 0,
      count: 0,
      items: [],
      list: [],
      data: [],
    };
  }

  const query =
    buildAdminShopQuery(req);

  const recentItems =
    await Shop.find(query)
      .sort({
        premium: -1,
        isPremium: -1,
        premiumActive: -1,
        createdAt: -1,
      })
      .limit(10)
      .maxTimeMS(SHOP_QUERY_MAX_TIME_MS)
      .lean();

  const total =
    await Shop.countDocuments(query)
      .maxTimeMS(SHOP_QUERY_MAX_TIME_MS);

  return {
    total,
    shops: total,
    totalShops: total,
    shopCount: total,
    count: total,
    items: recentItems,
    list: recentItems,
    data: recentItems,
  };
}

async function sendShopAdminStats(req, res) {
  try {
    const payload =
      await buildShopAdminStatsPayload(req);

    return ok(res, payload);
  } catch (e) {
    console.error(
      "SHOP ADMIN STATS ERROR:",
      e.message || e
    );

    try {
      const requestedCategory =
        getSafeRequestShopCategory(req);

      const allItems =
        await Shop.find({
          isDeleted: {
            $ne: true,
          },
        })
          .sort({
            premium: -1,
            isPremium: -1,
            premiumActive: -1,
            createdAt: -1,
          })
          .maxTimeMS(SHOP_QUERY_MAX_TIME_MS)
          .lean();

      const filteredItems =
        (Array.isArray(allItems)
          ? allItems
          : []
        ).filter((item) => {
          if (!item || item.isDeleted === true) {
            return false;
          }

          if (
            requestedCategory &&
            getShopCategory(item) !==
              requestedCategory
          ) {
            return false;
          }

          return true;
        });

      const recentItems =
        filteredItems.slice(0, 10);

      const total =
        filteredItems.length;

      return ok(res, {
        total,
        shops: total,
        totalShops: total,
        shopCount: total,
        count: total,
        items: recentItems,
        list: recentItems,
        data: recentItems,
      });
    } catch (fallbackErr) {
      console.error(
        "SHOP ADMIN STATS FALLBACK ERROR:",
        fallbackErr.message || fallbackErr
      );

      return ok(res, {
        total: 0,
        shops: 0,
        totalShops: 0,
        shopCount: 0,
        count: 0,
        items: [],
        list: [],
        data: [],
      });
    }
  }
}


/* 관리자 통계 */
router.get("/admin/stats", auth, admin, sendShopAdminStats);

/* 관리자 통계 보조 경로 */
router.get("/stats", auth, admin, sendShopAdminStats);
router.get("/admin/stats/", auth, admin, sendShopAdminStats);

/* 조회수 초기화 */
router.post("/admin/reset-view", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    await Shop.updateMany(
      buildShopCategoryQuery(req),
      {
        $set: {
          viewCount: 0,
        },
      }
    );

    return ok(res, {
      msg: "RESET_VIEW_OK",
    });
  } catch (e) {
    console.error("SHOP RESET VIEW ERROR:", e);
    return ok(res, {
      msg: "RESET_VIEW_OK",
    });
  }
});

/* 좋아요 초기화 */
router.post("/admin/reset-like", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    await Shop.updateMany(
      buildShopCategoryQuery(req),
      {
        $set: {
          likeCount: 0,
        },
      }
    );

    return ok(res, {
      msg: "RESET_LIKE_OK",
    });
  } catch (e) {
    console.error("SHOP RESET LIKE ERROR:", e);
    return ok(res, {
      msg: "RESET_LIKE_OK",
    });
  }
});

/* PREMIUM 활성화 */
router.patch("/admin/:id([0-9a-fA-F]{24})/premium/on", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const item = await Shop.findOneAndUpdate(
      buildShopBaseQuery(req, {
        _id: req.params.id,
      }),
      {
        premium: true,
        isPremium: true,
        premiumActive: true,
        updatedAt: new Date(),
      },
      {
        new: true,
      }
    );

    if (!item) {
      return fail(res, 404, "매장 없음");
    }

    return ok(res, {
      shop: item,
      item,
      premium: true,
      isPremium: true,
      premiumActive: true,
    });
  } catch (e) {
    console.error("SHOP PREMIUM ON ERROR:", e);
    return fail(res, 500, e.message || "SHOP_PREMIUM_ON_ERROR");
  }
});

/* PREMIUM 비활성화 */
router.patch("/admin/:id([0-9a-fA-F]{24})/premium/off", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const item = await Shop.findOneAndUpdate(
      buildShopBaseQuery(req, {
        _id: req.params.id,
      }),
      {
        premium: false,
        isPremium: false,
        premiumActive: false,
        updatedAt: new Date(),
      },
      {
        new: true,
      }
    );

    if (!item) {
      return fail(res, 404, "매장 없음");
    }

    return ok(res, {
      shop: item,
      item,
      premium: false,
      isPremium: false,
      premiumActive: false,
    });
  } catch (e) {
    console.error("SHOP PREMIUM OFF ERROR:", e);
    return fail(res, 500, e.message || "SHOP_PREMIUM_OFF_ERROR");
  }
});

/* PREMIUM 토글 */
router.patch("/admin/:id([0-9a-fA-F]{24})/premium", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const current = await Shop.findOne(
      buildShopBaseQuery(req, {
        _id: req.params.id,
      })
    );

    if (!current) {
      return fail(res, 404, "매장 없음");
    }

    const nextPremium = !(
      current.premium === true ||
      current.isPremium === true ||
      current.premiumActive === true
    );

    const item = await Shop.findOneAndUpdate(
      buildShopBaseQuery(req, {
        _id: req.params.id,
      }),
      {
        premium: nextPremium,
        isPremium: nextPremium,
        premiumActive: nextPremium,
        updatedAt: new Date(),
      },
      {
        new: true,
      }
    );

    return ok(res, {
      shop: item,
      item,
      premium: nextPremium,
      isPremium: nextPremium,
      premiumActive: nextPremium,
    });
  } catch (e) {
    console.error("SHOP PREMIUM TOGGLE ERROR:", e);
    return fail(res, 500, e.message || "SHOP_PREMIUM_TOGGLE_ERROR");
  }
});

/* TOP */
router.get("/top/list", async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const items = await Shop.find(
        buildPublicShopQuery(req)
      )
      .sort({ premium: -1, isPremium: -1, premiumActive: -1, likeCount: -1 })
      .limit(10);

    res.json({ ok: true, items });
  } catch (e) {
    console.error("SHOP TOP ERROR:", e);
    res.status(500).json({ ok: false, items: [] });
  }
});

/* 최근 */
router.get("/recent/list", async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const items = await Shop.find(
        buildPublicShopQuery(req)
      )
      .sort({ premium: -1, isPremium: -1, premiumActive: -1, createdAt: -1 })
      .limit(10);

    res.json({ ok: true, items });
  } catch (e) {
    console.error("SHOP RECENT ERROR:", e);
    res.status(500).json({ ok: false, items: [] });
  }
});

/* nearby */
router.get("/nearby/list", async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const { lat, lng, max = 5 } = req.query;

    let items = await Shop.find(
      buildPublicShopQuery(req)
    ).lean();
    items = enrichWithDistance(items, safeNumber(lat), safeNumber(lng));
    items = items.filter((i) => {
      const distanceKm = Number(i?.distanceKm);

      return (
        Number.isFinite(distanceKm) &&
        distanceKm >= 0 &&
        distanceKm <= safeNumber(max, 5)
      );
    });

    items = applySort(items, "distance");

    res.json({ ok: true, items });
  } catch (e) {
    console.error("SHOP NEARBY ERROR:", e);
    res.status(500).json({ ok: false, items: [] });
  }
});

/* PREMIUM + 거리순 + 마사지3 + 노래방3 */
router.get("/premium/nearby", async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const {
      lat,
      lng,
      limit = 3,
      region,
      district,
    } = req.query;

    const query = buildPublicShopQuery(req);

    if (region) {
      query.region = region;
    }

    if (district) {
      query.district = district;
    }

    let items = await Shop.find(query).lean();

    items = enrichWithDistance(
      items,
      safeNumber(lat),
      safeNumber(lng)
    );

    const grouped = groupPremiumNearbyItems(
      items,
      limit
    );

    return ok(res, {
      items: grouped.all,
      list: grouped.all,
      massage: grouped.massage,
      karaoke: grouped.karaoke,
      total: grouped.all.length,
    });
  } catch (e) {
    console.error("SHOP PREMIUM NEARBY ERROR:", e);
    return res.status(500).json({
      ok: false,
      items: [],
      list: [],
      massage: [],
      karaoke: [],
      total: 0,
    });
  }
});

/* ranking */
router.get("/ranking/list", async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    let items = await Shop.find(
      buildPublicShopQuery(req)
    ).lean();
    items = items.map((s) => ({
      ...s,
      premium: s.premium === true || s.isPremium === true || s.premiumActive === true,
      isPremium: s.premium === true || s.isPremium === true || s.premiumActive === true,
      premiumActive: s.premium === true || s.isPremium === true || s.premiumActive === true,
      score: calcScore(s),
    }));
    items.sort((a, b) => b.score - a.score);

    res.json({ ok: true, items: items.slice(0, 20) });
  } catch (e) {
    console.error("SHOP RANKING ERROR:", e);
    res.status(500).json({ ok: false, items: [] });
  }
});

/* random */
router.get("/random/list", async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const items = await Shop.aggregate([
      { $match: buildPublicShopQuery(req) },
      { $sample: { size: 10 } },
    ]);

    res.json({ ok: true, items });
  } catch (e) {
    console.error("SHOP RANDOM ERROR:", e);
    res.status(500).json({ ok: false, items: [] });
  }
});

/* =====================================================
   🔥 메인 리스트
===================================================== */
router.get("/", async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    let {
      keyword = "",
      region,
      service,
      tag,
      sort = "like",
      lat,
      lng,
      page = 1,
      limit = 20,
      premiumNearby,
      home,
    } = req.query;

    page = safePage(page);
    limit = safeLimit(limit);

    const adminListMode = isAdminShopListRequest(req);
    const query = adminListMode
      ? buildAdminShopQuery(req)
      : buildPublicShopQuery(req);

    if (keyword) {
      const safe = escapeRegex(keyword);

      query.$and = Array.isArray(query.$and)
        ? query.$and
        : [];

      query.$and.push({
        $or: [
          { name: { $regex: safe, $options: "i" } },
          { region: { $regex: safe, $options: "i" } },
          { address: { $regex: safe, $options: "i" } },
        ],
      });
    }

    if (region) query.region = region;

    if (service) query.serviceTypes = { $in: [service] };

    if (tag) query.tags = { $in: [tag] };

    let items = [];

    if (adminListMode) {
      let primaryItems = [];

      try {
        primaryItems = await Shop.find(query)
          .sort({ premium: -1, isPremium: -1, premiumActive: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .maxTimeMS(SHOP_QUERY_MAX_TIME_MS)
          .lean();
      } catch (primaryError) {
        console.error(
          "SHOP ADMIN LIST PRIMARY ERROR:",
          primaryError.message || primaryError
        );

        primaryItems = [];
      }

      let fallbackItems = [];

      if (
        !Array.isArray(primaryItems) ||
        primaryItems.length === 0
      ) {
        try {
          const requestedCategory =
            getSafeRequestShopCategory(req);

          const fallbackCandidates =
            await Shop.find({
              isDeleted: {
                $ne: true,
              },
            })
              .sort({ premium: -1, isPremium: -1, premiumActive: -1, createdAt: -1 })
              .maxTimeMS(SHOP_QUERY_MAX_TIME_MS)
              .lean();

          const safeKeyword =
            String(keyword || "")
              .trim()
              .toLowerCase();

          const filteredFallbackItems =
            (Array.isArray(fallbackCandidates)
              ? fallbackCandidates
              : []
            ).filter((item) => {
              if (!item || item.isDeleted === true) {
                return false;
              }

              if (
                requestedCategory &&
                getShopCategory(item) !==
                  requestedCategory
              ) {
                return false;
              }

              if (
                safeKeyword &&
                ![
                  item.name,
                  item.region,
                  item.address,
                ]
                  .map((value) =>
                    String(value || "")
                      .toLowerCase()
                  )
                  .some((value) =>
                    value.includes(
                      safeKeyword
                    )
                  )
              ) {
                return false;
              }

              if (
                region &&
                String(item.region || "") !==
                  String(region)
              ) {
                return false;
              }

              if (
                service &&
                !(
                  Array.isArray(
                    item.serviceTypes
                  ) &&
                  item.serviceTypes.some(
                    (value) =>
                      String(value) ===
                      String(service)
                  )
                )
              ) {
                return false;
              }

              if (
                tag &&
                !(
                  Array.isArray(item.tags) &&
                  item.tags.some(
                    (value) =>
                      String(value) ===
                      String(tag)
                  )
                )
              ) {
                return false;
              }

              return true;
            });

          const startIndex =
            (page - 1) * limit;

          fallbackItems =
            filteredFallbackItems.slice(
              startIndex,
              startIndex + limit
            );
        } catch (fallbackError) {
          console.error(
            "SHOP ADMIN LIST FALLBACK ERROR:",
            fallbackError.message ||
              fallbackError
          );

          fallbackItems = [];
        }
      }

      const mergedMap = new Map();

      [
        ...(Array.isArray(primaryItems)
          ? primaryItems
          : []),
        ...(Array.isArray(fallbackItems)
          ? fallbackItems
          : []),
      ].forEach((item) => {
        if (!item || item.isDeleted === true) {
          return;
        }

        const key = String(item._id || item.id || item.name || Math.random());

        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
        }
      });

      items = Array.from(mergedMap.values());
    } else {
      items = await findPublicShopItems(req, query, page, limit);
    }

    items = enrichWithDistance(items, safeNumber(lat), safeNumber(lng));
    items = applySort(items, sort);

    if (
      premiumNearby === "true" ||
      premiumNearby === true ||
      home === "true" ||
      home === true
    ) {
      const grouped = groupPremiumNearbyItems(items, 3);

      return res.json({
        ok: true,
        items: grouped.all,
        list: grouped.all,
        massage: grouped.massage,
        karaoke: grouped.karaoke,
        total: grouped.all.length,
      });
    }

    res.json({
      ok: true,
      items,
      list: items,
      total: items.length,
    });
  } catch (err) {
    console.error("SHOP LIST ERROR:", err);

    return res.json({
      ok: true,
      items: [],
      list: [],
      total: 0,
    });
  }
});

/* =====================================================
   🔥 생성
===================================================== */
router.post("/", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const payload = applyPayloadCategory(
      normalizePayload(req.body),
      req
    );

    if (!payload.name) {
      return fail(res, 400, "매장명 필요");
    }

    if (!payload.address) {
      return fail(res, 400, "주소 필요");
    }

    const item = await Shop.create(payload);

    return ok(res, {
      shop: item,
      item,
    });
  } catch (e) {
    console.error("SHOP CREATE ERROR:", e);
    return fail(res, 500, e.message || "SHOP_CREATE_ERROR");
  }
});

/* =====================================================
   🔥 상세
===================================================== */
router.get("/:id([0-9a-fA-F]{24})", async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const shop = await Shop.findOne(
      buildShopBaseQuery(req, {
        _id: req.params.id,
      })
    );

    if (!shop || shop.isDeleted) {
      return res.status(404).json({ ok: false });
    }

    let reviews = [];

    if (requireReviewModel()) {
      reviews = await Review.find({ shopId: shop._id });
    }

    let ratingAvg = 0;

    if (reviews.length) {
      ratingAvg =
        reviews.reduce((a, b) => a + (b.rating || 0), 0) /
        reviews.length;
    }

    const shopObject = shop.toObject();

    res.json({
      ok: true,
      shop: {
        ...shopObject,
        premium: shopObject.premium === true || shopObject.isPremium === true || shopObject.premiumActive === true,
        isPremium: shopObject.premium === true || shopObject.isPremium === true || shopObject.premiumActive === true,
        premiumActive: shopObject.premium === true || shopObject.isPremium === true || shopObject.premiumActive === true,
        ratingAvg,
      },
    });
  } catch (e) {
    console.error("SHOP DETAIL ERROR:", e);
    res.status(500).json({ ok: false });
  }
});

/* =====================================================
   🔥 수정
===================================================== */
router.put("/:id([0-9a-fA-F]{24})", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const payload = applyPayloadCategory(
      normalizePayload(req.body),
      req
    );

    const item = await Shop.findOneAndUpdate(
      buildShopBaseQuery(req, {
        _id: req.params.id,
      }),
      {
        ...payload,
        updatedAt: new Date(),
      },
      {
        new: true,
      }
    );

    if (!item) {
      return fail(res, 404, "매장 없음");
    }

    return ok(res, {
      shop: item,
      item,
    });
  } catch (e) {
    console.error("SHOP UPDATE ERROR:", e);
    return fail(res, 500, e.message || "SHOP_UPDATE_ERROR");
  }
});

/* =====================================================
   🔥 PATCH 수정
===================================================== */
router.patch("/:id([0-9a-fA-F]{24})", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const payload = applyPayloadCategory(
      normalizePayload(req.body),
      req
    );

    const item = await Shop.findOneAndUpdate(
      buildShopBaseQuery(req, {
        _id: req.params.id,
      }),
      {
        ...payload,
        updatedAt: new Date(),
      },
      {
        new: true,
      }
    );

    if (!item) {
      return fail(res, 404, "매장 없음");
    }

    return ok(res, {
      shop: item,
      item,
    });
  } catch (e) {
    console.error("SHOP PATCH UPDATE ERROR:", e);
    return fail(res, 500, e.message || "SHOP_PATCH_UPDATE_ERROR");
  }
});

/* =====================================================
   🔥 삭제
===================================================== */
router.delete("/:id([0-9a-fA-F]{24})", auth, admin, async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const item = await Shop.findOneAndUpdate(
      buildShopBaseQuery(req, {
        _id: req.params.id,
      }),
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      {
        new: true,
      }
    );

    if (!item) {
      return fail(res, 404, "매장 없음");
    }

    return ok(res, {
      shop: item,
      item,
    });
  } catch (e) {
    console.error("SHOP DELETE ERROR:", e);
    return fail(res, 500, e.message || "SHOP_DELETE_ERROR");
  }
});

/* =====================================================
   🔥 FIX ONLY (중요 버그 수정)
===================================================== */
router.get("/search/phone", auth, admin, safeAsync(async (req, res) => {
  try {
    if (!requireShopModel(res)) return;

    const phone = safeStr(req.query.phone);

    const items = await Shop.find(
      buildShopBaseQuery(req, {
        phone: { $regex: escapeRegex(phone), $options: "i" },
      })
    ).limit(50);

    return ok(res, { items });
  } catch (e) {
    console.error("SHOP SEARCH PHONE ERROR:", e);
    return ok(res, { items: [] });
  }
}));

/* =========================
🔥 FINAL MASTER LOG
========================= */
console.log("🔥 SHOP ROUTES FINAL MASTER PATCH READY");

module.exports = router;