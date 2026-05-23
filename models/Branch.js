"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =====================================================
🔥 BRANCH MODEL
매장 지점 / 위치 / 운영시간 / 슬롯 / 상태 관리
===================================================== */

const BranchSchema = new Schema(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

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

    address: {
      full: { type: String, default: "" },
      city: { type: String, default: "", index: true },
      district: { type: String, default: "" },
      zip: { type: String, default: "" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    contact: {
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
    },

    managerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    operatingHours: [
      {
        day: { type: Number, min: 0, max: 6, required: true }, // 0:일요일
        open: { type: String, required: true }, // "10:00"
        close: { type: String, required: true }, // "22:00"
        isClosed: { type: Boolean, default: false },
      },
    ],

    holidays: [
      {
        date: { type: Date, required: true },
        reason: { type: String, default: "" },
      },
    ],

    slotIntervalMinutes: {
      type: Number,
      default: 60,
      min: 10,
    },

    maxReservationsPerSlot: {
      type: Number,
      default: 1,
      min: 1,
    },

    services: [
      {
        serviceId: { type: Schema.Types.ObjectId },
        name: { type: String, default: "" },
        active: { type: Boolean, default: true },
      },
    ],

    images: [
      {
        url: { type: String },
        alt: { type: String, default: "" },
      },
    ],

    rating: {
      avg: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },

    status: {
      type: String,
      enum: ["active", "inactive", "closed", "deleted"],
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

    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

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
BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ shopId: 1, status: 1 });
BranchSchema.index({ "address.city": 1 });
BranchSchema.index({ isActive: 1, isDeleted: 1 });
BranchSchema.index({ priority: -1 });

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
}

function parseTime(str) {
  const [h, m] = (str || "").split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/* =====================================================
🔥 VIRTUALS
===================================================== */
BranchSchema.virtual("isOpenNow").get(function () {
  const d = new Date();
  return this.isOpenAt(d);
});

/* =====================================================
🔥 INSTANCE METHODS
===================================================== */
BranchSchema.methods.isOpenAt = function (date = new Date()) {
  if (!this.isActive || this.isDeleted || this.status !== "active") {
    return false;
  }

  const day = date.getDay();

  // 휴일 체크
  for (const h of this.holidays || []) {
    if (isSameDay(h.date, date)) {
      return false;
    }
  }

  const hours = this.operatingHours.find((h) => h.day === day);

  if (!hours || hours.isClosed) return false;

  const nowTime = date.getHours() * 60 + date.getMinutes();

  const open = parseTime(hours.open);
  const close = parseTime(hours.close);

  const openMin = open.h * 60 + open.m;
  const closeMin = close.h * 60 + close.m;

  return nowTime >= openMin && nowTime < closeMin;
};

BranchSchema.methods.generateSlots = function (date) {
  const d = new Date(date);
  const day = d.getDay();

  const hours = this.operatingHours.find((h) => h.day === day);

  if (!hours || hours.isClosed) return [];

  const open = parseTime(hours.open);
  const close = parseTime(hours.close);

  let current = open.h * 60 + open.m;
  const end = close.h * 60 + close.m;

  const slots = [];

  while (current < end) {
    const h = Math.floor(current / 60)
      .toString()
      .padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");

    slots.push(`${h}:${m}`);
    current += this.slotIntervalMinutes;
  }

  return slots;
};

BranchSchema.methods.activate = async function () {
  this.status = "active";
  this.isActive = true;
  await this.save();
  return this;
};

BranchSchema.methods.deactivate = async function () {
  this.status = "inactive";
  this.isActive = false;
  await this.save();
  return this;
};

BranchSchema.methods.softDelete = async function () {
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
BranchSchema.statics.findActive = function (filter = {}) {
  return this.find({
    ...filter,
    status: "active",
    isActive: true,
    isDeleted: false,
  }).sort({ priority: -1, createdAt: -1 });
};

BranchSchema.statics.findByCodeSafe = function (code) {
  return this.findOne({
    code: String(code || "").trim().toUpperCase(),
    isDeleted: false,
  });
};

BranchSchema.statics.findByShop = function (shopId) {
  return this.find({
    shopId,
    isDeleted: false,
  }).sort({ priority: -1 });
};

BranchSchema.statics.getOpenBranches = async function () {
  const list = await this.find({
    isActive: true,
    isDeleted: false,
    status: "active",
  });

  return list.filter((b) => b.isOpenNow);
};

/* =====================================================
🔥 PRE SAVE
===================================================== */
BranchSchema.pre("save", function (next) {
  if (this.code) {
    this.code = String(this.code).trim().toUpperCase();
  }

  if (this.rating && this.rating.count === 0) {
    this.rating.avg = 0;
  }

  next();
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 Branch Model READY");

module.exports =
  mongoose.models.Branch || mongoose.model("Branch", BranchSchema);