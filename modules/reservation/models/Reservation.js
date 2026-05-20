"use strict";

const mongoose = require("mongoose");

const ReservationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true, trim: true },
    shopId: { type: String, required: true, index: true, trim: true },
    serviceId: { type: String, default: null, index: true, trim: true },
    therapistId: { type: String, default: null, index: true, trim: true },

    reservationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "confirmed",
        "cancelled",
        "completed",
        "refunded",
        "expired",
        "no_show",
      ],
      default: "pending",
      index: true,
    },

    reservationDate: { type: String, default: null, index: true },
    reservationTime: { type: String, default: null, index: true },

    startAt: { type: Date, default: null, index: true },
    endAt: { type: Date, default: null, index: true },

    duration: { type: Number, default: 60 },
    price: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    finalPrice: { type: Number, default: 0 },

    paymentId: { type: String, default: null, index: true },

    customerName: String,
    customerPhone: String,
    customerRequest: String,

    address: String,
    detailAddress: String,

    paidAt: Date,
    confirmedAt: Date,
    cancelledAt: Date,
    completedAt: Date,
    refundedAt: Date,
    expiredAt: Date,

    cancelReason: String,
    refundReason: String,

    adminNote: String,

    snapshot: {
      shopName: String,
      serviceName: String,
      therapistName: String,
    },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false }
);

/* =====================================================
🔥 PRE
===================================================== */
ReservationSchema.pre("validate", function (next) {
  try {
    if (!this.reservationCode) {
      this.reservationCode =
        "res_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    }

    const price = Number(this.price || 0);
    const discount = Number(this.discountAmount || 0);
    this.finalPrice = Math.max(price - discount, 0);

    next();
  } catch (e) {
    next(e);
  }
});

/* =====================================================
🔥 METHODS (기존 + 복구)
===================================================== */

ReservationSchema.methods.cancelSafe = async function (reason) {
  this.status = "cancelled";
  this.cancelReason = reason || null;
  this.cancelledAt = new Date();
  return this.save();
};

ReservationSchema.methods.confirm = async function () {
  this.status = "confirmed";
  this.confirmedAt = new Date();
  return this.save();
};

ReservationSchema.methods.checkIn = async function () {
  this.metadata = { ...this.metadata, checkedIn: true };
  return this.save();
};

ReservationSchema.methods.checkOut = async function () {
  this.status = "completed";
  this.completedAt = new Date();
  return this.save();
};

ReservationSchema.methods.reschedule = async function (newTime) {
  this.startAt = new Date(newTime);
  return this.save();
};

/* =====================================================
🔥 STATICS (복구 핵심)
===================================================== */

ReservationSchema.statics.checkConflictFinal = async function (shopId, time) {
  return this.findOne({
    shopId,
    startAt: new Date(time),
    status: { $in: ["pending", "paid", "confirmed"] },
    isDeleted: false,
  });
};

ReservationSchema.statics.limitPerUserStrict = async function (userId) {
  const count = await this.countDocuments({
    userId,
    status: { $in: ["pending", "paid"] },
    isDeleted: false,
  });

  return { allowed: count < 5 };
};

ReservationSchema.statics.findByUser = function (userId) {
  return this.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
};

ReservationSchema.statics.findByStatus = function (status, limit = 50) {
  return this.find({ status, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit);
};

ReservationSchema.statics.findRecent = function (limit = 50) {
  return this.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit);
};

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

ReservationSchema.statics.expireOld = async function () {
  const now = new Date();
  return this.updateMany(
    {
      status: "pending",
      createdAt: { $lt: new Date(now - 1000 * 60 * 30) },
    },
    { status: "expired", expiredAt: now }
  );
};

/* =====================================================
🔥 FINAL
===================================================== */
module.exports = mongoose.model("Reservation", ReservationSchema);