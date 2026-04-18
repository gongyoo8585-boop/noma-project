"use strict";

const mongoose = require("mongoose");

/* =========================
   🔥 SCHEMA
========================= */
const InquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
      index: true
    },

    memo: { type: String, default: "" },
    doneAt: { type: Date, default: null },

    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    isDeleted: { type: Boolean, default: false, index: true },

    isRead: { type: Boolean, default: false, index: true },
    priority: { type: Number, default: 0 },
    category: { type: String, default: "", index: true },

    tags: [{ type: String }],

    assignedTo: { type: String, default: "" },
    lastCheckedAt: { type: Date, default: null },
    handleCount: { type: Number, default: 0 },

    isImportant: { type: Boolean, default: false, index: true },
    score: { type: Number, default: 0 },
    isNotified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

/* =========================
   🔥 INDEX (성능 최적화)
========================= */
InquirySchema.index({ createdAt: -1 });
InquirySchema.index({ phone: 1, createdAt: -1 });
InquirySchema.index({ status: 1, createdAt: -1 });
InquirySchema.index({ isDeleted: 1, status: 1, createdAt: -1 });
InquirySchema.index({ isRead: 1, isDeleted: 1, createdAt: -1 });
InquirySchema.index({ isImportant: 1, isDeleted: 1, createdAt: -1 });
InquirySchema.index({ category: 1, isDeleted: 1, createdAt: -1 });
InquirySchema.index({ tags: 1 }); // 🔥 중요

/* =========================
   🔥 UTIL
========================= */
function safeText(v) {
  return String(v || "")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim();
}

function safePhone(v) {
  return String(v || "").replace(/[^0-9]/g, "");
}

function safeNumber(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeRegex(q) {
  return String(q || "")
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =========================
   🔥 PRE SAVE (핵심 안정화)
========================= */
InquirySchema.pre("save", function (next) {
  try {
    if (!this.name || !this.phone || !this.content) {
      return next(new Error("필수값 누락"));
    }

    this.name = safeText(this.name);
    this.phone = safePhone(this.phone);
    this.content = safeText(this.content);
    this.memo = safeText(this.memo);

    this.priority = Math.max(0, safeNumber(this.priority));
    this.handleCount = Math.max(0, safeNumber(this.handleCount));
    this.score = Math.max(0, safeNumber(this.score));

    this.category = String(this.category || "").trim();
    this.assignedTo = String(this.assignedTo || "").trim();

    this.ip = String(this.ip || "").trim();
    this.userAgent = String(this.userAgent || "").trim();

    this.tags = [...new Set((this.tags || []).filter(Boolean).map(v => String(v).trim()))];

    // 🔥 doneAt 자동 처리
    if (this.status === "done" && !this.doneAt) {
      this.doneAt = new Date();
    }

    next();
  } catch (e) {
    next(e);
  }
});

/* =========================
   🔥 INSTANCE METHODS
========================= */

InquirySchema.methods.setStatus = function (status) {
  if (!["pending", "done"].includes(status)) {
    throw new Error("잘못된 상태");
  }

  this.status = status;
  this.doneAt = status === "done" ? new Date() : null;

  return this.save();
};

InquirySchema.methods.markRead = function () {
  this.isRead = true;
  this.lastCheckedAt = new Date();
  return this.save();
};

InquirySchema.methods.markImportant = function (flag = true) {
  this.isImportant = !!flag;
  return this.save();
};

InquirySchema.methods.assign = function (admin) {
  this.assignedTo = String(admin || "").trim();
  return this.save();
};

InquirySchema.methods.addTag = function (tag) {
  const t = String(tag || "").trim();
  if (!t) return this.save();

  if (!this.tags.includes(t)) this.tags.push(t);
  return this.save();
};

InquirySchema.methods.removeTag = function (tag) {
  const t = String(tag || "").trim();
  this.tags = this.tags.filter(v => v !== t);
  return this.save();
};

InquirySchema.methods.increaseHandle = function () {
  this.handleCount += 1;
  this.lastCheckedAt = new Date();
  return this.save();
};

InquirySchema.methods.calculateScore = function () {
  this.score =
    (this.priority * 10) +
    (this.isImportant ? 50 : 0) +
    (this.isRead ? 0 : 20);

  return this.save();
};

InquirySchema.methods.updateContent = function (content) {
  if (!content) throw new Error("내용 없음");
  this.content = safeText(content);
  return this.save();
};

InquirySchema.methods.updatePhone = function (phoneValue) {
  if (!phoneValue) throw new Error("전화번호 없음");
  this.phone = safePhone(phoneValue);
  return this.save();
};

InquirySchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

InquirySchema.methods.calcProcessTime = function () {
  if (!this.doneAt || !this.createdAt) return 0;

  return (
    new Date(this.doneAt).getTime() -
    new Date(this.createdAt).getTime()
  );
};

/* =========================
   🔥 STATIC METHODS
========================= */

InquirySchema.statics.findSafe = function () {
  return this.find({ isDeleted: false });
};

InquirySchema.statics.findAll = function () {
  return this.findSafe().sort({ createdAt: -1 });
};

InquirySchema.statics.search = function (q) {
  const safe = safeRegex(q);
  if (!safe) return this.findAll();

  return this.find({
    isDeleted: false,
    $or: [
      { name: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } }
    ]
  }).sort({ createdAt: -1 });
};

InquirySchema.statics.searchFull = function (q) {
  const safe = safeRegex(q);
  if (!safe) return this.findAll();

  return this.find({
    isDeleted: false,
    $or: [
      { name: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
      { content: { $regex: safe, $options: "i" } },
      { memo: { $regex: safe, $options: "i" } }
    ]
  }).sort({ createdAt: -1 });
};

InquirySchema.statics.findByTag = function (tag) {
  const t = String(tag || "").trim();
  if (!t) return this.findAll();

  return this.find({
    isDeleted: false,
    tags: t
  }).sort({ createdAt: -1 });
};

InquirySchema.statics.findUnread = function () {
  return this.find({
    isDeleted: false,
    isRead: false
  }).sort({ createdAt: -1 });
};

InquirySchema.statics.findImportant = function () {
  return this.find({
    isDeleted: false,
    isImportant: true
  }).sort({ createdAt: -1 });
};

InquirySchema.statics.getStats = async function () {
  const [pending, done, total] = await Promise.all([
    this.countDocuments({ status: "pending", isDeleted: false }),
    this.countDocuments({ status: "done", isDeleted: false }),
    this.countDocuments({ isDeleted: false })
  ]);

  return { pending, done, total };
};

/* =========================
   🔥 JSON
========================= */
InquirySchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

console.log("🔥 INQUIRY MODEL 100% COMPLETE");
/* =====================================================
🔥 FINAL ULTRA EXTENSION (ADD ONLY / NO MODIFY)
👉 위치: module.exports 바로 위
===================================================== */

/* =========================
1. 안전 tags 비교
========================= */
function __safeStr(v){
  return String(v || "").trim();
}

/* =========================
2. tags includes 안전화
========================= */
InquirySchema.methods.hasTag = function(tag){
  const t = __safeStr(tag);
  return (this.tags || []).some(v => __safeStr(v) === t);
};

/* =========================
3. addTag 완전 안전
========================= */
InquirySchema.methods.addTagSafe = function(tag){
  const t = __safeStr(tag);
  if(!t) return this;

  if(!this.tags) this.tags = [];

  if(!this.tags.some(v => __safeStr(v) === t)){
    this.tags.push(t);
  }

  return this.save();
};

/* =========================
4. handleCount 보호
========================= */
InquirySchema.methods.increaseHandleSafe = function(){
  this.handleCount = Math.max(0, safeNumber(this.handleCount, 0) + 1);
  this.lastCheckedAt = new Date();
  return this.save();
};

/* =========================
5. score 자동 재계산
========================= */
InquirySchema.methods.recalculateScore = function(){
  this.score =
    safeNumber(this.priority)*10 +
    (this.isImportant ? 50 : 0) +
    (this.isRead ? 0 : 20);

  return this.save();
};

/* =========================
6. 강제 읽음 처리
========================= */
InquirySchema.methods.forceRead = function(){
  this.isRead = true;
  this.lastCheckedAt = new Date();
  return this.save();
};

/* =========================
7. 강제 담당자 지정
========================= */
InquirySchema.methods.assignSafe = function(admin){
  this.assignedTo = __safeStr(admin);
  return this.save();
};

/* =========================
8. 카테고리 안전 설정
========================= */
InquirySchema.methods.setCategorySafe = function(cat){
  this.category = __safeStr(cat);
  return this.save();
};

/* =========================
9. memo sanitize 강화
========================= */
InquirySchema.methods.updateMemoSafe = function(memo){
  this.memo = safeText(memo);
  return this.save();
};

/* =========================
10. 오래된 문의 판단
========================= */
InquirySchema.methods.isOld = function(hours=24){
  return (
    Date.now() - new Date(this.createdAt).getTime()
    > hours * 3600000
  );
};

/* =========================
11. pending 오래된 조회
========================= */
InquirySchema.statics.findStale = function(hours=24){
  const d = new Date(Date.now() - hours*3600000);

  return this.find({
    isDeleted:false,
    status:"pending",
    createdAt:{ $lte:d }
  });
};

/* =========================
12. bulk mark read
========================= */
InquirySchema.statics.markAllRead = function(){
  return this.updateMany(
    { isRead:false, isDeleted:false },
    { $set:{ isRead:true } }
  );
};

/* =========================
13. bulk soft delete
========================= */
InquirySchema.statics.softDeleteMany = function(ids=[]){
  return this.updateMany(
    { _id:{ $in:ids } },
    { $set:{ isDeleted:true } }
  );
};

/* =========================
14. priority TOP
========================= */
InquirySchema.statics.findTopPriority = function(limit=20){
  return this.find({ isDeleted:false })
    .sort({ priority:-1, createdAt:-1 })
    .limit(limit);
};

/* =========================
15. score TOP
========================= */
InquirySchema.statics.findTopScore = function(limit=20){
  return this.find({ isDeleted:false })
    .sort({ score:-1, createdAt:-1 })
    .limit(limit);
};

/* =========================
16. 안전 검색 (완전 버전)
========================= */
InquirySchema.statics.searchSafe = function(q){
  const safe = safeRegex(q);
  if(!safe) return this.findAll();

  return this.find({
    isDeleted:false,
    $or:[
      { name:{ $regex:safe,$options:"i" } },
      { phone:{ $regex:safe,$options:"i" } },
      { content:{ $regex:safe,$options:"i" } },
      { memo:{ $regex:safe,$options:"i" } },
      { category:{ $regex:safe,$options:"i" } }
    ]
  });
};

/* =========================
17. 자동 score 계산 hook
========================= */
InquirySchema.pre("save", function(next){
  try{
    this.score =
      safeNumber(this.priority)*10 +
      (this.isImportant ? 50 : 0) +
      (this.isRead ? 0 : 20);
    next();
  }catch(e){ next(e); }
});

/* =========================
18. 자동 handleCount 보호
========================= */
InquirySchema.pre("save", function(next){
  this.handleCount = Math.max(0, safeNumber(this.handleCount));
  next();
});

/* =========================
19. tags sanitize 보강
========================= */
InquirySchema.pre("save", function(next){
  this.tags = [...new Set(
    (this.tags||[])
      .map(v=>__safeStr(v))
      .filter(Boolean)
  )];
  next();
});

/* =========================
20. done 상태 보정
========================= */
InquirySchema.pre("save", function(next){
  if(this.status === "done" && !this.doneAt){
    this.doneAt = new Date();
  }
  next();
});

/* =========================
🔥 FINAL LOG
========================= */
console.log("🔥 INQUIRY ULTRA PATCH 100% COMPLETE");
module.exports =
  mongoose.models.Inquiry ||
  mongoose.model("Inquiry", InquirySchema);