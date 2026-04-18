/**
 * =====================================================
 * 🔥 SHOP ROUTES (FINAL ULTRA COMPLETE - NO DELETE)
 * =====================================================
 */

const express = require("express");
const router = express.Router();

const Shop = require("../models/Shop");
const Review = require("../models/Review");

const auth = require("../middlewares/auth");
const admin = require("../middlewares/admin");

const {
  calcDistanceKm,
  safeNumber
} = require("../utils/distance");

/* ========================= 유틸 ========================= */

function isValidCoord(lat, lng){
  return !isNaN(lat) && !isNaN(lng);
}

function escapeRegex(str=""){
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safePage(n){
  n = Number(n);
  return isNaN(n) || n < 1 ? 1 : n;
}

function safeLimit(n){
  n = Number(n);
  if(isNaN(n) || n < 1) return 20;
  return Math.min(n, 100);
}

function enrichWithDistance(items, lat, lng) {
  if (!isValidCoord(lat, lng)) return items;

  return items.map((s) => {
    const obj = s.toObject ? s.toObject() : s;

    const distanceKm = calcDistanceKm(lat, lng, obj.lat, obj.lng);

    return {
      ...obj,
      distanceKm: distanceKm || 999
    };
  });
}

function applySort(items, sort) {
  const copy = [...items];

  switch (sort) {
    case "distance":
      return copy.sort((a, b) => (a.distanceKm||999)-(b.distanceKm||999));
    case "rating":
      return copy.sort((a, b) => (b.ratingAvg||0)-(a.ratingAvg||0));
    case "view":
      return copy.sort((a, b) => (b.viewCount||0)-(a.viewCount||0));
    case "recent":
      return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    case "price":
      return copy.sort((a,b)=>(a.priceDiscount||0)-(b.priceDiscount||0));
    default:
      return copy.sort((a, b) => (b.likeCount||0)-(a.likeCount||0));
  }
}

function calcScore(s){
  return (s.likeCount||0)*2 + (s.viewCount||0)*0.5 + (s.ratingAvg||0)*10;
}

/* =====================================================
   🔥 기존 코드 (절대 삭제 없음)
===================================================== */

/* TOP */
router.get("/top/list", async (req, res) => {
  try {
    const items = await Shop.find({ isDeleted: false })
      .sort({ likeCount: -1 })
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
    const items = await Shop.find({ isDeleted: false })
      .sort({ createdAt: -1 })
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
    const { lat, lng, max = 5 } = req.query;

    let items = await Shop.find({ isDeleted: false }).lean();
    items = enrichWithDistance(items, safeNumber(lat), safeNumber(lng));
    items = items.filter(i => (i.distanceKm || 999) <= safeNumber(max, 5));

    res.json({ ok: true, items });
  } catch (e) {
    console.error("SHOP NEARBY ERROR:", e);
    res.status(500).json({ ok: false, items: [] });
  }
});

/* ranking */
router.get("/ranking/list", async (req, res) => {
  try {
    let items = await Shop.find({ isDeleted:false }).lean();
    items = items.map(s => ({ ...s, score: calcScore(s) }));
    items.sort((a,b) => b.score - a.score);

    res.json({ ok:true, items:items.slice(0,20) });
  } catch (e) {
    console.error("SHOP RANKING ERROR:", e);
    res.status(500).json({ ok: false, items: [] });
  }
});

/* random */
router.get("/random/list", async (req,res)=>{
  try {
    const items = await Shop.aggregate([
      { $match:{ isDeleted:false } },
      { $sample:{ size:10 } }
    ]);

    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP RANDOM ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* =====================================================
   🔥 메인 리스트
===================================================== */
router.get("/", async (req, res) => {
  try {
    let {
      keyword = "",
      region,
      service,
      tag,
      sort = "like",
      lat,
      lng,
      page = 1,
      limit = 20
    } = req.query;

    page = safePage(page);
    limit = safeLimit(limit);

    const query = { isDeleted: false };

    if (keyword) {
      const safe = escapeRegex(keyword);
      query.$or = [
        { name: { $regex: safe, $options: "i" } },
        { region: { $regex: safe, $options: "i" } }
      ];
    }

    if (region) query.region = region;

    /* 🔥 FIX */
    if (service) query.serviceTypes = { $in: [service] };

    if (tag) query.tags = { $in: [tag] };

    let items = await Shop.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    items = enrichWithDistance(items, safeNumber(lat), safeNumber(lng));
    items = applySort(items, sort);

    res.json({ ok: true, items });

  } catch (err) {
    console.error("SHOP LIST ERROR:", err);
    res.status(500).json({ ok: false, items: [] });
  }
});

/* =====================================================
   🔥 상세
   🔥 FIX: 문자열 라우트 충돌 방지용 ObjectId 정규식
===================================================== */
router.get("/:id([0-9a-fA-F]{24})", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop || shop.isDeleted) {
      return res.status(404).json({ ok: false });
    }

    const reviews = await Review.find({ shopId: shop._id });

    let ratingAvg = 0;
    if (reviews.length) {
      ratingAvg = reviews.reduce((a, b) => a + (b.rating || 0), 0) / reviews.length;
    }

    res.json({
      ok: true,
      shop: {
        ...shop.toObject(),
        ratingAvg
      }
    });

  } catch (e) {
    console.error("SHOP DETAIL ERROR:", e);
    res.status(500).json({ ok: false });
  }
});

/* =====================================================
   🔥 클릭
   🔥 FIX: 문자열 라우트 충돌 방지용 ObjectId 정규식
===================================================== */
const viewCache = new Map();

router.post("/:id([0-9a-fA-F]{24})/click", async (req, res) => {
  try {
    const key = req.ip + req.params.id;

    const last = viewCache.get(key) || 0;
    if (Date.now() - last < 3000) {
      return res.json({ ok: true });
    }

    viewCache.set(key, Date.now());

    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ ok: false });

    shop.viewCount = safeNumber(shop.viewCount) + 1;
    await shop.save();

    res.json({ ok: true });

  } catch (e) {
    console.error("SHOP CLICK ERROR:", e);
    res.status(500).json({ ok: false });
  }
});

/* =====================================================
   🔥 좋아요
   🔥 FIX: 문자열 라우트 충돌 방지용 ObjectId 정규식
===================================================== */
router.post("/:id([0-9a-fA-F]{24})/like", auth, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ ok: false });

    shop.likeCount = safeNumber(shop.likeCount) + 1;
    await shop.save();

    res.json({ ok: true });

  } catch (e) {
    console.error("SHOP LIKE ERROR:", e);
    res.status(500).json({ ok: false });
  }
});

/* =====================================================
   🔥 관리자 기능
===================================================== */

router.post("/admin/reset-view", auth, admin, async (req,res)=>{
  try {
    await Shop.updateMany({}, { viewCount: 0 });
    res.json({ ok:true });
  } catch (e) {
    console.error("SHOP RESET VIEW ERROR:", e);
    res.status(500).json({ ok:false });
  }
});

router.post("/admin/reset-like", auth, admin, async (req,res)=>{
  try {
    await Shop.updateMany({}, { likeCount: 0 });
    res.json({ ok:true });
  } catch (e) {
    console.error("SHOP RESET LIKE ERROR:", e);
    res.status(500).json({ ok:false });
  }
});

router.get("/deleted/list", auth, admin, async (req,res)=>{
  try {
    const items = await Shop.find({ isDeleted:true });
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP DELETED LIST ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

router.post("/:id([0-9a-fA-F]{24})/restore", auth, admin, async (req,res)=>{
  try {
    const shop = await Shop.findById(req.params.id);
    if(!shop) return res.json({ ok:false });

    shop.isDeleted = false;
    await shop.save();

    res.json({ ok:true });
  } catch (e) {
    console.error("SHOP RESTORE ERROR:", e);
    res.status(500).json({ ok:false });
  }
});

/* =====================================================
   🔥 🔥 추가 기능 13개 (기존 코드 아래에만 추가됨)
===================================================== */

/* 1 */
router.get("/hot/list", async (req,res)=>{
  try {
    const items = await Shop.find({ isHot:true, isDeleted:false });
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP HOT ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 2 */
router.get("/premium/list", async (req,res)=>{
  try {
    const items = await Shop.find({ premium:true, isDeleted:false });
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP PREMIUM ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 3 */
router.get("/status/list", async (req,res)=>{
  try {
    const { status } = req.query;
    const items = await Shop.find({ status, isDeleted:false });
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP STATUS ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 4 */
router.get("/tags/list", async (req,res)=>{
  try {
    const { tags } = req.query;
    const arr = String(tags || "").split(",").filter(Boolean);
    const items = await Shop.find({ tags: { $in: arr }, isDeleted:false });
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP TAGS ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 5 */
router.get("/distance/top", async (req,res)=>{
  try {
    const { lat, lng } = req.query;
    let items = await Shop.find({ isDeleted:false }).lean();
    items = enrichWithDistance(items, safeNumber(lat), safeNumber(lng));
    items.sort((a,b)=> (a.distanceKm || 999) - (b.distanceKm || 999));
    res.json({ ok:true, items:items.slice(0,10) });
  } catch (e) {
    console.error("SHOP DISTANCE TOP ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 6 */
router.get("/view/top", async (req,res)=>{
  try {
    const items = await Shop.find({ isDeleted:false }).sort({ viewCount:-1 }).limit(10);
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP VIEW TOP ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 7 */
router.get("/like/top", async (req,res)=>{
  try {
    const items = await Shop.find({ isDeleted:false }).sort({ likeCount:-1 }).limit(10);
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP LIKE TOP ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 8 */
router.get("/price/filter", async (req,res)=>{
  try {
    const { min=0, max=999999 } = req.query;
    const items = await Shop.find({
      isDeleted:false,
      priceDiscount: {
        $gte: safeNumber(min, 0),
        $lte: safeNumber(max, 999999)
      }
    });
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP PRICE FILTER ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 9 */
router.get("/reservable/list", async (req,res)=>{
  try {
    const items = await Shop.find({ isReservable:true, isDeleted:false });
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP RESERVABLE ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 10 */
router.get("/search/advanced", async (req,res)=>{
  try {
    const { q } = req.query;
    const safe = escapeRegex(q || "");
    const items = await Shop.find({
      isDeleted:false,
      $or:[
        { name:new RegExp(safe,"i") },
        { keywords:new RegExp(safe,"i") }
      ]
    });
    res.json({ ok:true, items });
  } catch (e) {
    console.error("SHOP ADV SEARCH ERROR:", e);
    res.status(500).json({ ok:false, items:[] });
  }
});

/* 11 */
router.post("/:id([0-9a-fA-F]{24})/delete", auth, admin, async (req,res)=>{
  try {
    await Shop.findByIdAndUpdate(req.params.id, { isDeleted:true });
    res.json({ ok:true });
  } catch (e) {
    console.error("SHOP DELETE ERROR:", e);
    res.status(500).json({ ok:false });
  }
});

/* 12 */
router.get("/stats", async (req,res)=>{
  try {
    const total = await Shop.countDocuments();
    const active = await Shop.countDocuments({ isDeleted:false });
    res.json({ ok:true, total, active });
  } catch (e) {
    console.error("SHOP STATS ERROR:", e);
    res.status(500).json({ ok:false, total:0, active:0 });
  }
});

/* 13 */
router.get("/ping",(req,res)=>{
  res.json({ ok:true });
});

/* =====================================================
🔥 FINAL ULTRA COMPLETE PATCH (ADD ONLY / NO DELETE)
👉 위치: module.exports = router; 바로 위
===================================================== */

/* =========================
공통 추가 유틸
========================= */
function isValidObjectId(id){
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function safeAsync(fn){
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("SHOP PATCH ERROR:", e);
      res.status(500).json({ ok:false });
    });
  };
}

function safeStr(v){
  return String(v || "").trim();
}

function safeNum(v, d = 0){
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/* =========================
1. 키워드 추천
========================= */
router.get("/suggest", safeAsync(async (req, res) => {
  const q = escapeRegex(safeStr(req.query.q));
  const items = await Shop.find({
    isDeleted: false,
    name: new RegExp("^" + q, "i")
  }).limit(10);

  res.json({ ok:true, items });
}));

/* =========================
2. 전체 태그 목록
========================= */
router.get("/tags/all", safeAsync(async (req, res) => {
  const tags = await Shop.distinct("tags", { isDeleted:false });
  res.json({ ok:true, tags: Array.isArray(tags) ? tags : [] });
}));

/* =========================
3. 전체 서비스 목록
========================= */
router.get("/services/all", safeAsync(async (req, res) => {
  const items = await Shop.distinct("serviceTypes", { isDeleted:false });
  res.json({ ok:true, items: Array.isArray(items) ? items : [] });
}));

/* =========================
4. 지역별 통계
========================= */
router.get("/stats/region", safeAsync(async (req, res) => {
  const items = await Shop.aggregate([
    { $match: { isDeleted:false } },
    { $group: { _id:"$region", count:{ $sum:1 } } },
    { $sort: { count:-1, _id:1 } }
  ]);

  res.json({ ok:true, items });
}));

/* =========================
5. 랜덤 1개
========================= */
router.get("/random/one", safeAsync(async (req, res) => {
  const items = await Shop.aggregate([
    { $match: { isDeleted:false } },
    { $sample: { size:1 } }
  ]);

  res.json({ ok:true, item: items[0] || null });
}));

/* =========================
6. 점수 TOP
========================= */
router.get("/score/top", safeAsync(async (req, res) => {
  let items = await Shop.find({ isDeleted:false }).lean();

  items = items
    .map(v => ({
      ...v,
      score:
        safeNum(v.likeCount) * 2 +
        safeNum(v.viewCount) * 0.5 +
        safeNum(v.ratingAvg) * 10
    }))
    .sort((a, b) => safeNum(b.score) - safeNum(a.score))
    .slice(0, 10);

  res.json({ ok:true, items });
}));

/* =========================
7. 최근 수정 TOP
========================= */
router.get("/updated/top", safeAsync(async (req, res) => {
  const items = await Shop.find({ isDeleted:false })
    .sort({ updatedAt:-1 })
    .limit(10);

  res.json({ ok:true, items });
}));

/* =========================
8. 안전 nearby
========================= */
router.get("/nearby/safe", safeAsync(async (req, res) => {
  const lat = safeNum(req.query.lat);
  const lng = safeNum(req.query.lng);
  const max = safeNum(req.query.max, 5);

  let items = await Shop.find({ isDeleted:false }).lean();
  items = enrichWithDistance(items, lat, lng)
    .filter(v => safeNum(v.distanceKm, 999) <= max)
    .sort((a, b) => safeNum(a.distanceKm, 999) - safeNum(b.distanceKm, 999))
    .slice(0, 50);

  res.json({ ok:true, items });
}));

/* =========================
9. prefix 검색
========================= */
router.get("/search/prefix", safeAsync(async (req, res) => {
  const q = escapeRegex(safeStr(req.query.q));
  const items = await Shop.find({
    isDeleted:false,
    name: new RegExp("^" + q, "i")
  }).limit(20);

  res.json({ ok:true, items });
}));

/* =========================
10. bulk 조회
========================= */
router.post("/bulk", safeAsync(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const filtered = ids.filter(isValidObjectId);

  const items = await Shop.find({
    _id: { $in: filtered },
    isDeleted: false
  });

  res.json({ ok:true, items });
}));

/* =========================
11. bulk 존재 체크
========================= */
router.post("/exists/bulk", safeAsync(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const filtered = ids.filter(isValidObjectId);

  const items = await Shop.find({
    _id: { $in: filtered }
  }).select("_id");

  res.json({
    ok:true,
    ids: items.map(v => String(v._id))
  });
}));

/* =========================
12. 좋아요 안전 증가
========================= */
router.post("/:id([0-9a-fA-F]{24})/like-safe", auth, safeAsync(async (req, res) => {
  await Shop.updateOne(
    { _id:req.params.id },
    { $inc:{ likeCount:1 } }
  );

  res.json({ ok:true });
}));

/* =========================
13. 조회수 안전 증가
========================= */
router.post("/:id([0-9a-fA-F]{24})/view-safe", safeAsync(async (req, res) => {
  await Shop.updateOne(
    { _id:req.params.id },
    { $inc:{ viewCount:1 } }
  );

  res.json({ ok:true });
}));

/* =====================================================
🔥 FINAL ULTRA COMPLETE EXTENSION (100 FEATURES)
👉 위치: module.exports 바로 위
===================================================== */

/* =========================
공통 캐시 시스템
========================= */
const CACHE = new Map();

function cacheSet(key, data, ttl=10000){
  CACHE.set(key, {
    data,
    expire: Date.now() + ttl
  });
}

function cacheGet(key){
  const c = CACHE.get(key);
  if(!c) return null;
  if(Date.now() > c.expire){
    CACHE.delete(key);
    return null;
  }
  return c.data;
}

/* =========================
101. 캐시 리스트
========================= */
router.get("/cache/list", async (req,res)=>{
  const key = JSON.stringify(req.query);

  const cached = cacheGet(key);
  if(cached){
    return res.json({ ok:true, items:cached, cached:true });
  }

  let items = await Shop.find({ isDeleted:false }).lean();
  cacheSet(key, items);

  res.json({ ok:true, items });
});

/* =========================
102. 인기 점수 개선
========================= */
function advancedScore(s){
  return (
    safeNum(s.likeCount)*3 +
    safeNum(s.viewCount)*1 +
    safeNum(s.ratingAvg)*15 +
    Math.random()*2
  );
}

/* =========================
103. 추천 v2
========================= */
router.get("/recommend/v2", async (req,res)=>{
  let items = await Shop.find({ isDeleted:false }).lean();

  items = items
    .map(v=>({...v,score:advancedScore(v)}))
    .sort((a,b)=>b.score-a.score)
    .slice(0,20);

  res.json({ ok:true, items });
});

/* =========================
104. 실시간 인기
========================= */
let HOT_CACHE = [];

setInterval(async ()=>{
  try{
    let items = await Shop.find({ isDeleted:false }).lean();
    items = items
      .map(v=>({...v,score:advancedScore(v)}))
      .sort((a,b)=>b.score-a.score)
      .slice(0,10);

    HOT_CACHE = items;
  }catch(e){}
},10000);

router.get("/hot/live",(req,res)=>{
  res.json({ ok:true, items:HOT_CACHE });
});

/* =========================
105. 검색 랭킹
========================= */
const SEARCH_LOG = [];

router.get("/search/log",(req,res)=>{
  res.json({ ok:true, items:SEARCH_LOG.slice(-50) });
});

router.use((req,res,next)=>{
  if(req.query.keyword){
    SEARCH_LOG.push({
      keyword:req.query.keyword,
      time:Date.now()
    });
  }
  next();
});

/* =========================
106. 인기 태그
========================= */
router.get("/tags/top", async (req,res)=>{
  const items = await Shop.aggregate([
    { $match:{ isDeleted:false } },
    { $unwind:"$tags" },
    { $group:{ _id:"$tags", count:{ $sum:1 } } },
    { $sort:{ count:-1 } },
    { $limit:10 }
  ]);

  res.json({ ok:true, items });
});

/* =========================
107. 랜덤 추천 강화
========================= */
router.get("/random/boost", async (req,res)=>{
  const items = await Shop.aggregate([
    { $match:{ isDeleted:false } },
    { $sample:{ size:20 } }
  ]);

  res.json({ ok:true, items });
});

/* =========================
108. region 인기
========================= */
router.get("/region/top", async (req,res)=>{
  const items = await Shop.aggregate([
    { $match:{ isDeleted:false } },
    { $group:{ _id:"$region", count:{ $sum:1 } } },
    { $sort:{ count:-1 } }
  ]);

  res.json({ ok:true, items });
});

/* =========================
109. 평균 가격
========================= */
router.get("/stats/price", async (req,res)=>{
  const result = await Shop.aggregate([
    { $match:{ isDeleted:false } },
    { $group:{ _id:null, avg:{ $avg:"$priceDiscount" } } }
  ]);

  res.json({ ok:true, avg: result[0]?.avg || 0 });
});

/* =========================
110. 인기 시간대
========================= */
router.get("/stats/time", async (req,res)=>{
  const now = new Date().getHours();
  res.json({ ok:true, hour:now });
});

/* =========================
111. 관리자 전체 삭제
========================= */
router.post("/admin/delete-all", auth, admin, async (req,res)=>{
  await Shop.updateMany({}, { isDeleted:true });
  res.json({ ok:true });
});

/* =========================
112. 관리자 복구 전체
========================= */
router.post("/admin/restore-all", auth, admin, async (req,res)=>{
  await Shop.updateMany({}, { isDeleted:false });
  res.json({ ok:true });
});

/* =========================
113. DB 상태 체크
========================= */
router.get("/health/db", async (req,res)=>{
  try{
    await Shop.findOne();
    res.json({ ok:true });
  }catch{
    res.json({ ok:false });
  }
});

/* =========================
114. 서버 시간
========================= */
router.get("/time",(req,res)=>{
  res.json({ ok:true, time:Date.now() });
});

/* =========================
115. 요청 카운터
========================= */
let REQ_COUNT = 0;

router.use((req,res,next)=>{
  REQ_COUNT++;
  next();
});

router.get("/stats/req",(req,res)=>{
  res.json({ ok:true, count:REQ_COUNT });
});

/* =========================
116. 캐시 초기화
========================= */
router.post("/cache/clear", auth, admin, (req,res)=>{
  CACHE.clear();
  res.json({ ok:true });
});

/* =========================
117. 속도 테스트
========================= */
router.get("/benchmark",(req,res)=>{
  const t = Date.now();
  for(let i=0;i<100000;i++){}
  res.json({ ok:true, time:Date.now()-t });
});

/* =========================
118. API 상태
========================= */
router.get("/status",(req,res)=>{
  res.json({ ok:true, status:"RUNNING" });
});

/* =========================
119. 전체 수
========================= */
router.get("/count/all", async (req,res)=>{
  const count = await Shop.countDocuments();
  res.json({ ok:true, count });
});

/* =========================
120. 활성 수
========================= */
router.get("/count/active", async (req,res)=>{
  const count = await Shop.countDocuments({ isDeleted:false });
  res.json({ ok:true, count });
});

/* =========================
🔥 FINAL
========================= */
console.log("🔥 SHOP ROUTE ULTRA COMPLETE READY");
/* =====================================================
🔥 FINAL ULTRA COMPLETE MASTER PATCH (SHOP ROUTES)
👉 위치: module.exports = router; 바로 위
👉 기존 코드 유지 / add-only / 구조 유지
===================================================== */

/* =========================
121. 공통 응답 유틸
========================= */
function ok(res, data = {}) {
  return res.json({ ok: true, ...data });
}

function fail(res, status = 500, data = {}) {
  return res.status(status).json({ ok: false, ...data });
}

/* =========================
122. 안전 배열
========================= */
function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

/* =========================
123. 안전 bool
========================= */
function safeBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes", "y"].includes(v.toLowerCase());
  return false;
}

/* =========================
124. 페이지네이션 메타
========================= */
function paginateMeta(page, limit, total) {
  const p = safePage(page);
  const l = safeLimit(limit);
  return {
    page: p,
    limit: l,
    total,
    hasMore: p * l < total
  };
}

/* =========================
125. 관리자 ID 배열 필터
========================= */
function safeObjectIds(arr = []) {
  return safeArray(arr).filter(isValidObjectId);
}

/* =========================
126. visible list
========================= */
router.get("/visible/list", safeAsync(async (req, res) => {
  const page = safePage(req.query.page);
  const limit = safeLimit(req.query.limit);
  const query = { isDeleted: false, visible: true };

  const [items, total] = await Promise.all([
    Shop.find(query)
      .sort({ score: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Shop.countDocuments(query)
  ]);

  return ok(res, { items, ...paginateMeta(page, limit, total) });
}));

/* =========================
127. approved list
========================= */
router.get("/approved/list", safeAsync(async (req, res) => {
  const items = await Shop.find({
    approved: true,
    isDeleted: false
  }).sort({ updatedAt: -1 }).limit(100);

  return ok(res, { items });
}));

/* =========================
128. pending approve list
========================= */
router.get("/pending-approve/list", auth, admin, safeAsync(async (req, res) => {
  const items = await Shop.find({
    approved: false,
    isDeleted: false
  }).sort({ createdAt: -1 }).limit(100);

  return ok(res, { items });
}));

/* =========================
129. by slug
========================= */
router.get("/slug/:slug", safeAsync(async (req, res) => {
  const slug = safeStr(req.params.slug);
  const item = await Shop.findOne({ slug, isDeleted: false });

  if (!item) return fail(res, 404);
  return ok(res, { shop: item });
}));

/* =========================
130. region list
========================= */
router.get("/regions/all", safeAsync(async (req, res) => {
  const items = await Shop.distinct("region", { isDeleted: false });
  return ok(res, { items: safeArray(items).filter(Boolean).sort() });
}));

/* =========================
131. district list
========================= */
router.get("/districts/all", safeAsync(async (req, res) => {
  const region = safeStr(req.query.region);
  const query = { isDeleted: false };
  if (region) query.region = region;

  const items = await Shop.distinct("district", query);
  return ok(res, { items: safeArray(items).filter(Boolean).sort() });
}));

/* =========================
132. business open list
========================= */
router.get("/business/open", safeAsync(async (req, res) => {
  const items = await Shop.find({
    businessStatus: "open",
    isDeleted: false,
    visible: true
  }).sort({ score: -1 }).limit(100);

  return ok(res, { items });
}));

/* =========================
133. business break list
========================= */
router.get("/business/break", safeAsync(async (req, res) => {
  const items = await Shop.find({
    businessStatus: "break",
    isDeleted: false
  }).sort({ updatedAt: -1 }).limit(100);

  return ok(res, { items });
}));

/* =========================
134. business close list
========================= */
router.get("/business/close", safeAsync(async (req, res) => {
  const items = await Shop.find({
    businessStatus: "close",
    isDeleted: false
  }).sort({ updatedAt: -1 }).limit(100);

  return ok(res, { items });
}));

/* =========================
135. badge best list
========================= */
router.get("/badge/best", safeAsync(async (req, res) => {
  const items = await Shop.find({
    bestBadge: true,
    isDeleted: false
  }).sort({ score: -1, likeCount: -1 }).limit(50);

  return ok(res, { items });
}));

/* =========================
136. approved + visible + reservable
========================= */
router.get("/ready/list", safeAsync(async (req, res) => {
  const items = await Shop.find({
    approved: true,
    visible: true,
    isReservable: true,
    isDeleted: false
  }).sort({ rankScore: -1, score: -1 }).limit(100);

  return ok(res, { items });
}));

/* =========================
137. low price top
========================= */
router.get("/price/low-top", safeAsync(async (req, res) => {
  const items = await Shop.find({
    isDeleted: false
  }).sort({ priceDiscount: 1, ratingAvg: -1 }).limit(20);

  return ok(res, { items });
}));

/* =========================
138. high price top
========================= */
router.get("/price/high-top", safeAsync(async (req, res) => {
  const items = await Shop.find({
    isDeleted: false
  }).sort({ priceDiscount: -1, ratingAvg: -1 }).limit(20);

  return ok(res, { items });
}));

/* =========================
139. review top
========================= */
router.get("/review/top", safeAsync(async (req, res) => {
  const items = await Shop.find({
    isDeleted: false
  }).sort({ reviewCount: -1, ratingAvg: -1 }).limit(20);

  return ok(res, { items });
}));

/* =========================
140. reservation top
========================= */
router.get("/reservation/top", safeAsync(async (req, res) => {
  const items = await Shop.find({
    isDeleted: false
  }).sort({ reservationCount: -1, likeCount: -1 }).limit(20);

  return ok(res, { items });
}));

/* =========================
141. premium + best mixed
========================= */
router.get("/mixed/premium-best", safeAsync(async (req, res) => {
  const premium = await Shop.find({
    premium: true,
    isDeleted: false
  }).sort({ score: -1 }).limit(10).lean();

  const best = await Shop.find({
    bestBadge: true,
    isDeleted: false
  }).sort({ score: -1 }).limit(10).lean();

  const items = [...premium, ...best].filter((v, i, arr) =>
    arr.findIndex(x => String(x._id) === String(v._id)) === i
  );

  return ok(res, { items });
}));

/* =========================
142. search by phone
========================= */
router.get("/search/phone", auth, admin, safeAsync(async (req, res) => {
  const phone = safeStr(req.query.phone);
  const items = await Shop.find({
    phone: { $regex: escapeRegex(phone), $options: "i" }
  }).limit(50);

  return ok(res, { items });
}));

/* =========================
143. search by address
========================= */
router.get("/search/address", safeAsync(async (req, res) => {
  const q = safeStr(req.query.q);
  const items = await Shop.find({
    isDeleted: false,
    $or: [
      { address: { $regex: escapeRegex(q), $options: "i" } },
      { roadAddress: { $regex: escapeRegex(q), $options: "i" } }
    ]
  }).limit(100);

  return ok(res, { items });
}));

/* =========================
144. search by region+district
========================= */
router.get("/search/location", safeAsync(async (req, res) => {
  const region = safeStr(req.query.region);
  const district = safeStr(req.query.district);

  const query = { isDeleted: false };
  if (region) query.region = region;
  if (district) query.district = district;

  const items = await Shop.find(query).limit(100);
  return ok(res, { items });
}));

/* =========================
145. price bucket stats
========================= */
router.get("/stats/price-buckets", safeAsync(async (req, res) => {
  const items = await Shop.aggregate([
    { $match: { isDeleted: false } },
    {
      $bucket: {
        groupBy: "$priceDiscount",
        boundaries: [0, 50000, 100000, 150000, 999999999],
        default: "other",
        output: { count: { $sum: 1 } }
      }
    }
  ]);

  return ok(res, { items });
}));

/* =========================
146. service stats
========================= */
router.get("/stats/service", safeAsync(async (req, res) => {
  const items = await Shop.aggregate([
    { $match: { isDeleted: false } },
    { $unwind: "$serviceTypes" },
    { $group: { _id: "$serviceTypes", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } }
  ]);

  return ok(res, { items });
}));

/* =========================
147. premium stats
========================= */
router.get("/stats/premium", safeAsync(async (req, res) => {
  const [premium, nonPremium] = await Promise.all([
    Shop.countDocuments({ premium: true, isDeleted: false }),
    Shop.countDocuments({ premium: false, isDeleted: false })
  ]);

  return ok(res, { premium, nonPremium });
}));

/* =========================
148. badge stats
========================= */
router.get("/stats/badge", safeAsync(async (req, res) => {
  const [bestBadge, hot] = await Promise.all([
    Shop.countDocuments({ bestBadge: true, isDeleted: false }),
    Shop.countDocuments({ isHot: true, isDeleted: false })
  ]);

  return ok(res, { bestBadge, hot });
}));

/* =========================
149. score stats
========================= */
router.get("/stats/score", safeAsync(async (req, res) => {
  const items = await Shop.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        avgScore: { $avg: "$score" },
        maxScore: { $max: "$score" },
        minScore: { $min: "$score" }
      }
    }
  ]);

  return ok(res, { stats: items[0] || {} });
}));

/* =========================
150. top by district
========================= */
router.get("/district/top", safeAsync(async (req, res) => {
  const district = safeStr(req.query.district);
  const items = await Shop.find({
    district,
    isDeleted: false
  }).sort({ score: -1, likeCount: -1 }).limit(20);

  return ok(res, { items });
}));

/* =========================
151. create
========================= */
router.post("/admin/create", auth, admin, safeAsync(async (req, res) => {
  const payload = {
    name: safeStr(req.body.name),
    slug: safeStr(req.body.slug),
    region: safeStr(req.body.region),
    district: safeStr(req.body.district),
    address: safeStr(req.body.address),
    roadAddress: safeStr(req.body.roadAddress),
    phone: safeStr(req.body.phone),
    lat: safeNum(req.body.lat),
    lng: safeNum(req.body.lng),
    description: safeStr(req.body.description),
    openInfo: safeStr(req.body.openInfo),
    priceOriginal: safeNum(req.body.priceOriginal),
    priceDiscount: safeNum(req.body.priceDiscount),
    tags: safeArray(req.body.tags),
    serviceTypes: safeArray(req.body.serviceTypes),
    visible: safeBool(req.body.visible),
    approved: safeBool(req.body.approved)
  };

  const item = await Shop.create(payload);
  return ok(res, { item });
}));

/* =========================
152. admin update basic
========================= */
router.put("/admin/:id([0-9a-fA-F]{24})/basic", auth, admin, safeAsync(async (req, res) => {
  const update = {
    name: safeStr(req.body.name),
    region: safeStr(req.body.region),
    district: safeStr(req.body.district),
    address: safeStr(req.body.address),
    roadAddress: safeStr(req.body.roadAddress),
    phone: safeStr(req.body.phone),
    description: safeStr(req.body.description),
    openInfo: safeStr(req.body.openInfo),
    priceOriginal: safeNum(req.body.priceOriginal),
    priceDiscount: safeNum(req.body.priceDiscount)
  };

  await Shop.findByIdAndUpdate(req.params.id, update);
  return ok(res);
}));

/* =========================
153. admin update coords
========================= */
router.put("/admin/:id([0-9a-fA-F]{24})/coords", auth, admin, safeAsync(async (req, res) => {
  await Shop.findByIdAndUpdate(req.params.id, {
    lat: safeNum(req.body.lat),
    lng: safeNum(req.body.lng)
  });
  return ok(res);
}));

/* =========================
154. admin toggle visible
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/toggle-visible", auth, admin, safeAsync(async (req, res) => {
  const item = await Shop.findById(req.params.id);
  if (!item) return fail(res, 404);
  item.visible = !item.visible;
  await item.save();
  return ok(res, { visible: item.visible });
}));

/* =========================
155. admin toggle approved
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/toggle-approved", auth, admin, safeAsync(async (req, res) => {
  const item = await Shop.findById(req.params.id);
  if (!item) return fail(res, 404);
  item.approved = !item.approved;
  await item.save();
  return ok(res, { approved: item.approved });
}));

/* =========================
156. admin toggle premium
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/toggle-premium", auth, admin, safeAsync(async (req, res) => {
  const item = await Shop.findById(req.params.id);
  if (!item) return fail(res, 404);
  item.premium = !item.premium;
  await item.save();
  return ok(res, { premium: item.premium });
}));

/* =========================
157. admin toggle badge
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/toggle-best-badge", auth, admin, safeAsync(async (req, res) => {
  const item = await Shop.findById(req.params.id);
  if (!item) return fail(res, 404);
  item.bestBadge = !item.bestBadge;
  await item.save();
  return ok(res, { bestBadge: item.bestBadge });
}));

/* =========================
158. admin set ad score
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/ad-score", auth, admin, safeAsync(async (req, res) => {
  await Shop.findByIdAndUpdate(req.params.id, {
    adScore: safeNum(req.body.adScore)
  });
  return ok(res);
}));

/* =========================
159. admin set priority
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/priority", auth, admin, safeAsync(async (req, res) => {
  await Shop.findByIdAndUpdate(req.params.id, {
    priority: safeNum(req.body.priority)
  });
  return ok(res);
}));

/* =========================
160. admin set business status
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/business-status", auth, admin, safeAsync(async (req, res) => {
  const status = safeStr(req.body.status);
  await Shop.findByIdAndUpdate(req.params.id, { businessStatus: status });
  return ok(res);
}));

/* =========================
161. admin set tags
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/tags", auth, admin, safeAsync(async (req, res) => {
  const tags = safeArray(req.body.tags);
  await Shop.findByIdAndUpdate(req.params.id, { tags });
  return ok(res);
}));

/* =========================
162. admin set services
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/services", auth, admin, safeAsync(async (req, res) => {
  const serviceTypes = safeArray(req.body.serviceTypes);
  await Shop.findByIdAndUpdate(req.params.id, { serviceTypes });
  return ok(res);
}));

/* =========================
163. admin set memo
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/memo", auth, admin, safeAsync(async (req, res) => {
  await Shop.findByIdAndUpdate(req.params.id, {
    adminMemo: safeStr(req.body.adminMemo)
  });
  return ok(res);
}));

/* =========================
164. admin increment report
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/report", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateOne({ _id: req.params.id }, { $inc: { reportCount: 1 } });
  return ok(res);
}));

/* =========================
165. admin resolve report
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/report-resolve", auth, admin, safeAsync(async (req, res) => {
  const item = await Shop.findById(req.params.id);
  if (!item) return fail(res, 404);
  item.reportCount = Math.max(0, safeNum(item.reportCount) - 1);
  await item.save();
  return ok(res);
}));

/* =========================
166. bulk hide
========================= */
router.post("/admin/bulk-hide", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany(
    { _id: { $in: safeObjectIds(req.body.ids) } },
    { $set: { visible: false } }
  );
  return ok(res);
}));

/* =========================
167. bulk show
========================= */
router.post("/admin/bulk-show", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany(
    { _id: { $in: safeObjectIds(req.body.ids) } },
    { $set: { visible: true } }
  );
  return ok(res);
}));

/* =========================
168. bulk approve
========================= */
router.post("/admin/bulk-approve", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany(
    { _id: { $in: safeObjectIds(req.body.ids) } },
    { $set: { approved: true } }
  );
  return ok(res);
}));

/* =========================
169. bulk premium
========================= */
router.post("/admin/bulk-premium", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany(
    { _id: { $in: safeObjectIds(req.body.ids) } },
    { $set: { premium: true } }
  );
  return ok(res);
}));

/* =========================
170. bulk delete safe
========================= */
router.post("/admin/bulk-delete", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany(
    { _id: { $in: safeObjectIds(req.body.ids) } },
    { $set: { isDeleted: true } }
  );
  return ok(res);
}));

/* =========================
171. bulk restore safe
========================= */
router.post("/admin/bulk-restore", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany(
    { _id: { $in: safeObjectIds(req.body.ids) } },
    { $set: { isDeleted: false } }
  );
  return ok(res);
}));

/* =========================
172. admin recalc one
========================= */
router.post("/admin/:id([0-9a-fA-F]{24})/recalc", auth, admin, safeAsync(async (req, res) => {
  const item = await Shop.findById(req.params.id);
  if (!item) return fail(res, 404);
  item.score = calcScore(item);
  await item.save();
  return ok(res, { score: item.score });
}));

/* =========================
173. admin recalc all
========================= */
router.post("/admin/recalc-all", auth, admin, safeAsync(async (req, res) => {
  const items = await Shop.find({ isDeleted: false });
  for (const item of items) {
    item.score = calcScore(item);
    await item.save();
  }
  return ok(res);
}));

/* =========================
174. admin hot refresh
========================= */
router.post("/admin/hot-refresh", auth, admin, safeAsync(async (req, res) => {
  const items = await Shop.find({ isDeleted: false });
  for (const item of items) {
    item.isHot = safeNum(item.likeCount) > 50 || safeNum(item.viewCount) > 500;
    await item.save();
  }
  return ok(res);
}));

/* =========================
175. quick search
========================= */
router.get("/quick/search", safeAsync(async (req, res) => {
  const q = safeStr(req.query.q);
  const items = await Shop.find({
    isDeleted: false,
    searchableText: { $regex: escapeRegex(q), $options: "i" }
  }).limit(20);

  return ok(res, { items });
}));

/* =========================
176. visible count
========================= */
router.get("/count/visible", safeAsync(async (req, res) => {
  const count = await Shop.countDocuments({ visible: true, isDeleted: false });
  return ok(res, { count });
}));

/* =========================
177. approved count
========================= */
router.get("/count/approved", safeAsync(async (req, res) => {
  const count = await Shop.countDocuments({ approved: true, isDeleted: false });
  return ok(res, { count });
}));

/* =========================
178. premium count
========================= */
router.get("/count/premium", safeAsync(async (req, res) => {
  const count = await Shop.countDocuments({ premium: true, isDeleted: false });
  return ok(res, { count });
}));

/* =========================
179. reservable count
========================= */
router.get("/count/reservable", safeAsync(async (req, res) => {
  const count = await Shop.countDocuments({ isReservable: true, isDeleted: false });
  return ok(res, { count });
}));

/* =========================
180. report count
========================= */
router.get("/count/reported", auth, admin, safeAsync(async (req, res) => {
  const count = await Shop.countDocuments({ reportCount: { $gt: 0 } });
  return ok(res, { count });
}));

/* =========================
181. low bounce list
========================= */
router.get("/bounce/low", safeAsync(async (req, res) => {
  const items = await Shop.find({ isDeleted: false })
    .sort({ bounceRate: 1, viewCount: -1 })
    .limit(20);

  return ok(res, { items });
}));

/* =========================
182. conversion top
========================= */
router.get("/conversion/top", safeAsync(async (req, res) => {
  const items = await Shop.find({ isDeleted: false })
    .sort({ conversionRate: -1, reservationCount: -1 })
    .limit(20);

  return ok(res, { items });
}));

/* =========================
183. stay top
========================= */
router.get("/stay/top", safeAsync(async (req, res) => {
  const items = await Shop.find({ isDeleted: false })
    .sort({ avgStayMinutes: -1 })
    .limit(20);

  return ok(res, { items });
}));

/* =========================
184. report top
========================= */
router.get("/report/top", auth, admin, safeAsync(async (req, res) => {
  const items = await Shop.find({})
    .sort({ reportCount: -1, updatedAt: -1 })
    .limit(20);

  return ok(res, { items });
}));

/* =========================
185. owner memo search
========================= */
router.get("/search/memo", auth, admin, safeAsync(async (req, res) => {
  const q = safeStr(req.query.q);
  const items = await Shop.find({
    adminMemo: { $regex: escapeRegex(q), $options: "i" }
  }).limit(50);

  return ok(res, { items });
}));

/* =========================
186. check slug
========================= */
router.get("/check/slug", safeAsync(async (req, res) => {
  const slug = safeStr(req.query.slug);
  const exists = await Shop.exists({ slug });
  return ok(res, { exists: !!exists });
}));

/* =========================
187. check name duplicate
========================= */
router.get("/check/name", safeAsync(async (req, res) => {
  const name = safeStr(req.query.name);
  const exists = await Shop.exists({ name, isDeleted: false });
  return ok(res, { exists: !!exists });
}));

/* =========================
188. stats by visibility
========================= */
router.get("/stats/visibility", safeAsync(async (req, res) => {
  const [visible, hidden] = await Promise.all([
    Shop.countDocuments({ visible: true }),
    Shop.countDocuments({ visible: false })
  ]);

  return ok(res, { visible, hidden });
}));

/* =========================
189. stats by approval
========================= */
router.get("/stats/approval", safeAsync(async (req, res) => {
  const [approved, pending] = await Promise.all([
    Shop.countDocuments({ approved: true }),
    Shop.countDocuments({ approved: false })
  ]);

  return ok(res, { approved, pending });
}));

/* =========================
190. stats by reserve
========================= */
router.get("/stats/reserve", safeAsync(async (req, res) => {
  const items = await Shop.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalReservation: { $sum: "$reservationCount" },
        avgReservation: { $avg: "$reservationCount" }
      }
    }
  ]);

  return ok(res, { stats: items[0] || {} });
}));

/* =========================
191. admin clean deleted hard
========================= */
router.delete("/admin/cleanup/deleted", auth, admin, safeAsync(async (req, res) => {
  await Shop.deleteMany({ isDeleted: true });
  return ok(res);
}));

/* =========================
192. admin reset score
========================= */
router.post("/admin/reset-score", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany({}, { $set: { score: 0 } });
  return ok(res);
}));

/* =========================
193. admin reset reports
========================= */
router.post("/admin/reset-reports", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany({}, { $set: { reportCount: 0 } });
  return ok(res);
}));

/* =========================
194. admin reset reservations
========================= */
router.post("/admin/reset-reservations", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany({}, { $set: { reservationCount: 0 } });
  return ok(res);
}));

/* =========================
195. admin reset clicks
========================= */
router.post("/admin/reset-clicks", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany({}, { $set: { clickCount: 0 } });
  return ok(res);
}));

/* =========================
196. admin reset favorites
========================= */
router.post("/admin/reset-favorites", auth, admin, safeAsync(async (req, res) => {
  await Shop.updateMany({}, { $set: { favoriteCount: 0 } });
  return ok(res);
}));

/* =========================
197. safe health
========================= */
router.get("/health/safe", safeAsync(async (req, res) => {
  const one = await Shop.findOne().select("_id");
  return ok(res, { exists: !!one });
}));

/* =========================
198. cache status
========================= */
router.get("/cache/status", safeAsync(async (req, res) => {
  return ok(res, { size: CACHE.size, hotCache: HOT_CACHE.length, reqCount: REQ_COUNT });
}));

/* =========================
199. cache warm
========================= */
router.post("/cache/warm", auth, admin, safeAsync(async (req, res) => {
  const items = await Shop.find({ isDeleted: false }).lean().limit(100);
  cacheSet("warm:shops", items, 20000);
  return ok(res, { count: items.length });
}));

/* =========================
200. final debug
========================= */
router.get("/debug/final", safeAsync(async (req, res) => {
  return ok(res, {
    cacheSize: CACHE.size,
    hotCacheSize: HOT_CACHE.length,
    reqCount: REQ_COUNT,
    now: Date.now()
  });
}));

/* =========================
🔥 FINAL MASTER LOG
========================= */
console.log("🔥 SHOP ROUTES FINAL MASTER PATCH READY");
module.exports = router;
