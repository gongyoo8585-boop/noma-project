"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =====================================================
🔥 COUPON MODEL
===================================================== */

const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      enum: ["percent", "fixed", "free", "shipping", "service"],
      default: "percent",
      index: true,
    },

    discountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    targetType: {
      type: String,
      enum: ["all", "user", "shop", "branch", "service", "first_reservation", "vip"],
      default: "all",
      index: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },

    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    issuedTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    usedBy: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        reservationId: {
          type: Schema.Types.ObjectId,
          ref: "Reservation",
        },
        paymentId: {
          type: Schema.Types.ObjectId,
          ref: "Payment",
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
        discountAmount: {
          type: Number,
          default: 0,
        },
      },
    ],

    usageLimit: {
      type: Number,
      default: 0,
      min: 0,
    },

    userUsageLimit: {
      type: Number,
      default: 1,
      min: 0,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    startAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    endAt: {
      type: Date,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "expired", "deleted"],
      default: "active",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    autoIssue: {
      type: Boolean,
      default: false,
    },

    stackable: {
      type: Boolean,
      default: false,
    },

    firstReservationOnly: {
      type: Boolean,
      default: false,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    memo: {
      type: String,
      default: "",
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
🔥 INDEX
===================================================== */
CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ status: 1, isActive: 1, isDeleted: 1 });
CouponSchema.index({ userId: 1, status: 1 });
CouponSchema.index({ shopId: 1, status: 1 });
CouponSchema.index({ branchId: 1, status: 1 });
CouponSchema.index({ startAt: 1, endAt: 1 });

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/* =====================================================
🔥 VIRTUALS
===================================================== */
CouponSchema.virtual("isExpired").get(function () {
  return !!this.endAt && this.endAt < now();
});

CouponSchema.virtual("remainingCount").get(function () {
  if (!this.usageLimit) return null;
  return Math.max(0, this.usageLimit - this.usedCount);
});

/* =====================================================
🔥 INSTANCE METHODS
===================================================== */
CouponSchema.methods.isUsable = function (userId, amount = 0) {
  if (this.isDeleted) return { ok: false, reason: "COUPON_DELETED" };
  if (!this.isActive) return { ok: false, reason: "COUPON_INACTIVE" };
  if (this.status !== "active") return { ok: false, reason: "COUPON_NOT_ACTIVE" };
  if (this.startAt && this.startAt > now()) return { ok: false, reason: "COUPON_NOT_STARTED" };
  if (this.endAt && this.endAt < now()) return { ok: false, reason: "COUPON_EXPIRED" };
  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) {
    return { ok: false, reason: "COUPON_USAGE_LIMIT" };
  }
  if (safeNum(amount) < safeNum(this.minOrderAmount)) {
    return { ok: false, reason: "MIN_ORDER_AMOUNT_REQUIRED" };
  }

  const uid = String(userId || "");
  if (uid && this.userUsageLimit > 0) {
    const count = this.usedBy.filter((x) => String(x.userId) === uid).length;
    if (count >= this.userUsageLimit) {
      return { ok: false, reason: "USER_USAGE_LIMIT" };
    }
  }

  return { ok: true };
};

CouponSchema.methods.calculateDiscount = function (amount = 0) {
  const baseAmount = safeNum(amount);

  let discount = 0;

  if (this.type === "percent") {
    discount = Math.floor(baseAmount * (safeNum(this.discountRate) / 100));
  }

  if (this.type === "fixed") {
    discount = safeNum(this.discountAmount);
  }

  if (this.type === "free") {
    discount = baseAmount;
  }

  if (this.maxDiscountAmount > 0) {
    discount = Math.min(discount, this.maxDiscountAmount);
  }

  discount = Math.max(0, Math.min(discount, baseAmount));

  return discount;
};

CouponSchema.methods.useCoupon = async function ({
  userId,
  reservationId = null,
  paymentId = null,
  amount = 0,
} = {}) {
  const usable = this.isUsable(userId, amount);
  if (!usable.ok) {
    throw new Error(usable.reason);
  }

  const discountAmount = this.calculateDiscount(amount);

  this.usedBy.push({
    userId,
    reservationId,
    paymentId,
    usedAt: now(),
    discountAmount,
  });

  this.usedCount += 1;

  if (this.usageLimit > 0 && this.usedCount >= this.usageLimit) {
    this.status = "expired";
    this.isActive = false;
  }

  await this.save();

  return {
    coupon: this,
    discountAmount,
  };
};

CouponSchema.methods.issueToUser = async function (userId) {
  const exists = this.issuedTo.some((id) => String(id) === String(userId));
  if (!exists) {
    this.issuedTo.push(userId);
  }

  await this.save();
  return this;
};

CouponSchema.methods.activate = async function () {
  this.status = "active";
  this.isActive = true;
  await this.save();
  return this;
};

CouponSchema.methods.deactivate = async function () {
  this.status = "inactive";
  this.isActive = false;
  await this.save();
  return this;
};

CouponSchema.methods.softDelete = async function () {
  this.status = "deleted";
  this.isDeleted = true;
  this.isActive = false;
  this.deletedAt = now();
  await this.save();
  return this;
};

/* =====================================================
🔥 STATICS
===================================================== */
CouponSchema.statics.findActive = function () {
  return this.find({
    status: "active",
    isActive: true,
    isDeleted: false,
    $or: [{ endAt: null }, { endAt: { $gte: now() } }],
  }).sort({ createdAt: -1 });
};

CouponSchema.statics.findByCodeSafe = function (code) {
  return this.findOne({
    code: String(code || "").trim().toUpperCase(),
    isDeleted: false,
  });
};

CouponSchema.statics.validateCoupon = async function ({ code, userId, amount = 0 } = {}) {
  const coupon = await this.findByCodeSafe(code);
  if (!coupon) return { ok: false, reason: "COUPON_NOT_FOUND" };

  const usable = coupon.isUsable(userId, amount);
  if (!usable.ok) return usable;

  return {
    ok: true,
    coupon,
    discountAmount: coupon.calculateDiscount(amount),
  };
};

CouponSchema.statics.applyCoupon = async function ({
  code,
  userId,
  reservationId = null,
  paymentId = null,
  amount = 0,
} = {}) {
  const coupon = await this.findByCodeSafe(code);
  if (!coupon) throw new Error("COUPON_NOT_FOUND");

  return coupon.useCoupon({
    userId,
    reservationId,
    paymentId,
    amount,
  });
};

CouponSchema.statics.expireOldCoupons = function () {
  return this.updateMany(
    {
      isDeleted: false,
      isActive: true,
      endAt: { $ne: null, $lt: now() },
    },
    {
      $set: {
        status: "expired",
        isActive: false,
      },
    }
  );
};

CouponSchema.statics.createCoupon = function ({
  code,
  name,
  description = "",
  type = "percent",
  discountRate = 0,
  discountAmount = 0,
  maxDiscountAmount = 0,
  minOrderAmount = 0,
  usageLimit = 0,
  userUsageLimit = 1,
  startAt = new Date(),
  endAt = null,
  targetType = "all",
  userId = null,
  shopId = null,
  branchId = null,
  serviceId = null,
  issuedBy = null,
  metadata = {},
} = {}) {
  return this.create({
    code: String(code || "").trim().toUpperCase(),
    name,
    description,
    type,
    discountRate,
    discountAmount,
    maxDiscountAmount,
    minOrderAmount,
    usageLimit,
    userUsageLimit,
    startAt,
    endAt,
    targetType,
    userId,
    shopId,
    branchId,
    serviceId,
    issuedBy,
    metadata,
  });
};

/* =====================================================
🔥 PRE SAVE
===================================================== */
CouponSchema.pre("save", function (next) {
  if (this.code) {
    this.code = String(this.code).trim().toUpperCase();
  }

  if (this.endAt && this.endAt < now()) {
    this.status = "expired";
    this.isActive = false;
  }

  next();
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 Coupon Model READY");

module.exports = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);