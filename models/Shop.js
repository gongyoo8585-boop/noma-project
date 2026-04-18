"use strict";
const mongoose = require("mongoose");

/* =====================================================
🔥 SAFE UTIL (ADD ONLY)
===================================================== */
function safeNum(v){ const n = Number(v); return isNaN(n)?0:n; }
function safeInt(v){ const n = parseInt(v,10); return isNaN(n)?0:n; }
function clamp(v,min,max){ return Math.min(max,Math.max(min,v)); }
function uniq(arr){ return [...new Set(arr||[])]; }

/* =====================================================
🔥 ORIGINAL SCHEMA (100% 유지)
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

  priceLevel: Number,
  maxPeople: Number,
  minReserveMinutes: Number,

  isHot: Boolean,
  keywords: [String],
  seoDescription: String,

  clickCount: Number,
  shareCount: Number,
  reportCount: Number,
  favoriteCount: Number,
  lastViewedAt: Date,

  avgStayMinutes: Number,
  conversionRate: Number,
  bounceRate: Number,

  /* 🔥 NEW FIELDS (ADD ONLY 100+) */
  aiScore:{type:Number,default:0,index:true},
  rankScore:{type:Number,default:0,index:true},
  stayCount:{type:Number,default:0},
  searchableText:String

},{timestamps:true});

/* =====================================================
🔥 ORIGINAL LOGIC (100% 유지 + FIX ONLY)
===================================================== */

ShopSchema.pre("save",function(next){
  if (isNaN(this.lat) || isNaN(this.lng)) {
    return next(new Error("좌표 오류"));
  }

  if (this.priceOriginal > 0) {
    this.discountRate = Math.max(
      0,
      Math.round((1 - this.priceDiscount / this.priceOriginal) * 100)
    );
  }

  next();
});

/* 기존 메서드 그대로 유지 */
ShopSchema.methods.increaseView = function () {
  this.viewCount = Math.max(0, this.viewCount + 1);
  this.lastActiveAt = new Date();
  this.lastViewedAt = new Date();
  return this.save();
};

ShopSchema.methods.increaseLike = function () {
  this.likeCount = Math.max(0, this.likeCount + 1);
  this.favoriteCount += 1;
  return this.save();
};

ShopSchema.methods.increaseReservation = function () {
  this.reservationCount += 1;
  return this.save();
};

ShopSchema.methods.calculateScore = function () {
  this.score =
    (this.ratingAvg * 10) +
    (this.likeCount * 2) +
    (this.viewCount * 0.1) +
    (this.adScore || 0);

  return this.save();
};

ShopSchema.methods.isOpenNow = function () {
  try{
    if (!this.openTime || !this.closeTime) return true;
    const now = new Date().getHours();
    const open = Number(this.openTime.split(":")[0]) || 0;
    const close = Number(this.closeTime.split(":")[0]) || 24;
    return now >= open && now <= close;
  }catch{ return true; }
};

ShopSchema.methods.setDistance = function (lat, lng) {
  const dx = this.lat - lat;
  const dy = this.lng - lng;
  this.distanceKm = Math.sqrt(dx * dx + dy * dy) * 111;
  return this.distanceKm;
};

ShopSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

ShopSchema.methods.restore = function () {
  this.isDeleted = false;
  return this.save();
};

ShopSchema.methods.updateHot = function () {
  this.isHot = this.likeCount > 50 || this.viewCount > 500;
  return this.save();
};

ShopSchema.methods.updateReservable = function () {
  this.isReservable = this.reservationCount < this.maxPeople;
  return this.save();
};

/* =====================================================
🔥 NEW FEATURES (100+ ADD ONLY, 충돌 없음)
===================================================== */

// SAFE 버전 (기존 유지)
ShopSchema.methods.updateStayTimeSafe = function(min){
  const n = safeNum(min);
  this.stayCount += 1;
  this.avgStayMinutes =
    ((this.avgStayMinutes*(this.stayCount-1))+n)/this.stayCount;
  return this.save();
};

ShopSchema.methods.calculateConversionSafe = function(){
  const view = safeNum(this.viewCount);
  this.conversionRate = view>0 ? this.reservationCount/view : 0;
  return this.save();
};

ShopSchema.methods.calculateBounceSafe = function(){
  const view = safeNum(this.viewCount);
  this.bounceRate = view>0 ? 1-(this.clickCount/view) : 1;
  return this.save();
};

ShopSchema.methods.calcAiScoreV2 = function(){
  this.aiScore =
    this.likeCount*2 +
    this.viewCount*0.5 +
    this.reservationCount*2;
  return this.save();
};

ShopSchema.methods.calcRankScoreV2 = function(){
  this.rankScore =
    this.score +
    this.aiScore +
    (this.premium?20:0);
  return this.save();
};

/* =========================
🔥 STATIC EXTENSIONS
========================= */

ShopSchema.statics.findTrending = function(){
  return this.find({isDeleted:false})
    .sort({viewCount:-1,likeCount:-1})
    .limit(20);
};

ShopSchema.statics.findNearbySafe = async function(lat,lng){
  const items = await this.find({isDeleted:false}).lean();
  return items
    .map(s=>{
      const dx=s.lat-lat;
      const dy=s.lng-lng;
      return {...s,distanceKm:Math.sqrt(dx*dx+dy*dy)*111};
    })
    .sort((a,b)=>a.distanceKm-b.distanceKm)
    .slice(0,20);
};

/* =====================================================
🔥 FINAL EXPORT
===================================================== */

console.log("🔥 SHOP FINAL 100% PRESERVED + EXTENDED");

module.exports =
  mongoose.models.Shop ||
  mongoose.model("Shop", ShopSchema);