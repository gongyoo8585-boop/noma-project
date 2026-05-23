"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION SERVICE (FINAL COMPLETE)
 * ✔ 예약 생성 로직 (중복 방지)
 * ✔ 예약 슬롯 계산
 * ✔ 상태 변경 비즈니스 로직
 * ✔ 트랜잭션 처리 (결제 연동 대비)
 * ✔ 서비스 레이어 분리 (컨트롤러 안정화)
 * =====================================================
 */

const mongoose = require("mongoose");
const Reservation = require("../models/Reservation");
const Shop = require("../models/Shop");

/* =========================
🔥 예약 생성 (중복 방지 포함)
========================= */
exports.createReservation = async ({
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
    /* 매장 확인 */
    const shop = await Shop.findById(shopId).session(session);
    if (!shop) throw new Error("매장 없음");

    if (shop.isReservable === false) {
      throw new Error("예약 불가능 매장");
    }

    /* 중복 예약 체크 */
    const exists = await Reservation.findOne({
      shop: shopId,
      date,
      time,
      status: { $in: ["pending", "approved"] },
    }).session(session);

    if (exists) {
      throw new Error("이미 예약된 시간입니다");
    }

    /* 가격 계산 */
    const price = shop.priceDiscount || shop.priceOriginal || 0;

    /* 예약 생성 */
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
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return reservation[0];

  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    throw e;
  }
};

/* =========================
🔥 슬롯 계산
========================= */
exports.getAvailableSlots = async (shopId, date) => {
  const baseSlots = [
    "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00",
  ];

  const reservations = await Reservation.find({
    shop: shopId,
    date,
    status: { $in: ["pending", "approved"] },
  });

  const booked = reservations.map((r) => r.time);

  return baseSlots.map((time) => ({
    time,
    available: !booked.includes(time),
  }));
};

/* =========================
🔥 상태 변경
========================= */
exports.updateReservationStatus = async (id, status) => {
  const reservation = await Reservation.findById(id);

  if (!reservation) throw new Error("예약 없음");

  /* 상태 전이 제한 */
  const allowed = {
    pending: ["approved", "cancelled"],
    approved: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  const current = reservation.status;

  if (!allowed[current]?.includes(status)) {
    throw new Error(`상태 변경 불가 (${current} → ${status})`);
  }

  reservation.status = status;
  await reservation.save();

  return reservation;
};

/* =========================
🔥 예약 취소 (환불 연동 대비)
========================= */
exports.cancelReservation = async (id) => {
  const reservation = await Reservation.findById(id);

  if (!reservation) throw new Error("예약 없음");

  if (reservation.status === "completed") {
    throw new Error("완료된 예약은 취소 불가");
  }

  reservation.status = "cancelled";
  await reservation.save();

  return reservation;
};

/* =========================
🔥 관리자 통계
========================= */
exports.getReservationStats = async () => {
  const total = await Reservation.countDocuments();

  const statusStats = await Reservation.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const revenueAgg = await Reservation.aggregate([
    { $match: { status: "completed" } },
    {
      $group: {
        _id: null,
        total: { $sum: "$price" },
      },
    },
  ]);

  return {
    total,
    statusStats,
    revenue: revenueAgg[0]?.total || 0,
  };
};