"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =====================================================
🔥 PRICING MODEL
가격 정책 / 서비스 가격 / 시간대 할증 / 쿠폰 연동 / 지점별 가격
===================================================== */

const PricingSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
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

    serviceName: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "massage",
        "aroma",
        "sports",
        "thai",
        "swedish",
        "couple",
        "premium",
        "event",
        "custom",
      ],
      default: "massage",
      index: true,
    },

    basePrice: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    salePrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
      default: 60,
      index: true,
    },

    currency: {
      type: String,
      default: "KRW",
      uppercase: true,
      trim: true,
    },

    timeSurcharges: [
      {
        name: { type: String, default: "" },
        startHour: { type: Number, min: 0, max: 23, required: true },
        endHour: { type: Number, min: 0, max: 24, required: true },
        type: {
          type: String,
          enum: ["percent", "fixed"],
          default: "fixed",
        },
        value: { type: Number, default: 0, min: 0 },
        days: [
          {
            type: Number,
            min: 0,
            max: 6,
          },
        ],
        active: { type: Boolean, default: true },
      },
    ],

    daySurcharges: [
      {
        name: { type: String, default: "" },
        day: { type: Number, min: 0, max: 6, required: true },
        type: {
          type: String,
          enum: ["percent", "fixed"],
          default: "fixed",
        },
        value: { type: Number, default: 0, min: 0 },
        active: { type: Boolean, default: true },
      },
    ],

    options: [
      {
        name: { type: String, required: true, trim: true },
        code: { type: String, default: "", trim: true },
        price: { type: Number, default: 0, min: 0 },
        durationMinutes: { type: Number, default: 0, min: 0 },
        active: { type: Boolean, default: true },
      },
    ],

    discounts: [
      {
        name: { type: String, default: "" },
        type: {
          type: String,
          enum: ["percent", "fixed"],
          default: "percent",
        },
        value: { type: Number, default: 0, min: 0 },
        startAt: { type: Date, default: null },
        endAt: { type: Date, default: null },
        active: { type: Boolean, default: true },
      },
    ],

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    serviceFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    platformFeeRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    minPeople: {
      type: Number,
      default: 1,
      min: 1,
    },

    maxPeople: {
      type: Number,
      default: 1,
      min: 1,
    },

    extraPersonPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "hidden", "deleted"],
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

    startAt: {
      type: Date,
      default: null,
      index: true,
    },

    endAt: {
      type: Date,
      default: null,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    memo: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
🔥 INDEX
===================================================== */
PricingSchema.index({ code: 1 }, { unique: true });
PricingSchema.index({ shopId: 1, branchId: 1, status: 1 });
PricingSchema.index({ serviceId: 1, status: 1 });
PricingSchema.index({ category: 1, status: 1 });
PricingSchema.index({ isActive: 1, isDeleted: 1 });
PricingSchema.index({ priority: -1, createdAt: -1 });

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

function inDateRange(startAt, endAt, date = new Date()) {
  const d = new Date(date);
  if (startAt && new Date(startAt) > d) return false;
  if (endAt && new Date(endAt) < d) return false;
  return true;
}

function applyAdjust(base, type, value) {
  const amount = safeNum(base);
  const v = safeNum(value);

  if (type === "percent") {
    return Math.floor(amount * (v / 100));
  }

  return v;
}

/* =====================================================
🔥 VIRTUALS
===================================================== */
PricingSchema.virtual("finalBasePrice").get(function () {
  return this.salePrice > 0 ? this.salePrice : this.basePrice;
});

PricingSchema.virtual("isExpired").get(function () {
  return !!this.endAt && this.endAt < now();
});

/* =====================================================
🔥 INSTANCE METHODS
===================================================== */
PricingSchema.methods.isUsable = function (date = new Date()) {
  if (this.isDeleted) return { ok: false, reason: "PRICING_DELETED" };
  if (!this.isActive) return { ok: false, reason: "PRICING_INACTIVE" };
  if (this.status !== "active") return { ok: false, reason: "PRICING_NOT_ACTIVE" };
  if (!inDateRange(this.startAt, this.endAt, date)) {
    return { ok: false, reason: "PRICING_OUT_OF_DATE" };
  }

  return { ok: true };
};

PricingSchema.methods.calculate = function ({
  date = new Date(),
  people = 1,
  optionCodes = [],
  couponDiscount = 0,
  customDiscount = 0,
} = {}) {
  const usable = this.isUsable(date);
  if (!usable.ok) {
    return {
      ok: false,
      reason: usable.reason,
      total: 0,
    };
  }

  const targetDate = new Date(date);
  const hour = targetDate.getHours();
  const day = targetDate.getDay();

  const breakdown = {
    basePrice: safeNum(this.salePrice > 0 ? this.salePrice : this.basePrice),
    peopleExtra: 0,
    options: 0,
    timeSurcharge: 0,
    daySurcharge: 0,
    discount: 0,
    couponDiscount: safeNum(couponDiscount),
    customDiscount: safeNum(customDiscount),
    serviceFee: safeNum(this.serviceFee),
    tax: 0,
    platformFee: 0,
  };

  const countPeople = Math.max(1, safeNum(people, 1));

  if (countPeople > this.minPeople) {
    breakdown.peopleExtra = (countPeople - this.minPeople) * safeNum(this.extraPersonPrice);
  }

  for (const opt of this.options || []) {
    if (!opt.active) continue;
    if (optionCodes.includes(opt.code) || optionCodes.includes(String(opt._id))) {
      breakdown.options += safeNum(opt.price);
    }
  }

  const beforeSurcharge =
    breakdown.basePrice +
    breakdown.peopleExtra +
    breakdown.options;

  for (const s of this.timeSurcharges || []) {
    if (!s.active) continue;
    if (Array.isArray(s.days) && s.days.length > 0 && !s.days.includes(day)) continue;

    const start = safeNum(s.startHour);
    const end = safeNum(s.endHour);

    if (hour >= start && hour < end) {
      breakdown.timeSurcharge += applyAdjust(beforeSurcharge, s.type, s.value);
    }
  }

  for (const s of this.daySurcharges || []) {
    if (!s.active) continue;
    if (safeNum(s.day) === day) {
      breakdown.daySurcharge += applyAdjust(beforeSurcharge, s.type, s.value);
    }
  }

  let subtotal =
    breakdown.basePrice +
    breakdown.peopleExtra +
    breakdown.options +
    breakdown.timeSurcharge +
    breakdown.daySurcharge +
    breakdown.serviceFee;

  for (const d of this.discounts || []) {
    if (!d.active) continue;
    if (!inDateRange(d.startAt, d.endAt, targetDate)) continue;

    breakdown.discount += applyAdjust(subtotal, d.type, d.value);
  }

  breakdown.discount = Math.min(breakdown.discount, subtotal);
  subtotal -= breakdown.discount;

  const totalDiscount = Math.min(
    subtotal,
    safeNum(breakdown.couponDiscount) + safeNum(breakdown.customDiscount)
  );

  subtotal -= totalDiscount;

  breakdown.tax = Math.floor(subtotal * (safeNum(this.taxRate) / 100));
  breakdown.platformFee = Math.floor(subtotal * (safeNum(this.platformFeeRate) / 100));

  const total = Math.max(0, subtotal + breakdown.tax + breakdown.platformFee);

  return {
    ok: true,
    currency: this.currency,
    pricingId: this._id,
    total,
    subtotal,
    breakdown,
    durationMinutes: this.durationMinutes,
  };
};

PricingSchema.methods.activate = async function () {
  this.status = "active";
  this.isActive = true;
  await this.save();
  return this;
};

PricingSchema.methods.deactivate = async function () {
  this.status = "inactive";
  this.isActive = false;
  await this.save();
  return this;
};

PricingSchema.methods.softDelete = async function () {
  this.status = "deleted";
  this.isDeleted = true;
  this.isActive = false;
  this.deletedAt = now();
  await this.save();
  return this;
};

PricingSchema.methods.addOption = async function ({
  name,
  code = "",
  price = 0,
  durationMinutes = 0,
} = {}) {
  this.options.push({
    name,
    code,
    price,
    durationMinutes,
    active: true,
  });

  await this.save();
  return this;
};

PricingSchema.methods.addDiscount = async function ({
  name = "",
  type = "percent",
  value = 0,
  startAt = null,
  endAt = null,
} = {}) {
  this.discounts.push({
    name,
    type,
    value,
    startAt,
    endAt,
    active: true,
  });

  await this.save();
  return this;
};

/* =====================================================
🔥 STATICS
===================================================== */
PricingSchema.statics.findActive = function (filter = {}) {
  return this.find({
    ...filter,
    status: "active",
    isActive: true,
    isDeleted: false,
    $and: [
      {
        $or: [{ startAt: null }, { startAt: { $lte: now() } }],
      },
      {
        $or: [{ endAt: null }, { endAt: { $gte: now() } }],
      },
    ],
  }).sort({ priority: -1, createdAt: -1 });
};

PricingSchema.statics.findByCodeSafe = function (code) {
  return this.findOne({
    code: String(code || "").trim().toUpperCase(),
    isDeleted: false,
  });
};

PricingSchema.statics.findForShop = function (shopId, branchId = null) {
  const query = {
    shopId,
    status: "active",
    isActive: true,
    isDeleted: false,
  };

  if (branchId) query.branchId = branchId;

  return this.find(query).sort({ priority: -1, basePrice: 1 });
};

PricingSchema.statics.calculatePrice = async function ({
  pricingId = null,
  code = null,
  shopId = null,
  branchId = null,
  date = new Date(),
  people = 1,
  optionCodes = [],
  couponDiscount = 0,
  customDiscount = 0,
} = {}) {
  let pricing = null;

  if (pricingId) {
    pricing = await this.findById(pricingId);
  }

  if (!pricing && code) {
    pricing = await this.findByCodeSafe(code);
  }

  if (!pricing && shopId) {
    pricing = await this.findOne({
      shopId,
      branchId: branchId || null,
      status: "active",
      isActive: true,
      isDeleted: false,
    }).sort({ priority: -1, basePrice: 1 });
  }

  if (!pricing) throw new Error("PRICING_NOT_FOUND");

  return pricing.calculate({
    date,
    people,
    optionCodes,
    couponDiscount,
    customDiscount,
  });
};

PricingSchema.statics.createPricing = function ({
  name,
  code,
  description = "",
  shopId = null,
  branchId = null,
  serviceId = null,
  serviceName = "",
  category = "massage",
  basePrice = 0,
  salePrice = 0,
  durationMinutes = 60,
  currency = "KRW",
  minPeople = 1,
  maxPeople = 1,
  extraPersonPrice = 0,
  taxRate = 0,
  serviceFee = 0,
  platformFeeRate = 0,
  priority = 0,
  createdBy = null,
  metadata = {},
} = {}) {
  return this.create({
    name,
    code: String(code || "").trim().toUpperCase(),
    description,
    shopId,
    branchId,
    serviceId,
    serviceName,
    category,
    basePrice,
    salePrice,
    durationMinutes,
    currency,
    minPeople,
    maxPeople,
    extraPersonPrice,
    taxRate,
    serviceFee,
    platformFeeRate,
    priority,
    createdBy,
    metadata,
  });
};

PricingSchema.statics.expireOldPricing = function () {
  return this.updateMany(
    {
      isDeleted: false,
      isActive: true,
      endAt: { $ne: null, $lt: now() },
    },
    {
      $set: {
        status: "inactive",
        isActive: false,
      },
    }
  );
};

/* =====================================================
🔥 PRE SAVE
===================================================== */
PricingSchema.pre("save", function (next) {
  if (this.code) {
    this.code = String(this.code).trim().toUpperCase();
  }

  if (this.salePrice > 0 && this.salePrice > this.basePrice) {
    this.salePrice = this.basePrice;
  }

  if (this.maxPeople < this.minPeople) {
    this.maxPeople = this.minPeople;
  }

  if (this.endAt && this.endAt < now()) {
    this.status = "inactive";
    this.isActive = false;
  }

  next();
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 Pricing Model READY");

module.exports = mongoose.models.Pricing || mongoose.model("Pricing", PricingSchema);