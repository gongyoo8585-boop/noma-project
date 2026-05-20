"use strict";

/* =====================================================
🔥 WEBSOCKET INDEX (FINAL MASTER)
wsServer.js + mobile.sync.js 통합 초기화
===================================================== */

const WebSocket = require("ws");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try {
    return require(path);
  } catch (err) {
    console.warn("[websocket/index] require fail:", path, err.message);
    return null;
  }
}

/* =====================================================
🔥 MODULES
===================================================== */
const wsServer = safeRequire("./wsServer");
const mobileSync = safeRequire("./mobile.sync");

/* =====================================================
🔥 STATE
===================================================== */
let wss = null;

const STATE = {
  started: false,
  startedAt: null,
  connections: 0,
  messages: 0,
  errors: 0,
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date();
}

function safeJson(data) {
  try {
    return JSON.stringify(data);
  } catch (_) {
    return JSON.stringify({
      ok: false,
      message: "JSON_SERIALIZE_ERROR",
    });
  }
}

function send(ws, data) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(safeJson(data));
      return true;
    }
  } catch (err) {
    STATE.errors += 1;
  }
  return false;
}

function broadcast(data) {
  if (!wss) return 0;

  let count = 0;

  for (const client of wss.clients) {
    if (send(client, data)) count += 1;
  }

  return count;
}

/* =====================================================
🔥 DEFAULT MESSAGE HANDLER
===================================================== */
async function handleDefaultMessage(ws, raw) {
  STATE.messages += 1;

  let msg = null;

  try {
    msg = JSON.parse(raw.toString());
  } catch (_) {
    return send(ws, {
      ok: false,
      type: "ERROR",
      message: "INVALID_JSON",
    });
  }

  if (msg.type === "PING") {
    return send(ws, {
      ok: true,
      type: "PONG",
      time: now(),
    });
  }

  if (msg.type === "HEALTH") {
    return send(ws, {
      ok: true,
      type: "HEALTH",
      data: getHealth(),
    });
  }

  return send(ws, {
    ok: true,
    type: "ACK",
    receivedType: msg.type || "UNKNOWN",
    time: now(),
  });
}

/* =====================================================
🔥 INIT
===================================================== */
function init(server, options = {}) {
  if (!server) {
    throw new Error("HTTP_SERVER_REQUIRED");
  }

  if (STATE.started && wss) {
    return wss;
  }

  if (wsServer && typeof wsServer.init === "function") {
    wss = wsServer.init(server, options);
  } else if (typeof wsServer === "function") {
    wss = wsServer(server, options);
  } else {
    wss = new WebSocket.Server({
      server,
      path: options.path || "/ws",
    });
  }

  STATE.started = true;
  STATE.startedAt = now();

  wss.on("connection", (ws, req) => {
    STATE.connections += 1;

    ws.isAlive = true;
    ws.connectedAt = now();

    send(ws, {
      ok: true,
      type: "CONNECTED",
      service: "massage-platform-websocket",
      time: now(),
    });

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", async (raw) => {
      try {
        if (mobileSync && typeof mobileSync.handleMessage === "function") {
          const handled = await mobileSync.handleMessage(ws, raw, { req, wss });
          if (handled !== false) return;
        }

        return handleDefaultMessage(ws, raw);
      } catch (err) {
        STATE.errors += 1;
        return send(ws, {
          ok: false,
          type: "ERROR",
          message: err.message || "WEBSOCKET_MESSAGE_ERROR",
        });
      }
    });

    ws.on("error", () => {
      STATE.errors += 1;
    });

    ws.on("close", () => {
      STATE.connections = Math.max(0, STATE.connections - 1);
    });

    if (mobileSync && typeof mobileSync.onConnection === "function") {
      try {
        mobileSync.onConnection(ws, req, wss);
      } catch (_) {}
    }
  });

  startHeartbeat();

  console.log("🔥 websocket/index READY");

  return wss;
}

/* =====================================================
🔥 HEARTBEAT
===================================================== */
let heartbeatTimer = null;

function startHeartbeat() {
  if (heartbeatTimer) return;

  heartbeatTimer = setInterval(() => {
    if (!wss) return;

    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        try {
          ws.terminate();
        } catch (_) {}
        continue;
      }

      ws.isAlive = false;

      try {
        ws.ping();
      } catch (_) {}
    }
  }, 30000);
}

function stopHeartbeat() {
  if (!heartbeatTimer) return;

  clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

/* =====================================================
🔥 EXTERNAL SENDERS
===================================================== */
function notifyReservationUpdate(reservation) {
  if (mobileSync && typeof mobileSync.notifyReservationUpdate === "function") {
    return mobileSync.notifyReservationUpdate(reservation);
  }

  return broadcast({
    type: "RESERVATION_UPDATE",
    data: reservation,
    time: now(),
  });
}

function notifyUser(userId, message, payload = {}) {
  if (mobileSync && typeof mobileSync.notifyUser === "function") {
    return mobileSync.notifyUser(userId, message, payload);
  }

  return broadcast({
    type: "USER_NOTIFICATION",
    userId,
    message,
    payload,
    time: now(),
  });
}

function broadcastNotice(message, payload = {}) {
  if (mobileSync && typeof mobileSync.broadcastNotice === "function") {
    return mobileSync.broadcastNotice(message, payload);
  }

  return broadcast({
    type: "NOTICE",
    message,
    payload,
    time: now(),
  });
}

/* =====================================================
🔥 HEALTH
===================================================== */
function getHealth() {
  return {
    ok: true,
    started: STATE.started,
    startedAt: STATE.startedAt,
    activeConnections: wss ? wss.clients.size : 0,
    totalConnections: STATE.connections,
    messages: STATE.messages,
    errors: STATE.errors,
    mobileSync:
      mobileSync && typeof mobileSync.getHealth === "function"
        ? mobileSync.getHealth()
        : null,
    time: now(),
  };
}

/* =====================================================
🔥 CLOSE
===================================================== */
function close() {
  stopHeartbeat();

  if (!wss) return true;

  for (const ws of wss.clients) {
    try {
      ws.close();
    } catch (_) {}
  }

  try {
    wss.close();
  } catch (_) {}

  wss = null;
  STATE.started = false;

  return true;
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  init,
  close,

  send,
  broadcast,

  notifyReservationUpdate,
  notifyUser,
  broadcastNotice,

  getHealth,
};