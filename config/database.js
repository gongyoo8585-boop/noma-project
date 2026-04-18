"use strict";

/* =====================================================
🔥 DATABASE CONFIG (FINAL ULTRA MASTER - FIXED)
👉 mongoose 연결 관리
👉 재연결 / 장애 대응 / 상태 추적
👉 중복 재시도 방지
👉 Atlas / local Mongo 모두 대응
👉 통째 교체 가능한 최종본
===================================================== */

const mongoose = require("mongoose");
const ENV = require("./env");

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
const DB_STATE = {
  connected: false,
  connecting: false,
  lastConnectedAt: null,
  retryCount: 0,
  errors: 0,
  lastErrorMessage: "",
  lastRetryAt: null,
  retryTimer: null,
  shuttingDown: false
};

/* =====================================================
🔥 CONFIG
===================================================== */
const MONGO_URI = String(ENV.MONGO_URI || "").trim();

const OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
};

const READY_STATE = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function getReadyState() {
  return mongoose.connection.readyState;
}

function isActuallyConnected() {
  return getReadyState() === 1;
}

function isActuallyConnecting() {
  return getReadyState() === 2;
}

function sanitizeMongoUri(uri) {
  return String(uri || "").trim();
}

function validateMongoUri(uri) {
  if (!uri) {
    throw new Error("MONGO_URI가 비어 있습니다.");
  }

  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error("MONGO_URI 형식이 올바르지 않습니다. mongodb:// 또는 mongodb+srv:// 로 시작해야 합니다.");
  }

  if (uri.includes("<USER>") || uri.includes("<PASSWORD>") || uri.includes("<db_password>")) {
    throw new Error("MONGO_URI에 placeholder가 남아 있습니다. 실제 계정 정보로 바꿔야 합니다.");
  }

  return true;
}

function syncStateFromMongoose() {
  DB_STATE.connected = isActuallyConnected();
  DB_STATE.connecting = isActuallyConnecting();
}

/* =====================================================
🔥 RETRY LOGIC
===================================================== */
function clearRetryTimer() {
  if (DB_STATE.retryTimer) {
    clearTimeout(DB_STATE.retryTimer);
    DB_STATE.retryTimer = null;
  }
}

function scheduleRetry() {
  if (DB_STATE.shuttingDown) return;
  if (DB_STATE.retryTimer) return;
  if (isActuallyConnected() || isActuallyConnecting() || DB_STATE.connecting) return;

  const delay = Math.min(10000, Math.max(1000, DB_STATE.retryCount * 1000));
  DB_STATE.lastRetryAt = now();

  console.warn(`🔄 DB RETRY IN ${delay}ms`);

  DB_STATE.retryTimer = setTimeout(async () => {
    DB_STATE.retryTimer = null;
    await connectDB();
  }, delay);
}

/* =====================================================
🔥 CONNECT
===================================================== */
async function connectDB() {
  try {
    const uri = sanitizeMongoUri(MONGO_URI);
    validateMongoUri(uri);

    syncStateFromMongoose();

    if (DB_STATE.shuttingDown) {
      return;
    }

    if (DB_STATE.connected || isActuallyConnected()) {
      DB_STATE.connected = true;
      DB_STATE.connecting = false;
      return;
    }

    if (DB_STATE.connecting || isActuallyConnecting()) {
      return;
    }

    DB_STATE.connecting = true;
    clearRetryTimer();

    await mongoose.connect(uri, OPTIONS);

    DB_STATE.connected = true;
    DB_STATE.connecting = false;
    DB_STATE.lastConnectedAt = now();
    DB_STATE.retryCount = 0;
    DB_STATE.lastErrorMessage = "";

    console.log("🔥 MongoDB CONNECTED");
  } catch (err) {
    DB_STATE.errors++;
    DB_STATE.connected = false;
    DB_STATE.connecting = false;
    DB_STATE.retryCount++;
    DB_STATE.lastErrorMessage = err?.message || "UNKNOWN DB ERROR";

    console.error("❌ DB CONNECTION FAILED:", DB_STATE.lastErrorMessage);

    scheduleRetry();
  }
}

/* =====================================================
🔥 EVENTS
===================================================== */
mongoose.connection.on("connected", () => {
  DB_STATE.connected = true;
  DB_STATE.connecting = false;
  DB_STATE.lastConnectedAt = now();
  DB_STATE.retryCount = 0;
  clearRetryTimer();
  console.log("🟢 DB EVENT: connected");
});

mongoose.connection.on("error", (err) => {
  DB_STATE.errors++;
  DB_STATE.connected = false;
  DB_STATE.connecting = false;
  DB_STATE.lastErrorMessage = err?.message || "UNKNOWN DB ERROR";
  console.error("🔴 DB ERROR:", DB_STATE.lastErrorMessage);
});

mongoose.connection.on("disconnected", () => {
  DB_STATE.connected = false;
  DB_STATE.connecting = false;
  console.warn("🟡 DB DISCONNECTED");

  if (!DB_STATE.shuttingDown) {
    scheduleRetry();
  }
});

mongoose.connection.on("reconnected", () => {
  DB_STATE.connected = true;
  DB_STATE.connecting = false;
  DB_STATE.lastConnectedAt = now();
  DB_STATE.retryCount = 0;
  clearRetryTimer();
  console.log("🔵 DB RECONNECTED");
});

/* =====================================================
🔥 HEALTH CHECK
===================================================== */
function getDBHealth() {
  syncStateFromMongoose();

  return {
    ok: DB_STATE.connected,
    connected: DB_STATE.connected,
    connecting: DB_STATE.connecting,
    readyState: getReadyState(),
    readyStateText: READY_STATE[getReadyState()] || "unknown",
    retryCount: DB_STATE.retryCount,
    errors: DB_STATE.errors,
    lastErrorMessage: DB_STATE.lastErrorMessage,
    lastConnectedAt: DB_STATE.lastConnectedAt,
    lastRetryAt: DB_STATE.lastRetryAt,
    uptime: DB_STATE.lastConnectedAt ? now() - DB_STATE.lastConnectedAt : 0
  };
}

/* =====================================================
🔥 GRACEFUL SHUTDOWN
===================================================== */
async function closeDB() {
  try {
    DB_STATE.shuttingDown = true;
    clearRetryTimer();

    if (getReadyState() === 0) {
      console.log("🛑 DB ALREADY CLOSED");
      return;
    }

    await mongoose.connection.close(false);
    DB_STATE.connected = false;
    DB_STATE.connecting = false;

    console.log("🛑 DB CONNECTION CLOSED");
  } catch (e) {
    console.error("DB CLOSE ERROR:", e.message);
  }
}

process.on("SIGINT", async () => {
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});

/* =====================================================
🔥 AUTO MONITOR
===================================================== */
if (!global.__DB_MONITOR__) {
  global.__DB_MONITOR__ = true;

  setInterval(() => {
    syncStateFromMongoose();

    if (!DB_STATE.connected && !DB_STATE.shuttingDown) {
      console.warn("⚠️ DB NOT CONNECTED");
    }
  }, 10000);
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  connectDB,
  closeDB,
  getDBHealth
};

console.log("🔥 DATABASE CONFIG READY");