"use strict";

/**
 * =====================================================
 * 🔥 PRICING MODEL (ULTRA FINAL)
 * ✔ 코스 / 금액 구조
 * ✔ 매장(Shop) 연동
 * ✔ 확장 가능 (할인 / 시간별 요금)
 * ✔ 기존 시스템과 100% 호환
 * =====================================================
 */

const mongoose = require("mongoose");

/* =========================
SCHEMA
========================= */
const PricingSchema = new mongoose.Schema(
  {
    /* 매장 연결 */
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    /* 코스 이름 (예: 아로마 60분) */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    /* 소요 시간 (분 단위) */
    duration: {
      type: Number,
      required: true,
      min: 1,
    },

    /* 기본 가격 */
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    /* 할인 가격 */
    discountPrice: {
      type: Number,
      default: 0,
    },

    /* 통화 */
    currency: {
      type: String,
      default: "KRW",
    },

    /* 상태 */
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    /* 정렬 */
    sortOrder: {
      type: Number,
      default: 0,
    },

    /* 옵션 */
    options: {
      isPopular: { type: Boolean, default: false },
      isRecommended: { type: Boolean, default: false },
    },

    /* 삭제 처리 */
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
INDEX
========================= */
PricingSchema.index({ shopId: 1, status: 1 });
PricingSchema.index({ name: "text" });

/* =========================
METHODS
========================= */
PricingSchema.methods.getFinalPrice = function () {
  return this.discountPrice && this.discountPrice > 0
    ? this.discountPrice
    : this.price;
};

/* =========================
STATICS
========================= */
PricingSchema.statics.getActiveByShop = async function (shopId) {
  return this.find({
    shopId,
    status: "active",
    isDeleted: false,
  }).sort({ sortOrder: 1, createdAt: 1 });
};

/* =========================
EXPORT
========================= */
module.exports =
  mongoose.models.Pricing ||
  mongoose.model("Pricing", PricingSchema);