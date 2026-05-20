"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION TRANSACTION SERVICE (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ 세션 종료 안정성 강화 (finally 보장)
 * ✔ 상태 흐름 안전성 최소 보강
 * ✔ 코드 구조 변경 없음 (추가만)
 * =====================================================
 */

const mongoose = require("mongoose");

const Reservation = require("../../models/Reservation");
const Shop = require("../../models/Shop");

/* =========================
공통 로그
========================= */
const log = (type, msg, data = {}) => {
  console.log(`[RESERVATION-TX-${type}]`, msg, data);
};

/* =========================
세션 안전 종료 (🔥 추가)
========================= */
async function safeEnd(session, commit = false) {
  try {
    if (commit) await session.commitTransaction();
    else await session.abortTransaction();
  } catch (e) {
    console.error("SESSION END ERROR:", e.message);
  } finally {
    session.endSession();
  }
}

/* =========================
🔥 예약 생성 트랜잭션 (핵심)
========================= */
exports.createReservationTx = async ({
  userId,
  shopId,
  date,
  time,
  serviceType,
  memo,
  people,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shop = await Shop.findById(shopId).session(session);

    if (!shop) {
      throw new Error("매장 없음");
    }

    if (shop.isReservable === false) {
      throw new Error("예약 불가능 매장");
    }

    const exists = await Reservation.findOne({
      shop: shopId,
      date,
      time,
      status: { $in: ["pending", "approved", "confirmed"] },
    }).session(session);

    if (exists) {
      throw new Error("이미 예약된 시간");
    }

    const price =
      shop.priceDiscount ||
      shop.priceOriginal ||
      0;

    const reservation = await Reservation.create(
      [
        {
          user: userId,
          shop: shopId,
          date,
          time,
          serviceType,
          memo,
          people,
          price,
          status: "pending",
          createdAt: new Date(),
        },
      ],
      { session }
    );

    await safeEnd(session, true);

    log("CREATE", "예약 생성", { userId, shopId, date, time });

    return reservation[0];

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};

/* =========================
🔥 예약 취소 트랜잭션
========================= */
exports.cancelReservationTx = async ({
  reservationId,
  userId,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reservation = await Reservation.findById(reservationId).session(session);

    if (!reservation) {
      throw new Error("예약 없음");
    }

    if (String(reservation.user) !== String(userId)) {
      throw new Error("권한 없음");
    }

    if (reservation.status === "completed") {
      throw new Error("완료된 예약은 취소 불가");
    }

    if (reservation.status === "cancelled") {
      throw new Error("이미 취소된 예약");
    }

    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();

    await reservation.save({ session });

    await safeEnd(session, true);

    log("CANCEL", "예약 취소", { reservationId });

    return reservation;

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};

/* =========================
🔥 예약 상태 변경 트랜잭션
========================= */
exports.updateReservationStatusTx = async ({
  reservationId,
  nextStatus,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reservation = await Reservation.findById(reservationId).session(session);

    if (!reservation) {
      throw new Error("예약 없음");
    }

    const allowed = {
      pending: ["approved", "cancelled", "confirmed"],
      approved: ["completed", "cancelled"],
      confirmed: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    const current = reservation.status;

    if (!allowed[current]?.includes(nextStatus)) {
      throw new Error(`상태 변경 불가 (${current} → ${nextStatus})`);
    }

    reservation.status = nextStatus;

    if (nextStatus === "completed") {
      reservation.completedAt = new Date();
    }

    await reservation.save({ session });

    await safeEnd(session, true);

    log("STATUS", "상태 변경", { reservationId, nextStatus });

    return reservation;

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};

/* =========================
🔥 관리자 강제 취소
========================= */
exports.adminCancelReservationTx = async ({
  reservationId,
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const reservation = await Reservation.findById(reservationId).session(session);

    if (!reservation) {
      throw new Error("예약 없음");
    }

    reservation.status = "cancelled";
    reservation.cancelledAt = new Date();

    await reservation.save({ session });

    await safeEnd(session, true);

    log("ADMIN_CANCEL", "관리자 취소", { reservationId });

    return reservation;

  } catch (e) {
    await safeEnd(session, false);
    throw e;
  }
};

/* =========================
🔥 트랜잭션 상태 조회
========================= */
exports.getReservationTxStatus = async ({ reservationId }) => {
  const reservation = await Reservation.findById(reservationId)
    .populate("user", "name email")
    .populate("shop", "name");

  if (!reservation) {
    throw new Error("예약 없음");
  }

  return reservation;
};

/* =========================
🔥 유저 예약 목록 조회
========================= */
exports.getUserReservationsTx = async ({ userId }) => {
  const list = await Reservation.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("shop", "name address");

  return list;
};