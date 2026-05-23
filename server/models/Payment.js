"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT MODEL (PATCHED SAFE MINIMAL)
 * ✔ 기존 기능 100% 유지
 * ✔ 숫자 안정성 보강
 * ✔ status trim 방어
 * ✔ refund NaN 방어
 * ✔ 기존 흐름 절대 변경 없음
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
const PaymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true,
      index: true,
      unique: true,
    },

    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "KRW",
    },

    method: {
      type: String,
      default: "kakao",
      index: true,
    },

    status: {
      type: String,
      enum: ["ready", "paid", "cancelled", "fail"],
      default: "ready",
      index: true,
    },

    tid: {
      type: String,
      index: true,
    },

    pgToken: String,

    raw: {
      type: Object,
      default: {},
    },

    cancelRaw: {
      type: Object,
      default: {},
    },

    failReason: String,

    readyAt: {
      type: Date,
      default: Date.now,
    },

    approvedAt: Date,
    cancelledAt: Date,
    failedAt: Date,

    refundAmount: {
      type: Number,
      default: 0,
    },

    refundHistory: [
      {
        amount: Number,
        reason: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

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
INDEX
========================= */
PaymentSchema.index({ reservation: 1, status: 1 });
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ shop: 1, createdAt: -1 });
PaymentSchema.index({ tid: 1 });

/* =====================================================
🔥 최소 추가: 상태 정리
===================================================== */
PaymentSchema.pre("save", async function (next) {
  try {
    if (this.status) {
      this.status = String(this.status).trim();
    }

    /* 🔥 NaN 방어 */
    if (Number.isNaN(Number(this.refundAmount))) {
      this.refundAmount = 0;
    }

    if (!this.shop && this.reservation) {
      try {
        const Reservation = mongoose.model("Reservation");
        const reservation = await Reservation.findById(this.reservation).select("shop").lean();

        if (reservation?.shop) {
          this.shop = reservation.shop;
        }
      } catch (e) {
        console.warn("PAYMENT SHOP SYNC ERROR:", e.message);
      }
    }

    next();

  } catch (e) {
    next(e);
  }
});

/* =========================
METHODS
========================= */
PaymentSchema.methods.markPaid = async function (data) {
  if (this.status !== "ready") return this;

  this.status = "paid";
  this.raw = data || this.raw;
  this.approvedAt = new Date();

  await this.save();

  return this;
};

PaymentSchema.methods.markCancelled = async function (data) {
  if (this.status !== "paid") return this;

  this.status = "cancelled";
  this.cancelRaw = data || this.cancelRaw;
  this.cancelledAt = new Date();

  await this.save();

  return this;
};

PaymentSchema.methods.markFailed = async function (reason) {
  if (this.status !== "ready") return this;

  this.status = "fail";
  this.failReason = reason || "";
  this.failedAt = new Date();

  await this.save();

  return this;
};

PaymentSchema.methods.addRefund = async function (amount, reason) {
  const refundAmount = Number(amount || 0);

  if (!refundAmount || refundAmount < 1) {
    throw new Error("환불 금액 오류");
  }

  /* 🔥 최소 추가: refundAmount NaN 방어 */
  const currentRefund = Number(this.refundAmount || 0);

  if (currentRefund + refundAmount > this.amount) {
    throw new Error("환불 금액 초과");
  }

  this.refundAmount = currentRefund + refundAmount;

  this.refundHistory.push({
    amount: refundAmount,
    reason: reason || "환불",
  });

  await this.save();

  return this;
};

/* =========================
STATICS
========================= */
PaymentSchema.statics.findByUser = function (userId) {
  return this.find({ user: userId })
    .populate("reservation")
    .sort({ createdAt: -1 });
};

PaymentSchema.statics.findByReservation = function (reservationId) {
  return this.find({ reservation: reservationId })
    .sort({ createdAt: -1 });
};

PaymentSchema.statics.findActive = function () {
  return this.find({
    status: { $in: ["ready", "paid"] },
  });
};

/* =========================
HOOK
========================= */
PaymentSchema.post("save", async function (doc) {
  try {
    if (doc.status === "paid") {
      const Reservation = mongoose.model("Reservation");

      const reservation =
        await Reservation.findByIdAndUpdate(
          doc.reservation,
          {
            payment: doc._id,
            paidAt: doc.approvedAt || new Date(),
          },
          {
            new: true,
          }
        ).lean();

      const shopId =
        doc.shop ||
        reservation?.shop ||
        null;

      if (shopId) {
        const Shop = mongoose.model("Shop");
        const dateKey = normalizeDateKey(doc.approvedAt || doc.createdAt || new Date());

        await Shop.findByIdAndUpdate(shopId, {
          $inc: {
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
    }
  } catch (e) {
    console.error("PAYMENT POST SAVE ERROR:", e.message);
  }
});

/* =========================
JSON 변환
========================= */
PaymentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

/* =========================
EXPORT
========================= */
module.exports =
  mongoose.models.Payment ||
  mongoose.model("Payment", PaymentSchema);