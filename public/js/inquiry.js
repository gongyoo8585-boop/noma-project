// ==============================
// 🔥 Inquiry Model (최종 완성형)
// ==============================

const mongoose = require("mongoose");

/* ========================= */
/* 🔥 기존 유지 + 확장 */
/* ========================= */
const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      index: true
    },

    content: {
      type: String,
      required: true,
      maxlength: 500
    },

    status: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
      index: true
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    /* =========================
       🔥 기존 확장
    ========================= */
    doneAt: Date,

    memo: {
      type: String,
      default: ""
    },

    ip: String,
    userAgent: String,

    /* 🔥 추가 위치 1: 중요도 */
    priority: {
      type: Number,
      default: 0,
      index: true
    },

    /* 🔥 추가 위치 2: 태그 */
    tags: {
      type: [String],
      default: []
    },

    /* 🔥 추가 위치 3: 읽음 여부 */
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },

    /* 🔥 추가 위치 4: 관리자 */
    assignedTo: {
      type: String,
      default: ""
    },

    /* =========================
       🔥 추가 필드 (11~20)
    ========================= */

    isImportant: {
      type: Boolean,
      default: false,
      index: true
    },

    category: {
      type: String,
      default: "",
      index: true
    },

    processTime: {
      type: Number,
      default: 0
    },

    handleCount: {
      type: Number,
      default: 0
    },

    lastCheckedAt: {
      type: Date,
      default: null
    },

    isNotified: {
      type: Boolean,
      default: false
    },

    score: {
      type: Number,
      default: 0,
      index: true
    },

    email: {
      type: String,
      default: "",
      index: true
    },

    isRepeated: {
      type: Boolean,
      default: false
    },

    updatedBy: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,

    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

/* =========================
   🔥 인덱스
========================= */
schema.index({ createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ phone: 1, createdAt: -1 });
schema.index({ priority: -1, createdAt: -1 });

/* =========================
   🔥 상태 변경 메서드 (오류 수정 포함)
========================= */
schema.methods.setStatus = function (status) {
  if (!["pending", "done"].includes(status)) {
    throw new Error("잘못된 상태값");
  }

  if (this.status === status) return this;

  this.status = status;

  if (status === "done" && !this.doneAt) {
    this.doneAt = new Date();

    // 🔥 처리시간 자동 계산
    if (this.createdAt) {
      this.processTime = this.doneAt - this.createdAt;
    }
  }

  return this.save();
};

/* =========================
   🔥 기존 메서드 유지
========================= */
schema.methods.markRead = function () {
  this.isRead = true;
  return this.save();
};

schema.methods.updateMemo = function (memo) {
  this.memo = memo || "";
  return this.save();
};

/* =========================
   🔥 추가 메서드 10개 (11~20)
========================= */

// 1️⃣ 담당자 지정
schema.methods.assignTo = function (admin) {
  this.assignedTo = admin;
  return this.save();
};

// 2️⃣ 중요 표시
schema.methods.markImportant = function (flag = true) {
  this.isImportant = flag;
  return this.save();
};

// 3️⃣ 처리 횟수 증가
schema.methods.increaseHandle = function () {
  this.handleCount += 1;
  return this.save();
};

// 4️⃣ 마지막 확인 시간
schema.methods.touchCheck = function () {
  this.lastCheckedAt = new Date();
  return this.save();
};

// 5️⃣ 점수 계산
schema.methods.calculateScore = function () {
  this.score =
    (this.priority * 10) +
    (this.isImportant ? 50 : 0) +
    (this.isRead ? 0 : 20);

  return this.save();
};

// 6️⃣ 태그 추가
schema.methods.addTag = function (tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
  }
  return this.save();
};

// 7️⃣ 태그 제거
schema.methods.removeTag = function (tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return this.save();
};

// 8️⃣ 알림 처리
schema.methods.markNotified = function () {
  this.isNotified = true;
  return this.save();
};

// 9️⃣ 반복 문의 표시
schema.methods.markRepeated = function () {
  this.isRepeated = true;
  return this.save();
};

// 🔟 카테고리 설정
schema.methods.setCategory = function (cat) {
  this.category = cat;
  return this.save();
};

/* =========================
   🔥 static 유지
========================= */
schema.statics.findAll = function () {
  return this.find().sort({ createdAt: -1 });
};

schema.statics.findByStatus = function (status) {
  return this.find({ status }).sort({ createdAt: -1 });
};

schema.statics.findUnread = function () {
  return this.find({ isRead: false }).sort({ createdAt: -1 });
};

schema.statics.findByDateRange = function (from, to) {
  const query = {};

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  return this.find(query).sort({ createdAt: -1 });
};

schema.statics.search = function (q) {
  if (!q) return this.find().sort({ createdAt: -1 });

  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return this.find({
    $or: [
      { name: new RegExp(safe, "i") },
      { phone: new RegExp(safe, "i") },
      { content: new RegExp(safe, "i") }
    ]
  }).sort({ createdAt: -1 });
};

schema.statics.findByTag = function (tag) {
  return this.find({ tags: tag }).sort({ createdAt: -1 });
};

schema.statics.getStats = async function () {
  const [pending, done, total, unread] = await Promise.all([
    this.countDocuments({ status: "pending" }),
    this.countDocuments({ status: "done" }),
    this.countDocuments(),
    this.countDocuments({ isRead: false })
  ]);

  return { pending, done, total, unread };
};

schema.statics.getRecent = function (limit = 10) {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

schema.statics.cleanOld = function (days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);

  return this.deleteMany({ createdAt: { $lt: date } });
};

/* =========================
   🔥 저장 전 처리
========================= */
schema.pre("save", function (next) {
  if (!this.name || !this.phone || !this.content) {
    return next(new Error("필수 값 누락"));
  }

  if (this.phone) {
    this.phone = this.phone.replace(/[^0-9]/g, "");
  }

  if (this.content) {
    this.content = this.content.trim();
  }

  next();
});

/* ========================= */
module.exports = mongoose.model("Inquiry", schema);
/* =====================================================
🔥 FINAL ADD-ONLY EXTENSION v6 (절대 기존 코드 수정 없음)
👉 위치: module.exports 아래
===================================================== */

/* =========================
1. 최근 처리 여부
========================= */
schema.methods.isRecentlyHandled = function(ms = 60000){
  if(!this.lastCheckedAt) return false;
  return Date.now() - new Date(this.lastCheckedAt).getTime() < ms;
};

/* =========================
2. 우선순위 증가
========================= */
schema.methods.bumpPriority = function(n = 1){
  this.priority += n;
  return this.save();
};

/* =========================
3. 우선순위 감소
========================= */
schema.methods.lowerPriority = function(n = 1){
  this.priority = Math.max(this.priority - n, 0);
  return this.save();
};

/* =========================
4. 상태 토글
========================= */
schema.methods.toggleStatus = function(){
  const next = this.status === "pending" ? "done" : "pending";
  return this.setStatus(next);
};

/* =========================
5. 읽음 토글
========================= */
schema.methods.toggleRead = function(){
  this.isRead = !this.isRead;
  return this.save();
};

/* =========================
6. 관리자 업데이트 기록
========================= */
schema.methods.markUpdatedBy = function(admin){
  this.updatedBy = admin || "";
  return this.save();
};

/* =========================
7. 반복 문의 자동 감지
========================= */
schema.methods.detectRepeated = async function(){
  const count = await this.constructor.countDocuments({
    phone: this.phone
  });

  if(count > 1){
    this.isRepeated = true;
  }

  return this.save();
};

/* =========================
8. 점수 재계산 (자동 호출용)
========================= */
schema.methods.recompute = function(){
  this.score =
    (this.priority * 10) +
    (this.isImportant ? 50 : 0) +
    (this.isRead ? 0 : 20);

  return this.save();
};

/* =========================
9. 최신 여부 체크
========================= */
schema.methods.isRecent = function(ms = 3600000){
  return Date.now() - new Date(this.createdAt).getTime() < ms;
};

/* =========================
10. 관리자 필터 조회
========================= */
schema.statics.findImportant = function(){
  return this.find({ isImportant:true }).sort({ createdAt:-1 });
};

/* =========================
11. 담당자 기준 조회
========================= */
schema.statics.findByAdmin = function(admin){
  return this.find({ assignedTo:admin }).sort({ createdAt:-1 });
};

/* =========================
12. 점수 상위 조회
========================= */
schema.statics.findTopScore = function(limit=10){
  return this.find().sort({ score:-1 }).limit(limit);
};

/* =========================
13. 오래된 미처리 조회
========================= */
schema.statics.findOldPending = function(hours=24){
  const d = new Date();
  d.setHours(d.getHours() - hours);

  return this.find({
    status:"pending",
    createdAt: { $lt: d }
  }).sort({ createdAt:1 });
};