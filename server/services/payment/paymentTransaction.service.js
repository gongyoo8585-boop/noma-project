"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT TRANSACTION SERVICE (SAFE PATCH)
 * ✔ 기존 기능 100% 유지
 * ✔ payment.service 와 동기화 유지
 * ✔ 상태 전이 보호 유지
 * ✔ transaction/session 안정성 강화
 * ✔ 최소 수정만 적용
 * =====================================================
 */

const mongoose = require("mongoose");

const Payment = require("../../models/Payment");
const Reservation = require("../../models/Reservation");

/* =========================
상태 검증
========================= */
const canApprove = (payment) =>
  ["ready"].includes(String(payment.status || "").trim());

const canCancel = (payment) =>
  ["paid"].includes(String(payment.status || "").trim());

/* =========================
🔥 최소 추가
========================= */
const safeString = (v) => {
  if (v === undefined || v === null) return "";
  return String(v).trim();
};

/* =========================
세션 안전 종료
========================= */
async function safeEnd(session, commit = false) {
  try {
    if (commit) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }
  } catch (e) {
    console.error("SESSION END ERROR:", e.message);
  } finally {
    session.endSession();
  }
}

/* =========================
로그
========================= */
const log = (type, msg, data = {}) => {
  console.log(`[PAYMENT-TX-${type}]`, msg, data);
};

/* =====================================================
🔥 결제 승인 트랜잭션
===================================================== */
exports.approveTransaction = async ({
  paymentId,
  kakaoData,
}) => {
  paymentId = safeString(paymentId);

  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId).session(session);

    if (!payment) {
      throw new Error("결제 없음");
    }

    /* 🔥 이미 완료된 경우 보호 */
    if (payment.status === "paid") {
      await safeEnd(session, true);

      return {
        payment,
        reservation: null,
      };
    }

    if (!canApprove(payment)) {
      throw new Error("승인 불가능 상태");
    }

    /* 🔥 amount 검증 */
    const approvedAmount = Number(
      kakaoData?.amount?.total || 0
    );

    if (
      !approvedAmount ||
      approvedAmount !== Number(payment.amount)
    ) {
      payment.status = "fail";
      payment.failReason = "금액 검증 실패";
      payment.failedAt = new Date();

      await payment.save({ session });

      throw new Error("결제 금액 검증 실패");
    }

    payment.status = "paid";
    payment.raw = kakaoData || {};
    payment.approvedAt = new Date();

    await payment.save({ session });

    const reservation = await Reservation.findById(
      payment.reservation
    ).session(session);

    if (!reservation) {
      throw new Error("예약 없음");
    }

    if (reservation.status !== "pending") {
      throw new Error("예약 상태 오류");
    }

    reservation.status = "approved";
    reservation.paidAt = new Date();

    await reservation.save({ session });

    await safeEnd(session, true);

    log("APPROVE", "결제 승인 완료", {
      paymentId,
    });

    return {
      payment,
      reservation,
    };

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};

/* =====================================================
🔥 결제 취소 트랜잭션
===================================================== */
exports.cancelTransaction = async ({
  paymentId,
  kakaoData,
}) => {
  paymentId = safeString(paymentId);

  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId).session(session);

    if (!payment) {
      throw new Error("결제 없음");
    }

    if (!canCancel(payment)) {
      throw new Error("취소 불가능 상태");
    }

    payment.status = "cancelled";
    payment.cancelRaw = kakaoData || {};
    payment.cancelledAt = new Date();

    await payment.save({ session });

    const reservation = await Reservation.findById(
      payment.reservation
    ).session(session);

    if (!reservation) {
      throw new Error("예약 없음");
    }

    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();

    await reservation.save({ session });

    await safeEnd(session, true);

    log("CANCEL", "결제 취소 완료", {
      paymentId,
    });

    return {
      payment,
      reservation,
    };

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};

/* =====================================================
🔥 결제 실패 처리
===================================================== */
exports.failTransaction = async ({
  paymentId,
  reason,
}) => {
  paymentId = safeString(paymentId);

  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId).session(session);

    if (!payment) {
      throw new Error("결제 없음");
    }

    if (payment.status === "paid") {
      throw new Error("이미 성공된 결제");
    }

    payment.status = "fail";
    payment.failReason = reason || "unknown";
    payment.failedAt = new Date();

    await payment.save({ session });

    await safeEnd(session, true);

    log("FAIL", "결제 실패 처리", {
      paymentId,
      reason,
    });

    return payment;

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};

/* =====================================================
🔥 안전 결제 생성
===================================================== */
exports.createPaymentSafe = async ({
  userId,
  reservationId,
  amount,
}) => {
  reservationId = safeString(reservationId);
  userId = safeString(userId);

  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const reservation = await Reservation.findById(
      reservationId
    ).session(session);

    if (!reservation) {
      throw new Error("예약 없음");
    }

    if (reservation.status !== "pending") {
      throw new Error("결제 가능한 상태 아님");
    }

    const exists = await Payment.findOne({
      reservation: reservationId,
      status: {
        $in: ["ready", "paid"],
      },
    }).session(session);

    if (exists) {
      throw new Error("이미 결제 존재");
    }

    const [payment] = await Payment.create(
      [
        {
          user: userId,
          reservation: reservationId,
          amount: Number(amount),
          status: "ready",
          createdAt: new Date(),
        },
      ],
      { session }
    );

    await safeEnd(session, true);

    log("CREATE", "결제 생성", {
      reservationId,
    });

    return payment;

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};

/* =====================================================
🔥 결제 재시도 가능 여부
===================================================== */
exports.canRetryPayment = async ({
  reservationId,
}) => {
  reservationId = safeString(reservationId);

  const payment = await Payment.findOne({
    reservation: reservationId,
  });

  if (!payment) {
    return true;
  }

  return ["fail", "cancelled"].includes(payment.status);
};

/* =====================================================
🔥 관리자 강제 승인
===================================================== */
exports.adminForceApprove = async ({
  paymentId,
}) => {
  paymentId = safeString(paymentId);

  const session = await mongoose.startSession();

  session.startTransaction();

  try {
    const payment = await Payment.findById(paymentId).session(session);

    if (!payment) {
      throw new Error("결제 없음");
    }

    payment.status = "paid";
    payment.approvedAt = new Date();

    await payment.save({ session });

    const reservation = await Reservation.findById(
      payment.reservation
    ).session(session);

    if (!reservation) {
      throw new Error("예약 없음");
    }

    reservation.status = "approved";
    reservation.paidAt = new Date();

    await reservation.save({ session });

    await safeEnd(session, true);

    log("ADMIN", "관리자 강제 승인", {
      paymentId,
    });

    return {
      payment,
      reservation,
    };

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};