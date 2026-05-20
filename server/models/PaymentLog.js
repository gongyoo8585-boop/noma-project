"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT LOG MODEL (ULTRA FINAL - SAFE PATCH)
 * ✔ 기존 기능 100% 유지
 * ✔ 로그 저장 안정성 강화
 * ✔ lean 조회 유지
 * ✔ TTL 안정성 보강
 * ✔ 대용량 로그 대응 최소 추가
 * ✔ 기존 흐름 절대 변경 없음
 * =====================================================
 */

const mongoose = require("mongoose");

/* =========================
SCHEMA
========================= */
const PaymentLogSchema = new mongoose.Schema(
  {
    /* =========================
    기본 참조
    ========================= */
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },

    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    /* =========================
    이벤트 정보
    ========================= */
    type: {
      type: String,
      enum: [
        "ready",
        "approve",
        "cancel",
        "fail",
        "verify",
        "admin",
        "system",
      ],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["success", "error"],
      default: "success",
      index: true,
    },

    /* =========================
    금액 정보
    ========================= */
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* =========================
    메시지
    ========================= */
    message: {
      type: String,
      default: "",
      trim: true,
    },

    /* =========================
    원본 데이터
    ========================= */
    raw: {
      type: Object,
      default: {},
    },

    /* =========================
    요청 정보
    ========================= */
    request: {
      ip: {
        type: String,
        index: true,
        default: "",
      },

      userAgent: {
        type: String,
        default: "",
      },
    },

    /* =========================
    추가 메타
    ========================= */
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,

    /* 🔥 최소 추가 */
    minimize: false,
  }
);

/* =========================
INDEX 최적화
========================= */
PaymentLogSchema.index({ createdAt: -1 });

PaymentLogSchema.index({
  payment: 1,
  type: 1,
});

PaymentLogSchema.index({
  user: 1,
  createdAt: -1,
});

PaymentLogSchema.index({
  reservation: 1,
  createdAt: -1,
});

/* 🔥 최소 추가 */
PaymentLogSchema.index({
  status: 1,
  createdAt: -1,
});

/* =========================
TTL
========================= */
if (process.env.LOG_TTL_DAYS) {
  const days = Number(
    process.env.LOG_TTL_DAYS
  );

  if (!isNaN(days) && days > 0) {
    PaymentLogSchema.index(
      { createdAt: 1 },
      {
        expireAfterSeconds:
          days * 24 * 60 * 60,
      }
    );
  }
}

/* =========================
STATIC
========================= */

// 최근 로그
PaymentLogSchema.statics.getRecent =
  function (limit = 50) {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      200
    );

    return this.find()
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();
  };

// 특정 결제 로그
PaymentLogSchema.statics.getByPayment =
  function (paymentId) {
    return this.find({
      payment: paymentId,
    })
      .sort({ createdAt: -1 })
      .lean();
  };

// 에러 로그
PaymentLogSchema.statics.getErrors =
  function (limit = 50) {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      200
    );

    return this.find({
      status: "error",
    })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();
  };

/* 🔥 최소 추가 */
PaymentLogSchema.statics.writeLog =
  async function (payload = {}) {
    try {
      return await this.create({
        payment: payload.payment,
        reservation:
          payload.reservation,
        user: payload.user,
        type:
          payload.type || "system",
        status:
          payload.status ||
          "success",
        amount:
          Number(payload.amount) ||
          0,
        message:
          payload.message || "",
        raw: payload.raw || {},
        request:
          payload.request || {},
        meta: payload.meta || {},
      });
    } catch (e) {
      console.error(
        "PAYMENT LOG WRITE ERROR:",
        e.message
      );

      return null;
    }
  };

/* =========================
METHOD
========================= */
PaymentLogSchema.methods.toJSON =
  function () {
    return this.toObject();
  };

/* =========================
HOOK
========================= */

/* 🔥 최소 추가 */
PaymentLogSchema.pre(
  "save",
  function (next) {
    if (
      this.message &&
      typeof this.message ===
        "string"
    ) {
      this.message =
        this.message.trim();
    }

    next();
  }
);

/* =========================
EXPORT
========================= */
module.exports =
  mongoose.models.PaymentLog ||
  mongoose.model(
    "PaymentLog",
    PaymentLogSchema
  );