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

/* =====================================================
🔥 SCHEMA (기존 구조 유지 + 관리자 코스/가격 필드 보존)
===================================================== */
const Mixed = mongoose.Schema.Types.Mixed;

const ShopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, default: "" },

    region: { type: String, default: "" },
    district: { type: String, default: "" },
    address: { type: String, default: "" },
    roadAddress: { type: String, default: "" },
    fullAddress: { type: String, default: "" },
    locationText: { type: String, default: "" },
    phone: { type: String, default: "" },
    tel: { type: String, default: "" },
    virtualPhone: { type: String, default: "" },

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
    image: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    photo: { type: String, default: "" },
    picture: { type: String, default: "" },
    representativeImage: { type: String, default: "" },
    mainImage: { type: String, default: "" },
    coverImage: { type: String, default: "" },

    tags: [{ type: String }],
    serviceTypes: [{ type: String }],

    description: { type: String, default: "" },
    intro: { type: String, default: "" },
    shopIntro: { type: String, default: "" },
    openInfo: { type: String, default: "" },
    businessHours: { type: String, default: "" },
    openingHours: { type: String, default: "" },
    hours: { type: String, default: "" },

    premium: { type: Boolean, default: false },
    premiumType: { type: String, default: "normal" },
    premiumLevel: { type: String, default: "normal" },
    membershipType: { type: String, default: "normal" },
    listingType: { type: String, default: "normal" },
    shopGrade: { type: String, default: "normal" },
    imageGrade: { type: String, default: "normal" },
    photoGrade: { type: String, default: "normal" },
    isPremium: { type: Boolean, default: false },
    premiumActive: { type: Boolean, default: false },
    bestBadge: { type: Boolean, default: false },

    approved: { type: Boolean, default: true },

    priceOriginal: { type: Number, default: 0 },
    priceDiscount: { type: Number, default: 0 },
    discountRate: { type: Number, default: 0 },

    courses: [{ type: Mixed }],
    price: [{ type: Mixed }],
    prices: [{ type: Mixed }],
    originalPrice: [{ type: Mixed }],
    originalPrices: [{ type: Mixed }],
    coursePricing: { type: Mixed, default: undefined },
    pricing: { type: Mixed, default: undefined },
    priceTable: { type: Mixed, default: undefined },
    courseSections: { type: Mixed, default: undefined },
    menuPrices: { type: Mixed, default: undefined },
    menus: { type: Mixed, default: undefined },
    courseMenus: { type: Mixed, default: undefined },

    reviewCount: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },

    likeCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },

    distanceKm: { type: Number, default: 0 },

    isReservable: { type: Boolean, default: true },
    directPaymentEnabled: { type: Boolean, default: false },
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

  if (!this.premiumType) {
    this.premiumType = this.premium ? "premium" : "normal";
  }

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

    if (!target.premiumType) {
      target.premiumType = premium ? "premium" : "normal";
    }
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
