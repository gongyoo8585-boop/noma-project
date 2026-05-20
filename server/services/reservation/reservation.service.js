"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION SERVICE (PATCHED - MINIMAL SAFE ADD)
 * ✔ 기존 코드 100% 유지
 * ✔ status 문자열 안전 처리 (trim)
 * ✔ 기존 로직 절대 변경 없음
 * =====================================================
 */

const Reservation = require("../../models/Reservation");

const {
  withLock,
  reservationLockKey,
} = require("../lock/redisLock.service");

/* =========================
유틸
========================= */
const now = () => new Date();

const VALID_STATUS = [
  "pending",
  "approved",
  "cancelled",
  "completed",
];

function assertStatus(status) {
  /* 🔥 최소 추가: 문자열 안전 처리 */
  if (status) status = String(status).trim();

  if (status && !VALID_STATUS.includes(status)) {
    throw new Error("잘못된 예약 상태");
  }
}

/* =====================================================
🔥 예약 생성
===================================================== */
exports.createReservation = async ({
  userId,
  shopId,
  date,
  time,
  price,
}) => {
  if (!userId || !shopId || !date || !time) {
    throw new Error("필수값 누락");
  }

  return await withLock(
    reservationLockKey({ shopId, date, time }),
    async () => {
      const exists = await Reservation.findOne({
        shop: shopId,
        date,
        time,
        status: { $in: ["pending", "approved"] },
      });

      if (exists) {
        throw new Error("이미 예약된 시간");
      }

      const reservation = await Reservation.create({
        user: userId,
        shop: shopId,
        date,
        time,
        price: Number(price || 0),
        status: "pending",
        createdAt: now(),
      });

      return reservation;
    },
    {
      ttl: 5000,
      retry: 10,
      retryDelay: 100,
      timeout: 8000,
    }
  );
};

/* =====================================================
🔥 예약 상세
===================================================== */
exports.getById = async (id) => {
  if (!id) throw new Error("reservationId 필요");

  return Reservation.findById(id)
    .populate("user")
    .populate("shop");
};

/* =====================================================
🔥 내 예약 목록
===================================================== */
exports.getMyList = async (userId) => {
  if (!userId) throw new Error("userId 필요");

  return Reservation.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate("shop");
};

/* =====================================================
🔥 관리자 목록
===================================================== */
exports.getAdminList = async () => {
  return Reservation.find()
    .sort({ createdAt: -1 })
    .populate("user")
    .populate("shop");
};

/* =====================================================
🔥 예약 취소
===================================================== */
exports.cancelReservation = async ({
  reservationId,
  userId,
  isAdmin = false,
}) => {
  const reservation = await Reservation.findById(reservationId);

  if (!reservation) throw new Error("예약 없음");

  if (!isAdmin && String(reservation.user) !== String(userId)) {
    throw new Error("권한 없음");
  }

  if (reservation.status === "cancelled") {
    return reservation;
  }

  if (reservation.status === "completed") {
    throw new Error("완료된 예약 취소 불가");
  }

  reservation.status = "cancelled";
  reservation.cancelledAt = now();

  await reservation.save();

  return reservation;
};

/* =====================================================
🔥 상태 변경 (관리자)
===================================================== */
exports.updateStatus = async ({
  reservationId,
  status,
}) => {
  /* 🔥 최소 추가: trim 적용 */
  if (status) status = String(status).trim();

  assertStatus(status);

  const reservation = await Reservation.findById(reservationId);

  if (!reservation) throw new Error("예약 없음");

  reservation.status = status;

  if (status === "approved") {
    reservation.approvedAt = now();
  }

  if (status === "completed") {
    reservation.completedAt = now();
  }

  if (status === "cancelled") {
    reservation.cancelledAt = now();
  }

  await reservation.save();

  return reservation;
};

/* =====================================================
🔥 예약 삭제 (관리자)
===================================================== */
exports.remove = async (reservationId) => {
  const reservation = await Reservation.findById(reservationId);

  if (!reservation) throw new Error("예약 없음");

  await reservation.deleteOne();

  return true;
};

/* =====================================================
🔥 슬롯 조회
===================================================== */
exports.getSlots = async ({ shopId, date }) => {
  if (!shopId || !date) {
    throw new Error("필수값 누락");
  }

  const reservations = await Reservation.find({
    shop: shopId,
    date,
    status: { $in: ["pending", "approved"] },
  });

  const reservedTimes = reservations.map((r) => r.time);

  return {
    reserved: reservedTimes,
  };
};

/* =====================================================
🔥 통계
===================================================== */
exports.getStats = async () => {
  const total = await Reservation.countDocuments();
  const pending = await Reservation.countDocuments({ status: "pending" });
  const approved = await Reservation.countDocuments({ status: "approved" });
  const cancelled = await Reservation.countDocuments({ status: "cancelled" });
  const completed = await Reservation.countDocuments({ status: "completed" });

  return {
    total,
    pending,
    approved,
    cancelled,
    completed,
  };
};