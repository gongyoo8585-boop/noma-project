"use strict";

/* =====================================================
🔥 USER SOCKET (FINAL MASTER)
일반 사용자 실시간 기능 (알림 / 예약 / 채팅 / 상태)
===================================================== */

const WebSocket = require("ws");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); }
  catch (_) { return null; }
}

/* =====================================================
🔥 MODELS
===================================================== */
const Reservation = safeRequire("../models/Reservation");
const Notification = safeRequire("../models/Notification");

/* =====================================================
🔥 STATE
===================================================== */
const USER_CLIENTS = new Map(); // userId -> Set(ws)

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
}

function send(ws, data) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ok: true,
        time: now(),
        ...data
      }));
    }
  } catch (_) {}
}

function addClient(userId, ws) {
  if (!userId) return;

  if (!USER_CLIENTS.has(userId)) {
    USER_CLIENTS.set(userId, new Set());
  }

  USER_CLIENTS.get(userId).add(ws);
}

function removeClient(userId, ws) {
  if (!userId) return;

  const set = USER_CLIENTS.get(userId);
  if (!set) return;

  set.delete(ws);

  if (set.size === 0) {
    USER_CLIENTS.delete(userId);
  }
}

function sendToUser(userId, data) {
  const set = USER_CLIENTS.get(String(userId));
  if (!set) return;

  for (const ws of set) {
    send(ws, data);
  }
}

/* =====================================================
🔥 HANDLER
===================================================== */
async function handleUserMessage(ws, raw) {
  let msg;

  try {
    msg = JSON.parse(raw.toString());
  } catch (_) {
    return send(ws, { ok:false, error:"INVALID_JSON" });
  }

  const { type, payload } = msg;

  switch (type) {

    /* =========================
    🔥 AUTH
    ========================= */
    case "AUTH":
      if (!payload?.userId) {
        return send(ws, { ok:false, error:"NO_USER_ID" });
      }

      ws.userId = String(payload.userId);
      addClient(ws.userId, ws);

      return send(ws, { type:"AUTH_OK", userId:ws.userId });

    /* =========================
    🔥 PING
    ========================= */
    case "PING":
      return send(ws, { type:"PONG" });

    /* =========================
    🔥 MY RESERVATIONS
    ========================= */
    case "GET_MY_RESERVATIONS":
      if (!ws.userId || !Reservation) return;

      const list = await Reservation.find({
        userId: ws.userId
      }).limit(20).lean();

      return send(ws, {
        type:"MY_RESERVATIONS",
        data:list
      });

    /* =========================
    🔥 RESERVATION DETAIL
    ========================= */
    case "GET_RESERVATION":
      if (!Reservation) return;

      const item = await Reservation.findById(payload.id).lean();

      return send(ws, {
        type:"RESERVATION_DETAIL",
        data:item
      });

    /* =========================
    🔥 NOTIFICATION LIST
    ========================= */
    case "GET_NOTIFICATIONS":
      if (!Notification || !ws.userId) return;

      const notifications = await Notification.find({
        userId: ws.userId
      }).limit(30).lean();

      return send(ws, {
        type:"NOTIFICATION_LIST",
        data:notifications
      });

    /* =========================
    🔥 MARK READ
    ========================= */
    case "READ_NOTIFICATION":
      if (!Notification) return;

      await Notification.findByIdAndUpdate(payload.id, {
        $set:{ isRead:true }
      });

      return send(ws, {
        type:"NOTIFICATION_READ_OK"
      });

    /* =========================
    🔥 CHAT (간단)
    ========================= */
    case "CHAT":
      sendToUser(ws.userId, {
        type:"CHAT",
        message:payload.message
      });

      return;

    default:
      return send(ws, {
        type:"UNKNOWN",
        message:type
      });
  }
}

/* =====================================================
🔥 CONNECTION
===================================================== */
function onConnection(ws) {

  send(ws, {
    type:"USER_SOCKET_CONNECTED"
  });

  ws.on("message", (msg) => {
    handleUserMessage(ws, msg);
  });

  ws.on("close", () => {
    removeClient(ws.userId, ws);
  });

  ws.on("error", () => {
    removeClient(ws.userId, ws);
  });
}

/* =====================================================
🔥 EXTERNAL
===================================================== */
function notifyUser(userId, message) {
  sendToUser(userId, {
    type:"NOTIFICATION",
    message
  });
}

function notifyReservation(userId, data) {
  sendToUser(userId, {
    type:"RESERVATION_UPDATE",
    data
  });
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  onConnection,
  handleUserMessage,
  notifyUser,
  notifyReservation
};