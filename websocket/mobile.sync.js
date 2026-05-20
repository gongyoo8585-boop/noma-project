"use strict";

/* =====================================================
🔥 MOBILE SYNC WEBSOCKET (FINAL MASTER)
모바일 실시간 동기화 / 예약 상태 / 알림 / 사용자 세션 관리
===================================================== */

const WebSocket = require("ws");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try {
    return require(path);
  } catch (err) {
    console.warn("[mobile.sync] require fail:", path, err.message);
    return null;
  }
}

/* =====================================================
🔥 MODELS / SERVICES
===================================================== */
const Reservation = safeRequire("../models/Reservation");
const User = safeRequire("../models/User");
const Notification = safeRequire("../models/Notification");

const notificationService =
  safeRequire("../services/notification/notification.service") ||
  safeRequire("../services/notification/notifyService") ||
  safeRequire("../services/notifyService");

/* =====================================================
🔥 STATE
===================================================== */
const CLIENTS = new Map();        // userId -> Set(ws)
const SOCKET_META = new WeakMap(); // ws -> meta
const SUBSCRIPTIONS = new Map();  // reservationId -> Set(ws)

const STATS = {
  connected: 0,
  disconnected: 0,
  messages: 0,
  errors: 0,
  authSuccess: 0,
  authFail: 0,
  sent: 0,
  broadcast: 0,
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch (_) {
    return null;
  }
}

function safeString(v) {
  return String(v || "").trim();
}

function isOpen(ws) {
  return ws && ws.readyState === WebSocket.OPEN;
}

function send(ws, data = {}) {
  try {
    if (!isOpen(ws)) return false;

    ws.send(JSON.stringify({
      ok: data.ok !== false,
      time: now(),
      ...data,
    }));

    STATS.sent += 1;
    return true;
  } catch (err) {
    STATS.errors += 1;
    return false;
  }
}

function getMeta(ws) {
  return SOCKET_META.get(ws) || {};
}

function setMeta(ws, meta = {}) {
  const current = getMeta(ws);

  SOCKET_META.set(ws, {
    ...current,
    ...meta,
    updatedAt: now(),
  });

  return SOCKET_META.get(ws);
}

function getUserIdFromPayload(payload = {}) {
  return safeString(
    payload.userId ||
    payload.id ||
    payload._id ||
    payload.uid
  );
}

/* =====================================================
🔥 CLIENT MANAGE
===================================================== */
function addClient(userId, ws) {
  const id = safeString(userId);
  if (!id) return false;

  if (!CLIENTS.has(id)) {
    CLIENTS.set(id, new Set());
  }

  CLIENTS.get(id).add(ws);

  setMeta(ws, {
    userId: id,
    authenticated: true,
    authedAt: now(),
  });

  return true;
}

function removeClient(userId, ws) {
  const id = safeString(userId);
  if (!id) return false;

  const set = CLIENTS.get(id);
  if (!set) return false;

  set.delete(ws);

  if (set.size === 0) {
    CLIENTS.delete(id);
  }

  return true;
}

function removeSocketFromAll(ws) {
  const meta = getMeta(ws);

  if (meta.userId) {
    removeClient(meta.userId, ws);
  }

  for (const [, set] of SUBSCRIPTIONS.entries()) {
    set.delete(ws);
  }

  for (const [key, set] of SUBSCRIPTIONS.entries()) {
    if (set.size === 0) SUBSCRIPTIONS.delete(key);
  }

  SOCKET_META.delete(ws);
}

/* =====================================================
🔥 SUBSCRIPTION
===================================================== */
function subscribeReservation(ws, reservationId) {
  const id = safeString(reservationId);
  if (!id) return false;

  if (!SUBSCRIPTIONS.has(id)) {
    SUBSCRIPTIONS.set(id, new Set());
  }

  SUBSCRIPTIONS.get(id).add(ws);

  const meta = getMeta(ws);
  const list = new Set(meta.subscriptions || []);
  list.add(id);

  setMeta(ws, {
    subscriptions: Array.from(list),
  });

  return true;
}

function unsubscribeReservation(ws, reservationId) {
  const id = safeString(reservationId);
  if (!id) return false;

  const set = SUBSCRIPTIONS.get(id);
  if (set) {
    set.delete(ws);
    if (set.size === 0) SUBSCRIPTIONS.delete(id);
  }

  const meta = getMeta(ws);
  const list = new Set(meta.subscriptions || []);
  list.delete(id);

  setMeta(ws, {
    subscriptions: Array.from(list),
  });

  return true;
}

/* =====================================================
🔥 SEND TARGET
===================================================== */
function sendToUser(userId, data = {}) {
  const id = safeString(userId);
  const sockets = CLIENTS.get(id);

  if (!sockets) return 0;

  let count = 0;

  for (const ws of sockets) {
    if (send(ws, data)) count += 1;
  }

  return count;
}

function sendToReservationSubscribers(reservationId, data = {}) {
  const id = safeString(reservationId);
  const sockets = SUBSCRIPTIONS.get(id);

  if (!sockets) return 0;

  let count = 0;

  for (const ws of sockets) {
    if (send(ws, data)) count += 1;
  }

  return count;
}

function broadcast(data = {}) {
  let count = 0;

  for (const [, sockets] of CLIENTS.entries()) {
    for (const ws of sockets) {
      if (send(ws, data)) count += 1;
    }
  }

  STATS.broadcast += 1;
  return count;
}

/* =====================================================
🔥 AUTH
===================================================== */
async function authenticate(ws, payload = {}) {
  const userId = getUserIdFromPayload(payload);

  if (!userId) {
    STATS.authFail += 1;
    return send(ws, {
      ok: false,
      type: "AUTH_FAIL",
      message: "USER_ID_REQUIRED",
    });
  }

  let user = null;

  if (User) {
    try {
      user = await User.findById(userId).lean();
    } catch (_) {}
  }

  addClient(userId, ws);

  STATS.authSuccess += 1;

  return send(ws, {
    type: "AUTH_OK",
    userId,
    user: user
      ? {
          _id: user._id,
          email: user.email || "",
          nickname: user.nickname || user.name || "",
          role: user.role || "user",
        }
      : null,
  });
}

/* =====================================================
🔥 RESERVATION HELPERS
===================================================== */
async function getMyReservations(userId, limit = 20) {
  if (!Reservation) return [];

  return Reservation.find({
    userId: String(userId),
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 20, 100))
    .lean();
}

async function getReservationDetail(reservationId) {
  if (!Reservation) return null;

  return Reservation.findById(reservationId).lean();
}

/* =====================================================
🔥 MESSAGE HANDLER
===================================================== */
async function handleMessage(ws, raw, context = {}) {
  STATS.messages += 1;

  const msg = safeJsonParse(raw);

  if (!msg) {
    send(ws, {
      ok: false,
      type: "ERROR",
      message: "INVALID_JSON",
    });
    return true;
  }

  const type = safeString(msg.type).toUpperCase();
  const payload = msg.payload || {};

  setMeta(ws, {
    lastMessageAt: now(),
    lastType: type,
  });

  switch (type) {
    case "PING":
      send(ws, {
        type: "PONG",
        serverTime: now(),
      });
      return true;

    case "AUTH":
    case "LOGIN":
      await authenticate(ws, payload);
      return true;

    case "SYNC":
      send(ws, {
        type: "SYNC_OK",
        health: getHealth(),
      });
      return true;

    case "GET_ME": {
      const meta = getMeta(ws);

      send(ws, {
        type: "ME",
        userId: meta.userId || null,
        authenticated: !!meta.authenticated,
        subscriptions: meta.subscriptions || [],
      });
      return true;
    }

    case "GET_MY_RESERVATIONS": {
      const meta = getMeta(ws);
      if (!meta.userId) {
        send(ws, {
          ok: false,
          type: "ERROR",
          message: "AUTH_REQUIRED",
        });
        return true;
      }

      const list = await getMyReservations(meta.userId, payload.limit);

      send(ws, {
        type: "MY_RESERVATIONS",
        data: list,
      });
      return true;
    }

    case "GET_RESERVATION": {
      const reservationId = payload.reservationId || payload.id;
      const item = await getReservationDetail(reservationId);

      if (!item) {
        send(ws, {
          ok: false,
          type: "RESERVATION_NOT_FOUND",
          reservationId,
        });
        return true;
      }

      send(ws, {
        type: "RESERVATION_DETAIL",
        data: item,
      });
      return true;
    }

    case "SUBSCRIBE_RESERVATION": {
      const reservationId = payload.reservationId || payload.id;

      if (!reservationId) {
        send(ws, {
          ok: false,
          type: "ERROR",
          message: "RESERVATION_ID_REQUIRED",
        });
        return true;
      }

      subscribeReservation(ws, reservationId);

      send(ws, {
        type: "SUBSCRIBED_RESERVATION",
        reservationId,
      });
      return true;
    }

    case "UNSUBSCRIBE_RESERVATION": {
      const reservationId = payload.reservationId || payload.id;

      unsubscribeReservation(ws, reservationId);

      send(ws, {
        type: "UNSUBSCRIBED_RESERVATION",
        reservationId,
      });
      return true;
    }

    case "READ_NOTIFICATION": {
      if (Notification && payload.notificationId) {
        try {
          await Notification.findByIdAndUpdate(payload.notificationId, {
            $set: {
              isRead: true,
              readAt: new Date(),
            },
          });
        } catch (_) {}
      }

      send(ws, {
        type: "NOTIFICATION_READ_OK",
        notificationId: payload.notificationId,
      });
      return true;
    }

    default:
      send(ws, {
        type: "ACK",
        receivedType: type || "UNKNOWN",
      });
      return true;
  }
}

/* =====================================================
🔥 CONNECTION HOOK
===================================================== */
function onConnection(ws, req, wss) {
  STATS.connected += 1;

  setMeta(ws, {
    connectedAt: now(),
    ip: req?.ip || req?.socket?.remoteAddress || "",
    authenticated: false,
    subscriptions: [],
  });

  send(ws, {
    type: "MOBILE_SYNC_CONNECTED",
    message: "mobile sync connected",
  });

  ws.on("close", () => {
    STATS.disconnected += 1;
    removeSocketFromAll(ws);
  });

  ws.on("error", () => {
    STATS.errors += 1;
    removeSocketFromAll(ws);
  });
}

/* =====================================================
🔥 EXTERNAL EVENTS
===================================================== */
function notifyReservationUpdate(reservation) {
  if (!reservation) return 0;

  const reservationId = String(reservation._id || reservation.id || "");
  const userId = String(reservation.userId || "");

  const payload = {
    type: "RESERVATION_UPDATE",
    reservationId,
    data: reservation,
  };

  const a = sendToUser(userId, payload);
  const b = sendToReservationSubscribers(reservationId, payload);

  return a + b;
}

function notifyReservationStatus(reservationId, status, data = {}) {
  return sendToReservationSubscribers(reservationId, {
    type: "RESERVATION_STATUS",
    reservationId,
    status,
    data,
  });
}

function notifyUser(userId, message, payload = {}) {
  const count = sendToUser(userId, {
    type: "NOTIFICATION",
    message,
    payload,
  });

  if (notificationService?.pushAsync) {
    try {
      notificationService.pushAsync({
        userId,
        type: "websocket_notification",
        message,
        payload,
      });
    } catch (_) {}
  }

  return count;
}

function broadcastNotice(message, payload = {}) {
  return broadcast({
    type: "NOTICE",
    message,
    payload,
  });
}

function broadcastSystem(type, payload = {}) {
  return broadcast({
    type: safeString(type).toUpperCase() || "SYSTEM",
    payload,
  });
}

/* =====================================================
🔥 CLEANUP
===================================================== */
function cleanup() {
  for (const [userId, sockets] of CLIENTS.entries()) {
    for (const ws of sockets) {
      if (!isOpen(ws)) sockets.delete(ws);
    }

    if (sockets.size === 0) CLIENTS.delete(userId);
  }

  for (const [id, sockets] of SUBSCRIPTIONS.entries()) {
    for (const ws of sockets) {
      if (!isOpen(ws)) sockets.delete(ws);
    }

    if (sockets.size === 0) SUBSCRIPTIONS.delete(id);
  }

  return true;
}

if (!global.__MOBILE_SYNC_CLEANUP__) {
  global.__MOBILE_SYNC_CLEANUP__ = true;

  setInterval(() => {
    try {
      cleanup();
    } catch (_) {}
  }, 30000);
}

/* =====================================================
🔥 HEALTH
===================================================== */
function getHealth() {
  return {
    ok: true,
    users: CLIENTS.size,
    sockets: Array.from(CLIENTS.values()).reduce((sum, set) => sum + set.size, 0),
    subscriptions: SUBSCRIPTIONS.size,
    stats: STATS,
    time: now(),
  };
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  handleMessage,
  onConnection,

  send,
  sendToUser,
  sendToReservationSubscribers,
  broadcast,

  notifyReservationUpdate,
  notifyReservationStatus,
  notifyUser,
  broadcastNotice,
  broadcastSystem,

  cleanup,
  getHealth,
};