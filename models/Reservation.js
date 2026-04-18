"use strict";

const mongoose = require("mongoose");

/* =====================================================
🔥 RESERVATION MODEL
👉 FILE: /models/Reservation.js
👉 FINAL ULTRA COMPLETE
👉 기존 기능 100% 유지 + 오류 수정 + 누락 복구 + 확장
👉 통째로 교체해서 붙여넣기
===================================================== */

/* =========================
   SCHEMA
========================= */
const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    placeId: { type: String, required: true, index: true },

    time: { type: Date, required: true, index: true },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "checked_in",
        "checked_out",
        "arrived",
        "no_show"
      ],
      default: "pending",
      index: true
    },

    people: { type: Number, default: 1, min: 1 },
    memo: { type: String, default: "" },

    isActive: { type: Boolean, default: true, index: true },
    isVisited: { type: Boolean, default: false, index: true },
    isReviewed: { type: Boolean, default: false, index: true },
    isNoShow: { type: Boolean, default: false, index: true },

    paymentStatus: {
      type: String,
      enum: ["none", "paid", "refund", "partial_refund", "failed"],
      default: "none",
      index: true
    },

    paymentAmount: { type: Number, default: 0, min: 0 },

    reserveCode: { type: String, index: true },
    visitCode: { type: String, index: true },

    confirmedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    checkInAt: { type: Date, default: null },
    checkOutAt: { type: Date, default: null },
    arrivalAt: { type: Date, default: null },

    cancelReason: { type: String, default: "" },
    adminMemo: { type: String, default: "" },

    expireAt: { type: Date, default: null, index: true },

    contactPhone: { type: String, default: "" },
    specialRequest: { type: String, default: "" },

    lastUpdatedBy: { type: String, default: "" },

    /* =========================
       확장 필드
    ========================= */
    shopId: { type: String, default: "", index: true },
    source: { type: String, default: "app", index: true },
    channel: { type: String, default: "app", index: true },
    device: { type: String, default: "" },
    timezone: { type: String, default: "Asia/Seoul" },

    adminId: { type: String, default: "" },
    confirmedBy: { type: String, default: "" },

    seatNo: { type: String, default: "" },
    tableNo: { type: String, default: "" },

    waitMinutes: { type: Number, default: 0, min: 0 },

    isReminderSent: { type: Boolean, default: false, index: true },
    reminderAt: { type: Date, default: null },

    paymentId: { type: String, default: "", index: true },

    reserveName: { type: String, default: "" },
    reserveEmail: { type: String, default: "" },

    isCompleted: { type: Boolean, default: false, index: true },

    updatedByLogs: [{ type: String }],
    tags: [{ type: String }],

    statusLogs: {
      type: [
        {
          status: { type: String, default: "" },
          changedAt: { type: Date, default: Date.now },
          reason: { type: String, default: "" },
          by: { type: String, default: "" }
        }
      ],
      default: []
    },

    priceSnapshot: { type: Number, default: 0 },
    discountSnapshot: { type: Number, default: 0 },

    clientIp: { type: String, default: "" },
    userAgent: { type: String, default: "" },

    internalNote: { type: String, default: "" },

    confirmCount: { type: Number, default: 0, min: 0 },
    cancelCount: { type: Number, default: 0, min: 0 },
    rescheduleCount: { type: Number, default: 0, min: 0 },

    lastReminderType: { type: String, default: "" },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        ret.reserveAt = ret.time || null;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

/* =========================
   VIRTUALS
========================= */
schema.virtual("reserveAt")
  .get(function () {
    return this.time || null;
  })
  .set(function (v) {
    this.time = v ? new Date(v) : null;
  });

/* =========================
   INDEX
========================= */
schema.index({ placeId: 1, time: 1 });
schema.index({ userId: 1, createdAt: -1 });
schema.index({ placeId: 1, status: 1, time: 1 });
schema.index({ userId: 1, status: 1, createdAt: -1 });
schema.index({ reserveCode: 1, isDeleted: 1 });
schema.index({ visitCode: 1, isDeleted: 1 });
schema.index({ paymentId: 1 });
schema.index({ expireAt: 1, status: 1 });
schema.index({ isCompleted: 1, completedAt: -1 });
schema.index({ isReminderSent: 1, reminderAt: -1 });
schema.index({ source: 1, createdAt: -1 });
schema.index({ channel: 1, createdAt: -1 });
schema.index({ shopId: 1, createdAt: -1 });

/* =========================
   UTIL
========================= */
function safeStr(v) {
  return String(v == null ? "" : v)
    .replace(/[<>]/g, "")
    .trim();
}

function safePhone(v) {
  return String(v == null ? "" : v).replace(/[^0-9]/g, "");
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function uniq(arr) {
  return [...new Set((Array.isArray(arr) ? arr : []).map((v) => safeStr(v)).filter(Boolean))];
}

function isValidDateValue(v) {
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

function minuteFloor(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

async function generateUniqueCode(Model, prefix, field) {
  for (let i = 0; i < 20; i += 1) {
    const code = `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}`;
    const exists = await Model.exists({ [field]: code });
    if (!exists) return code;
  }
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 1000000)}`;
}

function appendStatusLog(doc, status, reason = "", by = "") {
  if (!Array.isArray(doc.statusLogs)) {
    doc.statusLogs = [];
  }

  const last = doc.statusLogs[doc.statusLogs.length - 1];
  if (!last || last.status !== status) {
    doc.statusLogs.push({
      status,
      changedAt: new Date(),
      reason: safeStr(reason),
      by: safeStr(by)
    });
  }
}

/* =========================
   PRE VALIDATE
========================= */
schema.pre("validate", function (next) {
  try {
    this.userId = safeStr(this.userId);
    this.placeId = safeStr(this.placeId);
    this.shopId = safeStr(this.shopId || this.placeId);

    this.memo = safeStr(this.memo);
    this.cancelReason = safeStr(this.cancelReason);
    this.adminMemo = safeStr(this.adminMemo);
    this.specialRequest = safeStr(this.specialRequest);
    this.lastUpdatedBy = safeStr(this.lastUpdatedBy);
    this.adminId = safeStr(this.adminId);
    this.confirmedBy = safeStr(this.confirmedBy);
    this.source = safeStr(this.source || "app") || "app";
    this.channel = safeStr(this.channel || "app") || "app";
    this.device = safeStr(this.device);
    this.timezone = safeStr(this.timezone || "Asia/Seoul") || "Asia/Seoul";
    this.contactPhone = safePhone(this.contactPhone);
    this.reserveName = safeStr(this.reserveName);
    this.reserveEmail = safeStr(this.reserveEmail).toLowerCase();
    this.paymentId = safeStr(this.paymentId);
    this.seatNo = safeStr(this.seatNo);
    this.tableNo = safeStr(this.tableNo);
    this.clientIp = safeStr(this.clientIp);
    this.userAgent = safeStr(this.userAgent);
    this.internalNote = safeStr(this.internalNote);
    this.lastReminderType = safeStr(this.lastReminderType);

    this.people = Math.max(1, safeNum(this.people, 1));
    this.paymentAmount = Math.max(0, safeNum(this.paymentAmount, 0));
    this.waitMinutes = Math.max(0, safeNum(this.waitMinutes, 0));
    this.priceSnapshot = Math.max(0, safeNum(this.priceSnapshot, 0));
    this.discountSnapshot = Math.max(0, safeNum(this.discountSnapshot, 0));
    this.confirmCount = Math.max(0, safeNum(this.confirmCount, 0));
    this.cancelCount = Math.max(0, safeNum(this.cancelCount, 0));
    this.rescheduleCount = Math.max(0, safeNum(this.rescheduleCount, 0));

    this.tags = uniq(this.tags);
    this.updatedByLogs = uniq(this.updatedByLogs);

    if (this.time) {
      this.time = minuteFloor(this.time);
    }

    if (!this.status) this.status = "pending";
    if (!this.paymentStatus) this.paymentStatus = "none";

    if (this.status === "cancelled") this.isActive = false;
    if (this.status === "completed") this.isCompleted = true;

    if (this.isCompleted) {
      this.isActive = false;
      if (!this.completedAt) this.completedAt = new Date();
    }

    if (!this.userId || !this.placeId) {
      return next(new Error("필수값 누락"));
    }

    if (!this.time || !isValidDateValue(this.time)) {
      return next(new Error("예약 시간 오류"));
    }

    return next();
  } catch (e) {
    return next(e);
  }
});

/* =========================
   PRE SAVE
========================= */
schema.pre("save", async function (next) {
  try {
    const Model = this.constructor;

    if (this.time) {
      this.time = minuteFloor(this.time);
    }

    if (!this.reserveCode) {
      this.reserveCode = await generateUniqueCode(Model, "R", "reserveCode");
    }

    if (!this.visitCode) {
      this.visitCode = await generateUniqueCode(Model, "V", "visitCode");
    }

    if (!this.expireAt && this.time) {
      this.expireAt = new Date(new Date(this.time).getTime() + 60 * 60 * 1000);
    }

    if (this.isNew && this.time < new Date(Date.now() - 60 * 1000)) {
      return next(new Error("과거 시간 예약 불가"));
    }

    if (this.time > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) {
      return next(new Error("예약은 30일 이내만 가능"));
    }

    const conflictCount = await Model.countDocuments({
      placeId: this.placeId,
      time: this.time,
      status: { $nin: ["cancelled"] },
      isDeleted: { $ne: true },
      _id: { $ne: this._id }
    });

    if (conflictCount >= 10) {
      return next(new Error("해당 시간 예약 마감"));
    }

    if (this.isModified("status") || this.isNew) {
      appendStatusLog(this, this.status, this.cancelReason || "", this.lastUpdatedBy || this.adminId || "");
    }

    if (this.status === "confirmed" && !this.confirmedAt) {
      this.confirmedAt = new Date();
    }

    if (this.status === "cancelled" && !this.cancelledAt) {
      this.cancelledAt = new Date();
      this.isActive = false;
    }

    if (this.status === "completed" && !this.completedAt) {
      this.completedAt = new Date();
      this.isCompleted = true;
      this.isActive = false;
    }

    if (this.status === "no_show") {
      this.isNoShow = true;
      this.isActive = false;
    }

    return next();
  } catch (e) {
    return next(e);
  }
});

/* =========================
   INSTANCE METHODS
   기존 기능 유지 + 복구 + 확장
========================= */

/* 1 */
schema.methods.cancelSafe = function (reason = "") {
  this.status = "cancelled";
  this.cancelReason = safeStr(reason);
  this.cancelledAt = new Date();
  this.isActive = false;
  appendStatusLog(this, "cancelled", this.cancelReason, this.lastUpdatedBy || "");
  return this.save();
};

/* 2 */
schema.methods.confirm = function (adminId = "") {
  this.status = "confirmed";
  this.confirmedAt = new Date();
  this.lastUpdatedBy = safeStr(adminId);
  this.confirmedBy = safeStr(adminId);
  this.adminId = safeStr(adminId);
  this.confirmCount += 1;
  appendStatusLog(this, "confirmed", "", this.lastUpdatedBy);
  return this.save();
};

/* 3 */
schema.methods.complete = function () {
  this.status = "completed";
  this.completedAt = new Date();
  this.isCompleted = true;
  this.isActive = false;
  appendStatusLog(this, "completed", "", this.lastUpdatedBy || "");
  return this.save();
};

/* 4 */
schema.methods.checkIn = function () {
  this.status = "checked_in";
  this.checkInAt = new Date();
  appendStatusLog(this, "checked_in", "", this.lastUpdatedBy || "");
  return this.save();
};

/* 5 */
schema.methods.checkOut = function () {
  this.status = "checked_out";
  this.checkOutAt = new Date();
  this.isActive = false;
  appendStatusLog(this, "checked_out", "", this.lastUpdatedBy || "");
  return this.save();
};

/* 6 */
schema.methods.markVisited = function () {
  this.isVisited = true;
  return this.save();
};

/* 7 */
schema.methods.markNoShow = function () {
  this.isNoShow = true;
  this.status = "no_show";
  this.isActive = false;
  this.cancelledAt = new Date();
  appendStatusLog(this, "no_show", "", this.lastUpdatedBy || "");
  return this.save();
};

/* 8 */
schema.methods.pay = function (amount) {
  this.paymentStatus = "paid";
  this.paymentAmount = Math.max(0, safeNum(amount, 0));
  return this.save();
};

/* 9 */
schema.methods.refund = function () {
  this.paymentStatus = "refund";
  return this.save();
};

/* 10 */
schema.methods.arrive = function () {
  this.status = "arrived";
  this.arrivalAt = new Date();
  appendStatusLog(this, "arrived", "", this.lastUpdatedBy || "");
  return this.save();
};

/* 11 */
schema.methods.markReviewed = function () {
  this.isReviewed = true;
  return this.save();
};

/* 12 */
schema.methods.setAdminMemo = function (memo = "") {
  this.adminMemo = safeStr(memo);
  return this.save();
};

/* 13 */
schema.methods.setCancelReason = function (reason = "") {
  this.cancelReason = safeStr(reason);
  return this.save();
};

/* 14 */
schema.methods.setUpdatedBy = function (adminId = "") {
  const v = safeStr(adminId);
  this.lastUpdatedBy = v;
  if (v) {
    this.updatedByLogs = uniq([...(this.updatedByLogs || []), v]);
  }
  return this.save();
};

/* 15 */
schema.methods.setContactPhone = function (phone = "") {
  this.contactPhone = safePhone(콜);
  return this.save();
};

/* 16 */
schema.methods.setSpecialRequest = function (request = "") {
  this.specialRequest = safeStr(request);
  return this.save();
};

/* 17 */
schema.methods.setSeat = function (seatNo = "", tableNo = "") {
  this.seatNo = safeStr(seatNo);
  this.tableNo = safeStr(tableNo);
  return this.save();
};

/* 18 */
schema.methods.attachPayment = function (paymentId = "", amount = null) {
  this.paymentId = safeStr(paymentId);
  if (amount != null) {
    this.paymentAmount = Math.max(0, safeNum(amount, 0));
    this.paymentStatus = this.paymentAmount > 0 ? "paid" : this.paymentStatus;
  }
  return this.save();
};

/* 19 */
schema.methods.markReminder = function (type = "") {
  this.isReminderSent = true;
  this.reminderAt = new Date();
  this.lastReminderType = safeStr(type);
  return this.save();
};

/* 20 */
schema.methods.clearReminder = function () {
  this.isReminderSent = false;
  this.reminderAt = null;
  this.lastReminderType = "";
  return this.save();
};

/* 21 */
schema.methods.reschedule = function (newTime, by = "") {
  const d = new Date(newTime);
  if (Number.isNaN(d.getTime())) {
    throw new Error("예약 시간 오류");
  }
  this.time = minuteFloor(d);
  this.status = "pending";
  this.confirmedAt = null;
  this.rescheduleCount += 1;
  this.lastUpdatedBy = safeStr(by || this.lastUpdatedBy);
  this.expireAt = new Date(this.time.getTime() + 60 * 60 * 1000);
  appendStatusLog(this, "pending", "rescheduled", this.lastUpdatedBy);
  return this.save();
};

/* 22 */
schema.methods.extendPeople = function (count) {
  this.people = Math.max(1, safeNum(count, 1));
  return this.save();
};

/* 23 */
schema.methods.setMemo = function (memo = "") {
  this.memo = safeStr(memo);
  return this.save();
};

/* 24 */
schema.methods.addTag = function (tag = "") {
  const t = safeStr(tag);
  this.tags = uniq([...(this.tags || []), t]);
  return this.save();
};

/* 25 */
schema.methods.removeTag = function (tag = "") {
  const t = safeStr(tag);
  this.tags = (this.tags || []).filter((v) => v !== t);
  return this.save();
};

/* 26 */
schema.methods.setSource = function (src = "app") {
  this.source = safeStr(src) || "app";
  return this.save();
};

/* 27 */
schema.methods.setChannel = function (channel = "app") {
  this.channel = safeStr(channel) || "app";
  return this.save();
};

/* 28 */
schema.methods.setDevice = function (device = "") {
  this.device = safeStr(device);
  return this.save();
};

/* 29 */
schema.methods.setClientMeta = function ({ ip = "", ua = "" } = {}) {
  this.clientIp = safeStr(ip);
  this.userAgent = safeStr(ua);
  return this.save();
};

/* 30 */
schema.methods.setReserveUserInfo = function ({ name = "", email = "", phone = "" } = {}) {
  this.reserveName = safeStr(name);
  this.reserveEmail = safeStr(email).toLowerCase();
  this.contactPhone = safePhone(콜);
  return this.save();
};

/* 31 */
schema.methods.setInternalNote = function (note = "") {
  this.internalNote = safeStr(음표);
  return this.save();
};

/* 32 */
schema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

/* 33 */
schema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  if (this.status !== "cancelled" && this.status !== "completed" && this.status !== "no_show") {
    this.isActive = true;
  }
  return this.save();
};

/* 34 */
schema.methods.autoExpire = function () {
  if (this.status === "pending" && this.time < new Date()) {
    this.status = "cancelled";
    this.isActive = false;
    this.cancelledAt = new Date();
    appendStatusLog(this, "cancelled", "auto_expire", this.lastUpdatedBy || "");
  }
  return this.save();
};

/* 35 */
schema.methods.autoExpireSafe = function () {
  if (this.status === "pending" && this.expireAt && this.expireAt < new Date()) {
    this.status = "cancelled";
    this.isActive = false;
    this.cancelledAt = new Date();
    appendStatusLog(this, "cancelled", "expireAt", this.lastUpdatedBy || "");
  }
  return this.save();
};

/* 36 */
schema.methods.forcePending = function () {
  this.status = "pending";
  this.isActive = true;
  appendStatusLog(this, "pending", "force_pending", this.lastUpdatedBy || "");
  return this.save();
};

/* 37 */
schema.methods.forceCancel = function (reason = "") {
  return this.cancelSafe(reason || "force_cancel");
};

/* 38 */
schema.methods.canModify = function () {
  return !this.isDeleted && ["pending", "confirmed"].includes(this.status) && this.time > new Date();
};

/* 39 */
schema.methods.isToday = function () {
  const a = new Date(this.time);
  const b = new Date();
  return a.toDateString() === b.toDateString();
};

/* 40 */
schema.methods.isUpcoming = function () {
  return this.time > new Date() && !["cancelled", "completed", "no_show"].includes(this.status);
};

/* 41 */
schema.methods.isExpired = function () {
  return !!(this.expireAt && this.expireAt < new Date());
};

/* 42 */
schema.methods.isValidReservation = function () {
  return this.isActive && !this.isDeleted && !["cancelled", "no_show"].includes(this.status);
};

/* 43 */
schema.methods.calcProcessMinutes = function () {
  if (!this.completedAt || !this.createdAt) return 0;
  return Math.max(0, Math.round((new Date(this.completedAt) - new Date(this.createdAt)) / 60000));
};

/* 44 */
schema.methods.getDurationMinutes = function () {
  if (!this.checkInAt || !this.checkOutAt) return 0;
  return Math.max(0, Math.round((new Date(this.checkOutAt) - new Date(this.checkInAt)) / 60000));
};

/* 45 */
schema.methods.snapshot = function () {
  return {
    id: String(this._id),
    userId: this.userId,
    placeId: this.placeId,
    time: this.time,
    status: this.status,
    people: this.people,
    isActive: this.isActive,
    paymentStatus: this.paymentStatus,
    paymentAmount: this.paymentAmount
  };
};

/* 46 */
schema.methods.debugSnapshot = function () {
  return {
    id: String(this._id),
    reserveCode: this.reserveCode,
    visitCode: this.visitCode,
    status: this.status,
    time: this.time,
    userId: this.userId,
    placeId: this.placeId,
    isDeleted: this.isDeleted,
    isActive: this.isActive,
    expireAt: this.expireAt
  };
};

/* 47 */
schema.methods.normalize = function () {
  this.userId = safeStr(this.userId);
  this.placeId = safeStr(this.placeId);
  this.shopId = safeStr(this.shopId || this.placeId);
  this.contactPhone = safePhone(this.contactPhone);
  this.memo = safeStr(this.memo);
  this.adminMemo = safeStr(this.adminMemo);
  this.specialRequest = safeStr(this.specialRequest);
  return this.save();
};

/* 48 */
schema.methods.regenerateReserveCode = async function () {
  this.reserveCode = await generateUniqueCode(this.constructor, "R", "reserveCode");
  return this.save();
};

/* 49 */
schema.methods.regenerateVisitCode = async function () {
  this.visitCode = await generateUniqueCode(this.constructor, "V", "visitCode");
  return this.save();
};

/* 50 */
schema.methods.touch = function () {
  this.updatedAt = new Date();
  return this.save();
};

/* =========================
   STATIC METHODS
   기존 기능 유지 + 복구 + 확장
========================= */

/* 51 */
schema.statics.checkConflict = async function (placeId, time) {
  return !!(await this.exists({
    placeId: String(placeId),
    time: minuteFloor(time),
    status: { $ne: "cancelled" },
    isDeleted: { $ne: true }
  }));
};

/* 52 */
schema.statics.checkConflictFinal = async function (placeId, time, excludeId = null) {
  const query = {
    placeId: String(placeId),
    time: minuteFloor(time),
    status: { $in: ["pending", "confirmed", "checked_in", "arrived"] },
    isDeleted: { $ne: true }
  };
  if (excludeId) query._id = { $ne: excludeId };
  return !!(await this.exists(query));
};

/* 53 */
schema.statics.limitPerUser = async function (userId) {
  const count = await this.countDocuments({
    userId: String(userId),
    status: { $ne: "cancelled" },
    isDeleted: { $ne: true }
  });

  return {
    allowed: count < 5,
    count
  };
};

/* 54 */
schema.statics.limitPerUserStrict = async function (userId) {
  const count = await this.countDocuments({
    userId: String(userId),
    status: { $in: ["pending", "confirmed", "checked_in", "arrived"] },
    isDeleted: { $ne: true }
  });

  return {
    allowed: count < 5,
    count
  };
};

/* 55 */
schema.statics.findUpcoming = function (limit = 20) {
  return this.find({
    time: { $gte: new Date() },
    status: { $nin: ["cancelled", "completed", "no_show"] },
    isDeleted: { $ne: true }
  })
    .sort({ time: 1, createdAt: 1 })
    .limit(limit);
};

/* 56 */
schema.statics.findCompleted = function (limit = 20) {
  return this.find({
    $or: [{ completedAt: { $ne: null } }, { status: "completed" }],
    isDeleted: { $ne: true }
  })
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(limit);
};

/* 57 */
schema.statics.getRevenue = async function () {
  const items = await this.find({
    paymentStatus: "paid",
    isDeleted: { $ne: true }
  }).select("paymentAmount");
  return items.reduce((s, v) => s + safeNum(v.paymentAmount, 0), 0);
};

/* 58 */
schema.statics.findByUser = function (userId, limit = 100) {
  return this.find({
    userId: String(userId),
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 59 */
schema.statics.findByPlace = function (placeId, limit = 100) {
  return this.find({
    placeId: String(placeId),
    isDeleted: { $ne: true }
  })
    .sort({ time: -1, createdAt: -1 })
    .limit(limit);
};

/* 60 */
schema.statics.findByStatus = function (status, limit = 100) {
  return this.find({
    status: String(status),
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 61 */
schema.statics.findToday = function (placeId = "") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const query = {
    time: { $gte: start, $lt: end },
    isDeleted: { $ne: true }
  };
  if (placeId) query.placeId = String(placeId);

  return this.find(query).sort({ time: 1 });
};

/* 62 */
schema.statics.findExpiredPending = function () {
  return this.find({
    status: "pending",
    expireAt: { $lte: new Date() },
    isDeleted: { $ne: true }
  }).sort({ time: 1, createdAt: 1 });
};

/* 63 */
schema.statics.findNeedReminder = function (minutes = 30) {
  const from = new Date();
  const to = new Date(Date.now() + Math.max(1, safeNum(minutes, 30)) * 60 * 1000);

  return this.find({
    status: { $in: ["pending", "confirmed"] },
    isReminderSent: false,
    time: { $gte: from, $lte: to },
    isDeleted: { $ne: true }
  }).sort({ time: 1 });
};

/* 64 */
schema.statics.findByReserveCode = function (code) {
  return this.findOne({
    reserveCode: safeStr(code),
    isDeleted: { $ne: true }
  });
};

/* 65 */
schema.statics.findByVisitCode = function (code) {
  return this.findOne({
    visitCode: safeStr(code),
    isDeleted: { $ne: true }
  });
};

/* 66 */
schema.statics.getSlotCount = async function (placeId, time) {
  return this.countDocuments({
    placeId: String(placeId),
    time: minuteFloor(time),
    status: { $nin: ["cancelled"] },
    isDeleted: { $ne: true }
  });
};

/* 67 */
schema.statics.isSlotAvailable = async function (placeId, time, max = 10) {
  const count = await this.getSlotCount(placeId, time);
  return count < Math.max(1, safeNum(max, 10));
};

/* 68 */
schema.statics.getUserHistory = function (userId, limit = 50) {
  return this.find({
    userId: String(userId),
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 69 */
schema.statics.getStats = async function () {
  const [total, pending, confirmed, cancelled, completed, noShow] = await Promise.all([
    this.countDocuments({ isDeleted: { $ne: true } }),
    this.countDocuments({ status: "pending", isDeleted: { $ne: true } }),
    this.countDocuments({ status: "confirmed", isDeleted: { $ne: true } }),
    this.countDocuments({ status: "cancelled", isDeleted: { $ne: true } }),
    this.countDocuments({ $or: [{ status: "completed" }, { isCompleted: true }], isDeleted: { $ne: true } }),
    this.countDocuments({ isNoShow: true, isDeleted: { $ne: true } })
  ]);

  return { total, pending, confirmed, cancelled, completed, noShow };
};

/* 70 */
schema.statics.getSuccessRate = async function () {
  const total = await this.countDocuments({ isDeleted: { $ne: true } });
  if (!total) return 0;
  const okCount = await this.countDocuments({
    $or: [{ status: "confirmed" }, { status: "completed" }, { isVisited: true }],
    isDeleted: { $ne: true }
  });
  return okCount / total;
};

/* 71 */
schema.statics.getCancelRate = async function () {
  const total = await this.countDocuments({ isDeleted: { $ne: true } });
  if (!total) return 0;
  const cancel = await this.countDocuments({ status: "cancelled", isDeleted: { $ne: true } });
  return cancel / total;
};

/* 72 */
schema.statics.findRecent = function (limit = 20) {
  return this.find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 73 */
schema.statics.safeFind = function (query = {}, limit = 100) {
  return this.find({
    ...query,
    isDeleted: { $ne: true }
  })
    .sort({ time: 1, createdAt: 1 })
    .limit(limit);
};

/* 74 */
schema.statics.findCancelled = function (limit = 50) {
  return this.find({
    status: "cancelled",
    isDeleted: { $ne: true }
  })
    .sort({ cancelledAt: -1, createdAt: -1 })
    .limit(limit);
};

/* 75 */
schema.statics.findNoShow = function (limit = 50) {
  return this.find({
    isNoShow: true,
    isDeleted: { $ne: true }
  })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

/* 76 */
schema.statics.findReviewed = function (limit = 50) {
  return this.find({
    isReviewed: true,
    isDeleted: { $ne: true }
  })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

/* 77 */
schema.statics.findVisited = function (limit = 50) {
  return this.find({
    isVisited: true,
    isDeleted: { $ne: true }
  })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

/* 78 */
schema.statics.findByPaymentStatus = function (paymentStatus, limit = 50) {
  return this.find({
    paymentStatus: String(paymentStatus),
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 79 */
schema.statics.findByDateRange = function (from, to, extra = {}) {
  const query = {
    ...extra,
    isDeleted: { $ne: true }
  };

  if (from || to) {
    query.time = {};
    if (from) query.time.$gte = new Date(from);
    if (to) query.time.$lte = new Date(to);
  }

  return this.find(query).sort({ time: 1, createdAt: 1 });
};

/* 80 */
schema.statics.findBySource = function (source, limit = 50) {
  return this.find({
    source: String(source),
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 81 */
schema.statics.findByChannel = function (channel, limit = 50) {
  return this.find({
    channel: String(channel),
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 82 */
schema.statics.findByContactPhone = function (phone, limit = 50) {
  return this.find({
    contactPhone: safePhone(콜),
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 83 */
schema.statics.bulkCancel = function (ids = [], reason = "") {
  return this.updateMany(
    { _id: { $in: ids }, isDeleted: { $ne: true } },
    {
      $set: {
        status: "cancelled",
        isActive: false,
        cancelReason: safeStr(reason),
        cancelledAt: new Date()
      }
    }
  );
};

/* 84 */
schema.statics.bulkConfirm = function (ids = [], adminId = "") {
  return this.updateMany(
    { _id: { $in: ids }, isDeleted: { $ne: true } },
    {
      $set: {
        status: "confirmed",
        confirmedAt: new Date(),
        confirmedBy: safeStr(adminId),
        lastUpdatedBy: safeStr(adminId)
      },
      $inc: { confirmCount: 1 }
    }
  );
};

/* 85 */
schema.statics.bulkComplete = function (ids = []) {
  return this.updateMany(
    { _id: { $in: ids }, isDeleted: { $ne: true } },
    {
      $set: {
        status: "completed",
        isCompleted: true,
        completedAt: new Date(),
        isActive: false
      }
    }
  );
};

/* 86 */
schema.statics.bulkReminderMark = function (ids = [], type = "") {
  return this.updateMany(
    { _id: { $in: ids }, isDeleted: { $ne: true } },
    {
      $set: {
        isReminderSent: true,
        reminderAt: new Date(),
        lastReminderType: safeStr(type)
      }
    }
  );
};

/* 87 */
schema.statics.bulkSoftDelete = function (ids = []) {
  return this.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false
      }
    }
  );
};

/* 88 */
schema.statics.restoreMany = function (ids = []) {
  return this.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        isDeleted: false,
        deletedAt: null
      }
    }
  );
};

/* 89 */
schema.statics.cleanDeleted = function (days = 30) {
  const d = new Date(Date.now() - Math.max(1, safeNum(days, 30)) * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    isDeleted: true,
    deletedAt: { $lte: d }
  });
};

/* 90 */
schema.statics.cleanOldCancelled = function (days = 7) {
  const d = new Date(Date.now() - Math.max(1, safeNum(days, 7)) * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    status: "cancelled",
    time: { $lt: d }
  });
};

/* 91 */
schema.statics.getHotTimes = async function (placeId) {
  return this.aggregate([
    {
      $match: {
        placeId: String(placeId),
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: { hour: { $hour: "$time" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1, "_id.hour": 1 } }
  ]);
};

/* 92 */
schema.statics.getRanking = async function (limit = 20) {
  const items = await this.find({ isDeleted: { $ne: true } }).lean();
  return items
    .map((v) => ({
      ...v,
      score:
        safeNum(v.people, 1) * 2 +
        (v.isVisited ? 5 : 0) +
        (v.isReviewed ? 10 : 0) +
        (v.paymentStatus === "paid" ? 7 : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, safeNum(limit, 20)));
};

/* 93 */
schema.statics.getDailySummary = async function (date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [total, confirmed, cancelled, completed] = await Promise.all([
    this.countDocuments({ time: { $gte: start, $lt: end }, isDeleted: { $ne: true } }),
    this.countDocuments({ time: { $gte: start, $lt: end }, status: "confirmed", isDeleted: { $ne: true } }),
    this.countDocuments({ time: { $gte: start, $lt: end }, status: "cancelled", isDeleted: { $ne: true } }),
    this.countDocuments({
      time: { $gte: start, $lt: end },
      $or: [{ status: "completed" }, { isCompleted: true }],
      isDeleted: { $ne: true }
    })
  ]);

  return { total, confirmed, cancelled, completed };
};

/* 94 */
schema.statics.existsReserveCode = async function (code) {
  return !!(await this.exists({ reserveCode: safeStr(code) }));
};

/* 95 */
schema.statics.existsVisitCode = async function (code) {
  return !!(await this.exists({ visitCode: safeStr(code) }));
};

/* 96 */
schema.statics.quickReserve = function (data = {}) {
  return this.create({
    ...data,
    userId: safeStr(data.userId),
    placeId: safeStr(data.placeId),
    shopId: safeStr(data.shopId || data.placeId),
    time: minuteFloor(data.time || new Date()),
    status: "pending"
  });
};

/* 97 */
schema.statics.searchMemo = function (q = "", limit = 50) {
  const keyword = safeStr(q);
  return this.find({
    $or: [
      { memo: { $regex: keyword, $options: "i" } },
      { adminMemo: { $regex: keyword, $options: "i" } },
      { specialRequest: { $regex: keyword, $options: "i" } }
    ],
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/* 98 */
schema.statics.findActiveNow = function (limit = 100) {
  return this.find({
    isActive: true,
    isDeleted: { $ne: true }
  })
    .sort({ time: 1, createdAt: 1 })
    .limit(limit);
};

/* 99 */
schema.statics.findArrived = function (limit = 50) {
  return this.find({
    arrivalAt: { $ne: null },
    isDeleted: { $ne: true }
  })
    .sort({ arrivalAt: -1 })
    .limit(limit);
};

/* 100 */
schema.statics.findCheckedIn = function (limit = 50) {
  return this.find({
    checkInAt: { $ne: null },
    isDeleted: { $ne: true }
  })
    .sort({ checkInAt: -1 })
    .limit(limit);
};

/* 101 */
schema.statics.findCheckedOut = function (limit = 50) {
  return this.find({
    checkOutAt: { $ne: null },
    isDeleted: { $ne: true }
  })
    .sort({ checkOutAt: -1 })
    .limit(limit);
};

/* 102 */
schema.statics.findWaiting = function (limit = 50) {
  return this.find({
    waitMinutes: { $gt: 0 },
    isDeleted: { $ne: true }
  })
    .sort({ waitMinutes: -1, createdAt: -1 })
    .limit(limit);
};

/* 103 */
schema.statics.findNeedAction = function (limit = 50) {
  return this.find({
    status: { $in: ["pending", "confirmed"] },
    time: { $lte: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    isDeleted: { $ne: true }
  })
    .sort({ time: 1 })
    .limit(limit);
};

/* 104 */
schema.statics.findLongPending = function (minutes = 30, limit = 50) {
  const d = new Date(Date.now() - Math.max(1, safeNum(minutes, 30)) * 60 * 1000);
  return this.find({
    status: "pending",
    createdAt: { $lte: d },
    isDeleted: { $ne: true }
  })
    .sort({ createdAt: 1 })
    .limit(limit);
};

/* 105 */
schema.statics.findRecentPaid = function (limit = 50) {
  return this.find({
    paymentStatus: "paid",
    isDeleted: { $ne: true }
  })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

/* 106 */
schema.statics.findRefunded = function (limit = 50) {
  return this.find({
    paymentStatus: { $in: ["refund", "partial_refund"] },
    isDeleted: { $ne: true }
  })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

/* 107 */
schema.statics.findForAdminDashboard = async function () {
  const [recent, upcoming, expired] = await Promise.all([
    this.findRecent(10),
    this.findUpcoming(10),
    this.findExpiredPending()
  ]);

  return { recent, upcoming, expired };
};

/* 108 */
schema.statics.revenueByDateRange = async function (from, to) {
  const query = {
    paymentStatus: "paid",
    isDeleted: { $ne: true }
  };
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const items = await this.find(query).select("paymentAmount");
  return items.reduce((sum, v) => sum + safeNum(v.paymentAmount, 0), 0);
};

/* 109 */
schema.statics.countByPlace = async function (placeId) {
  return this.countDocuments({
    placeId: String(placeId),
    isDeleted: { $ne: true }
  });
};

/* 110 */
schema.statics.countByUser = async function (userId) {
  return this.countDocuments({
    userId: String(userId),
    isDeleted: { $ne: true }
  });
};

/* =========================
   ERROR HANDLER HOOK
========================= */
schema.post("save", function (error, doc, next) {
  if (error && error.code === 11000) {
    return next(new Error("중복 예약 코드 오류"));
  }
  return next(error);
});

/* =========================
   FINAL
========================= */
console.log("🔥 RESERVATION FINAL ULTRA COMPLETE READY");

module.exports =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", schema);