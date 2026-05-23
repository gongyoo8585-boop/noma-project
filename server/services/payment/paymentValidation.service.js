"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT VALIDATION SERVICE (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ payment.service / transaction 완전 호환
 * ✔ 최소 수정 (this 바인딩 안정화 + 안전성 보강)
 * =====================================================
 */

const mongoose = require("mongoose");

const Payment = require("../../models/Payment");
const Reservation = require("../../models/Reservation");

/* =========================
공통 로그
========================= */
const log = (type, msg, data = {}) => {
  console.log(`[PAYMENT-VALIDATION-${type}]`, msg, data);
};

/* =========================
🔥 예약 검증
========================= */
exports.validateReservation = async (reservationId, userId) => {
  const reservation = await Reservation.findById(reservationId);

  if (!reservation) {
    throw new Error("예약 없음");
  }

  if (userId && String(reservation.user) !== String(userId)) {
    throw new Error("권한 없음");
  }

  if (["approved", "confirmed", "completed"].includes(reservation.status)) {
    throw new Error("이미 결제 완료된 예약");
  }

  if (reservation.status === "cancelled") {
    throw new Error("취소된 예약");
  }

  return reservation;
};

/* =========================
🔥 결제 중복 체크
========================= */
exports.preventDuplicatePayment = async (reservationId) => {
  const exists = await Payment.findOne({
    reservation: reservationId,
    status: { $in: ["ready", "paid"] },
  });

  if (exists) {
    throw new Error("이미 결제 진행 중 또는 완료된 예약");
  }
};

/* =========================
🔥 금액 검증
========================= */
exports.validateAmount = (reservation, amount) => {
  const expected =
    reservation.price ||
    reservation.totalAmount ||
    reservation.amount ||
    0;

  if (Number(expected) !== Number(amount)) {
    log("TAMPER", "금액 위변조 감지", {
      expected,
      received: amount,
    });
    throw new Error("결제 금액 위변조 감지");
  }
};

/* =========================
🔥 카카오 승인 금액 검증
========================= */
exports.validateKakaoApprove = (payment, kakaoData) => {
  const approvedAmount = kakaoData?.amount?.total;

  if (!approvedAmount) {
    throw new Error("카카오 응답 오류");
  }

  if (Number(approvedAmount) !== Number(payment.amount)) {
    log("TAMPER", "카카오 금액 불일치", {
      kakao: approvedAmount,
      db: payment.amount,
    });
    throw new Error("카카오 결제 금액 불일치");
  }
};

/* =========================
🔥 상태 전이 검증
========================= */
exports.validateStatusTransition = (current, next) => {
  const allowed = {
    ready: ["paid", "cancelled", "fail"],
    paid: ["cancelled"],
    cancelled: [],
    fail: [],
  };

  if (!allowed[current]?.includes(next)) {
    throw new Error(`결제 상태 변경 불가 (${current} → ${next})`);
  }
};

/* =========================
🔥 결제 상태 검증
========================= */
exports.validatePaymentState = async (paymentId) => {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error("결제 없음");
  }

  if (payment.status === "paid") {
    throw new Error("이미 완료된 결제");
  }

  return payment;
};

/* =========================
🔥 관리자 검증
========================= */
exports.adminValidate = async ({ paymentId }) => {
  const payment = await Payment.findById(paymentId)
    .populate("reservation");

  if (!payment) {
    throw new Error("결제 없음");
  }

  if (!payment.reservation) {
    throw new Error("예약 연결 없음");
  }

  exports.validateAmount(payment.reservation, payment.amount);

  log("ADMIN", "관리자 검증 완료", { paymentId });

  return payment;
};

/* =========================
🔥 전체 검증
========================= */
exports.fullValidation = async ({
  reservationId,
  userId,
  amount,
}) => {
  const reservation = await exports.validateReservation(
    reservationId,
    userId
  );

  await exports.preventDuplicatePayment(reservationId);

  exports.validateAmount(reservation, amount);

  log("FULL", "결제 사전 검증 완료", {
    reservationId,
    userId,
    amount,
  });

  return reservation;
};

/* =========================
🔥 트랜잭션 기반 검증
========================= */
exports.fullValidationTx = async ({
  reservationId,
  userId,
  amount,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reservation = await Reservation.findById(reservationId).session(session);

    if (!reservation) throw new Error("예약 없음");

    if (String(reservation.user) !== String(userId)) {
      throw new Error("권한 없음");
    }

    if (reservation.status === "cancelled") {
      throw new Error("취소된 예약");
    }

    const exists = await Payment.findOne({
      reservation: reservationId,
      status: { $in: ["ready", "paid"] },
    }).session(session);

    if (exists) {
      throw new Error("중복 결제");
    }

    exports.validateAmount(reservation, amount);

    await session.commitTransaction();
    session.endSession();

    log("TX", "트랜잭션 검증 완료", { reservationId });

    return reservation;

  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
};