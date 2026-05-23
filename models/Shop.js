"use strict";
const mongoose = require("mongoose");

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeNum(v){ const n = Number(v); return isNaN(n)?0:n; }

/* =====================================================
🔥 SCHEMA (100% 유지)
===================================================== */
const ShopSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  slug: { type: String, default: "", index: true },

  region: { type: String, default: "" },
  district: { type: String, default: "" },
  address: { type: String, default: "" },
  roadAddress: { type: String, default: "" },
  phone: { type: String, default: "" },

  lat: { type: Number, required: true },
  lng: { type: Number, required: true },

  thumbnail: { type: String, default: "" },
  images: [{ type: String }],

  tags: [{ type: String }],
  serviceTypes: [{ type: String }],

  description: { type: String, default: "" },
  openInfo: { type: String, default: "" },

  premium: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
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
  status: { type: String, default: "open", index: true },
  reservationCount: { type: Number, default: 0 },
  score: { type: Number, default: 0, index: true },
  adScore: { type: Number, default: 0 },
  visible: { type: Boolean, default: true, index: true },
  priority: { type: Number, default: 0 },
  lastActiveAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false, index: true },

  businessStatus: {
    type: String,
    enum: ["open", "close", "break"],
    default: "open"
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

  aiScore:{type:Number,default:0,index:true},
  rankScore:{type:Number,default:0,index:true},
  stayCount:{type:Number,default:0},
  searchableText:String

},{timestamps:true});

/* =====================================================
🔥 PRE SAVE (유지)
===================================================== */
ShopSchema.pre("save",function(next){
  if (isNaN(this.lat) || isNaN(this.lng)) {
    return next(new Error("좌표 오류"));
  }

  this.premium = this.premium === true || this.isPremium === true;
  this.isPremium = this.premium === true;

  if (this.priceOriginal > 0) {
    this.discountRate = Math.max(
      0,
      Math.round((1 - this.priceDiscount / this.priceOriginal) * 100)
    );
  }

  next();
});

/* =====================================================
🔥 핵심: DB SAVE 제거 (성능 FIX)
===================================================== */

ShopSchema.methods.calculateScore = function () {
  this.score =
    (safeNum(this.ratingAvg) * 10) +
    (safeNum(this.likeCount) * 2) +
    (safeNum(this.viewCount) * 0.1) +
    (safeNum(this.adScore));

  return this;
};

ShopSchema.methods.calcAiScoreV2 = function(){
  this.aiScore =
    safeNum(this.likeCount)*2 +
    safeNum(this.viewCount)*0.5 +
    safeNum(this.reservationCount)*2;

  return this;
};

ShopSchema.methods.calcRankScoreV2 = function(){
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

/* =====================================================
🔥 STATIC
===================================================== */
ShopSchema.statics.findTrending = function(){
  return this.find({isDeleted:false})
    .sort({viewCount:-1,likeCount:-1})
    .limit(20);
};

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", ShopSchema);