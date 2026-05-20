"use strict";

const mongoose = require("mongoose");

const { Schema } = mongoose;

/* =====================================================
🔥 ADMIN LOG MODEL
관리자 행동 로그 / 감사 로그 / 보안 추적
===================================================== */

const AdminLogSchema = new Schema(
  {
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    actionType: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "READ",
        "LOGIN",
        "LOGOUT",
        "FORCE",
        "SYSTEM",
        "SECURITY",
        "PAYMENT",
        "RESERVATION",
        "USER",
        "COUPON",
        "PRICING",
      ],
      default: "SYSTEM",
      index: true,
    },

    targetType: {
      type: String,
      enum: [
        "USER",
        "RESERVATION",
        "PAYMENT",
        "COUPON",
        "PRICING",
        "BRANCH",
        "SHOP",
        "SYSTEM",
        "OTHER",
      ],
      default: "OTHER",
      index: true,
    },

    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    targetSnapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },

    request: {
      method: { type: String, default: "" },
      url: { type: String, default: "" },
      ip: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },

    before: {
      type: Schema.Types.Mixed,
      default: null,
    },

    after: {
      type: Schema.Types.Mixed,
      default: null,
    },

    diff: {
      type: Schema.Types.Mixed,
      default: null,
    },

    status: {
      type: String,
      enum: ["SUCCESS", "FAIL", "PENDING"],
      default: "SUCCESS",
      index: true,
    },

    errorMessage: {
      type: String,
      default: "",
    },

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW",
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    isSensitive: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
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
AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ actionType: 1, createdAt: -1 });
AdminLogSchema.index({ targetType: 1, targetId: 1 });
AdminLogSchema.index({ status: 1, severity: 1 });
AdminLogSchema.index({ isDeleted: 1 });

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
}

/* =====================================================
🔥 DIFF FUNCTION
===================================================== */
function createDiff(before = {}, after = {}) {
  const diff = {};

  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const key of keys) {
    const b = before ? before[key] : undefined;
    const a = after ? after[key] : undefined;

    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diff[key] = { before: b, after: a };
    }
  }

  return diff;
}

/* =====================================================
🔥 INSTANCE METHODS
===================================================== */
AdminLogSchema.methods.markFail = async function (message = "") {
  this.status = "FAIL";
  this.errorMessage = message;
  await this.save();
  return this;
};

AdminLogSchema.methods.markSuccess = async function () {
  this.status = "SUCCESS";
  await this.save();
  return this;
};

AdminLogSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = now();
  await this.save();
  return this;
};

/* =====================================================
🔥 STATICS
===================================================== */
AdminLogSchema.statics.log = async function ({
  adminId,
  action,
  actionType = "SYSTEM",
  targetType = "OTHER",
  targetId = null,
  before = null,
  after = null,
  request = {},
  status = "SUCCESS",
  severity = "LOW",
  metadata = {},
  tags = [],
} = {}) {
  const diff = createDiff(before, after);

  return this.create({
    adminId,
    action,
    actionType,
    targetType,
    targetId,
    before,
    after,
    diff,
    request,
    status,
    severity,
    metadata,
    tags,
    targetSnapshot: after || before || null,
  });
};

AdminLogSchema.statics.logError = async function ({
  adminId,
  action,
  error,
  request = {},
  metadata = {},
} = {}) {
  return this.create({
    adminId,
    action,
    actionType: "SYSTEM",
    status: "FAIL",
    errorMessage: error?.message || String(error),
    severity: "HIGH",
    request,
    metadata,
  });
};

AdminLogSchema.statics.findRecent = function (limit = 50) {
  return this.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit);
};

AdminLogSchema.statics.findByAdmin = function (adminId, limit = 50) {
  return this.find({
    adminId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

AdminLogSchema.statics.findByTarget = function (targetType, targetId) {
  return this.find({
    targetType,
    targetId,
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

AdminLogSchema.statics.getStats = async function () {
  const total = await this.countDocuments({ isDeleted: false });

  const fail = await this.countDocuments({
    isDeleted: false,
    status: "FAIL",
  });

  const critical = await this.countDocuments({
    isDeleted: false,
    severity: "CRITICAL",
  });

  return {
    total,
    fail,
    critical,
  };
};

AdminLogSchema.statics.cleanupOld = function (days = 30) {
  const cutoff = new Date(Date.now() - days * 86400000);

  return this.updateMany(
    {
      createdAt: { $lt: cutoff },
      isDeleted: false,
    },
    {
      $set: {
        isDeleted: true,
        deletedAt: now(),
      },
    }
  );
};

/* =====================================================
🔥 PRE SAVE
===================================================== */
AdminLogSchema.pre("save", function (next) {
  if (!this.createdAt) {
    this.createdAt = now();
  }
  next();
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 AdminLog Model READY");

module.exports =
  mongoose.models.AdminLog ||
  mongoose.model("AdminLog", AdminLogSchema);