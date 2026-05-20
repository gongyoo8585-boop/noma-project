"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =====================================================
🔥 STATUS ENUM
===================================================== */
const STATUS = [
  "pending",      // 생성됨
  "paid",         // 결제 완료
  "confirmed",    // 관리자 확정
  "completed",    // 이용 완료
  "cancelled",    // 취소됨
  "no_show",      // 노쇼
  "expired"       // 자동 만료
];

/* =====================================================
🔥 SCHEMA
===================================================== */
const ReservationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    placeId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },

    time: { type: Date, required: true, index: true },
    people: { type: Number, default: 1 },

    memo: { type: String, default: "" },
    contactPhone: { type: String, default: "" },

    tags: [{ type: String }],

    serviceId: { type: Schema.Types.ObjectId, default: null },
    price: { type: Number, default: 0 },

    status: { type: String, enum: STATUS, default: "pending", index: true },

    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", default: null },

    cancelledAt: { type: Date },
    cancelReason: { type: String },

    confirmedAt: { type: Date },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User" },

    checkedInAt: { type: Date },
    checkedOutAt: { type: Date },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

/* =====================================================
🔥 INDEX
===================================================== */
ReservationSchema.index({ placeId: 1, time: 1 });
ReservationSchema.index({ userId: 1, createdAt: -1 });

/* =====================================================
🔥 STATIC: CONFLICT CHECK
===================================================== */
ReservationSchema.statics.checkConflictFinal = async function (placeId, time) {
  const start = new Date(time);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1시간 기준

  const conflict = await this.findOne({
    placeId,
    time: { $gte: start, $lt: end },
    status: { $in: ["pending", "paid", "confirmed"] }
  });

  return !!conflict;
};

/* =====================================================
🔥 STATIC: LIMIT
===================================================== */
ReservationSchema.statics.limitPerUserStrict = async function (userId) {
  const count = await this.countDocuments({
    userId,
    status: { $in: ["pending", "paid", "confirmed"] }
  });

  return {
    allowed: count < 5,
    current: count
  };
};

/* =====================================================
🔥 STATIC: FIND
===================================================== */
ReservationSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

ReservationSchema.statics.findByStatus = function (status, limit = 50) {
  return this.find({ status }).sort({ createdAt: -1 }).limit(limit);
};

ReservationSchema.statics.findRecent = function (limit = 50) {
  return this.find().sort({ createdAt: -1 }).limit(limit);
};

/* =====================================================
🔥 INSTANCE METHODS
===================================================== */
ReservationSchema.methods.cancelSafe = async function (reason = "cancel") {
  if (["cancelled", "completed"].includes(this.status)) return;

  this.status = "cancelled";
  this.cancelReason = reason;
  this.cancelledAt = new Date();

  await this.save();
};

ReservationSchema.methods.confirm = async function (adminId) {
  this.status = "confirmed";
  this.confirmedAt = new Date();
  this.confirmedBy = adminId;

  await this.save();
};

ReservationSchema.methods.checkIn = async function () {
  if (this.status !== "confirmed") return;

  this.checkedInAt = new Date();
  await this.save();
};

ReservationSchema.methods.checkOut = async function () {
  if (!this.checkedInAt) return;

  this.checkedOutAt = new Date();
  this.status = "completed";

  await this.save();
};

ReservationSchema.methods.reschedule = async function (newTime) {
  this.time = newTime;
  this.status = "pending";

  await this.save();
};

/* =====================================================
🔥 BULK
===================================================== */
ReservationSchema.statics.bulkCancel = async function (ids = []) {
  return this.updateMany(
    { _id: { $in: ids } },
    { status: "cancelled", cancelledAt: new Date() }
  );
};

ReservationSchema.statics.bulkConfirm = async function (ids = []) {
  return this.updateMany(
    { _id: { $in: ids } },
    { status: "confirmed", confirmedAt: new Date() }
  );
};

/* =====================================================
🔥 AUTO JOB
===================================================== */
ReservationSchema.statics.expireOld = async function () {
  const now = new Date();

  return this.updateMany(
    {
      status: "pending",
      time: { $lt: now }
    },
    {
      status: "expired"
    }
  );
};

ReservationSchema.statics.markNoShow = async function () {
  const now = new Date();

  return this.updateMany(
    {
      status: "confirmed",
      time: { $lt: new Date(now.getTime() - 60 * 60 * 1000) }
    },
    {
      status: "no_show"
    }
  );
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 Reservation Model READY");

module.exports = mongoose.model("Reservation", ReservationSchema);