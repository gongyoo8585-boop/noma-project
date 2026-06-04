"use strict";
const mongoose = require("mongoose");

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeNum(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
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

function normalizeShopStatus(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (
    text === "inactive" ||
    text === "disabled" ||
    text === "hidden" ||
    text === "hide" ||
    text === "close" ||
    text === "closed" ||
    text === "deleted" ||
    text === "blocked" ||
    text === "휴무" ||
    text === "비활성"
  ) {
    return "inactive";
  }

  return "active";
}

function normalizeImageValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "object") {
    return normalizeImageValue(
      value.url ||
        value.src ||
        value.path ||
        value.location ||
        value.image ||
        value.imageUrl ||
        value.thumbnail ||
        value.thumbnailUrl ||
        value.mainImage ||
        value.representativeImage ||
        value.coverImage ||
        value.photo ||
        value.picture ||
        ""
    );
  }

  const text = String(value || "").trim();

  if (
    !text ||
    text === "undefined" ||
    text === "null" ||
    text === "[object Object]" ||
    text.includes("[object Object]")
  ) {
    return "";
  }

  return text;
}

function hasShopImagePayload(source = {}) {
  if (!source || typeof source !== "object") {
    return false;
  }

  return [
    "images",
    "photos",
    "imageUrls",
    "gallery",
    "pictures",
    "representativeImage",
    "mainImage",
    "thumbnail",
    "coverImage",
    "image",
    "imageUrl",
    "photo",
    "picture",
  ].some((key) => source[key] !== undefined);
}

function collectShopImages(source = {}) {
  const images = [];

  const pushImage = (value) => {
    if (Array.isArray(value)) {
      value.forEach(pushImage);
      return;
    }

    const normalized = normalizeImageValue(value);

    if (normalized && !images.includes(normalized)) {
      images.push(normalized);
    }
  };

  pushImage(source.images);
  pushImage(source.photos);
  pushImage(source.imageUrls);
  pushImage(source.gallery);
  pushImage(source.pictures);
  pushImage(source.representativeImage);
  pushImage(source.mainImage);
  pushImage(source.thumbnail);
  pushImage(source.coverImage);
  pushImage(source.image);
  pushImage(source.imageUrl);
  pushImage(source.photo);
  pushImage(source.picture);

  return images;
}

function normalizeShopImagesPayload(target = {}) {
  if (!target || typeof target !== "object") {
    return target;
  }

  const images = collectShopImages(target);
  const representativeCandidate =
    normalizeImageValue(target.representativeImage) ||
    normalizeImageValue(target.mainImage) ||
    normalizeImageValue(target.thumbnail) ||
    normalizeImageValue(target.coverImage) ||
    normalizeImageValue(target.image) ||
    normalizeImageValue(target.imageUrl) ||
    normalizeImageValue(target.photo) ||
    normalizeImageValue(target.picture) ||
    images[0] ||
    "";

  const representativeImage =
    images.find((image) => image === representativeCandidate) ||
    representativeCandidate ||
    images[0] ||
    "";

  const finalImages = images.length
    ? images
    : representativeImage
      ? [representativeImage]
      : [];

  target.images = finalImages;
  target.photos = finalImages;
  target.imageUrls = finalImages;
  target.gallery = finalImages;
  target.pictures = finalImages;

  target.representativeImage = representativeImage;
  target.mainImage = representativeImage;
  target.thumbnail = representativeImage;
  target.coverImage = representativeImage;

  target.image = representativeImage;
  target.imageUrl = representativeImage;
  target.photo = representativeImage;
  target.picture = representativeImage;

  return target;
}

/* =====================================================
🔥 SCHEMA (100% 유지)
===================================================== */
const ShopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, default: "" },

    region: { type: String, default: "" },
    district: { type: String, default: "" },
    address: { type: String, default: "" },
    roadAddress: { type: String, default: "" },
    phone: { type: String, default: "" },

    category: { type: String, default: "massage" },
    shopCategory: { type: String, default: "massage" },
    serviceType: { type: String, default: "massage" },
    businessType: { type: String, default: "massage" },
    adminCategory: { type: String, default: "massage" },

    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },

    thumbnail: { type: String, default: "" },
    images: [{ type: String }],
    photos: [{ type: String }],
    imageUrls: [{ type: String }],
    gallery: [{ type: String }],
    pictures: [{ type: String }],
    representativeImage: { type: String, default: "" },
    mainImage: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    image: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    photo: { type: String, default: "" },
    picture: { type: String, default: "" },

    tags: [{ type: String }],
    serviceTypes: [{ type: String }],

    description: { type: String, default: "" },
    openInfo: { type: String, default: "" },

    premium: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
    premiumActive: { type: Boolean, default: false },
    bestBadge: { type: Boolean, default: false },

    approved: { type: Boolean, default: true },

    priceOriginal: { type: Number, default: 0 },
    priceDiscount: { type: Number, default: 0 },
    discountRate: { type: Number, default: 0 },

    reviewCount: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },

    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },

    distanceKm: { type: Number, default: 0 },

    isReservable: { type: Boolean, default: true },
    status: { type: String, default: "active" },
    reservationCount: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    adScore: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },

    businessStatus: {
      type: String,
      enum: ["open", "close", "break"],
      default: "open",
    },

    openTime: String,
    closeTime: String,
    holiday: [String],

    priceLevel: { type: Number, default: 0 },
    maxPeople: { type: Number, default: 10 },
    minReserveMinutes: { type: Number, default: 30 },

    isHot: { type: Boolean, default: false },
    keywords: [String],
    seoDescription: String,

    clickCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    reportResolvedCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },
    lastViewedAt: Date,

    avgStayMinutes: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },

    aiScore: { type: Number, default: 0 },
    rankScore: { type: Number, default: 0 },
    stayCount: { type: Number, default: 0 },
    searchableText: String,
  },
  {
    timestamps: true,
    autoIndex: false,
    autoCreate: false,
  }
);

ShopSchema.set("autoIndex", false);
ShopSchema.set("autoCreate", false);

/* =====================================================
🔥 QUERY INDEX DEFINITIONS
===================================================== */
ShopSchema.index({ isDeleted: 1, category: 1, createdAt: -1 });
ShopSchema.index({ isDeleted: 1, shopCategory: 1, createdAt: -1 });
ShopSchema.index({ isDeleted: 1, serviceType: 1, createdAt: -1 });
ShopSchema.index({ isDeleted: 1, businessType: 1, createdAt: -1 });
ShopSchema.index({ isDeleted: 1, adminCategory: 1, createdAt: -1 });
ShopSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
ShopSchema.index({ isDeleted: 1, premium: -1, isPremium: -1, premiumActive: -1, createdAt: -1 });
ShopSchema.index({ name: 1 });
ShopSchema.index({ region: 1, district: 1 });

/* =====================================================
🔥 PRE SAVE (유지)
===================================================== */
ShopSchema.pre("save", function (next) {
  this.lat = safeNum(this.lat);
  this.lng = safeNum(this.lng);

  const category =
    normalizeShopCategory(this.category) ||
    normalizeShopCategory(this.shopCategory) ||
    normalizeShopCategory(this.serviceType) ||
    normalizeShopCategory(this.businessType) ||
    normalizeShopCategory(this.adminCategory) ||
    "massage";

  this.category = category;
  this.shopCategory = category;
  this.serviceType = category;
  this.businessType = category;
  this.adminCategory = category;

  this.status = normalizeShopStatus(this.status);

  if (this.visible !== false) {
    this.visible = true;
  }

  if (this.approved !== false) {
    this.approved = true;
  }

  if (this.isReservable !== false) {
    this.isReservable = true;
  }

  if (this.isDeleted !== true) {
    this.isDeleted = false;
  }

  this.premium =
    this.premium === true ||
    this.isPremium === true ||
    this.premiumActive === true;
  this.isPremium = this.premium === true;
  this.premiumActive = this.premium === true;

  normalizeShopImagesPayload(this);

  if (this.priceOriginal > 0) {
    this.discountRate = Math.max(
      0,
      Math.round((1 - this.priceDiscount / this.priceOriginal) * 100)
    );
  }

  next();
});

/* =====================================================
🔥 PRE FINDONEANDUPDATE / UPDATE (최소 보정)
===================================================== */
function normalizeUpdatePayload(update = {}) {
  if (!update || typeof update !== "object") {
    return update;
  }

  const next = update;
  const hasOperator = Object.keys(next).some((key) => key.startsWith("$"));
  const target =
    next.$set && typeof next.$set === "object"
      ? next.$set
      : hasOperator
        ? {}
        : next;

  const category =
    normalizeShopCategory(target.category) ||
    normalizeShopCategory(target.shopCategory) ||
    normalizeShopCategory(target.serviceType) ||
    normalizeShopCategory(target.businessType) ||
    normalizeShopCategory(target.adminCategory);

  if (category) {
    target.category = category;
    target.shopCategory = category;
    target.serviceType = category;
    target.businessType = category;
    target.adminCategory = category;
  }

  if (target.status !== undefined) {
    target.status = normalizeShopStatus(target.status);
  }

  if (target.visible !== false && target.visible !== undefined) {
    target.visible = true;
  }

  if (target.approved !== false && target.approved !== undefined) {
    target.approved = true;
  }

  if (target.isReservable !== false && target.isReservable !== undefined) {
    target.isReservable = true;
  }

  if (target.isDeleted !== true && target.isDeleted !== undefined) {
    target.isDeleted = false;
  }

  if (hasShopImagePayload(target)) {
    normalizeShopImagesPayload(target);
  }

  if (
    target.premium !== undefined ||
    target.isPremium !== undefined ||
    target.premiumActive !== undefined
  ) {
    const premium =
      target.premium === true ||
      target.isPremium === true ||
      target.premiumActive === true ||
      target.premium === "true" ||
      target.isPremium === "true" ||
      target.premiumActive === "true";

    target.premium = premium;
    target.isPremium = premium;
    target.premiumActive = premium;
  }

  if (hasOperator && Object.keys(target).length > 0) {
    next.$set = target;
  }

  return next;
}

ShopSchema.pre("findOneAndUpdate", function (next) {
  this.setUpdate(normalizeUpdatePayload(this.getUpdate()));
  next();
});

ShopSchema.pre("updateOne", function (next) {
  this.setUpdate(normalizeUpdatePayload(this.getUpdate()));
  next();
});

ShopSchema.pre("updateMany", function (next) {
  this.setUpdate(normalizeUpdatePayload(this.getUpdate()));
  next();
});

/* =====================================================
🔥 핵심: DB SAVE 제거 (성능 FIX)
===================================================== */
ShopSchema.methods.calculateScore = function () {
  this.score =
    safeNum(this.ratingAvg) * 10 +
    safeNum(this.likeCount) * 2 +
    safeNum(this.viewCount) * 0.1 +
    safeNum(this.adScore);

  return this;
};

ShopSchema.methods.calcAiScoreV2 = function () {
  this.aiScore =
    safeNum(this.likeCount) * 2 +
    safeNum(this.viewCount) * 0.5 +
    safeNum(this.reservationCount) * 2;

  return this;
};

ShopSchema.methods.calcRankScoreV2 = function () {
  this.rankScore =
    safeNum(this.score) +
    safeNum(this.aiScore) +
    (this.premium || this.isPremium ? 20 : 0);

  return this;
};

/* =====================================================
🔥 DISTANCE (안전 버전)
===================================================== */
ShopSchema.methods.setDistance = function (lat, lng) {
  const dx = safeNum(this.lat) - safeNum(lat);
  const dy = safeNum(this.lng) - safeNum(lng);
  this.distanceKm = Math.sqrt(dx * dx + dy * dy) * 111;
  return this.distanceKm;
};

ShopSchema.methods.normalizeCategoryFields = function () {
  const category =
    normalizeShopCategory(this.category) ||
    normalizeShopCategory(this.shopCategory) ||
    normalizeShopCategory(this.serviceType) ||
    normalizeShopCategory(this.businessType) ||
    normalizeShopCategory(this.adminCategory) ||
    "massage";

  this.category = category;
  this.shopCategory = category;
  this.serviceType = category;
  this.businessType = category;
  this.adminCategory = category;

  return this;
};

ShopSchema.statics.normalizeCategoryValue = normalizeShopCategory;
ShopSchema.statics.normalizeStatusValue = normalizeShopStatus;

/* =====================================================
🔥 STATIC
===================================================== */
ShopSchema.statics.findTrending = function () {
  return this.find({
    isDeleted: false,
    visible: { $ne: false },
    approved: { $ne: false },
    status: { $ne: "inactive" },
  })
    .sort({ viewCount: -1, likeCount: -1 })
    .limit(20);
};

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", ShopSchema);
