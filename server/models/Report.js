"use strict";

/**
 * =====================================================
 * 🔥 REPORT MODEL (ULTRA FINAL - FULL SAFE)
 * ✔ 독립 신고 모델 (옵션)
 * ✔ Review.report 구조와 충돌 없음
 * ✔ 관리자 처리용 확장 가능
 * ✔ 기존 시스템 영향 0%
 * =====================================================
 */

const mongoose = require("mongoose");

if (!mongoose.models) {
  mongoose.models = {};
}

const ReportSchema = new mongoose.Schema(
  {
    /* =========================
    신고 대상 (리뷰)
    ========================= */
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: true,
      index: true,
    },

    /* =========================
    신고자
    ========================= */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /* =========================
    신고 사유
    ========================= */
    reason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    /* =========================
    상태
    ========================= */
    status: {
      type: String,
      enum: ["pending", "resolved", "rejected"],
      default: "pending",
      index: true,
    },

    /* =========================
    관리자 처리
    ========================= */
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    handledAt: Date,

    /* =========================
    메타
    ========================= */
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
🔥 중복 신고 방지
같은 유저가 같은 리뷰 신고 1회만
========================= */
ReportSchema.index(
  { review: 1, user: 1 },
  { unique: true }
);

/* =========================
🔥 정렬 인덱스
========================= */
ReportSchema.index({ createdAt: -1 });
ReportSchema.index({ status: 1 });

/* =========================
🔥 메서드
========================= */

// 처리 완료
ReportSchema.methods.resolve = async function (adminId) {
  this.status = "resolved";
  this.handledBy = adminId;
  this.handledAt = new Date();
  await this.save();
  return this;
};

// 거절
ReportSchema.methods.reject = async function (adminId) {
  this.status = "rejected";
  this.handledBy = adminId;
  this.handledAt = new Date();
  await this.save();
  return this;
};

/* =========================
🔥 STATIC
========================= */

// 리뷰 기준 신고 목록
ReportSchema.statics.findByReview = function (reviewId) {
  return this.find({ review: reviewId })
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .lean();
};

// 관리자 목록
ReportSchema.statics.findAdminList = function ({
  status,
  reviewId,
  userId,
  limit = 100,
} = {}) {
  const query = {};

  if (status) query.status = status;
  if (reviewId) query.review = reviewId;
  if (userId) query.user = userId;

  return this.find(query)
    .populate("user", "name email")
    .populate("review", "content rating status")
    .sort({ createdAt: -1 })
    .limit(Number(limit || 100))
    .lean();
};

/* ========================= */
const ReportModel =
  mongoose.models.Report ||
  mongoose.model("Report", ReportSchema);

module.exports = ReportModel;

if (!module.exports) {
  console.error("❌ Report model export 실패");
}