"use strict";

/* =====================================================
🔥 INDEX.JS (FINAL STABLE ENTRY)
===================================================== */

const http = require("http");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try {
    return require(path);
  } catch (err) {
    console.error(
      `❌ REQUIRE FAIL: ${path}`,
      err?.message || err
    );

    return null;
  }
}

/* =====================================================
🔥 LOAD APP
===================================================== */
const app =
  safeRequire("./app") ||
  (() => {
    const express = require("express");

    const fallback = express();

    fallback.get("/health", (req, res) => {
      res.json({
        ok: true,
        fallback: true,
      });
    });

    fallback.get("/api/health", (req, res) => {
      res.json({
        ok: true,
        fallback: true,
      });
    });

    return fallback;
  })();

/* =====================================================
🔥 CONFIG
===================================================== */
const ENV =
  safeRequire("./config/env") || {
    PORT: process.env.PORT || 10000,
    NODE_ENV:
      process.env.NODE_ENV ||
      "production",
  };

const databaseModule =
  safeRequire("./config/database") ||
  {};

/* =====================================================
🔥 SAFE DB FUNCTIONS
===================================================== */
const connectDB =
  typeof databaseModule.connectDB ===
  "function"
    ? databaseModule.connectDB
    : async () => {
        console.warn(
          "⚠️ connectDB 없음"
        );
      };

const closeDB =
  typeof databaseModule.closeDB ===
  "function"
    ? databaseModule.closeDB
    : async () => {
        console.warn(
          "⚠️ closeDB 없음"
        );
      };

const getDBHealth =
  typeof databaseModule.getDBHealth ===
  "function"
    ? databaseModule.getDBHealth
    : () => ({
        ok: true,
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
🔥 SERVER
===================================================== */
const server = http.createServer(app);

/* =====================================================
🔥 CONNECTION TRACKING
===================================================== */
server.on("connection", (socket) => {
  SERVER_STATE.connections++;

  socket.on("close", () => {
    SERVER_STATE.connections--;

    if (
      SERVER_STATE.connections < 0
    ) {
      SERVER_STATE.connections = 0;
    }
  });
});

/* =====================================================
🔥 SERVER ERROR
===================================================== */
server.on("error", (err) => {
  SERVER_STATE.errors++;

  console.error(
    "🔥 SERVER ERROR:",
    err
  );

  if (
    err?.code === "EADDRINUSE"
  ) {
    console.error(
      `❌ PORT 이미 사용중: ${ENV.PORT}`
    );
  }
});

/* =====================================================
🔥 START SERVER
===================================================== */
async function startServer() {
  try {

    if (SERVER_STATE.started) {
      console.warn(
        "⚠️ SERVER 이미 실행중"
      );

      return;
    }

    try {
      await connectDB();
    } catch (dbErr) {
      SERVER_STATE.errors++;

      console.error(
        "❌ DB CONNECT ERROR:",
        dbErr?.message || dbErr
      );
    }

    server.listen(
      ENV.PORT,
      "0.0.0.0",
      () => {

        SERVER_STATE.started = true;

        console.log(
          `🚀 SERVER RUNNING: http://localhost:${ENV.PORT}`
        );

        console.log(
          `🌍 ENV: ${ENV.NODE_ENV}`
        );
      }
    );

  } catch (err) {

    SERVER_STATE.errors++;

    console.error(
      "❌ SERVER START ERROR:",
      err?.message || err
    );

    process.exit(1);
  }
}

startServer();

/* =====================================================
🔥 SHUTDOWN
===================================================== */
async function shutdown(signal) {

  if (SERVER_STATE.shuttingDown) {
    return;
  }

  SERVER_STATE.shuttingDown = true;

  console.log(
    `🛑 SHUTDOWN SIGNAL: ${signal}`
  );

  try {

    try {
      await closeDB();
    } catch (dbErr) {
      console.error(
        "❌ CLOSE DB ERROR:",
        dbErr
      );
    }

    server.close(() => {

      console.log(
        "🛑 SERVER CLOSED"
      );

      process.exit(0);
    });

    setTimeout(() => {

      console.error(
        "❌ FORCE SHUTDOWN"
      );

      process.exit(1);

    }, 5000);

  } catch (err) {

    SERVER_STATE.errors++;

    console.error(
      "SHUTDOWN ERROR:",
      err
    );

    process.exit(1);
  }
}

process.on("SIGINT", () =>
  shutdown("SIGINT")
);

process.on("SIGTERM", () =>
  shutdown("SIGTERM")
);

/* =====================================================
🔥 PROCESS ERROR
===================================================== */
process.on(
  "unhandledRejection",
  (err) => {

    SERVER_STATE.errors++;

    console.error(
      "🔥 UNHANDLED REJECTION:",
      err
    );
  }
);

process.on(
  "uncaughtException",
  (err) => {

    SERVER_STATE.errors++;

    console.error(
      "🔥 UNCAUGHT EXCEPTION:",
      err
    );
  }
);

/* =====================================================
🔥 HEALTH MONITOR
===================================================== */
if (!global.__SERVER_MONITOR__) {

  global.__SERVER_MONITOR__ =
    setInterval(() => {
      try {

        const db =
          getDBHealth();

        if (!db?.ok) {
          console.warn(
            "⚠️ DB UNHEALTHY"
          );
        }

        const mem =
          process.memoryUsage()
            .heapUsed /
          1024 /
          1024;

        if (mem > 500) {
          console.warn(
            "⚠️ HIGH MEMORY:",
            mem.toFixed(2) + "MB"
          );
        }

      } catch (err) {

        SERVER_STATE.errors++;

        console.error(
          "MONITOR ERROR:",
          err
        );
      }

    }, 10000);

  if (
    typeof global.__SERVER_MONITOR__
      .unref === "function"
  ) {
    global.__SERVER_MONITOR__.unref();
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  server,

  getState: () => ({
    ...SERVER_STATE,
    uptime:
      Date.now() -
      SERVER_STATE.startedAt,
  }),
};

/* =====================================================
🔥 READY
===================================================== */
console.log(
  "🔥 INDEX SERVER READY"
);