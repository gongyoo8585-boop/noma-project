"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =====================================================
🔥 SLOT MODEL
시간 슬롯 / 예약 가능 수량 / 동시성 / 상태 관리
===================================================== */

const SlotSchema = new Schema(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    date: {
      type: Date,
      required: true,
      index: true,
    },

    time: {
      type: String, // "14:00"
      required: true,
      index: true,
    },

    datetime: {
      type: Date,
      required: true,
      index: true,
    },

    maxCapacity: {
      type: Number,
      default: 1,
      min: 1,
    },

    reservedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    availableCount: {
      type: Number,
      default: 1,
      min: 0,
    },

    status: {
      type: String,
      enum: ["open", "closed", "full", "blocked"],
      default: "open",
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

    isHoliday: {
      type: Boolean,
      default: false,
    },

    serviceIds: [
      {
        type: Schema.Types.ObjectId,
      },
    ],

    reservations: [
      {
        reservationId: {
          type: Schema.Types.ObjectId,
          ref: "Reservation",
        },
        userId: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
        people: {
          type: Number,
          default: 1,
        },
      },
    ],

    lock: {
      isLocked: { type: Boolean, default: false },
      lockedAt: { type: Date, default: null },
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
SlotSchema.index({ branchId: 1, date: 1, time: 1 }, { unique: true });
SlotSchema.index({ datetime: 1 });
SlotSchema.index({ status: 1, isActive: 1 });

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
🔥 VIRTUAL
===================================================== */
SlotSchema.virtual("isAvailable").get(function () {
  return (
    this.isActive &&
    !this.isDeleted &&
    this.status === "open" &&
    this.availableCount > 0
  );
});

/* =====================================================
🔥 INSTANCE METHODS
===================================================== */

/* 예약 가능 여부 */
SlotSchema.methods.canReserve = function (people = 1) {
  if (!this.isActive || this.isDeleted) return false;
  if (this.status !== "open") return false;
  if (this.isHoliday) return false;

  return this.availableCount >= safeNum(people, 1);
};

/* 예약 추가 */
SlotSchema.methods.reserve = async function ({
  reservationId,
  userId,
  people = 1,
}) {
  const count = safeNum(people, 1);

  if (!this.canReserve(count)) {
    throw new Error("SLOT_NOT_AVAILABLE");
  }

  this.reservations.push({
    reservationId,
    userId,
    people: count,
  });

  this.reservedCount += count;
  this.availableCount = Math.max(0, this.maxCapacity - this.reservedCount);

  if (this.availableCount === 0) {
    this.status = "full";
  }

  await this.save();
  return this;
};

/* 예약 취소 */
SlotSchema.methods.cancel = async function (reservationId) {
  const before = this.reservations.length;

  this.reservations = this.reservations.filter(
    (r) => String(r.reservationId) !== String(reservationId)
  );

  const removed = before - this.reservations.length;

  if (removed > 0) {
    this.recalculate();
    await this.save();
  }

  return this;
};

/* 재계산 */
SlotSchema.methods.recalculate = function () {
  let total = 0;

  for (const r of this.reservations) {
    total += safeNum(r.people, 1);
  }

  this.reservedCount = total;
  this.availableCount = Math.max(0, this.maxCapacity - total);

  if (this.availableCount === 0) {
    this.status = "full";
  } else {
    this.status = "open";
  }
};

/* 슬롯 잠금 */
SlotSchema.methods.lockSlot = async function () {
  this.lock.isLocked = true;
  this.lock.lockedAt = now();
  await this.save();
  return this;
};

/* 슬롯 잠금 해제 */
SlotSchema.methods.unlockSlot = async function () {
  this.lock.isLocked = false;
  this.lock.lockedAt = null;
  await this.save();
  return this;
};

/* 활성화 */
SlotSchema.methods.activate = async function () {
  this.isActive = true;
  this.status = "open";
  await this.save();
  return this;
};

/* 비활성화 */
SlotSchema.methods.deactivate = async function () {
  this.isActive = false;
  this.status = "closed";
  await this.save();
  return this;
};

/* 삭제 */
SlotSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = now();
  this.isActive = false;
  await this.save();
  return this;
};

/* =====================================================
🔥 STATICS
===================================================== */

/* 슬롯 생성 */
SlotSchema.statics.createSlot = function ({
  shopId,
  branchId,
  date,
  time,
  maxCapacity = 1,
}) {
  const d = new Date(date);
  const dt = new Date(`${d.toISOString().slice(0, 10)}T${time}:00`);

  return this.create({
    shopId,
    branchId,
    date: d,
    time,
    datetime: dt,
    maxCapacity,
    availableCount: maxCapacity,
  });
};

/* 슬롯 조회 */
SlotSchema.statics.findAvailable = function ({
  branchId,
  date,
}) {
  return this.find({
    branchId,
    date: new Date(date),
    status: "open",
    isActive: true,
    isDeleted: false,
  }).sort({ time: 1 });
};

/* 특정 시간 슬롯 */
SlotSchema.statics.findOneSlot = function ({
  branchId,
  date,
  time,
}) {
  return this.findOne({
    branchId,
    date: new Date(date),
    time,
    isDeleted: false,
  });
};

/* 슬롯 일괄 생성 */
SlotSchema.statics.bulkCreateSlots = async function ({
  shopId,
  branchId,
  date,
  times = [],
  maxCapacity = 1,
}) {
  const list = [];

  for (const t of times) {
    const d = new Date(date);
    const dt = new Date(`${d.toISOString().slice(0, 10)}T${t}:00`);

    list.push({
      shopId,
      branchId,
      date: d,
      time: t,
      datetime: dt,
      maxCapacity,
      availableCount: maxCapacity,
    });
  }

  return this.insertMany(list, { ordered: false });
};

/* 만료 슬롯 정리 */
SlotSchema.statics.cleanupExpired = function () {
  return this.updateMany(
    {
      datetime: { $lt: now() },
      status: "open",
    },
    {
      $set: { status: "closed" },
    }
  );
};

/* =====================================================
🔥 PRE SAVE
===================================================== */
SlotSchema.pre("save", function (next) {
  if (this.reservedCount > this.maxCapacity) {
    this.reservedCount = this.maxCapacity;
  }

  this.availableCount = Math.max(
    0,
    this.maxCapacity - this.reservedCount
  );

  if (this.availableCount === 0) {
    this.status = "full";
  }

  next();
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 Slot Model READY");

module.exports =
  mongoose.models.Slot || mongoose.model("Slot", SlotSchema);