"use strict";

/* =====================================================
🔥 ADMIN SOCKET (FINAL MASTER)
관리자 실시간 제어 / 유저관리 / 예약관리 / 시스템 제어
===================================================== */

const WebSocket = require("ws");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); }
  catch (err) {
    console.warn("[admin.socket] require fail:", path);
    return null;
  }
}

/* =====================================================
🔥 MODELS / SERVICES
===================================================== */
const User = safeRequire("../models/User");
const Reservation = safeRequire("../models/Reservation");
const Payment = safeRequire("../models/Payment");

const AdminLog = safeRequire("../models/AdminLog");

/* =====================================================
🔥 STATE
===================================================== */
const ADMIN_CLIENTS = new Set();

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

/* =====================================================
🔥 AUTH CHECK (간단)
===================================================== */
function isAdmin(ws) {
  return ws.isAdmin === true;
}

/* =====================================================
🔥 ADMIN LOG
===================================================== */
async function log(adminId, action, payload = {}) {
  if (!AdminLog) return;

  try {
    await AdminLog.log({
      adminId,
      action,
      actionType: "SYSTEM",
      targetType: "SYSTEM",
      metadata: payload
    });
  } catch (_) {}
}

/* =====================================================
🔥 HANDLER
===================================================== */
async function handleAdminMessage(ws, raw) {
  let msg;

  try {
    msg = JSON.parse(raw.toString());
  } catch (_) {
    return send(ws, { ok:false, error:"INVALID_JSON" });
  }

  const { type, payload } = msg;

  if (!isAdmin(ws) && type !== "AUTH_ADMIN") {
    return send(ws, { ok:false, error:"ADMIN_REQUIRED" });
  }

  switch (type) {

    /* =========================
    🔥 ADMIN AUTH
    ========================= */
    case "AUTH_ADMIN":
      if (payload?.role === "admin") {
        ws.isAdmin = true;
        ws.adminId = payload.adminId || "unknown";

        ADMIN_CLIENTS.add(ws);

        return send(ws, { type:"AUTH_ADMIN_OK" });
      }

      return send(ws, { ok:false, error:"AUTH_FAIL" });

    /* =========================
    🔥 USER LIST
    ========================= */
    case "GET_USERS":
      if (!User) return send(ws, { ok:false });

      const users = await User.find().limit(50).lean();

      return send(ws, {
        type:"USER_LIST",
        data: users
      });

    /* =========================
    🔥 USER BLOCK
    ========================= */
    case "BLOCK_USER":
      if (!User) return;

      await User.findByIdAndUpdate(payload.userId, {
        $set: { blocked:true }
      });

      await log(ws.adminId, "BLOCK_USER", payload);

      return send(ws, { type:"USER_BLOCKED" });

    /* =========================
    🔥 USER UNBLOCK
    ========================= */
    case "UNBLOCK_USER":
      if (!User) return;

      await User.findByIdAndUpdate(payload.userId, {
        $set: { blocked:false }
      });

      await log(ws.adminId, "UNBLOCK_USER", payload);

      return send(ws, { type:"USER_UNBLOCKED" });

    /* =========================
    🔥 RESERVATION LIST
    ========================= */
    case "GET_RESERVATIONS":
      if (!Reservation) return;

      const reservations = await Reservation.find()
        .limit(50)
        .lean();

      return send(ws, {
        type:"RESERVATION_LIST",
        data: reservations
      });

    /* =========================
    🔥 FORCE CANCEL
    ========================= */
    case "FORCE_CANCEL_RESERVATION":
      if (!Reservation) return;

      await Reservation.findByIdAndUpdate(payload.id, {
        $set: { status:"cancelled" }
      });

      await log(ws.adminId, "FORCE_CANCEL", payload);

      return send(ws, { type:"RESERVATION_CANCELLED" });

    /* =========================
    🔥 PAYMENT LIST
    ========================= */
    case "GET_PAYMENTS":
      if (!Payment) return;

      const payments = await Payment.find()
        .limit(50)
        .lean();

      return send(ws, {
        type:"PAYMENT_LIST",
        data: payments
      });

    /* =========================
    🔥 SYSTEM STATS
    ========================= */
    case "GET_STATS":
      const stats = {
        users: User ? await User.countDocuments() : 0,
        reservations: Reservation ? await Reservation.countDocuments() : 0,
        payments: Payment ? await Payment.countDocuments() : 0
      };

      return send(ws, {
        type:"STATS",
        data: stats
      });

    /* =========================
    🔥 BROADCAST
    ========================= */
    case "BROADCAST":
      for (const client of ADMIN_CLIENTS) {
        send(client, {
          type:"ADMIN_BROADCAST",
          message: payload.message
        });
      }

      await log(ws.adminId, "BROADCAST", payload);

      return send(ws, { type:"BROADCAST_OK" });

    default:
      return send(ws, { type:"UNKNOWN" });
  }
}

/* =====================================================
🔥 CONNECTION
===================================================== */
function onConnection(ws) {

  send(ws, {
    type:"ADMIN_SOCKET_CONNECTED"
  });

  ws.on("message", (msg) => {
    handleAdminMessage(ws, msg);
  });

  ws.on("close", () => {
    ADMIN_CLIENTS.delete(ws);
  });

  ws.on("error", () => {
    ADMIN_CLIENTS.delete(ws);
  });
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  onConnection,
  handleAdminMessage
};