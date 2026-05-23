"use strict";

/**
 * =====================================================
 * 🔥 SHOP MODEL (ULTRA FINAL - PATCHED)
 * =====================================================
 */

const mongoose = require("mongoose");

/* =========================
UTIL
========================= */
function isValidNumber(v) {
  return typeof v === "number" && !Number.isNaN(v);
}

function toNumberSafe(v) {
  if (
    v === "" ||
    v === null ||
    v === undefined
  ) {
    return undefined;
  }

  const n = Number(v);

  return Number.isFinite(n)
    ? n
    : undefined;
}

function normalizeImageArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v || "").trim())
      .filter(Boolean);
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
}

function normalizeCourseArray(value) {
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
      .map((v) => Number(v || 0))
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
    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return [numberValue];
    }
  }

  return [];
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

function normalizeShopCategoryFields(doc) {
  if (!doc) return doc;

  const category =
    normalizeShopCategory(doc.category) ||
    normalizeShopCategory(doc.shopCategory) ||
    normalizeShopCategory(doc.serviceType) ||
    normalizeShopCategory(doc.businessType) ||
    normalizeShopCategory(doc.adminCategory) ||
    normalizeShopCategory(doc.type) ||
    "massage";

  doc.category = category;
  doc.shopCategory = category;
  doc.serviceType = category;
  doc.businessType = category;
  doc.adminCategory = category;

  return doc;
}

function normalizePremiumType(value) {
  const text = String(value || "")
    .toLowerCase()
    .trim();

  if (
    text === "vip" ||
    text === "vvip"
  ) {
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

function normalizePremiumValue(doc) {
  if (!doc) {
    return {
      premium: false,
      isPremium: false,
      premiumType: "normal",
    };
  }

  const rawPremiumType =
    doc.premiumType ||
    doc.premiumLevel ||
    doc.grade ||
    "";

  const typeFromText =
    normalizePremiumType(rawPremiumType);

  const premium =
    doc.premium === true ||
    doc.isPremium === true ||
    doc.premiumActive === true ||
    doc.premium === "true" ||
    doc.isPremium === "true" ||
    doc.premiumActive === "true" ||
    typeFromText !== "normal";

  const premiumType =
    premium
      ? typeFromText === "normal"
        ? "premium"
        : typeFromText
      : "normal";

  return {
    premium,
    isPremium: premium,
    premiumActive: premium,
    premiumType,
  };
}

function normalizeShopImages(doc) {
  if (!doc) return doc;

  const images = normalizeImageArray(doc.images);
  const photos = normalizeImageArray(doc.photos);
  const imageUrls = normalizeImageArray(doc.imageUrls);
  const singleImage = normalizeImageArray(doc.image);

  const merged = [];

  [...images, ...photos, ...imageUrls, ...singleImage].forEach((image) => {
    if (image && !merged.includes(image)) {
      merged.push(image);
    }
  });

  const representativeImage =
    doc.representativeImage ||
    doc.mainImage ||
    doc.thumbnail ||
    doc.coverImage ||
    doc.image ||
    merged[0] ||
    "";

  doc.images = merged;
  doc.photos = merged;
  doc.imageUrls = merged;
  doc.image = representativeImage;

  doc.representativeImage = representativeImage;
  doc.mainImage = representativeImage;
  doc.thumbnail = representativeImage;
  doc.coverImage = representativeImage;

  return doc;
}

function normalizeShopLocation(doc) {
  if (!doc) return doc;

  const locationLat = toNumberSafe(
    doc.location?.lat
  );

  const locationLng = toNumberSafe(
    doc.location?.lng
  );

  const rootLat = toNumberSafe(doc.lat);
  const rootLng = toNumberSafe(doc.lng);

  const lat =
    locationLat !== undefined
      ? locationLat
      : rootLat;

  const lng =
    locationLng !== undefined
      ? locationLng
      : rootLng;

  if (
    isValidNumber(lat) &&
    isValidNumber(lng)
  ) {
    doc.lat = lat;
    doc.lng = lng;

    doc.location = {
      lat,
      lng,
    };

    doc.geo = {
      type: "Point",
      coordinates: [lng, lat],
    };
  }

  return doc;
}

function normalizeShopExtraFields(doc) {
  if (!doc) return doc;

  doc.name =
    String(
      doc.name ||
        doc.shopName ||
        doc.title ||
        "업체명 없음"
    ).trim();

  doc.address =
    String(
      doc.address || ""
    ).trim();

  doc.description =
    doc.description ||
    "";

  doc.virtualPhone =
    doc.virtualPhone ||
    doc.fakePhone ||
    doc.callNumber ||
    "";

  doc.fakePhone =
    doc.fakePhone ||
    doc.virtualPhone ||
    "";

  doc.callNumber =
    doc.callNumber ||
    doc.virtualPhone ||
    "";

  doc.businessHours =
    doc.businessHours ||
    doc.openingHours ||
    doc.hours ||
    "";

  doc.openingHours =
    doc.openingHours ||
    doc.businessHours ||
    "";

  doc.hours =
    doc.hours ||
    doc.businessHours ||
    "";

  doc.courses =
    normalizeCourseArray(
      doc.courses
    );

  doc.price =
    normalizePriceArray(
      doc.price
    );

  doc.images =
    normalizeImageArray(
      doc.images
    );

  doc.photos =
    normalizeImageArray(
      doc.photos
    );

  doc.imageUrls =
    normalizeImageArray(
      doc.imageUrls
    );

  if (
    doc.representativeImage &&
    !doc.images.includes(
      doc.representativeImage
    )
  ) {
    doc.images.unshift(
      doc.representativeImage
    );
  }

  if (doc.visible === undefined) {
    doc.visible = true;
  }

  if (doc.approved === undefined) {
    doc.approved = true;
  }

  const premiumState =
    normalizePremiumValue(doc);

  doc.premium =
    premiumState.premium;

  doc.isPremium =
    premiumState.isPremium;

  doc.premiumActive =
    premiumState.premiumActive;

  doc.premiumType =
    premiumState.premiumType;

  normalizeShopCategoryFields(doc);

  if (!doc.status) {
    doc.status = "active";
  }

  return doc;
}

/* =========================
SCHEMA
========================= */
const ShopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      enum: [
        "massage",
        "karaoke",
      ],
      default: "massage",
      required: true,
      index: true,
      set: (value) => normalizeShopCategory(value) || "massage",
    },

    shopCategory: {
      type: String,
      enum: [
        "massage",
        "karaoke",
      ],
      default: "massage",
      index: true,
      set: (value) => normalizeShopCategory(value) || "massage",
    },

    serviceType: {
      type: String,
      enum: [
        "massage",
        "karaoke",
      ],
      default: "massage",
      index: true,
      set: (value) => normalizeShopCategory(value) || "massage",
    },

    businessType: {
      type: String,
      enum: [
        "massage",
        "karaoke",
      ],
      default: "massage",
      index: true,
      set: (value) => normalizeShopCategory(value) || "massage",
    },

    adminCategory: {
      type: String,
      enum: [
        "massage",
        "karaoke",
      ],
      default: "massage",
      index: true,
      set: (value) => normalizeShopCategory(value) || "massage",
    },

    region: {
      type: String,
      default: "",
      index: true,
    },

    district: {
      type: String,
      default: "",
      index: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    lat: {
      type: Number,
      default: undefined,
    },

    lng: {
      type: Number,
      default: undefined,
    },

    location: {
      lat: {
        type: Number,
        default: undefined,
      },

      lng: {
        type: Number,
        default: undefined,
      },
    },

    geo: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        index: "2dsphere",
        default: undefined,
      },
    },

    priceOriginal: {
      type: Number,
      default: 0,
    },

    priceDiscount: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: "KRW",
    },

    price: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },

    courses: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    isReservable: {
      type: Boolean,
      default: true,
      index: true,
    },

    maxPeople: {
      type: Number,
      default: 1,
    },

    openTime: String,
    closeTime: String,

    holidays: [String],

    phone: String,

    virtualPhone: {
      type: String,
      default: "",
      index: true,
    },

    fakePhone: {
      type: String,
      default: "",
    },

    callNumber: {
      type: String,
      default: "",
    },

    businessHours: {
      type: String,
      default: "",
    },

    openingHours: {
      type: String,
      default: "",
    },

    hours: {
      type: String,
      default: "",
    },

    email: String,
    website: String,

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    photos: {
      type: [String],
      default: [],
    },

    imageUrls: {
      type: [String],
      default: [],
    },

    representativeImage: {
      type: String,
      default: "",
    },

    mainImage: {
      type: String,
      default: "",
    },

    thumbnail: {
      type: String,
      default: "",
    },

    coverImage: {
      type: String,
      default: "",
    },

    rating: {
      average: {
        type: Number,
        default: 0,
      },

      count: {
        type: Number,
        default: 0,
      },
    },

    ratingAvg: {
      type: Number,
      default: 0,
    },

    likeCount: {
      type: Number,
      default: 0,
    },

    viewCount: {
      type: Number,
      default: 0,
    },

    callCount: {
      type: Number,
      default: 0,
      index: true,
    },

    clickCount: {
      type: Number,
      default: 0,
      index: true,
    },

    conversionCount: {
      type: Number,
      default: 0,
      index: true,
    },

    reviewCount: {
      type: Number,
      default: 0,
      index: true,
    },

    dailyCalls: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    dailyClicks: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    dailyConversions: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    dailyReviews: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    stats: {
      reservationCount: {
        type: Number,
        default: 0,
      },

      viewCount: {
        type: Number,
        default: 0,
      },

      favoriteCount: {
        type: Number,
        default: 0,
      },

      callCount: {
        type: Number,
        default: 0,
      },

      clickCount: {
        type: Number,
        default: 0,
      },

      conversionCount: {
        type: Number,
        default: 0,
      },

      reviewCount: {
        type: Number,
        default: 0,
      },
    },

    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "blocked",
        "open",
        "approved",
        "enabled",
        "enable",
      ],
      default: "active",
      index: true,
    },

    visible: {
      type: Boolean,
      default: true,
      index: true,
    },

    approved: {
      type: Boolean,
      default: true,
      index: true,
    },

    premium: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPremium: {
      type: Boolean,
      default: false,
      index: true,
    },

    premiumActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    premiumType: {
      type: String,
      enum: [
        "normal",
        "premium",
        "vip",
      ],
      default: "normal",
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    tags: [String],

    serviceTypes: [String],

    options: {
      parking: {
        type: Boolean,
        default: false,
      },

      shower: {
        type: Boolean,
        default: false,
      },

      wifi: {
        type: Boolean,
        default: false,
      },
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isPopular: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: Date,
  },
  {
    timestamps: true,
    minimize: false,
  }
);

/* =========================
INDEX
========================= */
ShopSchema.index({
  geo: "2dsphere",
});

ShopSchema.index({
  name: "text",
  description: "text",
});

ShopSchema.index({
  region: 1,
  district: 1,
});

ShopSchema.index({
  virtualPhone: 1,
});

ShopSchema.index({
  businessHours: 1,
});

ShopSchema.index({
  visible: 1,
  approved: 1,
  status: 1,
});

ShopSchema.index({
  category: 1,
  visible: 1,
  approved: 1,
  status: 1,
});

ShopSchema.index({
  category: 1,
  region: 1,
  district: 1,
});

ShopSchema.index({
  category: 1,
  createdAt: -1,
});

ShopSchema.index({
  category: 1,
  updatedAt: -1,
});

/* =========================
HOOK
========================= */
ShopSchema.pre("validate", function (next) {
  normalizeShopCategoryFields(this);
  normalizeShopCategoryFields(this);
  normalizeShopLocation(this);
  normalizeShopImages(this);
  normalizeShopExtraFields(this);

  if (Array.isArray(this.price)) {
    this.price = this.price.map((v) => Number(v || 0));
  }

  next();
});

ShopSchema.pre("save", function (next) {
  normalizeShopLocation(this);
  normalizeShopImages(this);
  normalizeShopExtraFields(this);

  if (
    this.rating &&
    typeof this.rating.average === "number"
  ) {
    this.ratingAvg = this.rating.average;
  }

  if (this.stats) {
    this.stats.viewCount = Number(
      this.stats.viewCount ||
        this.viewCount ||
        0
    );

    this.stats.callCount = Number(
      this.stats.callCount ||
        this.callCount ||
        0
    );

    this.stats.clickCount = Number(
      this.stats.clickCount ||
        this.clickCount ||
        this.viewCount ||
        0
    );

    this.stats.conversionCount = Number(
      this.stats.conversionCount ||
        this.conversionCount ||
        0
    );

    this.stats.reviewCount = Number(
      this.stats.reviewCount ||
        this.reviewCount ||
        this.rating?.count ||
        0
    );
  }

  this.clickCount = Number(
    this.clickCount ||
      this.viewCount ||
      this.stats?.clickCount ||
      0
  );

  this.callCount = Number(
    this.callCount ||
      this.stats?.callCount ||
      0
  );

  this.conversionCount = Number(
    this.conversionCount ||
      this.stats?.conversionCount ||
      this.stats?.reservationCount ||
      0
  );

  this.reviewCount = Number(
    this.reviewCount ||
      this.rating?.count ||
      this.stats?.reviewCount ||
      0
  );

  if (Array.isArray(this.price)) {
    this.price = this.price.map((v) => Number(v || 0));
  }

  this.markModified("images");
  this.markModified("photos");
  this.markModified("imageUrls");
  this.markModified("representativeImage");
  this.markModified("mainImage");
  this.markModified("thumbnail");
  this.markModified("coverImage");

  this.markModified("address");
  this.markModified("location");
  this.markModified("geo");
  this.markModified("lat");
  this.markModified("lng");
  this.markModified("premium");
  this.markModified("isPremium");
  this.markModified("premiumActive");
  this.markModified("premiumType");

  next();
});

/* =========================
INSERT MANY PATCH
========================= */
ShopSchema.pre("insertMany", function (next, docs) {
  try {
    if (Array.isArray(docs)) {
      docs.forEach((doc) => {
        normalizeShopCategoryFields(doc);
        normalizeShopLocation(doc);
        normalizeShopImages(doc);
        normalizeShopExtraFields(doc);

        if (Array.isArray(doc.price)) {
          doc.price = doc.price.map((v) => Number(v || 0));
        }
      });
    }
  } catch (e) {
    console.error(
      "SHOP INSERT MANY NORMALIZE ERROR:",
      e.message
    );
  }

  next();
});

/* =========================
TO JSON
========================= */
ShopSchema.set("toJSON", {
  virtuals: true,
  minimize: false,
  transform: function (doc, ret) {
    normalizeShopCategoryFields(ret);
    normalizeShopLocation(ret);
    normalizeShopImages(ret);
    normalizeShopExtraFields(ret);

    ret.id = ret._id;

    return ret;
  },
});

/* =========================
EXPORT
========================= */
module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", ShopSchema);