"use strict";

const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    nickname: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "shop", "admin", "superAdmin"],
      default: "user",
    },

    serviceType: {
      type: String,
      enum: ["general", "massage", "karaoke"],
      default: "general",
    },

    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
    },

    blocked: {
      type: Boolean,
      default: false,
    },

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
      },
    ],

    point: {
      type: Number,
      default: 0,
    },

    attendanceCount: {
      type: Number,
      default: 0,
    },

    lastAttendAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      default: "",
    },

    profileImage: {
      type: String,
      default: "",
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    loginCount: {
      type: Number,
      default: 0,
    },

    statusMessage: {
      type: String,
      default: "",
    },

    level: {
      type: Number,
      default: 1,
    },

    exp: {
      type: Number,
      default: 0,
    },

    banReason: {
      type: String,
      default: "",
    },

    lastIp: {
      type: String,
      default: "",
    },

    lastUserAgent: {
      type: String,
      default: "",
    },

    loginFailCount: {
      type: Number,
      default: 0,
    },

    lockedUntil: {
      type: Date,
      default: null,
    },

    notificationEnabled: {
      type: Boolean,
      default: true,
    },

    marketingAgree: {
      type: Boolean,
      default: false,
    },

    lastActionAt: {
      type: Date,
      default: null,
    },

    deviceCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    autoIndex: false,
    autoCreate: false,
  }
);

schema.set("autoIndex", false);

schema.set("autoCreate", false);

function safeCompareId(a, b) {
  return String(a) === String(b);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

schema.pre("save", async function (next) {
  try {
    if (this.id) {
      this.id = String(this.id).trim();
    }

    if (this.email) {
      this.email = String(this.email).toLowerCase().trim();

      if (!isValidEmail(this.email)) {
        this.email = "";
      }
    }

    if (this.phone) {
      this.phone = String(this.phone).replace(/[^0-9]/g, "");
    }

    if (this.nickname) {
      this.nickname = String(this.nickname).replace(/[<>]/g, "").trim();
    }

    if (Array.isArray(this.favorites)) {
      this.favorites = [
        ...new Set(this.favorites.map((value) => String(value))),
      ];
    }

    this.point = Number(this.point || 0);

    this.exp = Number(this.exp || 0);

    this.level = Math.floor(this.exp / 100) + 1;

    this.loginCount = Number(this.loginCount || 0);

    this.deviceCount = Number(this.deviceCount || 0);

    this.loginFailCount = Number(this.loginFailCount || 0);

    if (this.point < 0) {
      this.point = 0;
    }

    if (this.exp < 0) {
      this.exp = 0;
      this.level = 1;
    }

    if (this.loginCount < 0) {
      this.loginCount = 0;
    }

    if (this.loginCount > 1000000) {
      this.loginCount = 1000000;
    }

    if (this.deviceCount < 0) {
      this.deviceCount = 0;
    }

    if (this.loginFailCount < 0) {
      this.loginFailCount = 0;
    }

    this.lastActionAt = new Date();

    next();
  } catch (error) {
    next(error);
  }
});

schema.methods.isAdmin = function () {
  return ["admin", "superAdmin"].includes(this.role);
};

schema.methods.isLocked = function () {
  return this.lockedUntil && Date.now() < new Date(this.lockedUntil).getTime();
};

schema.methods.canLogin = function () {
  if (this.isDeleted || !this.isActive) {
    return false;
  }

  if (this.isLocked()) {
    return false;
  }

  return true;
};

schema.methods.recordLogin = function (meta = {}) {
  this.lastLoginAt = new Date();

  this.loginCount += 1;

  this.lastIp = meta.ip || this.lastIp;

  this.lastUserAgent = meta.ua || meta.userAgent || this.lastUserAgent;

  this.loginFailCount = 0;

  this.lockedUntil = null;

  return this.save();
};

schema.methods.increaseLoginFail = function () {
  this.loginFailCount += 1;

  if (this.loginFailCount >= 5) {
    this.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
  }

  return this.save();
};

schema.methods.addFavorite = function (shopId) {
  if (!this.favorites.some((value) => safeCompareId(value, shopId))) {
    this.favorites.push(shopId);
  }

  return this.save();
};

schema.methods.removeFavorite = function (shopId) {
  this.favorites = this.favorites.filter(
    (value) => !safeCompareId(value, shopId)
  );

  return this.save();
};

schema.methods.addPoint = function (amount) {
  this.point += Number(amount || 0);

  if (this.point < 0) {
    this.point = 0;
  }

  return this.save();
};

schema.methods.addExp = function (amount) {
  this.exp += Number(amount || 0);

  if (this.exp < 0) {
    this.exp = 0;
  }

  this.level = Math.floor(this.exp / 100) + 1;

  return this.save();
};

schema.methods.updateNickname = function (nickname) {
  this.nickname = String(nickname || "").replace(/[<>]/g, "").trim();

  return this.save();
};

schema.methods.updatePhone = function (phone) {
  this.phone = String(phone || "").replace(/[^0-9]/g, "");

  return this.save();
};

schema.methods.updateEmail = function (email) {
  const value = String(email || "").toLowerCase().trim();

  if (isValidEmail(value)) {
    this.email = value;
  }

  return this.save();
};

schema.methods.ban = function (reason = "") {
  this.isActive = false;

  this.banReason = String(reason || "");

  return this.save();
};

schema.methods.unlock = function () {
  this.loginFailCount = 0;

  this.lockedUntil = null;

  return this.save();
};

schema.methods.softDelete = function () {
  this.isDeleted = true;

  return this.save();
};

schema.statics.findSafe = function (query = {}) {
  return this.find({
    ...query,
    isDeleted: false,
  });
};

schema.statics.findAdmins = function () {
  return this.find({
    role: {
      $in: ["admin", "superAdmin"],
    },
  });
};

schema.statics.topPointUsers = function (limit = 10) {
  return this.find()
    .sort({
      point: -1,
    })
    .limit(limit);
};

schema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;

  delete obj.loginFailCount;

  delete obj.lockedUntil;

  return obj;
};

console.log("🔥 USER MODEL FINAL STABLE READY");

module.exports =
  mongoose.models.User ||
  mongoose.model("User", schema);
