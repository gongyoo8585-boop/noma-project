const mongoose = require("mongoose");

/* =====================================================
   🔥 EVENT SCHEMA (완성형)
===================================================== */

const EventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["attendance", "roulette", "promo"],
      default: "attendance",
      index: true
    },

    description: {
      type: String,
      default: ""
    },

    /* =========================
       🔥 기간
    ========================= */
    startAt: {
      type: Date,
      required: true,
      index: true
    },

    endAt: {
      type: Date,
      required: true,
      index: true
    },

    /* =========================
       🔥 상태
    ========================= */
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    /* =========================
       🔥 참여 설정
    ========================= */
    maxParticipants: {
      type: Number,
      default: 0 // 0 = 무제한
    },

    rewardPoint: {
      type: Number,
      default: 0
    },

    /* =========================
       🔥 참여 기록
    ========================= */
    participants: [
      {
        userId: String,
        joinedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]

  },
  {
    timestamps: true
  }
);

/* =====================================================
   🔥 인덱스
===================================================== */
EventSchema.index({ type: 1, isActive: 1 });
EventSchema.index({ startAt: 1, endAt: 1 });

/* =====================================================
   🔥 유틸
===================================================== */

// 현재 진행중 이벤트
EventSchema.methods.isRunning = function () {
  const now = new Date();
  return this.isActive && !this.isDeleted &&
    now >= this.startAt &&
    now <= this.endAt;
};

// 종료 여부
EventSchema.methods.isEnded = function () {
  return new Date() > this.endAt;
};

/* =====================================================
   🔥 참여 처리
===================================================== */
EventSchema.methods.join = async function (userId) {

  if (!this.isRunning()) {
    throw new Error("이벤트 진행중 아님");
  }

  // 중복 참여 방지
  const exists = this.participants.find(p => p.userId === userId);
  if (exists) {
    throw new Error("이미 참여함");
  }

  // 최대 인원 제한
  if (this.maxParticipants > 0 &&
      this.participants.length >= this.maxParticipants) {
    throw new Error("참여 마감");
  }

  this.participants.push({ userId });

  return this.save();
};

/* =====================================================
   🔥 통계
===================================================== */

// 참여 수
EventSchema.methods.getParticipantCount = function () {
  return this.participants.length;
};

// 참여 여부
EventSchema.methods.hasJoined = function (userId) {
  return this.participants.some(p => p.userId === userId);
};

/* =====================================================
   🔥 static
===================================================== */

// 활성 이벤트
EventSchema.statics.findActive = function () {
  const now = new Date();

  return this.find({
    isActive: true,
    isDeleted: false,
    startAt: { $lte: now },
    endAt: { $gte: now }
  }).sort({ startAt: 1 });
};

// 타입별 이벤트
EventSchema.statics.findByType = function (type) {
  return this.find({
    type,
    isDeleted: false
  }).sort({ createdAt: -1 });
};

// 종료된 이벤트
EventSchema.statics.findEnded = function () {
  const now = new Date();

  return this.find({
    endAt: { $lt: now }
  }).sort({ endAt: -1 });
};

/* =====================================================
   🔥 저장 전 자동 처리
===================================================== */
EventSchema.pre("save", function (next) {

  if (!this.name) {
    return next(new Error("이벤트 이름 필요"));
  }

  if (this.startAt >= this.endAt) {
    return next(new Error("기간 설정 오류"));
  }

  next();
});

/* =====================================================
🔥 FINAL ULTRA COMPLETE PATCH (ADD ONLY / NO DELETE)
👉 위치: module.exports 바로 위
===================================================== */

/* =========================
1. 추가 필드 확장
========================= */
EventSchema.add({
  slug: {
    type: String,
    default: "",
    index: true
  },
  bannerImage: {
    type: String,
    default: ""
  },
  thumbnail: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    enum: ["draft", "scheduled", "running", "ended", "hidden"],
    default: "scheduled",
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  winnerUserIds: {
    type: [String],
    default: []
  },
  couponCode: {
    type: String,
    default: ""
  },
  joinedCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  },
  shareCount: {
    type: Number,
    default: 0
  },
  tag: {
    type: String,
    default: "",
    index: true
  },
  targetRole: {
    type: String,
    default: "all",
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

/* =========================
2. 인덱스 추가
========================= */
EventSchema.index({ isDeleted: 1, isActive: 1, startAt: 1, endAt: 1 });
EventSchema.index({ priority: -1, createdAt: -1 });
EventSchema.index({ slug: 1, isDeleted: 1 });
EventSchema.index({ tag: 1, isDeleted: 1 });
EventSchema.index({ status: 1, isDeleted: 1 });

/* =========================
3. 저장 전 slug 자동 생성
========================= */
EventSchema.pre("save", function(next){
  try{
    if(!this.slug && this.name){
      this.slug = String(this.name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9가-힣_-]/g, "");
    }
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
4. 저장 전 숫자 보정
========================= */
EventSchema.pre("save", function(next){
  try{
    if(this.maxParticipants < 0) this.maxParticipants = 0;
    if(this.rewardPoint < 0) this.rewardPoint = 0;
    if(this.priority < 0) this.priority = 0;
    if(this.joinedCount < 0) this.joinedCount = 0;
    if(this.viewCount < 0) this.viewCount = 0;
    if(this.shareCount < 0) this.shareCount = 0;
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
5. 저장 전 상태 자동 계산
========================= */
EventSchema.pre("save", function(next){
  try{
    const now = new Date();

    if(this.isDeleted){
      this.status = "hidden";
      return next();
    }

    if(!this.isActive){
      if(this.status === "running") this.status = "scheduled";
      return next();
    }

    if(now < this.startAt){
      this.status = "scheduled";
    }else if(now >= this.startAt && now <= this.endAt){
      this.status = "running";
    }else if(now > this.endAt){
      this.status = "ended";
    }

    next();
  }catch(e){
    next(e);
  }
});

/* =========================
6. 참가 수 자동 동기화
========================= */
EventSchema.pre("save", function(next){
  try{
    if(!Array.isArray(this.participants)){
      this.participants = [];
    }

    const uniq = [];
    const seen = new Set();

    for(const p of this.participants){
      if(!p || !p.userId) continue;
      if(seen.has(p.userId)) continue;
      seen.add(p.userId);
      uniq.push(p);
    }

    this.participants = uniq;
    this.joinedCount = this.participants.length;

    next();
  }catch(e){
    next(e);
  }
});

/* =========================
7. 숨김 처리
========================= */
EventSchema.methods.softDelete = function(){
  this.isDeleted = true;
  this.isActive = false;
  this.status = "hidden";
  return this.save();
};

/* =========================
8. 복구 처리
========================= */
EventSchema.methods.restore = function(){
  this.isDeleted = false;
  this.isActive = true;
  return this.save();
};

/* =========================
9. 조회수 증가
========================= */
EventSchema.methods.increaseView = function(){
  this.viewCount = Number(this.viewCount || 0) + 1;
  return this.save();
};

/* =========================
10. 공유수 증가
========================= */
EventSchema.methods.increaseShare = function(){
  this.shareCount = Number(this.shareCount || 0) + 1;
  return this.save();
};

/* =========================
11. 우승자 추가
========================= */
EventSchema.methods.addWinner = function(userId){
  if(!userId) throw new Error("userId 필요");

  if(!this.winnerUserIds.includes(userId)){
    this.winnerUserIds.push(userId);
  }

  return this.save();
};

/* =========================
12. 참가 취소
========================= */
EventSchema.methods.leave = function(userId){
  this.participants = (this.participants || []).filter(p => p.userId !== userId);
  this.joinedCount = this.participants.length;
  return this.save();
};

/* =========================
13. 점수형 정렬용 메서드
========================= */
EventSchema.methods.getScore = function(){
  return (
    Number(this.joinedCount || 0) * 3 +
    Number(this.viewCount || 0) +
    Number(this.shareCount || 0) * 2 +
    Number(this.priority || 0) * 5
  );
};

/* =========================
14. 쿠폰 설정
========================= */
EventSchema.methods.setCoupon = function(code){
  this.couponCode = String(code || "").trim();
  return this.save();
};

/* =========================
15. 메타데이터 병합
========================= */
EventSchema.methods.setMetadata = function(data = {}){
  this.metadata = {
    ...(this.metadata || {}),
    ...(data || {})
  };
  return this.save();
};

/* =========================
16. draft 여부
========================= */
EventSchema.methods.isDraft = function(){
  return this.status === "draft";
};

/* =========================
17. visible 여부
========================= */
EventSchema.methods.isVisibleNow = function(){
  return !this.isDeleted && this.isActive && this.status !== "hidden";
};

/* =========================
18. 최근 활성 이벤트
========================= */
EventSchema.statics.findRecentActive = function(limit = 10){
  return this.find({
    isDeleted: false,
    isActive: true
  })
  .sort({ startAt: -1, createdAt: -1 })
  .limit(limit);
};

/* =========================
19. 우선순위 이벤트
========================= */
EventSchema.statics.findPriority = function(limit = 10){
  return this.find({
    isDeleted: false,
    isActive: true
  })
  .sort({ priority: -1, startAt: 1 })
  .limit(limit);
};

/* =========================
20. slug 조회
========================= */
EventSchema.statics.findBySlug = function(slug){
  return this.findOne({
    slug,
    isDeleted: false
  });
};

/* =========================
21. tag 조회
========================= */
EventSchema.statics.findByTag = function(tag){
  return this.find({
    tag,
    isDeleted: false
  }).sort({ createdAt: -1 });
};

/* =========================
22. 진행 예정 이벤트
========================= */
EventSchema.statics.findUpcoming = function(limit = 20){
  const now = new Date();

  return this.find({
    isDeleted: false,
    startAt: { $gt: now }
  })
  .sort({ startAt: 1 })
  .limit(limit);
};

/* =========================
23. 인기 이벤트
========================= */
EventSchema.statics.findTrending = async function(limit = 10){
  const items = await this.find({
    isDeleted: false,
    isActive: true
  }).lean();

  return items
    .map(v => ({
      ...v,
      score:
        Number(v.joinedCount || 0) * 3 +
        Number(v.viewCount || 0) +
        Number(v.shareCount || 0) * 2 +
        Number(v.priority || 0) * 5
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

module.exports =
  mongoose.models.Event ||
  mongoose.model("Event", EventSchema);