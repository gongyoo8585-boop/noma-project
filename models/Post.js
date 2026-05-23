const mongoose = require("mongoose");

/* =====================================================
   🔥 FINAL COMPLETE VERSION (PRODUCTION READY)
   ===================================================== */

const PostSchema = new mongoose.Schema(
  {
    boardType: {
      type: String,
      enum: ["shop-recommend", "region-recommend", "review", "info", "community", "notice"],
      default: "community",
      index: true
    },

    title: { 
      type: String, 
      required: true,
      trim: true
    },

    content: { 
      type: String, 
      required: true,
      trim: true
    },

    userId: { 
      type: String, 
      required: true 
    },

    nickname: { 
      type: String, 
      default: "" 
    },

    likeCount: { 
      type: Number, 
      default: 0 
    },

    /* =========================
       🔥 기존 확장 유지
    ========================= */
    viewCount: {
      type: Number,
      default: 0
    },

    commentCount: {
      type: Number,
      default: 0
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    isPinned: {
      type: Boolean,
      default: false
    },

    tags: {
      type: [String],
      default: []
    },

    /* =========================
       🔥 추가 위치 1
    ========================= */
    lastCommentAt: {
      type: Date
    },

    reportCount: {
      type: Number,
      default: 0
    },

    isHidden: {
      type: Boolean,
      default: false,
      index: true
    },

    /* 🔥 추가 위치 2 */
    editedAt: {
      type: Date
    },

    /* 🔥 추가 위치 3 */
    ip: String,

    userAgent: String
  },
  { timestamps: true }
);

/* =========================
   🔥 인덱스
========================= */
PostSchema.index({ createdAt: -1 });
PostSchema.index({ likeCount: -1 });
PostSchema.index({ boardType: 1, createdAt: -1 });

/* 🔥 추가 위치 4 */
PostSchema.index({ isPinned: -1, createdAt: -1 });
PostSchema.index({ reportCount: -1 });

/* =========================
   🔥 pre-save
========================= */
PostSchema.pre("save", function (next) {

  if (!this.title || !this.content) {
    return next(new Error("제목/내용 필요"));
  }

  // XSS 방어
  this.title = this.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  this.content = this.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // nickname fallback
  if (!this.nickname) {
    this.nickname = this.userId;
  }

  /* 🔥 추가 위치 5 */
  this.title = this.title.trim();
  this.content = this.content.trim();

  next();
});

/* =========================
   🔥 methods
========================= */

// 좋아요 증가
PostSchema.methods.addLike = function () {
  this.likeCount += 1;
  return this.save();
};

// 조회수 증가
PostSchema.methods.addView = function () {
  this.viewCount += 1;
  return this.save();
};

// soft delete
PostSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

/* 🔥 추가 위치 6 */

// 댓글 증가
PostSchema.methods.addComment = function () {
  this.commentCount += 1;
  this.lastCommentAt = new Date();
  return this.save();
};

// 신고
PostSchema.methods.report = function () {
  this.reportCount += 1;
  if (this.reportCount > 10) this.isHidden = true;
  return this.save();
};

// 고정
PostSchema.methods.pin = function (flag = true) {
  this.isPinned = flag;
  return this.save();
};

// 수정 처리
PostSchema.methods.markEdited = function () {
  this.editedAt = new Date();
  return this.save();
};

/* =========================
   🔥 statics
========================= */

// 최신 글
PostSchema.statics.findRecent = function (limit = 20) {
  return this.find({ isDeleted: false, isHidden:false })
    .sort({ isPinned:-1, createdAt: -1 })
    .limit(limit);
};

// 인기 글
PostSchema.statics.findTop = function (limit = 20) {
  return this.find({ isDeleted: false, isHidden:false })
    .sort({ likeCount: -1 })
    .limit(limit);
};

// 검색
PostSchema.statics.search = function (q) {
  if (!q) return this.findRecent();

  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return this.find({
    isDeleted: false,
    isHidden:false,
    $or: [
      { title: new RegExp(safe, "i") },
      { content: new RegExp(safe, "i") }
    ]
  }).sort({ createdAt: -1 });
};

/* 🔥 추가 위치 7 */

// 태그 검색
PostSchema.statics.findByTag = function (tag) {
  return this.find({ tags: tag, isDeleted:false, isHidden:false })
    .sort({ createdAt:-1 });
};

// 게시판별 조회
PostSchema.statics.findByBoard = function (boardType) {
  return this.find({ boardType, isDeleted:false, isHidden:false })
    .sort({ isPinned:-1, createdAt:-1 });
};

// 신고 많은 글
PostSchema.statics.findReported = function () {
  return this.find({ reportCount: { $gt: 0 } })
    .sort({ reportCount:-1 });
};

// 댓글 많은 글
PostSchema.statics.findMostCommented = function (limit=20) {
  return this.find({ isDeleted:false })
    .sort({ commentCount:-1 })
    .limit(limit);
};

// 특정 유저 글
PostSchema.statics.findByUser = function (userId) {
  return this.find({ userId, isDeleted:false })
    .sort({ createdAt:-1 });
};

// 최근 댓글 순
PostSchema.statics.findByRecentComment = function () {
  return this.find({ isDeleted:false })
    .sort({ lastCommentAt:-1 });
};

/* =====================================================
🔥 FINAL ULTRA COMPLETE PATCH (ADD ONLY / NO DELETE)
👉 위치: module.exports 바로 위
===================================================== */

/* =========================
1. 추가 필드 확장
========================= */
PostSchema.add({
  thumbnail: {
    type: String,
    default: ""
  },
  images: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    default: "",
    index: true
  },
  score: {
    type: Number,
    default: 0,
    index: true
  },
  isNotice: {
    type: Boolean,
    default: false,
    index: true
  },
  slug: {
    type: String,
    default: "",
    index: true
  },
  lastLikeAt: {
    type: Date,
    default: null
  },
  lastViewAt: {
    type: Date,
    default: null
  },
  shareCount: {
    type: Number,
    default: 0
  },
  bookmarkCount: {
    type: Number,
    default: 0
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isEdited: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
});

/* =========================
2. 인덱스 추가
========================= */
PostSchema.index({ isDeleted: 1, isHidden: 1, createdAt: -1 });
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ slug: 1, isDeleted: 1 });
PostSchema.index({ category: 1, boardType: 1, createdAt: -1 });
PostSchema.index({ score: -1, createdAt: -1 });

/* =========================
3. pre-save 보강
========================= */
PostSchema.pre("save", function(next){
  try{
    this.title = String(this.title || "").trim();
    this.content = String(this.content || "").trim();
    this.nickname = String(this.nickname || this.userId || "").trim();
    this.category = String(this.category || "").trim();
    this.thumbnail = String(this.thumbnail || "").trim();
    this.slug = String(this.slug || "").trim();
    this.likeCount = Math.max(0, Number(this.likeCount || 0));
    this.viewCount = Math.max(0, Number(this.viewCount || 0));
    this.commentCount = Math.max(0, Number(this.commentCount || 0));
    this.reportCount = Math.max(0, Number(this.reportCount || 0));
    this.shareCount = Math.max(0, Number(this.shareCount || 0));
    this.bookmarkCount = Math.max(0, Number(this.bookmarkCount || 0));
    this.score = Math.max(0, Number(this.score || 0));
    this.tags = [...new Set((this.tags || []).filter(Boolean).map(v => String(v).trim()))];
    this.images = [...new Set((this.images || []).filter(Boolean).map(v => String(v).trim()))];
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
4. slug 자동 생성
========================= */
PostSchema.pre("save", function(next){
  try{
    if(!this.slug && this.title){
      this.slug = String(this.title)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9가-힣_-]/g, "");
    }
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
5. score 자동 계산
========================= */
PostSchema.pre("save", function(next){
  try{
    this.score =
      Number(this.likeCount || 0) * 2 +
      Number(this.commentCount || 0) * 3 +
      Number(this.viewCount || 0) * 0.1 +
      Number(this.shareCount || 0) * 2 -
      Number(this.reportCount || 0) * 5;

    if(this.score < 0) this.score = 0;
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
6. 좋아요 취소
========================= */
PostSchema.methods.removeLike = function () {
  this.likeCount = Math.max(0, Number(this.likeCount || 0) - 1);
  return this.save();
};

/* =========================
7. 조회수 증가 안전 버전
========================= */
PostSchema.methods.addViewSafe = function () {
  this.viewCount = Math.max(0, Number(this.viewCount || 0) + 1);
  this.lastViewAt = new Date();
  return this.save();
};

/* =========================
8. 공유 증가
========================= */
PostSchema.methods.addShare = function () {
  this.shareCount = Math.max(0, Number(this.shareCount || 0) + 1);
  return this.save();
};

/* =========================
9. 북마크 증가/감소
========================= */
PostSchema.methods.addBookmark = function () {
  this.bookmarkCount = Math.max(0, Number(this.bookmarkCount || 0) + 1);
  return this.save();
};

PostSchema.methods.removeBookmark = function () {
  this.bookmarkCount = Math.max(0, Number(this.bookmarkCount || 0) - 1);
  return this.save();
};

/* =========================
10. 본문 수정
========================= */
PostSchema.methods.editPost = function ({ title, content, tags, category }) {
  if (title != null) {
    this.title = String(title).replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
  }
  if (content != null) {
    this.content = String(content).replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
  }
  if (Array.isArray(tags)) {
    this.tags = [...new Set(tags.filter(Boolean).map(v => String(v).trim()))];
  }
  if (category != null) {
    this.category = String(category || "").trim();
  }

  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

/* =========================
11. 숨김/복구
========================= */
PostSchema.methods.hide = function () {
  this.isHidden = true;
  return this.save();
};

PostSchema.methods.unhide = function () {
  this.isHidden = false;
  return this.save();
};

/* =========================
12. notice 처리 + soft delete 보강
========================= */
PostSchema.methods.setNotice = function (flag = true) {
  this.isNotice = !!flag;
  return this.save();
};

PostSchema.methods.softDeleteSafe = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

/* =========================
13. static 확장
========================= */
PostSchema.statics.findVisible = function (limit = 20) {
  return this.find({ isDeleted: false, isHidden: false })
    .sort({ isPinned: -1, isNotice: -1, createdAt: -1 })
    .limit(limit);
};

PostSchema.statics.findTrending = function (limit = 20) {
  return this.find({ isDeleted: false, isHidden: false })
    .sort({ score: -1, createdAt: -1 })
    .limit(limit);
};

PostSchema.statics.findBySlug = function (slug) {
  return this.findOne({
    slug: String(slug || "").trim(),
    isDeleted: false
  });
};

PostSchema.statics.findNotices = function (limit = 20) {
  return this.find({
    isDeleted: false,
    isHidden: false,
    isNotice: true
  })
  .sort({ isPinned: -1, createdAt: -1 })
  .limit(limit);
};

module.exports =
  mongoose.models.Post ||
  mongoose.model("Post", PostSchema);