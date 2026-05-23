"use strict";

const mongoose = require("mongoose");

/* =====================================================
🔥 PAYMENT MODEL (KAKAO PAY ONLY FINAL MASTER)
👉 카드 결제 제거
👉 카카오페이 전용
👉 기존 기능 복구 + 오류 수정 + 운영 확장
👉 통째로 교체 가능
===================================================== */

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeInt(v, d = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
}

function uniq(arr) {
  return [...new Set(Array.isArray(arr) ? arr.filter(Boolean) : [])];
}

function genOrderId() {
  return `ORD_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function isValidStatus(status = "") {
  return [
    "ready",
    "pending",
    "paid",
    "failed",
    "cancelled",
    "refunded",
    "partial_refunded",
    "expired",
    "verifying"
  ].includes(String(status));
}

/* =====================================================
🔥 SCHEMA
===================================================== */
const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },

    shopId: {
      type: String,
      default: "",
      index: true
    },

    placeId: {
      type: String,
      default: "",
      index: true
    },

    reservationId: {
      type: String,
      default: "",
      index: true
    },

    orderId: {
      type: String,
      default: "",
      index: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    currency: {
      type: String,
      default: "KRW",
      index: true
    },

    title: {
      type: String,
      default: "예약 결제"
    },

    description: {
      type: String,
      default: ""
    },

    /* =========================
       🔥 카카오페이 전용
    ========================= */
    method: {
      type: String,
      enum: ["kakao"],
      default: "kakao",
      index: true
    },

    status: {
      type: String,
      enum: [
        "ready",
        "pending",
        "paid",
        "failed",
        "cancelled",
        "refunded",
        "partial_refunded",
        "expired",
        "verifying"
      ],
      default: "ready",
      index: true
    },

    tid: {
      type: String,
      default: "",
      index: true
    },

    partnerOrderId: {
      type: String,
      default: "",
      index: true
    },

    partnerUserId: {
      type: String,
      default: "",
      index: true
    },

    paymentKey: {
      type: String,
      default: "",
      index: true
    },

    redirectUrl: {
      type: String,
      default: ""
    },

    receiptUrl: {
      type: String,
      default: ""
    },

    approvedAt: {
      type: Date,
      default: null,
      index: true
    },

    cancelledAt: {
      type: Date,
      default: null,
      index: true
    },

    failedAt: {
      type: Date,
      default: null,
      index: true
    },

    refundedAt: {
      type: Date,
      default: null,
      index: true
    },

    expireAt: {
      type: Date,
      default: null,
      index: true
    },

    isExpired: {
      type: Boolean,
      default: false,
      index: true
    },

    verified: {
      type: Boolean,
      default: false,
      index: true
    },

    lastVerifiedAt: {
      type: Date,
      default: null
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    failReason: {
      type: String,
      default: ""
    },

    cancelReason: {
      type: String,
      default: ""
    },

    refundReason: {
      type: String,
      default: ""
    },

    approvedBy: {
      type: String,
      default: ""
    },

    refundedBy: {
      type: String,
      default: ""
    },

    cancelledBy: {
      type: String,
      default: ""
    },

    customerName: {
      type: String,
      default: ""
    },

    customerEmail: {
      type: String,
      default: ""
    },

    customerPhone: {
      type: String,
      default: ""
    },

    locale: {
      type: String,
      default: "ko-KR"
    },

    clientIp: {
      type: String,
      default: ""
    },

    userAgent: {
      type: String,
      default: ""
    },

    source: {
      type: String,
      default: "api",
      index: true
    },

    device: {
      type: String,
      default: ""
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },

    deletedAt: {
      type: Date,
      default: null
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    providerPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    tags: [{ type: String }],

    logs: {
      type: [
        {
          type: { type: String, default: "" },
          message: { type: String, default: "" },
          at: { type: Date, default: Date.now }
        }
      ],
      default: []
    },

    statusLogs: {
      type: [
        {
          from: { type: String, default: "" },
          to: { type: String, default: "" },
          reason: { type: String, default: "" },
          by: { type: String, default: "" },
          at: { type: Date, default: Date.now }
        }
      ],
      default: []
    },

    verifyCount: {
      type: Number,
      default: 0,
      min: 0
    },

    refundCount: {
      type: Number,
      default: 0,
      min: 0
    },

    cancelCount: {
      type: Number,
      default: 0,
      min: 0
    },

    retryCount: {
      type: Number,
      default: 0,
      min: 0
    },

    adminMemo: {
      type: String,
      default: ""
    },

    internalNote: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true,
    minimize: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true
    }
  }
);

/* =====================================================
🔥 VIRTUAL
===================================================== */
paymentSchema.virtual("isPaid").get(function () {
  return this.status === "paid";
});

paymentSchema.virtual("isActivePayment").get(function () {
  return !this.isDeleted && !["failed", "cancelled", "expired", "refunded"].includes(this.status);
});

/* =====================================================
🔥 INDEX
===================================================== */
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ shopId: 1, createdAt: -1 });
paymentSchema.index({ placeId: 1, createdAt: -1 });
paymentSchema.index({ reservationId: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1, isDeleted: 1 });
paymentSchema.index({ partnerOrderId: 1, isDeleted: 1 });
paymentSchema.index({ paymentKey: 1, isDeleted: 1 });
paymentSchema.index({ tid: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ approvedAt: -1, status: 1 });
paymentSchema.index({ expireAt: 1, status: 1 });
paymentSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

/* =====================================================
🔥 INTERNAL HELPERS
===================================================== */
function addStatusLog(doc, from, to, reason = "", by = "") {
  if (!Array.isArray(doc.statusLogs)) {
    doc.statusLogs = [];
  }

  doc.statusLogs.push({
    from: safeStr(from),
    to: safeStr(to),
    reason: safeStr(reason),
    by: safeStr(by),
    at: new Date()
  });

  if (doc.statusLogs.length > 200) {
    doc.statusLogs.shift();
  }
}

function addLog(doc, type = "", message = "") {
  if (!Array.isArray(doc.logs)) {
    doc.logs = [];
  }

  doc.logs.push({
    type: safeStr(type),
    message: safeStr(message),
    at: new Date()
  });

  if (doc.logs.length > 200) {
    doc.logs.shift();
  }
}

/* =====================================================
🔥 PRE VALIDATE
===================================================== */
paymentSchema.pre("validate", function (next) {
  try {
    this.userId = safeStr(this.userId);
    this.shopId = safeStr(this.shopId);
    this.placeId = safeStr(this.placeId || this.shopId);
    this.reservationId = safeStr(this.reservationId);
    this.orderId = safeStr(this.orderId);
    this.partnerOrderId = safeStr(this.partnerOrderId || this.orderId);
    this.partnerUserId = safeStr(this.partnerUserId || this.userId);
    this.tid = safeStr(this.tid);
    this.paymentKey = safeStr(this.paymentKey);
    this.redirectUrl = safeStr(this.redirectUrl);
    this.receiptUrl = safeStr(this.receiptUrl);
    this.title = safeStr(this.title || "예약 결제", "예약 결제");
    this.description = safeStr(this.description);
    this.currency = safeStr(this.currency || "KRW", "KRW").toUpperCase();
    this.failReason = safeStr(this.failReason);
    this.cancelReason = safeStr(this.cancelReason);
    this.refundReason = safeStr(this.refundReason);
    this.approvedBy = safeStr(this.approvedBy);
    this.refundedBy = safeStr(this.refundedBy);
    this.cancelledBy = safeStr(this.cancelledBy);
    this.customerName = safeStr(this.customerName);
    this.customerEmail = safeStr(this.customerEmail).toLowerCase();
    this.customerPhone = safeStr(this.customerPhone);
    this.locale = safeStr(this.locale || "ko-KR", "ko-KR");
    this.clientIp = safeStr(this.clientIp);
    this.userAgent = safeStr(this.userAgent);
    this.source = safeStr(this.source || "api", "api");
    this.device = safeStr(this.device);
    this.adminMemo = safeStr(this.adminMemo);
    this.internalNote = safeStr(this.internalNote);

    this.amount = Math.max(0, safeNum(this.amount, 0));
    this.refundAmount = Math.max(0, safeNum(this.refundAmount, 0));
    this.verifyCount = Math.max(0, safeInt(this.verifyCount, 0));
    this.refundCount = Math.max(0, safeInt(this.refundCount, 0));
    this.cancelCount = Math.max(0, safeInt(this.cancelCount, 0));
    this.retryCount = Math.max(0, safeInt(this.retryCount, 0));

    this.tags = uniq((this.tags || []).map((v) => safeStr(v)).filter(Boolean));

    if (!this.userId) {
      return next(new Error("userId required"));
    }

    if (!this.shopId && !this.placeId) {
      return next(new Error("shopId required"));
    }

    if (!isValidStatus(this.status)) {
      this.status = "ready";
    }

    next();
  } catch (e) {
    next(e);
  }
});

/* =====================================================
🔥 PRE SAVE
===================================================== */
paymentSchema.pre("save", function (next) {
  try {
    if (!this.orderId) {
      this.orderId = genOrderId();
    }

    if (!this.partnerOrderId) {
      this.partnerOrderId = this.orderId;
    }

    if (!this.partnerUserId) {
      this.partnerUserId = this.userId;
    }

    if (!this.expireAt && ["ready", "pending", "verifying"].includes(this.status)) {
      this.expireAt = new Date(Date.now() + 1000 * 60 * 30);
    }

    if (this.status === "paid") {
      this.verified = true;
      this.approvedAt = this.approvedAt || new Date();
      this.lastVerifiedAt = this.lastVerifiedAt || new Date();
    }

    if (this.status === "failed") {
      this.failedAt = this.failedAt || new Date();
    }

    if (this.status === "cancelled") {
      this.cancelledAt = this.cancelledAt || new Date();
    }

    if (this.status === "refunded" || this.status === "partial_refunded") {
      this.refundedAt = this.refundedAt || new Date();
      if (this.refundAmount <= 0) {
        this.refundAmount = this.amount;
      }
    }

    if (this.status === "expired") {
      this.isExpired = true;
    }

    if (this.isDeleted && !this.deletedAt) {
      this.deletedAt = new Date();
    }

    next();
  } catch (e) {
    next(e);
  }
});

/* =====================================================
🔥 PRE SAVE STATUS LOG
===================================================== */
paymentSchema.pre("save", function (next) {
  try {
    if (this.isModified("status")) {
      const oldStatus =
        this.$locals && this.$locals._oldStatus
          ? this.$locals._oldStatus
          : "";
      addStatusLog(this, oldStatus, this.status, this.failReason || this.cancelReason || this.refundReason || "", "");
    }
    next();
  } catch (e) {
    next(e);
  }
});

paymentSchema.pre("init", function (doc) {
  this.$locals = this.$locals || {};
  this.$locals._oldStatus = doc.status || "";
});

/* =====================================================
🔥 METHODS
===================================================== */
paymentSchema.methods.markPaid = function () {
  const from = this.status;
  this.status = "paid";
  this.verified = true;
  this.approvedAt = new Date();
  this.lastVerifiedAt = new Date();
  addStatusLog(this, from, "paid", "", this.approvedBy || "");
  addLog(this, "paid", "payment approved");
  return this.save();
};

paymentSchema.methods.markFailed = function (reason = "") {
  const from = this.status;
  this.status = "failed";
  this.failReason = safeStr(reason);
  this.failedAt = new Date();
  addStatusLog(this, from, "failed", this.failReason, "");
  addLog(this, "failed", this.failReason || "payment failed");
  return this.save();
};

paymentSchema.methods.cancel = function (reason = "") {
  const from = this.status;
  this.status = "cancelled";
  this.cancelReason = safeStr(reason);
  this.cancelledAt = new Date();
  this.cancelCount += 1;
  addStatusLog(this, from, "cancelled", this.cancelReason, this.cancelledBy || "");
  addLog(this, "cancelled", this.cancelReason || "payment cancelled");
  return this.save();
};

paymentSchema.methods.refund = function (amount = null, reason = "") {
  const value = amount == null ? this.amount : Math.max(0, safeNum(amount, 0));
  const from = this.status;

  this.refundAmount = value;
  this.refundReason = safeStr(reason);
  this.refundCount += 1;
  this.refundedAt = new Date();

  if (value >= this.amount) {
    this.status = "refunded";
  } else {
    this.status = "partial_refunded";
  }

  addStatusLog(this, from, this.status, this.refundReason, this.refundedBy || "");
  addLog(this, "refund", this.refundReason || "payment refunded");
  return this.save();
};

paymentSchema.methods.verifyNow = function () {
  this.verified = true;
  this.verifyCount += 1;
  this.lastVerifiedAt = new Date();
  addLog(this, "verify", "payment verified");
  return this.save();
};

paymentSchema.methods.setReceipt = function (url = "") {
  this.receiptUrl = safeStr(url);
  return this.save();
};

paymentSchema.methods.setPaymentKey = function (key = "") {
  this.paymentKey = safeStr(key);
  return this.save();
};

paymentSchema.methods.setRedirectUrl = function (url = "") {
  this.redirectUrl = safeStr(url);
  return this.save();
};

paymentSchema.methods.setCustomerInfo = function ({ name = "", email = "", phone = "" } = {}) {
  this.customerName = safeStr(name);
  this.customerEmail = safeStr(email).toLowerCase();
  this.customerPhone = safeStr(콜);
  return this.save();
};

paymentSchema.methods.setAdminMemo = function (memo = "") {
  this.adminMemo = safeStr(memo);
  return this.save();
};

paymentSchema.methods.setInternalNote = function (note = "") {
  this.internalNote = safeStr(음표);
  return this.save();
};

paymentSchema.methods.setMetadata = function (metadata = {}) {
  this.metadata = metadata && typeof metadata === "object" ? metadata : {};
  return this.save();
};

paymentSchema.methods.mergeProviderPayload = function (payload = {}) {
  this.providerPayload = {
    ...(this.providerPayload || {}),
    ...(payload && typeof payload === "object" ? payload : {})
  };
  return this.save();
};

paymentSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  addLog(this, "soft_delete", "payment soft deleted");
  return this.save();
};

paymentSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  addLog(this, "restore", "payment restored");
  return this.save();
};

paymentSchema.methods.retryReady = function () {
  const from = this.status;
  this.status = "ready";
  this.retryCount += 1;
  this.failReason = "";
  this.expireAt = new Date(Date.now() + 1000 * 60 * 30);
  addStatusLog(this, from, "ready", "retry", "");
  addLog(this, "retry", "payment retry");
  return this.save();
};

paymentSchema.methods.isExpiredNow = function () {
  if (!this.expireAt) return false;
  return new Date(this.expireAt).getTime() <= Date.now();
};

paymentSchema.methods.getSummary = function () {
  return {
    id: String(this._id),
    userId: this.userId,
    shopId: this.shopId,
    placeId: this.placeId,
    reservationId: this.reservationId,
    orderId: this.orderId,
    partnerOrderId: this.partnerOrderId,
    tid: this.tid,
    amount: this.amount,
    currency: this.currency,
    method: this.method,
    status: this.status,
    verified: this.verified,
    approvedAt: this.approvedAt,
    refundedAt: this.refundedAt,
    cancelledAt: this.cancelledAt
  };
};

/* =====================================================
🔥 STATICS
===================================================== */
paymentSchema.statics.findByOrderId = function (orderId) {
  const value = safeStr(orderId);
  return this.findOne({
    $or: [{ orderId: value }, { partnerOrderId: value }],
    isDeleted: false
  });
};

paymentSchema.statics.findByPaymentKey = function (paymentKey) {
  return this.findOne({
    paymentKey: safeStr(paymentKey),
    isDeleted: false
  });
};

paymentSchema.statics.findByReservation = function (reservationId) {
  return this.find({
    reservationId: safeStr(reservationId),
    isDeleted: false
  }).sort({ createdAt: -1 });
};

paymentSchema.statics.findByUser = function (userId) {
  return this.find({
    userId: safeStr(userId),
    isDeleted: false
  }).sort({ createdAt: -1 });
};

paymentSchema.statics.findByShop = function (shopId) {
  return this.find({
    $or: [{ shopId: safeStr(shopId) }, { placeId: safeStr(shopId) }],
    isDeleted: false
  }).sort({ createdAt: -1 });
};

paymentSchema.statics.findPaid = function (limit = 50) {
  return this.find({
    status: "paid",
    isDeleted: false
  })
    .sort({ approvedAt: -1, createdAt: -1 })
    .limit(limit);
};

paymentSchema.statics.findFailed = function (limit = 50) {
  return this.find({
    status: "failed",
    isDeleted: false
  })
    .sort({ failedAt: -1, createdAt: -1 })
    .limit(limit);
};

paymentSchema.statics.findCancelled = function (limit = 50) {
  return this.find({
    status: "cancelled",
    isDeleted: false
  })
    .sort({ cancelledAt: -1, createdAt: -1 })
    .limit(limit);
};

paymentSchema.statics.findRefunded = function (limit = 50) {
  return this.find({
    status: { $in: ["refunded", "partial_refunded"] },
    isDeleted: false
  })
    .sort({ refundedAt: -1, createdAt: -1 })
    .limit(limit);
};

paymentSchema.statics.findReady = function (limit = 50) {
  return this.find({
    status: "ready",
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

paymentSchema.statics.findExpiredPending = function () {
  return this.find({
    status: { $in: ["ready", "pending", "verifying"] },
    expireAt: { $lte: new Date() },
    isDeleted: false
  }).sort({ createdAt: 1 });
};

paymentSchema.statics.listPaged = async function ({
  userId = "",
  reservationId = "",
  shopId = "",
  status = "",
  page = 1,
  limit = 20
} = {}) {
  const query = { isDeleted: false };

  if (userId) query.userId = safeStr(userId);
  if (reservationId) query.reservationId = safeStr(reservationId);
  if (shopId) {
    query.$or = [{ shopId: safeStr(shopId) }, { placeId: safeStr(shopId) }];
  }
  if (status) query.status = safeStr(status);

  const skip = (Math.max(1, safeInt(page, 1)) - 1) * Math.max(1, safeInt(limit, 20));
  const finalLimit = Math.max(1, Math.min(100, safeInt(limit, 20)));

  const [items, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(finalLimit),
    this.countDocuments(query)
  ]);

  return {
    items,
    total,
    page: Math.max(1, safeInt(page, 1)),
    limit: finalLimit,
    pages: Math.ceil(total / finalLimit)
  };
};

paymentSchema.statics.getRevenue = async function () {
  const result = await this.aggregate([
    {
      $match: {
        status: "paid",
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" }
      }
    }
  ]);

  return result[0]?.total || 0;
};

paymentSchema.statics.getRefundTotal = async function () {
  const result = await this.aggregate([
    {
      $match: {
        status: { $in: ["refunded", "partial_refunded"] },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$refundAmount" }
      }
    }
  ]);

  return result[0]?.total || 0;
};

paymentSchema.statics.getStats = async function () {
  const [total, ready, paid, failed, cancelled, refunded] = await Promise.all([
    this.countDocuments({ isDeleted: false }),
    this.countDocuments({ status: "ready", isDeleted: false }),
    this.countDocuments({ status: "paid", isDeleted: false }),
    this.countDocuments({ status: "failed", isDeleted: false }),
    this.countDocuments({ status: "cancelled", isDeleted: false }),
    this.countDocuments({ status: { $in: ["refunded", "partial_refunded"] }, isDeleted: false })
  ]);

  return { total, ready, paid, failed, cancelled, refunded };
};

paymentSchema.statics.expireOldReady = function (minutes = 30) {
  const d = new Date(Date.now() - Math.max(1, safeInt(minutes, 30)) * 60 * 1000);

  return this.updateMany(
    {
      status: { $in: ["ready", "pending", "verifying"] },
      createdAt: { $lt: d },
      isDeleted: false
    },
    {
      $set: {
        status: "expired",
        isExpired: true
      }
    }
  );
};

paymentSchema.statics.cleanDeleted = function (days = 30) {
  const d = new Date(Date.now() - Math.max(1, safeInt(days, 30)) * 24 * 60 * 60 * 1000);
  return this.deleteMany({
    isDeleted: true,
    deletedAt: { $lte: d }
  });
};

/* =====================================================
🔥 AUTO EXPIRE
===================================================== */
if (!global.__PAYMENT_MODEL_EXPIRE__) {
  global.__PAYMENT_MODEL_EXPIRE__ = true;

  setInterval(async () => {
    try {
      const Payment = mongoose.models.Payment;
      if (!Payment) return;

      await Payment.updateMany(
        {
          status: { $in: ["ready", "pending", "verifying"] },
          expireAt: { $lte: new Date() },
          isDeleted: false
        },
        {
          $set: {
            status: "expired",
            isExpired: true
          }
        }
      );
    } catch (_) {}
  }, 60000);
}

/* =====================================================
🔥 ERROR HOOK
===================================================== */
paymentSchema.post("save", function (error, doc, next) {
  if (error && error.code === 11000) {
    return next(new Error("중복 결제 오류"));
  }
  return next(error);
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 PAYMENT MODEL FINAL ULTRA COMPLETE READY");

module.exports =
  mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);