"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION MODEL (PATCHED - MINIMAL ADD ONLY)
 * ✔ 기존 코드 100% 유지
 * ✔ 상태 흐름 검증 추가 (잘못된 상태 변경 방지)
 * ✔ 기존 로직 절대 변경 없음
 * ✔ 🔥 업체 일일 전환수 통계 최소 추가
 * =====================================================
 */

const mongoose = require("mongoose");

/* =========================
UTIL
========================= */
function normalizeDateKey(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

/* =========================
SCHEMA
========================= */
const ReservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    date: {
      type: String,
      required: true,
      index: true,
    },

    time: {
      type: String,
      required: true,
      index: true,
    },

    serviceType: {
      type: String,
      default: "",
    },

    memo: {
      type: String,
      default: "",
    },

    people: {
      type: Number,
      default: 1,
      min: 1,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "confirmed",
        "completed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
    },

    reservedAt: {
      type: Date,
      default: Date.now,
    },

    paidAt: Date,
    completedAt: Date,
    cancelledAt: Date,

    cancelReason: String,

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
    },

    raw: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
INDEX
========================= */
ReservationSchema.index(
  { shop: 1, date: 1, time: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending", "approved", "confirmed"] },
    },
  }
);

ReservationSchema.index({ user: 1, status: 1 });
ReservationSchema.index({ shop: 1, status: 1, date: 1, time: 1 });
ReservationSchema.index({ payment: 1 });
ReservationSchema.index({ review: 1 });

/* =========================
METHODS
========================= */

/* 🔥 최소 추가: 상태 흐름 검증 */
function validateTransition(current, next) {
  const flow = {
    pending: ["approved", "cancelled"],
    approved: ["confirmed", "completed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  return flow[current]?.includes(next);
}

ReservationSchema.methods.markPaid = async function () {
  if (this.status === "cancelled") {
    throw new Error("취소된 예약은 결제 완료 처리 불가");
  }

  if (this.status === "completed") {
    throw new Error("완료된 예약은 결제 완료 처리 불가");
  }

  /* 🔥 최소 추가 */
  if (!validateTransition(this.status, "approved")) {
    throw new Error("상태 변경 불가");
  }

  this.status = "approved";
  this.paidAt = new Date();
  await this.save();
  return this;
};

ReservationSchema.methods.markCompleted = async function () {
  if (this.status === "cancelled") {
    throw new Error("취소된 예약은 완료 처리 불가");
  }

  /* 🔥 최소 추가 */
  if (!validateTransition(this.status, "completed")) {
    throw new Error("상태 변경 불가");
  }

  this.status = "completed";
  this.completedAt = new Date();
  await this.save();
  return this;
};

ReservationSchema.methods.markCancelled = async function (reason) {
  if (this.status === "completed") {
    throw new Error("완료된 예약은 취소 불가");
  }

  if (this.status === "cancelled") {
    return this;
  }

  /* 🔥 최소 추가 */
  if (!validateTransition(this.status, "cancelled")) {
    throw new Error("상태 변경 불가");
  }

  this.status = "cancelled";
  this.cancelReason = reason || "";
  this.cancelledAt = new Date();
  await this.save();
  return this;
};

/* =========================
STATICS
========================= */
ReservationSchema.statics.findByUser = function (userId) {
  return this.find({ user: userId })
    .populate("shop")
    .populate("payment")
    .populate("review")
    .sort({ createdAt: -1 });
};

ReservationSchema.statics.findByShop = function (shopId) {
  return this.find({ shop: shopId })
    .populate("user")
    .populate("payment")
    .populate("review")
    .sort({ date: 1, time: 1 });
};

ReservationSchema.statics.existsReservation = function ({
  shopId,
  date,
  time,
}) {
  return this.findOne({
    shop: shopId,
    date,
    time,
    status: { $in: ["pending", "approved", "confirmed"] },
  });
};

ReservationSchema.statics.findAdminList = function (query = {}) {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.shopId) filter.shop = query.shopId;
  if (query.userId) filter.user = query.userId;
  if (query.date) filter.date = query.date;

  return this.find(filter)
    .populate("user")
    .populate("shop")
    .populate("payment")
    .populate("review")
    .sort({ createdAt: -1 })
    .limit(Number(query.limit || 100));
};

/* =========================
HOOK
========================= */
ReservationSchema.post("save", function (doc, next) {
  (async () => {
    try {
      if (doc.isNew && doc.shop) {
        const Shop = mongoose.model("Shop");
        const dateKey = normalizeDateKey(doc.createdAt || doc.reservedAt || new Date());

        await Shop.findByIdAndUpdate(doc.shop, {
          $inc: {
            "stats.reservationCount": 1,
            "stats.conversionCount": 1,
            conversionCount: 1,
            ...(dateKey
              ? {
                  [`dailyConversions.${dateKey}`]: 1,
                }
              : {}),
          },
        });
      }
    } catch (e) {
      console.error("RESERVATION POST SAVE ERROR:", e.message);
    }
  })();

  if (typeof next === "function") {
    next();
  }
});

/* =========================
JSON 변환
========================= */
ReservationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

/* =========================
EXPORT
========================= */
module.exports =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", ReservationSchema);