"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT LOG SERVICE (ULTRA FINAL - FIXED)
 * ✔ 기존 기능 100% 유지
 * ✔ 로그 기록 안정성 강화
 * ✔ 필수값 검증 추가
 * ✔ lean 최적화 유지
 * ✔ 통계 / 검색 유지
 * ✔ 실서비스 안정성 보강
 * =====================================================
 */

const PaymentLog = require("../../models/PaymentLog");

/* =========================
공통 생성
========================= */
async function createLog({
  paymentId,
  reservationId,
  userId,
  type,
  status = "success",
  amount = 0,
  message = "",
  raw = {},
  req = null,
}) {
  try {
    if (!type) {
      console.error("PAYMENT LOG TYPE 없음");
      return null;
    }

    const log = await PaymentLog.create({
      payment: paymentId || null,
      reservation: reservationId || null,
      user: userId || null,
      type,
      status,
      amount,
      message,
      raw,
      request: {
        ip: req?.ip || null,
        userAgent: req?.headers?.["user-agent"] || null,
      },
      createdAt: new Date(),
    });

    return log;

  } catch (e) {
    console.error("PAYMENT LOG ERROR:", e.message);
    return null;
  }
}

/* =========================
READY
========================= */
exports.logReady = (params) =>
  createLog({
    ...params,
    type: "ready",
  });

/* =========================
APPROVE
========================= */
exports.logApprove = (params) =>
  createLog({
    ...params,
    type: "approve",
  });

/* =========================
CANCEL
========================= */
exports.logCancel = (params) =>
  createLog({
    ...params,
    type: "cancel",
  });

/* =========================
FAIL
========================= */
exports.logFail = (params) =>
  createLog({
    ...params,
    type: "fail",
    status: "error",
  });

/* =========================
VERIFY
========================= */
exports.logVerify = (params) =>
  createLog({
    ...params,
    type: "verify",
  });

/* =========================
🔥 관리자 로그
========================= */
exports.logAdmin = (params) =>
  createLog({
    ...params,
    type: "admin",
  });

/* =========================
조회
========================= */

// 특정 결제 로그 조회
exports.getByPayment = async (paymentId) => {
  if (!paymentId) return [];
  return PaymentLog.find({ payment: paymentId })
    .sort({ createdAt: -1 })
    .lean();
};

// 특정 예약 로그 조회
exports.getByReservation = async (reservationId) => {
  if (!reservationId) return [];
  return PaymentLog.find({ reservation: reservationId })
    .sort({ createdAt: -1 })
    .lean();
};

// 특정 유저 로그 조회
exports.getByUser = async (userId) => {
  if (!userId) return [];
  return PaymentLog.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean();
};

// 최근 로그
exports.getRecent = async (limit = 50) => {
  return PaymentLog.find()
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

/* =========================
🔥 필터 검색
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

  return PaymentLog.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();
};

/* =========================
🔥 통계
========================= */
exports.getStats = async () => {
  const result = await PaymentLog.aggregate([
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

  return result || [];
};