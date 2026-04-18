const mongoose = require("mongoose");

/* ========================= */
/* 🔥 기존 유지 */
/* ========================= */
const schema = new mongoose.Schema({
  shopId: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", index: true },

  /* 🔥 추가 위치 10 */
  userId: { type: String, required: true },
  nickname: { type: String, default: "" },

  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 5,
    required: true
  },

  content: {
    type: String,
    trim: true,
    required: true
  },

  /* 🔥 추가 위치 11 */
  status: { 
    type: String, 
    enum: ["visible", "hidden"],
    default: "visible" 
  },

  likeCount: {
    type: Number,
    default: 0
  },

  reportCount: {
    type: Number,
    default: 0
  }

}, { timestamps: true });

/* ========================= */
/* 🔥 기존 인덱스 유지 */
/* ========================= */
schema.index({ shopId: 1, createdAt: -1 });
schema.index({ likeCount: -1 });
schema.index({ shopId: 1, userId: 1 }, { unique: true });

/* ========================= */
/* 🔥 기존 메서드 유지 */
/* ========================= */

/* 좋아요 증가 */
schema.methods.addLike = function () {
  this.likeCount = Math.max(0, this.likeCount + 1);
  return this.save();
};

/* 신고 */
schema.methods.report = function () {
  this.reportCount = Math.min(100, this.reportCount + 1);

  if (this.reportCount >= 5) {
    this.status = "hidden";
  }

  return this.save();
};

/* ========================= */
/* 🔥 추가 위치 12 */
/* ========================= */

/* 좋아요 취소 */
schema.methods.removeLike = function () {
  this.likeCount = Math.max(0, this.likeCount - 1);
  return this.save();
};

/* 신고 취소 */
schema.methods.unreport = function () {
  this.reportCount = Math.max(0, this.reportCount - 1);

  if (this.reportCount < 5) {
    this.status = "visible";
  }

  return this.save();
};

/* ========================= */
/* 🔥 추가 위치 13 */
/* ========================= */

/* 리뷰 숨김 */
schema.methods.hide = function () {
  this.status = "hidden";
  return this.save();
};

/* 리뷰 복구 */
schema.methods.restore = function () {
  this.status = "visible";
  return this.save();
};

/* ========================= */
/* 🔥 기존 static 유지 */
/* ========================= */
schema.statics.calcShopRating = async function (shopId) {
  const stats = await this.aggregate([
    {
      $match: {
        shopId: new mongoose.Types.ObjectId(shopId),
        status: "visible"
      }
    },
    {
      $group: {
        _id: "$shopId",
        ratingAvg: { $avg: "$rating" },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  return stats[0] || { ratingAvg: 0, reviewCount: 0 };
};

/* ========================= */
/* 🔥 추가 위치 14 */
/* ========================= */

// 최신 리뷰
schema.statics.findRecent = function (shopId, limit = 10) {
  return this.find({ shopId, status: "visible" })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// 인기 리뷰
schema.statics.findTop = function (shopId, limit = 10) {
  return this.find({ shopId, status: "visible" })
    .sort({ likeCount: -1 })
    .limit(limit);
};

// 유저 리뷰
schema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

/* ========================= */
/* 🔥 export 유지 */
/* ========================= */
/* =====================================================
🔥 FINAL ULTRA COMPLETE PATCH (REVIEW MODEL)
👉 ADD ONLY / NO BREAK
===================================================== */

/* =========================
1. 필드 확장
========================= */
schema.add({
  isDeleted: { type:Boolean, default:false, index:true },
  editedAt: { type:Date, default:null },
  lastActionAt: { type:Date, default:null },
  ip: { type:String, default:"" },
  device: { type:String, default:"" },
  images: [{ type:String }],
  tags: [{ type:String }],
  adminMemo: { type:String, default:"" },
  isPinned: { type:Boolean, default:false, index:true },
  priority: { type:Number, default:0 }
});

/* =========================
2. pre-save 안정화
========================= */
schema.pre("save", function(next){
  try{
    this.content = String(this.content || "").trim().slice(0,1000);
    this.nickname = String(this.nickname || "").trim();
    this.adminMemo = String(this.adminMemo || "").trim();

    if(this.rating < 1) this.rating = 1;
    if(this.rating > 5) this.rating = 5;

    this.likeCount = Math.max(0, this.likeCount||0);
    this.reportCount = Math.max(0, this.reportCount||0);

    this.tags = [...new Set(this.tags || [])];
    this.images = [...new Set(this.images || [])];

    this.lastActionAt = new Date();

    next();
  }catch(e){
    next(e);
  }
});

/* =========================
3. 수정 기능
========================= */
schema.methods.edit = function(content){
  this.content = String(content || "").trim().slice(0,1000);
  this.editedAt = new Date();
  return this.save();
};

/* =========================
4. soft delete
========================= */
schema.methods.softDelete = function(){
  this.isDeleted = true;
  this.status = "hidden";
  return this.save();
};

schema.methods.restoreSoft = function(){
  this.isDeleted = false;
  this.status = "visible";
  return this.save();
};

/* =========================
5. 이미지 관리
========================= */
schema.methods.addImage = function(url){
  if(!this.images.includes(url)){
    this.images.push(url);
  }
  return this.save();
};

schema.methods.removeImage = function(url){
  this.images = this.images.filter(v=>v!==url);
  return this.save();
};

/* =========================
6. 태그 관리
========================= */
schema.methods.addTag = function(tag){
  if(!this.tags.includes(tag)){
    this.tags.push(tag);
  }
  return this.save();
};

schema.methods.removeTag = function(tag){
  this.tags = this.tags.filter(v=>v!==tag);
  return this.save();
};

/* =========================
7. 핀 고정
========================= */
schema.methods.pin = function(){
  this.isPinned = true;
  return this.save();
};

schema.methods.unpin = function(){
  this.isPinned = false;
  return this.save();
};

/* =========================
8. 우선순위
========================= */
schema.methods.setPriority = function(p){
  this.priority = Number(p)||0;
  return this.save();
};

/* =========================
9. 활동 체크
========================= */
schema.methods.isPopular = function(){
  return this.likeCount > 10;
};

schema.methods.isRisk = function(){
  return this.reportCount >= 5;
};

/* =========================
10. 관리자 기능
========================= */
schema.methods.setAdminMemo = function(m){
  this.adminMemo = m;
  return this.save();
};

/* =========================
11. static 확장
========================= */

// 안전 조회
schema.statics.findSafe = function(filter={}){
  return this.find({ ...filter, isDeleted:false });
};

// 핀된 리뷰
schema.statics.findPinned = function(shopId){
  return this.find({
    shopId,
    isPinned:true,
    status:"visible"
  }).sort({ priority:-1, createdAt:-1 });
};

// 신고 많은 리뷰
schema.statics.findReported = function(){
  return this.find({ reportCount:{ $gte:5 } })
    .sort({ reportCount:-1 });
};

// 인기 리뷰
schema.statics.findPopular = function(shopId){
  return this.find({
    shopId,
    likeCount:{ $gte:5 },
    status:"visible"
  }).sort({ likeCount:-1 });
};

// 랜덤 리뷰
schema.statics.findRandom = async function(shopId, limit=5){
  const items = await this.find({ shopId, status:"visible" }).lean();

  return items.sort(()=>Math.random()-0.5).slice(0,limit);
};

// 키워드 검색
schema.statics.search = function(q){
  return this.find({
    content:{ $regex:q, $options:"i" }
  });
};

// 평점 필터
schema.statics.filterByRating = function(shopId, rating){
  return this.find({
    shopId,
    rating,
    status:"visible"
  });
};

/* =========================
12. 통계
========================= */
schema.statics.getStats = async function(shopId){
  const result = await this.aggregate([
    { $match:{ shopId:new mongoose.Types.ObjectId(shopId) } },
    {
      $group:{
        _id:null,
        avg:{ $avg:"$rating" },
        count:{ $sum:1 }
      }
    }
  ]);

  return result[0] || { avg:0, count:0 };
};

/* =========================
13. 캐시
========================= */
const REVIEW_CACHE = new Map();

schema.statics.cacheGet = function(key){
  const c = REVIEW_CACHE.get(key);
  if(!c) return null;
  if(Date.now()>c.expire){
    REVIEW_CACHE.delete(key);
    return null;
  }
  return c.data;
};

schema.statics.cacheSet = function(key,data,ttl=5000){
  REVIEW_CACHE.set(key,{
    data,
    expire:Date.now()+ttl
  });
};

/* =========================
14. 캐시 조회
========================= */
schema.statics.findCached = async function(key,fn){
  const cached = this.cacheGet(key);
  if(cached) return cached;

  const data = await fn();
  this.cacheSet(key,data);
  return data;
};

/* =========================
15. 정렬 강화
========================= */
schema.statics.findSorted = function(shopId){
  return this.find({ shopId, status:"visible" })
    .sort({ isPinned:-1, priority:-1, likeCount:-1, createdAt:-1 });
};

/* =========================
16. 자동 정리
========================= */
setInterval(()=>{
  if(REVIEW_CACHE.size > 100){
    REVIEW_CACHE.clear();
  }
},10000);

/* =========================
17. 디버그
========================= */
schema.methods.debug = function(){
  return {
    id:this._id,
    rating:this.rating,
    like:this.likeCount,
    report:this.reportCount,
    status:this.status
  };
};

console.log("🔥 REVIEW MODEL ULTRA COMPLETE READY");
module.exports = mongoose.model("Review", schema);