"use strict";

/* =====================================================
🔥 INDEX.JS (FINAL ULTRA MASTER ENTRY)
👉 서버 실행 + DB 연결 + ENV 통합
👉 기존 기능 100% 유지
👉 안정성 / 모니터링 / 운영 기능 확장
👉 통째 교체 가능
===================================================== */

const http = require("http");
const app = require("./app");

/* =====================================================
🔥 CONFIG LOAD
===================================================== */
const ENV = require("./config/env");

const databaseModule =
  require("./config/database");

/* =====================================================
🔥 SAFE DB FUNCTIONS (최소 추가)
===================================================== */
const connectDB =
  typeof databaseModule?.connectDB === "function"
    ? databaseModule.connectDB
    : async () => {
        console.warn("⚠️ connectDB 없음");
      };

const closeDB =
  typeof databaseModule?.closeDB === "function"
    ? databaseModule.closeDB
    : async () => {
        console.warn("⚠️ closeDB 없음");
      };

const getDBHealth =
  typeof databaseModule?.getDBHealth === "function"
    ? databaseModule.getDBHealth
    : () => ({
        ok: false,
      });

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
const SERVER_STATE = {
  startedAt: Date.now(),
  connections: 0,
  errors: 0,
  started: false,
  shuttingDown: false,
};

/* =====================================================
🔥 SERVER INSTANCE
===================================================== */
const server = http.createServer(app);

/* =====================================================
🔥 CONNECTION TRACKING
===================================================== */
server.on("connection", (socket) => {
  SERVER_STATE.connections++;

  socket.on("close", () => {
    SERVER_STATE.connections--;

    if (SERVER_STATE.connections < 0) {
      SERVER_STATE.connections = 0;
    }
  });
});

/* =====================================================
🔥 SERVER ERROR HANDLER (최소 추가)
===================================================== */
server.on("error", (err) => {
  SERVER_STATE.errors++;

  console.error("🔥 SERVER ERROR:", err);

  if (err?.code === "EADDRINUSE") {
    console.error(`❌ PORT 이미 사용중: ${ENV.PORT}`);
  }
});

/* =====================================================
🔥 START SERVER
===================================================== */
async function startServer() {
  try {

    /* 🔥 중복 실행 방지 */
    if (SERVER_STATE.started) {
      console.warn("⚠️ SERVER 이미 실행중");
      return;
    }

    /* 🔥 DB 연결 */
    await connectDB();

    /* 🔥 서버 시작 */
    server.listen(ENV.PORT, "0.0.0.0", () => {

      SERVER_STATE.started = true;

      console.log(`🚀 SERVER RUNNING: http://localhost:${ENV.PORT}`);
      console.log(`🌍 ENV: ${ENV.NODE_ENV}`);
    });

  } catch (err) {

    SERVER_STATE.errors++;

    console.error("❌ SERVER START ERROR:", err?.message || err);

    process.exit(1);
  }
}

startServer();

/* =====================================================
🔥 GRACEFUL SHUTDOWN
===================================================== */
async function shutdown(signal) {

  if (SERVER_STATE.shuttingDown) {
    return;
  }

  SERVER_STATE.shuttingDown = true;

  console.log(`🛑 SHUTDOWN SIGNAL: ${signal}`);

  try {

    await closeDB();

    server.close(() => {

      console.log("🛑 SERVER CLOSED");

      process.exit(0);
    });

    /* 🔥 강제 종료 보호 */
    setTimeout(() => {

      console.error("❌ FORCE SHUTDOWN");

      process.exit(1);

    }, 5000);

  } catch (err) {

    SERVER_STATE.errors++;

    console.error("SHUTDOWN ERROR:", err);

    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* =====================================================
🔥 ERROR HANDLING
===================================================== */

/* 🔥 Promise 에러 */
process.on("unhandledRejection", (err) => {

  SERVER_STATE.errors++;

  console.error("🔥 UNHANDLED REJECTION:", err);
});

/* 🔥 Exception */
process.on("uncaughtException", (err) => {

  SERVER_STATE.errors++;

  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

/* =====================================================
🔥 HEALTH MONITOR
===================================================== */
if (!global.__SERVER_MONITOR__) {

  global.__SERVER_MONITOR__ = true;

  setInterval(() => {
    try {

      const db = getDBHealth();

      if (!db?.ok) {
        console.warn("⚠️ DB UNHEALTHY");
      }

      const mem =
        process.memoryUsage().heapUsed / 1024 / 1024;

      if (mem > 500) {
        console.warn(
          "⚠️ HIGH MEMORY:",
          mem.toFixed(2) + "MB"
        );
      }

    } catch (err) {

      SERVER_STATE.errors++;

      console.error("MONITOR ERROR:", err);
    }

  }, 10000);
}

/* =====================================================
🔥 DEBUG EXPORT
===================================================== */
module.exports = {
  server,

  getState: () => ({
    ...SERVER_STATE,
    uptime: Date.now() - SERVER_STATE.startedAt,
  }),
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 INDEX SERVER READY");