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
🔥 CONFIG LOAD (핵심 추가)
===================================================== */
const ENV = require("./config/env");
const { connectDB, closeDB, getDBHealth } = require("./config/database");

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
const SERVER_STATE = {
  startedAt: Date.now(),
  connections: 0,
  errors: 0
};

/* =====================================================
🔥 SERVER INSTANCE
===================================================== */
const server = http.createServer(app);

/* =====================================================
🔥 CONNECTION TRACKING (신규)
===================================================== */
server.on("connection", (socket) => {
  SERVER_STATE.connections++;

  socket.on("close", () => {
    SERVER_STATE.connections--;
  });
});

/* =====================================================
🔥 START SERVER
===================================================== */
async function startServer() {
  try {
    /* 🔥 DB 연결 (기존 mongoose 제거 → config 사용) */
    await connectDB();

    /* 🔥 서버 시작 */
    server.listen(ENV.PORT, () => {
      console.log(`🚀 SERVER RUNNING: http://localhost:${ENV.PORT}`);
      console.log(`🌍 ENV: ${ENV.NODE_ENV}`);
    });

  } catch (err) {
    console.error("❌ SERVER START ERROR:", err.message);
    process.exit(1);
  }
}

startServer();

/* =====================================================
🔥 GRACEFUL SHUTDOWN (강화)
===================================================== */
async function shutdown(signal) {
  console.log(`🛑 SHUTDOWN SIGNAL: ${signal}`);

  try {
    await closeDB();

    server.close(() => {
      console.log("🛑 SERVER CLOSED");
      process.exit(0);
    });

    // 강제 종료 보호
    setTimeout(() => {
      console.error("❌ FORCE SHUTDOWN");
      process.exit(1);
    }, 5000);

  } catch (err) {
    console.error("SHUTDOWN ERROR:", err);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* =====================================================
🔥 ERROR HANDLING (기존 유지 + 강화)
===================================================== */

// Promise 에러
process.on("unhandledRejection", (err) => {
  SERVER_STATE.errors++;
  console.error("🔥 UNHANDLED REJECTION:", err);
});

// Exception
process.on("uncaughtException", (err) => {
  SERVER_STATE.errors++;
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

/* =====================================================
🔥 HEALTH MONITOR (신규)
===================================================== */
if (!global.__SERVER_MONITOR__) {
  global.__SERVER_MONITOR__ = true;

  setInterval(() => {
    try {
      const db = getDBHealth();

      if (!db.ok) {
        console.warn("⚠️ DB UNHEALTHY");
      }

      const mem = process.memoryUsage().heapUsed / 1024 / 1024;

      if (mem > 500) {
        console.warn("⚠️ HIGH MEMORY:", mem.toFixed(2) + "MB");
      }

    } catch {}
  }, 10000);
}

/* =====================================================
🔥 DEBUG EXPORT (신규)
===================================================== */
module.exports = {
  server,
  getState: () => ({
    ...SERVER_STATE,
    uptime: Date.now() - SERVER_STATE.startedAt
  })
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 INDEX SERVER READY");