"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT VERIFY CONTROLLER (PATCHED SAFE MINIMAL)
 * ✔ 기존 기능 100% 유지
 * ✔ paymentId trim 안정화
 * ✔ reservationId trim 안정화
 * ✔ verify log limit 안정화
 * ✔ 기존 verify 흐름 절대 변경 없음
 * =====================================================
 */

const Payment = require("../models/Payment");
const Reservation = require("../models/Reservation");

const kakaoPayService = require("../services/payment/kakaoPay.service");
const paymentValidation = require("../services/payment/paymentValidation.service");
const paymentTx = require("../services/payment/paymentTransaction.service");

const {
  withLock,
  paymentLockKey,
} = require("../services/lock/redisLock.service");

/* ========================= */
const ok = (res, data = {}) => res.json({ ok: true, ...data });

const fail = (res, msg = "VERIFY_ERROR", code = 400) =>
  res.status(code).json({ ok: false, msg });

const getUserId = (req) => req.user?.id || req.user?._id;
const isAdmin = (req) => req.user?.role === "admin";

/* 🔥 최소 추가 */
const safeString = (v) => {
  if (v === undefined || v === null) return "";
  return String(v).trim();
};

/* ===================================================== */
exports.verify = async (req, res) => {
  let { reservationId, pgToken } = req.body;

  /* 🔥 최소 추가 */
  reservationId = safeString(reservationId);
  pgToken = safeString(pgToken);

  if (!reservationId || !pgToken) {
    return fail(res, "필수값 누락");
  }

  try {
    const userId = getUserId(req);

    return await withLock(
      paymentLockKey({ reservationId }),
      async () => {
        const payment = await Payment.findOne({
          reservation: reservationId,
        });

        if (!payment) return fail(res, "결제 없음");

        if (payment.status === "paid") {
          return ok(res, { payment });
        }

        if (payment.status !== "ready") {
          return fail(res, "잘못된 결제 상태");
        }

        if (payment.pgToken && payment.pgToken === pgToken) {
          return ok(res, { payment });
        }

        if (!isAdmin(req) && String(payment.user) !== String(userId)) {
          return fail(res, "권한 없음", 403);
        }

        if (!payment.tid) {
          return fail(res, "결제 정보 오류");
        }

        const reservation = await Reservation.findById(reservationId);

        if (!reservation) return fail(res, "예약 없음");

        if (reservation.status !== "pending") {
          return fail(res, "이미 처리된 예약");
        }

        if (String(reservation._id) !== String(payment.reservation)) {
          return fail(res, "데이터 불일치");
        }

        let kakaoData;

        try {
          kakaoData = await kakaoPayService.approve({
            tid: payment.tid,
            orderId: payment._id.toString(),
            userId: payment.user,
            pgToken,
          });
        } catch (err) {
          console.error("KAKAO ERROR:", err.message);
          throw new Error("카카오 승인 실패");
        }

        if (!kakaoData || !kakaoData.amount) {
          return fail(res, "카카오 응답 오류");
        }

        paymentValidation.validateKakaoApprove(payment, kakaoData);

        const result = await paymentTx.approveTransaction({
          paymentId: payment._id,
          kakaoData,
        });

        payment.pgToken = pgToken;

        await payment.save();

        return ok(res, {
          payment: result.payment,
          reservation: result.reservation,
        });
      },
      {
        ttl: 8000,
        retry: 5,
      }
    );
  } catch (e) {
    console.error("VERIFY ERROR:", e.message);

    try {
      if (reservationId) {
        const payment = await Payment.findOne({
          reservation: reservationId,
        });

        if (payment && payment.status === "ready") {
          await paymentTx.failTransaction({
            paymentId: payment._id,
            reason: e.message,
          });
        }
      }
    } catch (inner) {
      console.error("FAIL HANDLE ERROR:", inner.message);
    }

    return fail(res, e.message);
  }
};

/* ===================================================== */
exports.adminVerify = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return fail(res, "권한 없음", 403);
    }

    let { paymentId } = req.body;

    /* 🔥 최소 추가 */
    paymentId = safeString(paymentId);

    if (!paymentId) return fail(res, "paymentId 필요");

    const payment = await Payment.findById(paymentId);

    if (!payment) return fail(res, "결제 없음");

    const kakaoData = await kakaoPayService.getOrder({
      tid: payment.tid,
    });

    return ok(res, { payment, kakao: kakaoData });
  } catch (e) {
    return fail(res, e.message);
  }
};

/* ===================================================== */
exports.getVerifyStatus = async (req, res) => {
  try {
    const userId = getUserId(req);

    const id = safeString(req.params.id);

    const payment = await Payment.findById(id);

    if (!payment) return fail(res, "결제 없음");

    if (!isAdmin(req) && String(payment.user) !== String(userId)) {
      return fail(res, "권한 없음", 403);
    }

    return ok(res, {
      status: payment.status,
      payment,
    });
  } catch (e) {
    return fail(res, e.message);
  }
};

/* ===================================================== */
exports.forceVerify = async (req, res) => {
  try {
    if (!isAdmin(req)) return fail(res, "권한 없음", 403);

    let { paymentId } = req.body;

    paymentId = safeString(paymentId);

    if (!paymentId) return fail(res, "paymentId 필요");

    const payment = await Payment.findById(paymentId);

    if (!payment) return fail(res, "결제 없음");

    const kakaoData = await kakaoPayService.getOrder({
      tid: payment.tid,
    });

    return ok(res, {
      payment,
      kakao: kakaoData,
    });
  } catch (e) {
    return fail(res, e.message);
  }
};

/* ===================================================== */
exports.verifyIntegrity = async (req, res) => {
  try {
    let { paymentId } = req.body;

    paymentId = safeString(paymentId);

    if (!paymentId) return fail(res, "paymentId 필요");

    const payment = await Payment.findById(paymentId);

    if (!payment) return fail(res, "결제 없음");

    if (!payment.tid) return fail(res, "TID 없음");

    const kakaoData = await kakaoPayService.getOrder({
      tid: payment.tid,
    });

    return ok(res, {
      match: payment.amount === kakaoData.amount?.total,
      paymentAmount: payment.amount,
      kakaoAmount: kakaoData.amount?.total,
    });
  } catch (e) {
    return fail(res, e.message);
  }
};

/* ===================================================== */
exports.getVerifyLogs = async (req, res) => {
  try {
    if (!isAdmin(req)) return fail(res, "권한 없음", 403);

    /* 🔥 최소 추가 */
    const limit = Number(req.query.limit || 50);

    const logs = await Payment.find()
      .sort({ updatedAt: -1 })
      .limit(limit > 0 ? limit : 50)
      .select("status amount user reservation updatedAt");

    return ok(res, { items: logs });
  } catch (e) {
    return fail(res, e.message);
  }
};