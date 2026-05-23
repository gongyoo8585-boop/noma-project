"use strict";

/* =====================================================
🔥 RESERVATION EVENT (FINAL MASTER)
예약 생성 / 변경 / 취소 → 실시간 전파
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); }
  catch (_) { return null; }
}

/* =====================================================
🔥 SOCKET MODULES
===================================================== */
const mobileSync = safeRequire("../mobile.sync");
const userSocket = safeRequire("../user.socket");
const adminSocket = safeRequire("../admin.socket");

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
}

function safeId(v) {
  return String(v || "");
}

/* =====================================================
🔥 CORE EVENT EMITTER
===================================================== */
function emit(event, payload = {}) {
  const data = {
    type: event,
    data: payload,
    time: now(),
  };

  // 🔥 mobile sync
  if (mobileSync?.broadcast) {
    mobileSync.broadcast(data);
  }

  // 🔥 user socket
  if (payload.userId && userSocket?.notifyReservation) {
    userSocket.notifyReservation(payload.userId, payload);
  }

  // 🔥 admin socket broadcast
  if (adminSocket?.handleAdminMessage) {
    // admin은 전체 브로드캐스트
    // (adminSocket에는 direct broadcast 함수 없으므로 mobileSync로 이미 처리됨)
  }

  return true;
}

/* =====================================================
🔥 RESERVATION CREATED
===================================================== */
function onCreated(reservation) {
  if (!reservation) return false;

  const payload = {
    reservationId: safeId(reservation._id),
    userId: safeId(reservation.userId),
    shopId: safeId(reservation.shopId),
    branchId: safeId(reservation.branchId),
    status: reservation.status || "created",
    time: reservation.time,
  };

  emit("RESERVATION_CREATED", payload);

  // 개별 유저 알림
  mobileSync?.notifyUser?.(
    payload.userId,
    "예약이 생성되었습니다",
    payload
  );

  return true;
}

/* =====================================================
🔥 RESERVATION UPDATED
===================================================== */
function onUpdated(reservation) {
  if (!reservation) return false;

  const payload = {
    reservationId: safeId(reservation._id),
    userId: safeId(reservation.userId),
    status: reservation.status,
    time: reservation.time,
  };

  emit("RESERVATION_UPDATED", payload);

  mobileSync?.notifyReservationUpdate?.(reservation);

  return true;
}

/* =====================================================
🔥 RESERVATION CANCELLED
===================================================== */
function onCancelled(reservation) {
  if (!reservation) return false;

  const payload = {
    reservationId: safeId(reservation._id),
    userId: safeId(reservation.userId),
    status: "cancelled",
  };

  emit("RESERVATION_CANCELLED", payload);

  mobileSync?.notifyUser?.(
    payload.userId,
    "예약이 취소되었습니다",
    payload
  );

  return true;
}

/* =====================================================
🔥 RESERVATION CONFIRMED
===================================================== */
function onConfirmed(reservation) {
  if (!reservation) return false;

  const payload = {
    reservationId: safeId(reservation._id),
    userId: safeId(reservation.userId),
    status: "confirmed",
  };

  emit("RESERVATION_CONFIRMED", payload);

  mobileSync?.notifyUser?.(
    payload.userId,
    "예약이 확정되었습니다",
    payload
  );

  return true;
}

/* =====================================================
🔥 RESERVATION NO SHOW
===================================================== */
function onNoShow(reservation) {
  if (!reservation) return false;

  const payload = {
    reservationId: safeId(reservation._id),
    userId: safeId(reservation.userId),
    status: "no_show",
  };

  emit("RESERVATION_NO_SHOW", payload);

  return true;
}

/* =====================================================
🔥 BULK EVENTS
===================================================== */
function onBulkUpdate(list = []) {
  if (!Array.isArray(list)) return false;

  for (const r of list) {
    onUpdated(r);
  }

  return true;
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  emit,

  onCreated,
  onUpdated,
  onCancelled,
  onConfirmed,
  onNoShow,

  onBulkUpdate,
};