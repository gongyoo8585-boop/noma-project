"use strict";

/* =====================================================
🔥 PAYMENT EVENT (FINAL MASTER)
결제 생성 / 성공 / 실패 / 환불 → 실시간 전파
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
🔥 CORE EMIT
===================================================== */
function emit(event, payload = {}) {
  const data = {
    type: event,
    data: payload,
    time: now(),
  };

  // 전체 브로드캐스트 (모바일)
  if (mobileSync?.broadcast) {
    mobileSync.broadcast(data);
  }

  // 특정 유저
  if (payload.userId && userSocket?.notifyUser) {
    userSocket.notifyUser(payload.userId, event);
  }

  return true;
}

/* =====================================================
🔥 PAYMENT CREATED
===================================================== */
function onCreated(payment) {
  if (!payment) return false;

  const payload = {
    paymentId: safeId(payment._id),
    userId: safeId(payment.userId),
    amount: payment.amount || 0,
    status: payment.status || "created",
  };

  emit("PAYMENT_CREATED", payload);

  mobileSync?.notifyUser?.(
    payload.userId,
    "결제가 생성되었습니다",
    payload
  );

  return true;
}

/* =====================================================
🔥 PAYMENT SUCCESS
===================================================== */
function onSuccess(payment) {
  if (!payment) return false;

  const payload = {
    paymentId: safeId(payment._id),
    userId: safeId(payment.userId),
    amount: payment.amount || 0,
    status: "paid",
  };

  emit("PAYMENT_SUCCESS", payload);

  mobileSync?.notifyUser?.(
    payload.userId,
    "결제가 완료되었습니다",
    payload
  );

  return true;
}

/* =====================================================
🔥 PAYMENT FAILED
===================================================== */
function onFailed(payment, reason = "") {
  if (!payment) return false;

  const payload = {
    paymentId: safeId(payment._id),
    userId: safeId(payment.userId),
    status: "failed",
    reason,
  };

  emit("PAYMENT_FAILED", payload);

  mobileSync?.notifyUser?.(
    payload.userId,
    "결제가 실패했습니다",
    payload
  );

  return true;
}

/* =====================================================
🔥 PAYMENT CANCELLED
===================================================== */
function onCancelled(payment) {
  if (!payment) return false;

  const payload = {
    paymentId: safeId(payment._id),
    userId: safeId(payment.userId),
    status: "cancelled",
  };

  emit("PAYMENT_CANCELLED", payload);

  return true;
}

/* =====================================================
🔥 PAYMENT REFUND
===================================================== */
function onRefund(payment) {
  if (!payment) return false;

  const payload = {
    paymentId: safeId(payment._id),
    userId: safeId(payment.userId),
    amount: payment.amount || 0,
    status: "refunded",
  };

  emit("PAYMENT_REFUND", payload);

  mobileSync?.notifyUser?.(
    payload.userId,
    "환불이 완료되었습니다",
    payload
  );

  return true;
}

/* =====================================================
🔥 BULK
===================================================== */
function onBulkUpdate(list = []) {
  if (!Array.isArray(list)) return false;

  for (const p of list) {
    emit("PAYMENT_UPDATED", {
      paymentId: safeId(p._id),
      userId: safeId(p.userId),
      status: p.status,
    });
  }

  return true;
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  emit,
  onCreated,
  onSuccess,
  onFailed,
  onCancelled,
  onRefund,
  onBulkUpdate,
};