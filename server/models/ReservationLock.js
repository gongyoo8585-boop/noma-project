"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION LOCK MODEL (ULTRA FINAL)
 * ✔ DB 기반 락 (Redis 장애 대비 fallback)
 * ✔ 예약 동시성 제어 (이중 예약 방지)
 * ✔ TTL 기반 자동 만료
 * ✔ 분산 환경 안전성 보완
 * ✔ 락 소유권 / 상태 관리 추가
 * ✔ 강제 해제 / 검증 기능 대응
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

const mongoose = require("mongoose");

/* =========================
SCHEMA
========================= */
const ReservationLockSchema = new mongoose.Schema(
  {
    /* =========================
    락 키 (유니크)
    ========================= */
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    /* =========================
    매장 + 시간 정보
    ========================= */
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    date: {
      type: String,
      required: true,
      index: true,
    },

    time: {
      type: String,
      required: true,
      index: true,
    },

    /* =========================
    락 보유자
    ========================= */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    /* =========================
    락 상태
    ========================= */
    status: {
      type: String,
      enum: ["locked", "released"],
      default: "locked",
      index: true,
    },

    /* =========================
    락 고유값 (소유권 검증)
    ========================= */
    value: {
      type: String,
      index: true,
    },

    /* =========================
    만료 시간 (TTL)
    ========================= */
    expireAt: {
      type: Date,
      required: true,
      index: true,
    },

    /* =========================
    메타
    ========================= */
    meta: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
🔥 TTL 인덱스 (자동 삭제)
========================= */
ReservationLockSchema.index(
  { expireAt: 1 },
  { expireAfterSeconds: 0 }
);

/* =========================
🔥 복합 인덱스 (조회 최적화)
========================= */
ReservationLockSchema.index({
  shop: 1,
  date: 1,
  time: 1,
});

/* =========================
METHODS
========================= */

// 락 해제
ReservationLockSchema.methods.release = async function () {
  this.status = "released";
  await this.save();
};

// 락 유효 여부
ReservationLockSchema.methods.isActive = function () {
  return (
    this.status === "locked" &&
    this.expireAt &&
    this.expireAt > new Date()
  );
};

/* =========================
STATICS
========================= */

// 락 조회
ReservationLockSchema.statics.findActiveLock = function ({
  shop,
  date,
  time,
}) {
  return this.findOne({
    shop,
    date,
    time,
    status: "locked",
    expireAt: { $gt: new Date() },
  });
};

// 강제 해제
ReservationLockSchema.statics.forceRelease = function (key) {
  return this.deleteOne({ key });
};

/* =========================
HOOK
========================= */

// 생성 시 기본 값 세팅
ReservationLockSchema.pre("save", function (next) {
  if (!this.value) {
    this.value = `${Date.now()}-${Math.random()}`;
  }
  next();
});

/* =========================
JSON
========================= */
ReservationLockSchema.methods.toJSON = function () {
  return this.toObject();
};

/* =========================
EXPORT (중복 방지)
========================= */
module.exports =
  mongoose.models.ReservationLock ||
  mongoose.model("ReservationLock", ReservationLockSchema);