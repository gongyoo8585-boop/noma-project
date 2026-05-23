"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION TRANSACTION CONTROLLER (PATCHED - SAFE MINIMAL)
 * ✔ 기존 코드 100% 유지
 * ✔ status 값 문자열 안전 처리 추가
 * ✔ 기존 흐름 절대 변경 없음
 * =====================================================
 */

const reservationTx = require("../services/reservation/reservationTransaction.service");
const redisLock = require("../services/lock/redisLock.service");

/* ========================= */
const ok = (res, data = {}) => res.json({ ok: true, ...data });
const fail = (res, msg = "ERROR", code = 400) =>
  res.status(code).json({ ok: false, msg });

const getUserId = (req) => req.user?.id || req.user?._id || null;
const isAdmin = (req) => req.user?.role === "admin";

/* 🔥 PATCH 유지 */
const allowedStatus = ["pending", "approved", "confirmed", "completed", "cancelled"];

/* ========================= */
const validateCreateInput = ({ shopId, date, time }) => {
  if (!shopId) return "shopId 필요";
  if (!date) return "date 필요";
  if (!time) return "time 필요";
  return null;
};

const log = (type, message, data = {}) => {
  console.log(`[RESERVATION-${type}]`, message, data);
};

/* ===================================================== */
exports.create = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return fail(res, "인증 필요", 401);
    }

    const { shopId, date, time, serviceType, memo, people } = req.body;

    const validationError = validateCreateInput({ shopId, date, time });
    if (validationError) return fail(res, validationError);

    const lockKey = redisLock.reservationLockKey({ shopId, date, time });

    let reservation;

    try {
      reservation = await redisLock.withLock(lockKey, async () => {
        return await reservationTx.createReservationTx({
          userId,
          shopId,
          date,
          time,
          serviceType,
          memo,
          people,
        });
      });
    } catch (lockErr) {
      console.error("LOCK ERROR:", lockErr.message);
      return fail(res, "예약 충돌 발생", 409);
    }

    log("CREATE", "예약 생성 성공", { userId, shopId, date, time });

    ok(res, { reservation });

  } catch (e) {
    console.error("CREATE TX ERROR:", e);
    fail(res, e.message || "예약 생성 실패");
  }
};

/* ===================================================== */
exports.cancel = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return fail(res, "인증 필요", 401);
    }

    const { id } = req.params;

    if (!id) {
      return fail(res, "reservation id 필요");
    }

    const reservation = await reservationTx.cancelReservationTx({
      reservationId: id,
      userId,
    });

    log("CANCEL", "예약 취소", { userId, reservationId: id });

    ok(res, { reservation });

  } catch (e) {
    console.error("CANCEL TX ERROR:", e);
    fail(res, e.message || "예약 취소 실패");
  }
};

/* ===================================================== */
exports.updateStatus = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return fail(res, "권한 없음", 403);
    }

    const { id } = req.params;
    let { status } = req.body;

    if (!id) return fail(res, "reservation id 필요");
    if (!status) return fail(res, "status 필요");

    /* 🔥 최소 추가: 문자열 안전 처리 */
    status = String(status).trim();

    if (!allowedStatus.includes(status)) {
      return fail(res, "잘못된 상태값");
    }

    const reservation = await reservationTx.updateReservationStatusTx({
      reservationId: id,
      nextStatus: status,
    });

    log("STATUS", "상태 변경", { reservationId: id, status });

    ok(res, { reservation });

  } catch (e) {
    console.error("STATUS TX ERROR:", e);
    fail(res, e.message || "상태 변경 실패");
  }
};

/* ===================================================== */
exports.adminCancel = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return fail(res, "권한 없음", 403);
    }

    const { id } = req.params;

    if (!id) return fail(res, "reservation id 필요");

    const reservation = await reservationTx.adminCancelReservationTx({
      reservationId: id,
    });

    log("ADMIN_CANCEL", "관리자 강제 취소", { reservationId: id });

    ok(res, { reservation });

  } catch (e) {
    console.error("ADMIN CANCEL ERROR:", e);
    fail(res, e.message || "관리자 취소 실패");
  }
};

/* ===================================================== */
exports.getTxStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return fail(res, "reservation id 필요");

    const reservation = await reservationTx.getReservationTxStatus({
      reservationId: id,
    });

    ok(res, { reservation });

  } catch (e) {
    console.error("TX STATUS ERROR:", e);
    fail(res, e.message || "상태 조회 실패");
  }
};

/* ===================================================== */
exports.getMyReservations = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return fail(res, "인증 필요", 401);
    }

    const list = await reservationTx.getUserReservationsTx({ userId });

    ok(res, { list });

  } catch (e) {
    console.error("MY RESERVATIONS ERROR:", e);
    fail(res, e.message || "조회 실패");
  }
};