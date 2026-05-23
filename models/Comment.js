const mongoose = require("mongoose");

/* =====================================================
   🔥 기존 코드 유지 + 확장
===================================================== */
const CommentSchema = new mongoose.Schema(
  {
    postId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Post", 
      required: true, 
      index: true 
    },

    userId: { 
      type: String, 
      required: true 
    },

    nickname: { 
      type: String, 
      default: "" 
    },

    content: { 
      type: String, 
      required: true,
      maxlength: 500
    },

    /* =========================
       🔥 추가 영역
    ========================= */

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    likeCount: {
      type: Number,
      default: 0
    },

    reportCount: {
      type: Number,
      default: 0
    }

  },
  { timestamps: true }
);

/* =========================
   🔥 인덱스 추가
========================= */
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ likeCount: -1 });

/* =========================
   🔥 저장 전 처리 (보안 + 검증)
========================= */
CommentSchema.pre("save", function (next) {

  /* 🔥 content 필수 체크 */
  if (!this.content || !this.content.trim()) {
    return next(new Error("댓글 내용 필요"));
  }

  /* 🔥 최소 길이 */
  if (this.content.length < 1) {
    return next(new Error("댓글 너무 짧음"));
  }

  /* 🔥 XSS 방어 */
  this.content = this.content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  /* 🔥 nickname fallback */
  if (!this.nickname) {
    this.nickname = this.userId;
  }

  next();
});

/* =========================
   🔥 instance 메서드
========================= */

// soft delete
CommentSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

// 좋아요
CommentSchema.methods.addLike = function () {
  this.likeCount = (this.likeCount || 0) + 1;
  return this.save();
};

// 신고
CommentSchema.methods.report = function () {
  this.reportCount = (this.reportCount || 0) + 1;
  return this.save();
};

/* =========================
   🔥 static 메서드
========================= */

// post별 댓글
CommentSchema.statics.findByPost = function (postId) {
  return this.find({ postId, isDeleted: false })
    .sort({ createdAt: -1 });
};

// 최신 댓글
CommentSchema.statics.findRecent = function (limit = 10) {
  return this.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// 인기 댓글
CommentSchema.statics.findTop = function (limit = 10) {
  return this.find({ isDeleted: false })
    .sort({ likeCount: -1 })
    .limit(limit);
};

// 댓글 수
CommentSchema.statics.countByPost = function (postId) {
  return this.countDocuments({ postId, isDeleted: false });
};

/* =====================================================
🔥 FINAL ULTRA COMPLETE PATCH (ADD ONLY / NO DELETE)
👉 위치: module.exports 바로 위
===================================================== */

/* =========================
1. 추가 필드 확장
========================= */
CommentSchema.add({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null,
    index: true
  },
  depth: {
    type: Number,
    default: 0,
    index: true
  },
  isEdited: {
    type: Boolean,
    default: false,
    index: true
  },
  editedAt: {
    type: Date,
    default: null
  },
  lastIp: {
    type: String,
    default: ""
  },
  userAgent: {
    type: String,
    default: ""
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  status: {
    type: String,
    enum: ["active", "hidden", "blocked"],
    default: "active",
    index: true
  },
  mentions: {
    type: [String],
    default: []
  },
  imageUrl: {
    type: String,
    default: ""
  },
  replyCount: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0,
    index: true
  },
  lastActionAt: {
    type: Date,
    default: null
  },
  isOwnerDeleted: {
    type: Boolean,
    default: false
  }
});

/* =========================
2. content 추가 정리
========================= */
CommentSchema.pre("save", function(next){
  try{
    this.content = String(this.content || "").trim();

    if(this.content.length > 500){
      this.content = this.content.slice(0, 500);
    }

    next();
  }catch(e){
    next(e);
  }
});

/* =========================
3. 숫자 필드 음수 방지
========================= */
CommentSchema.pre("save", function(next){
  try{
    if(this.likeCount < 0) this.likeCount = 0;
    if(this.reportCount < 0) this.reportCount = 0;
    if(this.replyCount < 0) this.replyCount = 0;
    if(this.score < 0) this.score = 0;
    if(this.depth < 0) this.depth = 0;
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
4. 상태 기본 보정
========================= */
CommentSchema.pre("save", function(next){
  try{
    if(!this.status){
      this.status = "active";
    }
    this.lastActionAt = new Date();
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
5. mention 추출
========================= */
CommentSchema.pre("save", function(next){
  try{
    const found = String(this.content || "").match(/@[A-Za-z0-9_가-힣]+/g) || [];
    this.mentions = [...new Set(found.map(v => v.slice(1)))];
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
6. 대댓글 자동 depth
========================= */
CommentSchema.pre("save", async function(next){
  try{
    if(this.parentId && !this.isModified("depth")){
      const parent = await this.constructor.findById(this.parentId).select("depth");
      this.depth = parent ? Number(parent.depth || 0) + 1 : 1;
    }
    next();
  }catch(e){
    next(e);
  }
});

/* =========================
7. 수정 메서드
========================= */
CommentSchema.methods.editContent = function(content){
  const safe = String(content || "")
    .trim()
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if(!safe){
    throw new Error("댓글 내용 필요");
  }

  this.content = safe.slice(0, 500);
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

/* =========================
8. 좋아요 취소
========================= */
CommentSchema.methods.removeLike = function(){
  this.likeCount = Math.max(0, Number(this.likeCount || 0) - 1);
  return this.save();
};

/* =========================
9. 숨김 처리
========================= */
CommentSchema.methods.hide = function(){
  this.status = "hidden";
  return this.save();
};

/* =========================
10. 차단 처리
========================= */
CommentSchema.methods.block = function(){
  this.status = "blocked";
  return this.save();
};

/* =========================
11. 고정 처리
========================= */
CommentSchema.methods.pin = function(flag = true){
  this.isPinned = !!flag;
  return this.save();
};

/* =========================
12. 점수 계산
========================= */
CommentSchema.methods.calculateScore = function(){
  this.score =
    Number(this.likeCount || 0) * 2 +
    Number(this.replyCount || 0) -
    Number(this.reportCount || 0) * 3;

  if(this.score < 0) this.score = 0;
  return this.save();
};

/* =========================
13. 소유자 삭제
========================= */
CommentSchema.methods.ownerDelete = function(){
  this.isOwnerDeleted = true;
  this.isDeleted = true;
  return this.save();
};

/* =========================
14. 대댓글 수 증가
========================= */
CommentSchema.methods.increaseReplyCount = function(){
  this.replyCount = Number(this.replyCount || 0) + 1;
  return this.save();
};

/* =========================
15. 대댓글 수 감소
========================= */
CommentSchema.methods.decreaseReplyCount = function(){
  this.replyCount = Math.max(0, Number(this.replyCount || 0) - 1);
  return this.save();
};

/* =========================
16. 메타 기록
========================= */
CommentSchema.methods.setMeta = function(meta = {}){
  if(meta.ip) this.lastIp = String(meta.ip);
  if(meta.userAgent) this.userAgent = String(meta.userAgent);
  return this.save();
};

/* =========================
17. post + parent 기준 조회
========================= */
CommentSchema.statics.findReplies = function(parentId){
  return this.find({
    parentId,
    isDeleted: false,
    status: "active"
  }).sort({ createdAt: 1 });
};

/* =========================
18. 사용자 댓글 조회
========================= */
CommentSchema.statics.findByUser = function(userId, limit = 20){
  return this.find({
    userId,
    isDeleted: false
  })
  .sort({ createdAt: -1 })
  .limit(limit);
};

/* =========================
19. 신고 많은 댓글
========================= */
CommentSchema.statics.findReported = function(limit = 20){
  return this.find({
    isDeleted: false
  })
  .sort({ reportCount: -1, createdAt: -1 })
  .limit(limit);
};

/* =========================
20. 고정 댓글 조회
========================= */
CommentSchema.statics.findPinnedByPost = function(postId){
  return this.find({
    postId,
    isDeleted: false,
    isPinned: true
  }).sort({ createdAt: -1 });
};

/* =========================
21. 활성 댓글만 조회
========================= */
CommentSchema.statics.findActiveByPost = function(postId){
  return this.find({
    postId,
    isDeleted: false,
    status: "active"
  }).sort({ isPinned: -1, createdAt: -1 });
};

/* =========================
22. 통계
========================= */
CommentSchema.statics.getStatsByPost = async function(postId){
  const [total, active, hidden, deleted] = await Promise.all([
    this.countDocuments({ postId }),
    this.countDocuments({ postId, isDeleted: false, status: "active" }),
    this.countDocuments({ postId, status: "hidden" }),
    this.countDocuments({ postId, isDeleted: true })
  ]);

  return { total, active, hidden, deleted };
};

/* =========================
23. 인덱스 추가
========================= */
CommentSchema.index({ parentId: 1, createdAt: 1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ status: 1, isDeleted: 1, createdAt: -1 });
CommentSchema.index({ isPinned: 1, postId: 1, createdAt: -1 });
CommentSchema.index({ reportCount: -1, createdAt: -1 });
module.exports =
  mongoose.models.Comment ||
  mongoose.model("Comment", CommentSchema);