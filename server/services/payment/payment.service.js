"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT SERVICE (SAFE PATCH MINIMAL)
 * ✔ 기존 기능 100% 유지
 * ✔ transaction / verify 완전 호환
 * ✔ amount / status 안정성 강화
 * ✔ query 안정성 보강
 * ✔ 기존 흐름 절대 변경 없음
 * =====================================================
 */

const Payment = require("../../models/Payment");
const Reservation = require("../../models/Reservation");

const {
  withLock,
  paymentLockKey,
} = require("../lock/redisLock.service");

/* =========================
유틸
========================= */
const now = () => new Date();

const VALID_PAYMENT_STATUS = [
  "ready",
  "paid",
  "cancelled",
  "fail",
];

/* 🔥 최소 추가 */
function safeString(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function safeNumber(v, fallback = 0) {
  const n = Number(v);

  if (Number.isNaN(n)) return fallback;

  return n;
}

function normalizePage(value) {
  const page = safeNumber(value, 1);

  return page > 0 ? page : 1;
}

function normalizeLimit(value, fallback = 20) {
  const limit = safeNumber(value, fallback);

  if (!limit || limit < 1) return fallback;

  return Math.min(limit, 200);
}

function assertValidStatus(status) {
  if (
    status &&
    !VALID_PAYMENT_STATUS.includes(status)
  ) {
    throw new Error("잘못된 결제 상태");
  }
}

/* =====================================================
🔥 결제 생성 (READY)
===================================================== */
exports.createPayment = async ({
  reservationId,
  userId,
  amount,
  method = "kakao",
}) => {
  reservationId = safeString(reservationId);
  userId = safeString(userId);
  method = safeString(method) || "kakao";

  if (!reservationId) {
    throw new Error("reservationId 필요");
  }

  if (!userId) {
    throw new Error("userId 필요");
  }

  /* 🔥 최소 추가 */
  amount = safeNumber(amount, -1);

  if (amount < 0) {
    throw new Error("결제 금액 오류");
  }

  return await withLock(
    paymentLockKey({ reservationId }),
    async () => {
      const reservation = await Reservation.findById(
        reservationId
      );

      if (!reservation) {
        throw new Error("예약 없음");
      }

      if (
        String(reservation.user) !== String(userId)
      ) {
        throw new Error("권한 없음");
      }

      if (reservation.status !== "pending") {
        throw new Error("이미 처리된 예약");
      }

      const existing = await Payment.findOne({
        reservation: reservationId,
      });

      if (
        existing &&
        ["paid", "ready"].includes(existing.status)
      ) {
        return existing;
      }

      if (
        existing &&
        ["cancelled", "fail"].includes(existing.status)
      ) {
        existing.amount = amount;
        existing.method = method;
        existing.status = "ready";
        existing.readyAt = now();
        existing.failReason = "";
        existing.failedAt = undefined;

        existing.meta = {
          ...(existing.meta || {}),
          retriedAt: now(),
        };

        await existing.save();

        return existing;
      }

      try {
        return await Payment.create({
          reservation: reservationId,
          user: userId,
          amount,
          method,
          status: "ready",
          readyAt: now(),
        });
      } catch (e) {
        if (e.code === 11000) {
          const retry = await Payment.findOne({
            reservation: reservationId,
          });

          if (retry) {
            return retry;
          }
        }

        throw e;
      }
    },
    {
      ttl: 8000,
      retry: 10,
      retryDelay: 100,
      timeout: 10000,
    }
  );
};

/* =====================================================
🔥 controller 호환 alias
===================================================== */
exports.createReadyPayment =
  exports.createPayment;

/* =====================================================
🔥 결제 승인
===================================================== */
exports.approvePayment = async ({
  paymentId,
  kakaoData,
  pgToken,
}) => {
  paymentId = safeString(paymentId);

  if (!paymentId) {
    throw new Error("paymentId 필요");
  }

  const payment = await Payment.findById(
    paymentId
  );

  if (!payment) {
    throw new Error("결제 없음");
  }

  if (payment.status === "paid") {
    return payment;
  }

  if (payment.status !== "ready") {
    throw new Error("잘못된 결제 상태");
  }

  /* 🔥 최소 추가 */
  const approvedAmount = safeNumber(
    kakaoData?.amount?.total,
    0
  );

  if (!approvedAmount) {
    payment.status = "fail";
    payment.failReason =
      "카카오 승인 금액 없음";
    payment.failedAt = now();

    await payment.save();

    throw new Error("카카오 응답 오류");
  }

  if (
    approvedAmount !==
    safeNumber(payment.amount)
  ) {
    payment.status = "fail";
    payment.failReason =
      "결제 금액 불일치";
    payment.failedAt = now();
    payment.raw = kakaoData || {};

    await payment.save();

    throw new Error("결제 금액 불일치");
  }

  payment.status = "paid";
  payment.raw = kakaoData || {};
  payment.pgToken =
    pgToken || payment.pgToken;
  payment.approvedAt = now();

  await payment.save();

  await Reservation.findByIdAndUpdate(
    payment.reservation,
    {
      status: "approved",
      payment: payment._id,
      paidAt: now(),
    }
  );

  return payment;
};

/* =====================================================
🔥 결제 실패
===================================================== */
exports.failPayment = async ({
  paymentId,
  reservationId,
  reason = "unknown",
}) => {
  paymentId = safeString(paymentId);
  reservationId = safeString(reservationId);

  let payment = null;

  if (paymentId) {
    payment = await Payment.findById(paymentId);
  } else if (reservationId) {
    payment = await Payment.findOne({
      reservation: reservationId,
    });
  }

  if (!payment) {
    return null;
  }

  if (payment.status !== "ready") {
    return payment;
  }

  payment.status = "fail";
  payment.failReason = reason;
  payment.failedAt = now();

  await payment.save();

  return payment;
};

/* =====================================================
🔥 결제 취소
===================================================== */
exports.cancelPayment = async ({
  paymentId,
  userId,
  isAdmin = false,
  kakaoData = null,
  reason = "",
}) => {
  paymentId = safeString(paymentId);
  userId = safeString(userId);

  if (!paymentId) {
    throw new Error("paymentId 필요");
  }

  const payment = await Payment.findById(
    paymentId
  );

  if (!payment) {
    throw new Error("결제 없음");
  }

  if (
    !isAdmin &&
    String(payment.user) !== String(userId)
  ) {
    throw new Error("권한 없음");
  }

  if (payment.status !== "paid") {
    throw new Error("취소 불가 상태");
  }

  payment.status = "cancelled";
  payment.cancelRaw =
    kakaoData || payment.cancelRaw || {};
  payment.cancelledAt = now();

  if (reason) {
    payment.meta = {
      ...(payment.meta || {}),
      cancelReason: reason,
    };
  }

  await payment.save();

  await Reservation.findByIdAndUpdate(
    payment.reservation,
    {
      status: "cancelled",
      cancelledAt: now(),
      cancelReason:
        reason || "결제 취소",
    }
  );

  return payment;
};