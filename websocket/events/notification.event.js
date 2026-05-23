"use strict";

/* =====================================================
🔥 NOTIFICATION EVENT (FINAL MASTER)
알림 생성 / 전송 / 읽음 처리 / 브로드캐스트
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

  // 전체 브로드캐스트
  if (mobileSync?.broadcast) {
    mobileSync.broadcast(data);
  }

  // 특정 유저
  if (payload.userId && userSocket?.notifyUser) {
    userSocket.notifyUser(payload.userId, payload.message || event);
  }

  return true;
}

/* =====================================================
🔥 NOTIFICATION CREATED
===================================================== */
function onCreated(notification) {
  if (!notification) return false;

  const payload = {
    notificationId: safeId(notification._id),
    userId: safeId(notification.userId),
    message: notification.message || "",
    type: notification.type || "general",
  };

  emit("NOTIFICATION_CREATED", payload);

  mobileSync?.notifyUser?.(
    payload.userId,
    payload.message,
    payload
  );

  return true;
}

/* =====================================================
🔥 NOTIFICATION SENT
===================================================== */
function onSent(notification) {
  if (!notification) return false;

  const payload = {
    notificationId: safeId(notification._id),
    userId: safeId(notification.userId),
    message: notification.message,
    status: "sent",
  };

  emit("NOTIFICATION_SENT", payload);

  return true;
}

/* =====================================================
🔥 NOTIFICATION READ
===================================================== */
function onRead(notification) {
  if (!notification) return false;

  const payload = {
    notificationId: safeId(notification._id),
    userId: safeId(notification.userId),
    status: "read",
  };

  emit("NOTIFICATION_READ", payload);

  return true;
}

/* =====================================================
🔥 USER NOTIFY (직접 호출)
===================================================== */
function notifyUser(userId, message, extra = {}) {
  const payload = {
    userId: safeId(userId),
    message,
    ...extra,
  };

  emit("USER_NOTIFICATION", payload);

  mobileSync?.notifyUser?.(userId, message, extra);

  return true;
}

/* =====================================================
🔥 BROADCAST
===================================================== */
function broadcast(message, extra = {}) {
  const payload = {
    message,
    ...extra,
  };

  if (mobileSync?.broadcast) {
    mobileSync.broadcast({
      type: "BROADCAST_NOTIFICATION",
      data: payload,
      time: now(),
    });
  }

  return true;
}

/* =====================================================
🔥 SYSTEM ALERT
===================================================== */
function systemAlert(message, level = "info") {
  const payload = {
    message,
    level,
  };

  emit("SYSTEM_ALERT", payload);

  return true;
}

/* =====================================================
🔥 BULK
===================================================== */
function onBulk(list = []) {
  if (!Array.isArray(list)) return false;

  for (const n of list) {
    onCreated(n);
  }

  return true;
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  emit,
  onCreated,
  onSent,
  onRead,
  notifyUser,
  broadcast,
  systemAlert,
  onBulk,
};