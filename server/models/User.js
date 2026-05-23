"use strict";

/**
 * =====================================================
 * 🔥 USER MODEL (ULTRA FINAL - STABLE)
 * =====================================================
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* =========================
SCHEMA
========================= */
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.oauthProvider;
      },
      select: false,
    },

    name: {
      type: String,
      required: false,
      trim: true,
    },

    phone: {
      type: String,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "blocked", "deleted"],
      default: "active",
      index: true,
    },

    oauthProvider: {
      type: String,
      enum: ["kakao", "google", "naver", null],
      default: null,
    },

    oauthId: {
      type: String,
      index: true,
    },

    id: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
      trim: true,
    },

    nickname: {
      type: String,
      trim: true,
    },

    blocked: {
      type: Boolean,
      default: false,
    },

    provider: {
      type: String,
      default: null,
    },

    avatar: String,
    address: String,

    location: {
      lat: Number,
      lng: Number,
    },

    point: {
      type: Number,
      default: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    lastLoginAt: Date,

    loginFailCount: {
      type: Number,
      default: 0,
    },

    lockedUntil: Date,

    emailVerified: {
      type: Boolean,
      default: false,
    },

    notification: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
    },

    stats: {
      reservationCount: { type: Number, default: 0 },
      paymentTotal: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
    },

    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

/* =========================
INDEX
========================= */
UserSchema.index({ oauthProvider: 1, oauthId: 1 });

/* =========================
🔥 최소 추가: id 조회 성능 보장 (로그인 안정화)
========================= */
UserSchema.index({ id: 1 });

/* =========================
🔥 최소 추가: role 조회 성능 (admin API 안정화)
========================= */
UserSchema.index({ role: 1 });

/* =========================
비밀번호 암호화
========================= */
UserSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;

  const current = String(this.password);

  if (current.startsWith("$2a$") || current.startsWith("$2b$")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(current, salt);
});

/* =========================
비밀번호 비교
========================= */
UserSchema.methods.comparePassword = async function (password) {
  if (!this.password || !password) return false;
  return bcrypt.compare(password, this.password);
};

/* =========================
로그인 실패 처리
========================= */
UserSchema.methods.incLoginFail = async function () {
  this.loginFailCount += 1;

  if (this.loginFailCount >= 5) {
    this.lockedUntil = new Date(Date.now() + 1000 * 60 * 15);
  }

  await this.save();
};

/* =========================
로그인 성공 처리
========================= */
UserSchema.methods.resetLoginFail = async function () {
  this.loginFailCount = 0;
  this.lockedUntil = null;
  this.lastLoginAt = new Date();
  await this.save();
};

/* =========================
계정 잠금 여부
========================= */
UserSchema.methods.isLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

/* =========================
소프트 삭제
========================= */
UserSchema.methods.softDelete = async function () {
  this.status = "deleted";
  this.deletedAt = new Date();
  await this.save();
};

/* =========================
JSON 변환 (보안)
========================= */
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();

  delete obj.password;
  delete obj.loginFailCount;
  delete obj.lockedUntil;

  return obj;
};

/* =========================
EXPORT
========================= */
module.exports =
  mongoose.models.User ||
  mongoose.model("User", UserSchema);