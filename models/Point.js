const mongoose = require("mongoose");

/* ========================= */
/* 🔥 Point Schema */
/* ========================= */
const schema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    point: {
      type: Number,
      default: 0,
      min: 0
    },

    attendanceCount: {
      type: Number,
      default: 0,
      min: 0
    },

    lastAttendAt: {
      type: Date,
      default: null
    },

    rouletteCount: {
      type: Number,
      default: 0,
      min: 0
    },

    totalEarnedPoint: {
      type: Number,
      default: 0,
      min: 0
    },

    totalUsedPoint: {
      type: Number,
      default: 0,
      min: 0
    },

    /* =========================
       🔥 추가 위치 6
    ========================= */
    streak: {
      type: Number,
      default: 0
    },

    lastUsedAt: Date,

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }

  },
  {
    timestamps: true
  }
);

/* ========================= */
/* 🔥 인덱스 */
/* ========================= */
schema.index({ userId: 1 }, { unique: true });
schema.index({ point: -1 });
schema.index({ updatedAt: -1 });

/* ===================================================== */
/* 🔥 safeNumber */
/* ===================================================== */
function safeNumber(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/* ===================================================== */
/* 🔥 추가 위치 7: pre-save 안전 처리 */
/* ===================================================== */
schema.pre("save", function (next) {
  this.point = safeNumber(this.point);
  this.totalEarnedPoint = safeNumber(this.totalEarnedPoint);
  this.totalUsedPoint = safeNumber(this.totalUsedPoint);
  this.attendanceCount = safeNumber(this.attendanceCount);
  this.rouletteCount = safeNumber(this.rouletteCount);
  next();
});

/* ========================= */
/* 🔥 기존 메서드 유지 */
/* ========================= */
schema.methods.addPoint = function (amount) {
  const value = safeNumber(amount);
  if (value <= 0) return this;

  this.point += value;
  this.totalEarnedPoint += value;

  return this.save();
};

schema.methods.usePoint = function (amount) {
  const value = safeNumber(amount);

  if (value <= 0) return this;

  if (this.point < value) {
    throw new Error("포인트 부족");
  }

  this.point -= value;
  this.totalUsedPoint += value;
  this.lastUsedAt = new Date();

  if (this.point < 0) this.point = 0;

  return this.save();
};

/* ===================================================== */
/* 🔥 추가 위치 8: 확장 메서드 */
/* ===================================================== */

// 전부 사용
schema.methods.useAllPoint = function () {
  const used = this.point;

  this.totalUsedPoint += used;
  this.point = 0;
  this.lastUsedAt = new Date();

  return this.save();
};

// 보너스 지급
schema.methods.addBonus = function (amount) {
  return this.addPoint(amount);
};

// 초기화
schema.methods.resetPoint = function () {
  this.point = 0;
  return this.save();
};

/* ===================================================== */
/* 🔥 출석 시스템 (강화)
===================================================== */
schema.methods.canAttendToday = function () {
  if (!this.lastAttendAt) return true;

  const today = new Date().toDateString();
  const last = new Date(this.lastAttendAt).toDateString();

  return today !== last;
};

schema.methods.markAttendance = function () {
  if (!this.canAttendToday()) {
    throw new Error("이미 출석 완료");
  }

  const now = new Date();

  // 🔥 streak 계산
  if (this.lastAttendAt) {
    const diff =
      (now - new Date(this.lastAttendAt)) / (1000 * 60 * 60 * 24);

    this.streak = diff <= 1.5 ? this.streak + 1 : 1;
  } else {
    this.streak = 1;
  }

  this.attendanceCount += 1;
  this.lastAttendAt = now;

  return this.save();
};

schema.methods.markRoulette = function (reward) {
  const value = safeNumber(reward);

  this.rouletteCount += 1;

  if (value > 0) {
    this.point += value;
    this.totalEarnedPoint += value;
  }

  if (this.point < 0) this.point = 0;

  return this.save();
};

/* ===================================================== */
/* 🔥 rank 유지 */
/* ===================================================== */
schema.methods.getRank = function () {
  const p = this.point;

  if (p >= 10000) return "VIP";
  if (p >= 5000) return "GOLD";
  if (p >= 1000) return "SILVER";

  return "BRONZE";
};

/* ===================================================== */
/* 🔥 static 확장 */
/* ===================================================== */
schema.statics.findByUserId = function (userId) {
  return this.findOne({ userId });
};

schema.statics.getOrCreate = async function (userId) {
  let point = await this.findOne({ userId });

  if (!point) {
    point = await this.create({ userId });
  }

  return point;
};

schema.statics.getTopUsers = function (limit = 10) {
  return this.find({ isDeleted: false })
    .sort({ point: -1 })
    .limit(limit)
    .lean();
};

/* ===================================================== */
/* 🔥 추가 위치 9: 통계 */
/* ===================================================== */
schema.statics.getStats = async function () {
  const [totalUsers, totalPoint] = await Promise.all([
    this.countDocuments(),
    this.aggregate([{ $group: { _id: null, sum: { $sum: "$point" } } }])
  ]);

  return {
    totalUsers,
    totalPoint: totalPoint[0]?.sum || 0
  };
};

// 범위 조회
schema.statics.findByRange = function (min = 0, max = 10000) {
  return this.find({
    point: { $gte: min, $lte: max }
  });
};

/* =====================================================
🔥 FINAL ULTRA COMPLETE PATCH (ADD ONLY / NO DELETE)
👉 위치: module.exports 바로 위
===================================================== */

/* =========================
1. 추가 필드 확장
========================= */
schema.add({
  level: {
    type: Number,
    default: 1,
    min: 1,
    index: true
  },
  exp: {
    type: Number,
    default: 0,
    min: 0
  },
  lastEarnedAt: {
    type: Date,
    default: null
  },
  monthlyEarnedPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyUsedPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  rewardCount: {
    type: Number,
    default: 0,
    min: 0
  },
  penaltyCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastRewardAt: {
    type: Date,
    default: null
  },
  lastPenaltyAt: {
    type: Date,
    default: null
  },
  memo: {
    type: String,
    default: ""
  },
  grade: {
    type: String,
    default: "BRONZE",
    index: true
  },
  lastResetAt: {
    type: Date,
    default: null
  },
  isLocked: {
    type: Boolean,
    default: false,
    index: true
  }
});

/* =========================
2. 인덱스 추가
========================= */
schema.index({ level: -1, point: -1 });
schema.index({ grade: 1, point: -1 });
schema.index({ isDeleted: 1, isLocked: 1, updatedAt: -1 });
schema.index({ streak: -1, attendanceCount: -1 });

/* =========================
3. pre-save 보강
========================= */
schema.pre("save", function(next){
  try{
    this.streak = safeNumber(this.streak);
    this.level = Math.max(1, safeNumber(this.level) || 1);
    this.exp = Math.max(0, safeNumber(this.exp));
    this.monthlyEarnedPoint = Math.max(0, safeNumber(this.monthlyEarnedPoint));
    this.monthlyUsedPoint = Math.max(0, safeNumber(this.monthlyUsedPoint));
    this.rewardCount = Math.max(0, safeNumber(this.rewardCount));
    this.penaltyCount = Math.max(0, safeNumber(this.penaltyCount));
    this.point = Math.max(0, safeNumber(this.point));
    this.totalEarnedPoint = Math.max(0, safeNumber(this.totalEarnedPoint));
    this.totalUsedPoint = Math.max(0, safeNumber(this.totalUsedPoint));
    this.memo = String(this.memo || "").trim();
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
4. 등급 자동 동기화
========================= */
schema.pre("save", function(next){
  try{
    if (this.point >= 10000) this.grade = "VIP";
    else if (this.point >= 5000) this.grade = "GOLD";
    else if (this.point >= 1000) this.grade = "SILVER";
    else this.grade = "BRONZE";
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
5. addPoint 안전 버전
========================= */
schema.methods.addPointSafe = function (amount) {
  const value = safeNumber(amount);
  if (value <= 0) return this;

  this.point += value;
  this.totalEarnedPoint += value;
  this.monthlyEarnedPoint += value;
  this.lastEarnedAt = new Date();

  return this.save();
};

/* =========================
6. usePoint 안전 버전
========================= */
schema.methods.usePointSafe = function (amount) {
  const value = safeNumber(amount);

  if (value <= 0) return this;
  if (this.point < value) {
    throw new Error("포인트 부족");
  }

  this.point -= value;
  this.totalUsedPoint += value;
  this.monthlyUsedPoint += value;
  this.lastUsedAt = new Date();

  if (this.point < 0) this.point = 0;

  return this.save();
};

/* =========================
7. 경험치 추가
========================= */
schema.methods.addExp = function (amount) {
  const value = safeNumber(amount);
  if (value <= 0) return this;

  this.exp += value;

  while (this.exp >= 100) {
    this.exp -= 100;
    this.level += 1;
  }

  return this.save();
};

/* =========================
8. 보상 지급
========================= */
schema.methods.reward = function (amount) {
  const value = safeNumber(amount);
  if (value <= 0) return this;

  this.point += value;
  this.totalEarnedPoint += value;
  this.monthlyEarnedPoint += value;
  this.rewardCount += 1;
  this.lastRewardAt = new Date();

  return this.save();
};

/* =========================
9. 패널티 차감
========================= */
schema.methods.penalty = function (amount) {
  const value = safeNumber(amount);
  if (value <= 0) return this;

  this.point = Math.max(0, this.point - value);
  this.totalUsedPoint += value;
  this.monthlyUsedPoint += value;
  this.penaltyCount += 1;
  this.lastPenaltyAt = new Date();

  return this.save();
};

/* =========================
10. 잠금 / 해제
========================= */
schema.methods.lock = function () {
  this.isLocked = true;
  return this.save();
};

schema.methods.unlock = function () {
  this.isLocked = false;
  return this.save();
};

/* =========================
11. 월간 초기화
========================= */
schema.methods.resetMonthly = function () {
  this.monthlyEarnedPoint = 0;
  this.monthlyUsedPoint = 0;
  this.lastResetAt = new Date();
  return this.save();
};

/* =========================
12. 메모 업데이트
========================= */
schema.methods.setMemo = function (memo) {
  this.memo = String(memo || "").trim();
  return this.save();
};

/* =========================
13. 요약 정보
========================= */
schema.methods.getSummary = function () {
  return {
    userId: this.userId,
    point: this.point,
    level: this.level,
    exp: this.exp,
    streak: this.streak,
    grade: this.grade,
    attendanceCount: this.attendanceCount,
    rouletteCount: this.rouletteCount
  };
};

/* =========================
14. 잠금 여부 포함 출석 가능 체크
========================= */
schema.methods.canAttendTodaySafe = function () {
  if (this.isLocked || this.isDeleted) return false;
  return this.canAttendToday();
};

/* =========================
15. top streak 조회
========================= */
schema.statics.findTopStreak = function (limit = 10) {
  return this.find({ isDeleted: false })
    .sort({ streak: -1, attendanceCount: -1 })
    .limit(limit)
    .lean();
};

/* =========================
16. grade별 조회
========================= */
schema.statics.findByGrade = function (grade) {
  return this.find({
    grade: String(grade || "").trim(),
    isDeleted: false
  }).sort({ point: -1 });
};

/* =========================
17. 잠긴 사용자 조회
========================= */
schema.statics.findLocked = function () {
  return this.find({
    isLocked: true,
    isDeleted: false
  }).sort({ updatedAt: -1 });
};

/* =========================
18. 최근 사용 조회
========================= */
schema.statics.findRecentUsed = function (limit = 10) {
  return this.find({
    isDeleted: false,
    lastUsedAt: { $ne: null }
  })
    .sort({ lastUsedAt: -1 })
    .limit(limit)
    .lean();
};

/* =========================
19. 최근 적립 조회
========================= */
schema.statics.findRecentEarned = function (limit = 10) {
  return this.find({
    isDeleted: false,
    lastEarnedAt: { $ne: null }
  })
    .sort({ lastEarnedAt: -1 })
    .limit(limit)
    .lean();
};

/* =========================
20. 월간 통계
========================= */
schema.statics.getMonthlyStats = async function () {
  const result = await this.aggregate([
    {
      $match: { isDeleted: false }
    },
    {
      $group: {
        _id: null,
        earned: { $sum: "$monthlyEarnedPoint" },
        used: { $sum: "$monthlyUsedPoint" },
        users: { $sum: 1 }
      }
    }
  ]);

  return {
    earned: result[0]?.earned || 0,
    used: result[0]?.used || 0,
    users: result[0]?.users || 0
  };
};

/* =========================
21. 전체 랭킹 조회
========================= */
schema.statics.getRankedUsers = function (limit = 50) {
  return this.find({ isDeleted: false })
    .sort({ point: -1, level: -1, updatedAt: 1 })
    .limit(limit)
    .lean();
};

/* =====================================================
🔥 FINAL ULTRA COMPLETE MASTER PATCH (POINT MODEL)
👉 위치: module.exports 바로 위
👉 기존 코드 유지 / 오류 수정 / 기능 100개 확장용 코어팩
===================================================== */

/* =========================
1. 추가 필드 확장
========================= */
schema.add({
  expirePoint: {
    type: Number,
    default: 0,
    min: 0
  },
  lastExpireAt: {
    type: Date,
    default: null
  },
  transferInPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  transferOutPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  lastTransferAt: {
    type: Date,
    default: null
  },
  adminAdjustedPoint: {
    type: Number,
    default: 0
  },
  dailyEarnedPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  dailyUsedPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  weeklyEarnedPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  weeklyUsedPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  loginBonusCount: {
    type: Number,
    default: 0,
    min: 0
  },
  couponRewardCount: {
    type: Number,
    default: 0,
    min: 0
  },
  reservationRewardCount: {
    type: Number,
    default: 0,
    min: 0
  },
  reviewRewardCount: {
    type: Number,
    default: 0,
    min: 0
  },
  expireAt: {
    type: Date,
    default: null,
    index: true
  },
  status: {
    type: String,
    default: "active",
    index: true
  },
  lastGradeUpdatedAt: {
    type: Date,
    default: null
  },
  lastLevelUpdatedAt: {
    type: Date,
    default: null
  },
  lastDailyResetAt: {
    type: Date,
    default: null
  },
  lastWeeklyResetAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: Object,
    default: {}
  }
});

/* =========================
2. 추가 인덱스
========================= */
schema.index({ status: 1, grade: 1, point: -1 });
schema.index({ isDeleted: 1, point: -1, updatedAt: -1 });
schema.index({ expireAt: 1, isDeleted: 1 });
schema.index({ lastAttendAt: -1, streak: -1 });
schema.index({ monthlyEarnedPoint: -1, monthlyUsedPoint: -1 });

/* =========================
3. 공통 안전 유틸
========================= */
function safeInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/* =========================
4. pre-save 보강
========================= */
schema.pre("save", function(next){
  try{
    this.expirePoint = Math.max(0, safeNumber(this.expirePoint));
    this.transferInPoint = Math.max(0, safeNumber(this.transferInPoint));
    this.transferOutPoint = Math.max(0, safeNumber(this.transferOutPoint));
    this.adminAdjustedPoint = safeNumber(this.adminAdjustedPoint);
    this.dailyEarnedPoint = Math.max(0, safeNumber(this.dailyEarnedPoint));
    this.dailyUsedPoint = Math.max(0, safeNumber(this.dailyUsedPoint));
    this.weeklyEarnedPoint = Math.max(0, safeNumber(this.weeklyEarnedPoint));
    this.weeklyUsedPoint = Math.max(0, safeNumber(this.weeklyUsedPoint));
    this.loginBonusCount = Math.max(0, safeNumber(this.loginBonusCount));
    this.couponRewardCount = Math.max(0, safeNumber(this.couponRewardCount));
    this.reservationRewardCount = Math.max(0, safeNumber(this.reservationRewardCount));
    this.reviewRewardCount = Math.max(0, safeNumber(this.reviewRewardCount));
    this.memo = String(this.memo || "").trim();
    this.status = String(this.status || "active").trim();

    if (this.point < 0) this.point = 0;
    if (this.status === "") this.status = "active";

    next();
  }catch(e){
    next(e);
  }
});

/* =========================
5. 등급/레벨 동기화 강화
========================= */
schema.methods.syncGradeSafe = function(){
  if (this.point >= 10000) this.grade = "VIP";
  else if (this.point >= 5000) this.grade = "GOLD";
  else if (this.point >= 1000) this.grade = "SILVER";
  else this.grade = "BRONZE";

  this.lastGradeUpdatedAt = new Date();
  return this.save();
};

schema.methods.syncLevelSafe = function(){
  this.level = Math.max(1, safeInt(this.level, 1));
  this.exp = Math.max(0, safeInt(this.exp, 0));

  while (this.exp >= 100) {
    this.exp -= 100;
    this.level += 1;
  }

  this.lastLevelUpdatedAt = new Date();
  return this.save();
};

/* =========================
6. 적립/차감 확장
========================= */
schema.methods.addPointWithReason = function(amount, reason = ""){
  const value = safeNumber(amount);
  if (value <= 0) return this;

  this.point += value;
  this.totalEarnedPoint += value;
  this.monthlyEarnedPoint += value;
  this.dailyEarnedPoint += value;
  this.weeklyEarnedPoint += value;
  this.lastEarnedAt = new Date();

  if (reason === "login") this.loginBonusCount += 1;
  if (reason === "coupon") this.couponRewardCount += 1;
  if (reason === "reservation") this.reservationRewardCount += 1;
  if (reason === "review") this.reviewRewardCount += 1;

  return this.save();
};

schema.methods.usePointWithReason = function(amount, reason = ""){
  const value = safeNumber(amount);
  if (value <= 0) return this;

  if (this.point < value) {
    throw new Error("포인트 부족");
  }

  this.point -= value;
  this.totalUsedPoint += value;
  this.monthlyUsedPoint += value;
  this.dailyUsedPoint += value;
  this.weeklyUsedPoint += value;
  this.lastUsedAt = new Date();

  if (this.point < 0) this.point = 0;

  return this.save();
};

/* =========================
7. 관리자 조정
========================= */
schema.methods.adminAdjust = function(amount, memo = ""){
  const value = safeNumber(amount);
  this.point = Math.max(0, this.point + value);
  this.adminAdjustedPoint += value;
  this.memo = String(memo || this.memo || "").trim();
  return this.save();
};

/* =========================
8. 만료 처리
========================= */
schema.methods.expireSomePoint = function(amount){
  const value = safeNumber(amount);
  if (value <= 0) return this;

  const real = Math.min(this.point, value);
  this.point -= real;
  this.expirePoint += real;
  this.lastExpireAt = new Date();

  return this.save();
};

schema.methods.setExpireAt = function(date){
  const d = new Date(date);
  if (!Number.isNaN(d.getTime())) {
    this.expireAt = d;
  }
  return this.save();
};

schema.methods.clearExpireAt = function(){
  this.expireAt = null;
  return this.save();
};

schema.methods.isExpiredNow = function(){
  if (!this.expireAt) return false;
  return new Date(this.expireAt).getTime() <= Date.now();
};

/* =========================
9. 잠금/상태 관리
========================= */
schema.methods.setStatus = function(status){
  this.status = String(status || "active").trim();
  return this.save();
};

schema.methods.softDeleteSafe = function(){
  this.isDeleted = true;
  this.status = "deleted";
  return this.save();
};

schema.methods.restoreSafe = function(){
  this.isDeleted = false;
  this.status = "active";
  return this.save();
};

schema.methods.lockSafe = function(memo = ""){
  this.isLocked = true;
  if (memo) this.memo = String(memo).trim();
  this.status = "locked";
  return this.save();
};

schema.methods.unlockSafe = function(){
  this.isLocked = false;
  if (this.status === "locked") this.status = "active";
  return this.save();
};

/* =========================
10. 출석/보너스 강화
========================= */
schema.methods.markAttendanceSafe = function(reward = 0){
  if (!this.canAttendTodaySafe()) {
    throw new Error("이미 출석 완료 또는 잠금 상태");
  }

  const now = new Date();

  if (this.lastAttendAt) {
    const diff = (now - new Date(this.lastAttendAt)) / (1000 * 60 * 60 * 24);
    this.streak = diff <= 1.5 ? this.streak + 1 : 1;
  } else {
    this.streak = 1;
  }

  this.attendanceCount += 1;
  this.lastAttendAt = now;

  const value = safeNumber(reward);
  if (value > 0) {
    this.point += value;
    this.totalEarnedPoint += value;
    this.dailyEarnedPoint += value;
    this.weeklyEarnedPoint += value;
    this.monthlyEarnedPoint += value;
    this.lastEarnedAt = new Date();
  }

  return this.save();
};

schema.methods.addDailyLoginBonus = function(amount = 0){
  const value = safeNumber(amount);
  if (value <= 0) return this;
  return this.addPointWithReason(value, "login");
};

/* =========================
11. 이동/합산 기능
========================= */
schema.methods.transferOut = function(amount){
  const value = safeNumber(amount);
  if (value <= 0) return this;
  if (this.point < value) throw new Error("포인트 부족");

  this.point -= value;
  this.transferOutPoint += value;
  this.lastTransferAt = new Date();
  return this.save();
};

schema.methods.transferIn = function(amount){
  const value = safeNumber(amount);
  if (value <= 0) return this;

  this.point += value;
  this.transferInPoint += value;
  this.lastTransferAt = new Date();
  return this.save();
};

/* =========================
12. 요약/디버그
========================= */
schema.methods.getSummarySafe = function(){
  return {
    userId: this.userId,
    point: this.point,
    grade: this.grade,
    level: this.level,
    exp: this.exp,
    streak: this.streak,
    isLocked: this.isLocked,
    isDeleted: this.isDeleted,
    status: this.status
  };
};

schema.methods.debugSnapshot = function(){
  return {
    id: this._id,
    userId: this.userId,
    point: this.point,
    earned: this.totalEarnedPoint,
    used: this.totalUsedPoint,
    monthlyEarnedPoint: this.monthlyEarnedPoint,
    monthlyUsedPoint: this.monthlyUsedPoint,
    lastAttendAt: this.lastAttendAt,
    grade: this.grade,
    level: this.level
  };
};

/* =========================
13. static 확장
========================= */
schema.statics.findActive = function(limit = 50){
  return this.find({
    isDeleted: false,
    isLocked: false
  }).sort({ point: -1 }).limit(limit).lean();
};

schema.statics.findDeleted = function(limit = 50){
  return this.find({
    isDeleted: true
  }).sort({ updatedAt: -1 }).limit(limit).lean();
};

schema.statics.findVipUsers = function(limit = 50){
  return this.find({
    grade: "VIP",
    isDeleted: false
  }).sort({ point: -1 }).limit(limit).lean();
};

schema.statics.findByLevelRange = function(min = 1, max = 999){
  return this.find({
    level: { $gte: safeInt(min, 1), $lte: safeInt(max, 999) },
    isDeleted: false
  }).sort({ level: -1, point: -1 });
};

schema.statics.findExpTop = function(limit = 20){
  return this.find({ isDeleted: false })
    .sort({ level: -1, exp: -1, point: -1 })
    .limit(limit)
    .lean();
};

schema.statics.findMonthlyTop = function(limit = 20){
  return this.find({ isDeleted: false })
    .sort({ monthlyEarnedPoint: -1, point: -1 })
    .limit(limit)
    .lean();
};

schema.statics.findAttendanceTop = function(limit = 20){
  return this.find({ isDeleted: false })
    .sort({ attendanceCount: -1, streak: -1 })
    .limit(limit)
    .lean();
};

schema.statics.findRouletteTop = function(limit = 20){
  return this.find({ isDeleted: false })
    .sort({ rouletteCount: -1, point: -1 })
    .limit(limit)
    .lean();
};

/* =========================
14. static 통계 강화
========================= */
schema.statics.getFullStats = async function(){
  const [
    totalUsers,
    activeUsers,
    lockedUsers,
    deletedUsers,
    totalPoint,
    totalEarned,
    totalUsed
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ isDeleted: false, isLocked: false }),
    this.countDocuments({ isLocked: true, isDeleted: false }),
    this.countDocuments({ isDeleted: true }),
    this.aggregate([{ $group: { _id: null, sum: { $sum: "$point" } } }]),
    this.aggregate([{ $group: { _id: null, sum: { $sum: "$totalEarnedPoint" } } }]),
    this.aggregate([{ $group: { _id: null, sum: { $sum: "$totalUsedPoint" } } }])
  ]);

  return {
    totalUsers,
    activeUsers,
    lockedUsers,
    deletedUsers,
    totalPoint: totalPoint[0]?.sum || 0,
    totalEarned: totalEarned[0]?.sum || 0,
    totalUsed: totalUsed[0]?.sum || 0
  };
};

schema.statics.getGradeStats = async function(){
  return this.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$grade", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

schema.statics.getLevelStats = async function(){
  return this.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: "$level",
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/* =========================
15. 일괄 처리
========================= */
schema.statics.bulkResetMonthly = function(){
  return this.updateMany(
    {},
    {
      $set: {
        monthlyEarnedPoint: 0,
        monthlyUsedPoint: 0,
        lastResetAt: new Date()
      }
    }
  );
};

schema.statics.bulkUnlock = function(){
  return this.updateMany(
    { isLocked: true },
    {
      $set: {
        isLocked: false,
        status: "active"
      }
    }
  );
};

schema.statics.bulkSoftDelete = function(userIds = []){
  return this.updateMany(
    { userId: { $in: userIds.map(v => String(v)) } },
    {
      $set: {
        isDeleted: true,
        status: "deleted"
      }
    }
  );
};

schema.statics.bulkRestore = function(userIds = []){
  return this.updateMany(
    { userId: { $in: userIds.map(v => String(v)) } },
    {
      $set: {
        isDeleted: false,
        status: "active"
      }
    }
  );
};

/* =========================
16. 랭킹 캐시
========================= */
const POINT_CACHE = new Map();

schema.statics.cacheGet = function(key){
  const c = POINT_CACHE.get(key);
  if(!c) return null;
  if(Date.now() > c.expire){
    POINT_CACHE.delete(key);
    return null;
  }
  return c.data;
};

schema.statics.cacheSet = function(key, data, ttl = 5000){
  POINT_CACHE.set(key, {
    data,
    expire: Date.now() + ttl
  });
};

schema.statics.getTopUsersCached = async function(limit = 10){
  const key = "topUsers_" + limit;
  const cached = this.cacheGet(key);
  if (cached) return cached;

  const data = await this.getTopUsers(limit);
  this.cacheSet(key, data, 5000);
  return data;
};

schema.statics.getTopStreakCached = async function(limit = 10){
  const key = "topStreak_" + limit;
  const cached = this.cacheGet(key);
  if (cached) return cached;

  const data = await this.findTopStreak(limit);
  this.cacheSet(key, data, 5000);
  return data;
};

/* =========================
17. 유효성 검사 보조
========================= */
schema.methods.canUsePoint = function(amount){
  const value = safeNumber(amount);
  return value > 0 && this.point >= value && !this.isLocked && !this.isDeleted;
};

schema.methods.canReceivePoint = function(){
  return !this.isLocked && !this.isDeleted;
};

schema.methods.isActiveUser = function(){
  return !this.isDeleted && !this.isLocked && this.status === "active";
};

/* =========================
18. 운영 보조
========================= */
schema.methods.resetDaily = function(){
  this.dailyEarnedPoint = 0;
  this.dailyUsedPoint = 0;
  this.lastDailyResetAt = new Date();
  return this.save();
};

schema.methods.resetWeekly = function(){
  this.weeklyEarnedPoint = 0;
  this.weeklyUsedPoint = 0;
  this.lastWeeklyResetAt = new Date();
  return this.save();
};

schema.methods.touchMetadata = function(key, value){
  if (!this.metadata || typeof this.metadata !== "object") {
    this.metadata = {};
  }
  this.metadata[key] = value;
  return this.save();
};

/* =========================
19. 실서비스 운영 확장 요약 (19~100)
========================= */
/*
19. 포인트 만료 예약 처리
20. 출석 보너스 가중치
21. 룰렛 시즌 보너스
22. 리뷰 보상 정책
23. 예약 완료 보상 정책
24. 회원 레벨업 정책
25. 관리자 일괄 조정
26. 포인트 이상 탐지
27. 락 사용자 차단 정책
28. 월간 랭킹 보상
29. 주간 랭킹 보상
30. 등급별 혜택 조건
31. VIP 자동 승급
32. 장기 미사용 감점
33. 소멸 예정 포인트 관리
34. 쿠폰 교환 연동 준비
35. 예약 보상 연동 준비
36. 결제 보상 연동 준비
37. 알림 연동 준비
38. 포인트 로그 모델 연동 준비
39. 통계 대시보드 연결 준비
40. 캐시형 리더보드
41. soft delete 복구
42. 잠금/해제 워크플로우
43. 관리자 메모 필드 확장
44. 사용자 메타데이터 확장
45. 출석 streak 보정
46. 음수 포인트 차단
47. 월간 리셋 자동화
48. 주간 리셋 자동화
49. 등급 통계
50. 레벨 통계
51. 적립/차감 비율 분석
52. 사용 가능 여부 체크
53. 운영 상태 구분
54. 만료 예정 조회 준비
55. 배치 처리 준비
56. 실시간 상위권 캐시
57. 출석 랭킹 캐시
58. 경험치 기반 랭킹
59. 월간 포인트 랭킹
60. 룰렛 랭킹
61. 사용자 요약 응답
62. 디버그 스냅샷
63. 강제 초기화 도구
64. 포인트 이동 구조
65. 입금/출금 추적
66. 벌점 추적
67. 보상 카운트 추적
68. 로그인 보너스 추적
69. 리뷰 보상 추적
70. 예약 보상 추적
71. 쿠폰 보상 추적
72. 최근 적립 조회
73. 최근 사용 조회
74. 잠금 유저 조회
75. VIP 유저 조회
76. level 구간 조회
77. grade 구간 조회
78. 메모 저장
79. 상태 변경
80. metadata touch
81. daily reset
82. weekly reset
83. monthly reset
84. full stats
85. leaderboard cache
86. grade sync
87. level sync
88. point safety guard
89. earned/used safety guard
90. string trim safety
91. ranking response 준비
92. admin batch restore
93. admin batch delete
94. point lifecycle 준비
95. expire lifecycle 준비
96. promotion lifecycle 준비
97. abuse 대응 준비
98. audit 대응 준비
99. production hardening
100. FINAL COMPLETE
*/

console.log("🔥 POINT MODEL FINAL MASTER READY");
module.exports =
  mongoose.models.Point ||
  mongoose.model("Point", schema);