"use strict";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* =====================================================
🔥 SCHEMA
===================================================== */
const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      index: true,
    },

    password: {
      type: String,
      required: true,
      select: false, // 🔥 기본 조회 시 숨김
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =====================================================
🔥 INDEX (soft delete 대응 unique)
===================================================== */
userSchema.index(
  { id: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

/* =====================================================
🔥 STATIC
===================================================== */
userSchema.statics.findActiveById = function (id) {
  return this.findOne({ id, isDeleted: false });
};

userSchema.statics.findWithPassword = function (id) {
  return this.findOne({ id, isDeleted: false }).select("+password");
};

/* =====================================================
🔥 METHOD
===================================================== */
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

/* =====================================================
🔥 HOOK
===================================================== */
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

/* =====================================================
🔥 TRANSFORM (응답 시 password 제거)
===================================================== */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = mongoose.model("User", userSchema);