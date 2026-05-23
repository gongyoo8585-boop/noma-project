"use strict";

/**
 * =====================================================
 * 🔥 REFUND SERVICE (ULTRA FINAL - FULL COMPLETE)
 * ✔ 결제 환불 처리 전용 서비스
 * ✔ KakaoPay 환불 연동
 * ✔ Payment / Reservation 상태 동기화
 * ✔ PaymentLog 기록 지원
 * ✔ 기존 구조 영향 없음
 * ✔ 바로 붙여넣어 실행 가능
 * =====================================================
 */

const Payment = require("../../models/Payment");
const Reservation = require("../../models/Reservation");

const kakaoPayService = require("./kakaoPay.service");

let PaymentLog = null;

try {
  PaymentLog = require("../../models/PaymentLog");
} catch (e) {
  PaymentLog = null;
}

/* =========================
UTIL
========================= */
const now = () => new Date();

function safeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

async function writeRefundLog(payload = {}) {
  try {
    if (!PaymentLog) return null;

    if (typeof PaymentLog.writeLog === "function") {
      return await PaymentLog.writeLog(payload);
    }

    return await PaymentLog.create(payload);
  } catch (e) {
    console.error("REFUND LOG ERROR:", e.message);
    return null;
  }
}

/* =====================================================
🔥 환불 가능 여부 확인
===================================================== */
exports.canRefund = async ({ paymentId }) => {
  paymentId = safeString(paymentId);

  if (!paymentId) throw new Error("paymentId 필요");

  const payment = await Payment.findById(paymentId);

  if (!payment) throw new Error("결제 없음");

  if (payment.status !== "paid") {
    return {
      ok: false,
      reason: "환불 불가 상태",
      payment,
    };
  }

  const paidAmount = safeNumber(payment.amount);
  const refundedAmount = safeNumber(payment.refundAmount);
  const refundableAmount = paidAmount - refundedAmount;

  if (refundableAmount <= 0) {
    return {
      ok: false,
      reason: "환불 가능 금액 없음",
      payment,
    };
  }

  return {
    ok: true,
    payment,
    refundableAmount,
  };
};

/* =====================================================
🔥 환불 처리
===================================================== */
exports.refundPayment = async ({
  paymentId,
  amount,
  reason = "관리자 환불",
  adminId = null,
  request = {},
}) => {
  paymentId = safeString(paymentId);
  reason = safeString(reason) || "관리자 환불";

  if (!paymentId) throw new Error("paymentId 필요");

  const check = await exports.canRefund({ paymentId });

  if (!check.ok) {
    throw new Error(check.reason);
  }

  const payment = check.payment;

  const refundAmount = amount === undefined || amount === null
    ? check.refundableAmount
    : safeNumber(amount);

  if (!refundAmount || refundAmount < 1) {
    throw new Error("환불 금액 오류");
  }

  if (refundAmount > check.refundableAmount) {
    throw new Error("환불 금액 초과");
  }

  let kakaoResult = null;

  if (payment.tid) {
    kakaoResult = await kakaoPayService.cancel({
      tid: payment.tid,
      cancelAmount: refundAmount,
    });
  }

  await payment.addRefund(refundAmount, reason);

  payment.cancelRaw = kakaoResult || payment.cancelRaw || {};
  payment.cancelledAt = now();

  if (adminId) {
    payment.handledBy = adminId;
  }

  const totalRefunded = safeNumber(payment.refundAmount);

  if (totalRefunded >= safeNumber(payment.amount)) {
    payment.status = "cancelled";

    await Reservation.findByIdAndUpdate(payment.reservation, {
      status: "cancelled",
      cancelledAt: now(),
      cancelReason: reason,
    });
  }

  payment.meta = {
    ...(payment.meta || {}),
    lastRefundReason: reason,
    lastRefundAt: now(),
  };

  await payment.save();

  await writeRefundLog({
    payment: payment._id,
    reservation: payment.reservation,
    user: payment.user,
    type: "cancel",
    status: "success",
    amount: refundAmount,
    message: reason,
    raw: kakaoResult || {},
    request,
    meta: {
      adminId,
      refundAmount,
      totalRefunded,
    },
  });

  return {
    payment,
    refundAmount,
    refundableAmount: Math.max(safeNumber(payment.amount) - safeNumber(payment.refundAmount), 0),
    kakao: kakaoResult,
  };
};

/* =====================================================
🔥 관리자 강제 환불 실패 로그
===================================================== */
exports.logRefundFail = async ({
  paymentId,
  reason = "환불 실패",
  adminId = null,
  request = {},
}) => {
  paymentId = safeString(paymentId);
  reason = safeString(reason) || "환불 실패";

  if (!paymentId) return null;

  const payment = await Payment.findById(paymentId);

  if (!payment) return null;

  return await writeRefundLog({
    payment: payment._id,
    reservation: payment.reservation,
    user: payment.user,
    type: "cancel",
    status: "error",
    amount: 0,
    message: reason,
    raw: {},
    request,
    meta: {
      adminId,
    },
  });
};

/* =====================================================
🔥 환불 이력 조회
===================================================== */
exports.getRefundHistory = async ({ paymentId }) => {
  paymentId = safeString(paymentId);

  if (!paymentId) throw new Error("paymentId 필요");

  const payment = await Payment.findById(paymentId)
    .populate("user")
    .populate("reservation");

  if (!payment) throw new Error("결제 없음");

  return {
    payment,
    refundAmount: safeNumber(payment.refundAmount),
    refundHistory: payment.refundHistory || [],
  };
};