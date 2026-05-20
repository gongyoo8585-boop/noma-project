"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION LOG SERVICE (ULTRA FINAL)
 * ✔ 예약 생성 / 취소 / 상태 변경 로그
 * ✔ 사용자 / 관리자 액션 추적
 * ✔ 디버깅 / 감사 로그
 * ✔ PaymentLog 패턴 유지
 * ✔ 성능 최적화 (lean)
 * ✔ 필터 검색 / 통계 기능 추가
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

const mongoose = require("mongoose");

/* =========================
🔥 Schema
========================= */
const ReservationLogSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    type: {
      type: String,
      enum: [
        "create",
        "cancel",
        "update",
        "status",
        "admin_cancel",
        "admin",
      ],
      required: true,
      index: true,
    },

    status: {
      type: String,
      default: "success",
      index: true,
    },

    message: String,

    raw: {
      type: Object,
      default: {},
    },

    request: {
      ip: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================
모델 중복 방지
========================= */
const ReservationLog =
  mongoose.models.ReservationLog ||
  mongoose.model("ReservationLog", ReservationLogSchema);

/* =========================
공통 생성
========================= */
async function createLog({
  reservationId,
  userId,
  type,
  status = "success",
  message = "",
  raw = {},
  req = null,
}) {
  try {
    return await ReservationLog.create({
      reservation: reservationId,
      user: userId,
      type,
      status,
      message,
      raw,
      request: {
        ip: req?.ip || null,
        userAgent: req?.headers?.["user-agent"] || null,
      },
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("RESERVATION LOG ERROR:", e.message);
  }
}

/* =========================
로그 API
========================= */

// 예약 생성
exports.logCreate = (params) =>
  createLog({ ...params, type: "create" });

// 예약 취소
exports.logCancel = (params) =>
  createLog({ ...params, type: "cancel" });

// 상태 변경
exports.logStatus = (params) =>
  createLog({ ...params, type: "status" });

// 일반 수정
exports.logUpdate = (params) =>
  createLog({ ...params, type: "update" });

// 관리자 취소
exports.logAdminCancel = (params) =>
  createLog({ ...params, type: "admin_cancel" });

// 관리자 로그
exports.logAdmin = (params) =>
  createLog({ ...params, type: "admin" });

// 실패 로그
exports.logFail = (params) =>
  createLog({ ...params, status: "error" });

/* =========================
조회
========================= */

// 예약별 로그 조회
exports.getByReservation = async (reservationId) => {
  return ReservationLog.find({ reservation: reservationId })
    .sort({ createdAt: -1 })
    .lean();
};

// 유저별 로그 조회
exports.getByUser = async (userId) => {
  return ReservationLog.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();
};

// 최근 로그
exports.getRecent = async (limit = 50) => {
  return ReservationLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/* =========================
🔥 신규: 필터 검색
========================= */
exports.searchLogs = async ({
  type,
  status,
  userId,
  startDate,
  endDate,
  limit = 100,
}) => {
  const query = {};

  if (type) query.type = type;
  if (status) query.status = status;
  if (userId) query.user = userId;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return ReservationLog.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/* =========================
🔥 신규: 통계
========================= */
exports.getStats = async () => {
  return ReservationLog.aggregate([
    {
      $group: {
        _id: {
          type: "$type",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
  ]);
};