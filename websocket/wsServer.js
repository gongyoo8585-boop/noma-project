"use strict";

/* =====================================================
🔥 WS SERVER (FINAL MASTER)
WebSocket 서버 생성 / 라우팅 / 모듈 연결
===================================================== */

const WebSocket = require("ws");
const url = require("url");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); }
  catch (err) {
    console.warn("[wsServer] require fail:", path);
    return null;
  }
}

/* =====================================================
🔥 SOCKET MODULES
===================================================== */
const mobileSync = safeRequire("./mobile.sync");
const adminSocket = safeRequire("./admin.socket");
const userSocket = safeRequire("./user.socket");

/* =====================================================
🔥 STATE
===================================================== */
let WSS = null;

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
🔥 ROUTER
===================================================== */
function routeConnection(ws, req) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "";

  // 🔥 경로 기반 라우팅
  if (pathname.startsWith("/ws/admin")) {
    ws.role = "admin";

    if (adminSocket?.onConnection) {
      return adminSocket.onConnection(ws, req, WSS);
    }
  }

  if (pathname.startsWith("/ws/user")) {
    ws.role = "user";

    if (userSocket?.onConnection) {
      return userSocket.onConnection(ws, req, WSS);
    }
  }

  // 🔥 기본 (모바일 sync)
  ws.role = "mobile";

  if (mobileSync?.onConnection) {
    return mobileSync.onConnection(ws, req, WSS);
  }

  // fallback
  send(ws, {
    type: "CONNECTED",
    role: ws.role
  });
}

/* =====================================================
🔥 INIT
===================================================== */
function init(server, options = {}) {

  if (WSS) return WSS;

  WSS = new WebSocket.Server({
    server,
    path: options.path || "/ws"
  });

  console.log("🔥 WebSocket Server START");

  WSS.on("connection", (ws, req) => {

    ws.connectedAt = now();

    routeConnection(ws, req);

    ws.on("error", () => {});
  });

  /* =========================
  🔥 HEARTBEAT
  ========================= */
  const interval = setInterval(() => {
    WSS.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;

      try {
        ws.ping();
      } catch (_) {}
    });
  }, 30000);

  WSS.on("close", () => {
    clearInterval(interval);
  });

  console.log("🔥 WebSocket READY");

  return WSS;
}

/* =====================================================
🔥 BROADCAST
===================================================== */
function broadcast(data) {
  if (!WSS) return 0;

  let count = 0;

  WSS.clients.forEach((ws) => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        count++;
      }
    } catch (_) {}
  });

  return count;
}

/* =====================================================
🔥 HEALTH
===================================================== */
function getHealth() {
  return {
    ok: true,
    clients: WSS ? WSS.clients.size : 0,
    time: now()
  };
}

/* =====================================================
🔥 CLOSE
===================================================== */
function close() {
  if (!WSS) return;

  WSS.clients.forEach(ws => {
    try { ws.close(); } catch (_) {}
  });

  try {
    WSS.close();
  } catch (_) {}

  WSS = null;

  return true;
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  init,
  broadcast,
  getHealth,
  close
};