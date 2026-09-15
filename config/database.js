"use strict";

/* =====================================================
🔥 DATABASE CONFIG (FINAL ULTRA MASTER - SAFE)
👉 mongoose 연결 관리 단일화
👉 재연결 / 장애 대응 / 상태 추적
👉 중복 connect / 중복 close / 중복 timer 방지
👉 Atlas / local Mongo 모두 대응
👉 기존 export 기능 유지
👉 SIGINT / SIGTERM 직접 close 제거: 중복 shutdown 충돌 방지
===================================================== */

const mongoose = require("mongoose");
const dns = require("dns");

/* =====================================================
🔥 DNS SAFE SETUP
===================================================== */
try {
  if (typeof dns.setDefaultResultOrder === "function") {
    dns.setDefaultResultOrder("ipv4first");
  }

  if (process.env.MONGO_DNS_SERVERS) {
    const dnsServers = String(process.env.MONGO_DNS_SERVERS)
      .split(",")
      .map((server) => server.trim())
      .filter(Boolean);

    if (dnsServers.length > 0) {
      dns.setServers(dnsServers);
    }
  }
} catch (error) {
  console.warn("⚠️ DNS CONFIG SKIPPED:", error.message);
}

/* =====================================================
🔥 ENV SAFE LOAD
===================================================== */
let ENV = {};

try {
  ENV = require("./env") || {};
} catch (error) {
  ENV = {};
}

/* =====================================================
🔥 MONGOOSE GLOBAL OPTIONS
===================================================== */
mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", false);
mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

/* =====================================================
🔥 GLOBAL SINGLETON STATE
===================================================== */
const DB_STATE =
  global.__NORA_DB_STATE__ ||
  {
    connected: false,
    connecting: false,
    lastConnectedAt: null,
    retryCount: 0,
    errors: 0,
    lastErrorMessage: "",
    lastRetryAt: null,
    retryTimer: null,
    shuttingDown: false,
    connectPromise: null,
  };

global.__NORA_DB_STATE__ = DB_STATE;

/* =====================================================
🔥 CONFIG
===================================================== */
const READY_STATE = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function now() {
  return Date.now();
}

function safeNumberOption(value, fallback, min, max) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue) || numberValue <= 0) {
    return fallback;
  }

  return Math.min(Math.max(numberValue, min), max);
}

function getMongoUri() {
  return String(
    process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      process.env.MONGO_URI_DEV ||
      process.env.DATABASE_URL ||
      process.env.MONGO_URL ||
      ENV.MONGO_URI ||
      ""
  ).trim();
}

function getMongoOptions() {
  const options = {
    maxPoolSize: safeNumberOption(process.env.MONGO_MAX_POOL_SIZE, 5, 1, 20),
    minPoolSize: safeNumberOption(process.env.MONGO_MIN_POOL_SIZE, 0, 0, 5),
    serverSelectionTimeoutMS: safeNumberOption(
      process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS ||
        process.env.MONGO_CONNECT_TIMEOUT_MS,
      30000,
      15000,
      60000
    ),
    socketTimeoutMS: safeNumberOption(process.env.MONGO_SOCKET_TIMEOUT_MS, 60000, 30000, 120000),
    connectTimeoutMS: safeNumberOption(process.env.MONGO_CONNECT_TIMEOUT_MS, 30000, 15000, 60000),
    heartbeatFrequencyMS: safeNumberOption(process.env.MONGO_HEARTBEAT_MS, 10000, 5000, 30000),
    maxIdleTimeMS: safeNumberOption(process.env.MONGO_MAX_IDLE_TIME_MS, 60000, 30000, 120000),
    retryWrites: true,
    retryReads: true,
    family: 4,
    autoIndex: false,
    autoCreate: false,
    bufferCommands: false,
  };

  const dbName = ENV.DB_NAME || process.env.DB_NAME || "";

  if (dbName) {
    options.dbName = dbName;
  }

  return options;
}

/* =====================================================
🔥 UTIL
===================================================== */
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

function maskMongoUri(uri) {
  return String(uri || "").replace(
    /(mongodb(?:\+srv)?:\/\/)([^:@/]+):([^@/]+)@/i,
    "$1$2:****@"
  );
}

function validateMongoUri(uri) {
  if (!uri) {
    throw new Error("MONGO_URI가 비어 있습니다.");
  }

  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error(
      "MONGO_URI 형식이 올바르지 않습니다. mongodb:// 또는 mongodb+srv:// 로 시작해야 합니다."
    );
  }

  if (
    uri.includes("<USER>") ||
    uri.includes("<PASSWORD>") ||
    uri.includes("<db_password>")
  ) {
    throw new Error(
      "MONGO_URI에 placeholder가 남아 있습니다. 실제 계정 정보로 바꿔야 합니다."
    );
  }

  return true;
}

function syncStateFromMongoose() {
  DB_STATE.connected = isActuallyConnected();
  DB_STATE.connecting = isActuallyConnecting();
}

function clearRetryTimer() {
  if (DB_STATE.retryTimer) {
    clearTimeout(DB_STATE.retryTimer);
    DB_STATE.retryTimer = null;
  }
}

function scheduleRetry() {
  if (DB_STATE.shuttingDown) return;
  if (DB_STATE.retryTimer) return;
  if (DB_STATE.connectPromise) return;
  if (isActuallyConnected() || isActuallyConnecting() || DB_STATE.connecting) return;

  const retryMaxDelay = safeNumberOption(process.env.MONGO_RETRY_MAX_DELAY_MS, 30000, 5000, 60000);
  const retryMinDelay = safeNumberOption(process.env.MONGO_RETRY_MIN_DELAY_MS, 5000, 1000, 30000);
  const delay = Math.min(
    retryMaxDelay,
    Math.max(retryMinDelay, DB_STATE.retryCount * retryMinDelay || retryMinDelay)
  );

  DB_STATE.lastRetryAt = now();

  console.warn(`🔄 DB RETRY IN ${delay}ms`);

  DB_STATE.retryTimer = setTimeout(async () => {
    DB_STATE.retryTimer = null;

    try {
      await connectDB();
    } catch (error) {
      console.error("❌ RETRY CONNECT ERROR:", error.message);
    }
  }, delay);

  if (
    DB_STATE.retryTimer &&
    typeof DB_STATE.retryTimer.unref === "function"
  ) {
    DB_STATE.retryTimer.unref();
  }
}

/* =====================================================
🔥 CONNECT
===================================================== */
async function connectDB() {
  const uri = sanitizeMongoUri(getMongoUri());

  try {
    validateMongoUri(uri);
  } catch (error) {
    DB_STATE.errors++;
    DB_STATE.connected = false;
    DB_STATE.connecting = false;
    DB_STATE.lastErrorMessage = error.message;

    console.error("❌ DB CONFIG ERROR:", error.message);

    return null;
  }

  syncStateFromMongoose();

  if (DB_STATE.shuttingDown) {
    return mongoose.connection;
  }

  if (DB_STATE.connected || isActuallyConnected()) {
    DB_STATE.connected = true;
    DB_STATE.connecting = false;
    return mongoose.connection;
  }

  if (DB_STATE.connectPromise) {
    return DB_STATE.connectPromise;
  }

  if (DB_STATE.connecting || isActuallyConnecting()) {
    return mongoose.connection;
  }

  DB_STATE.connecting = true;
  DB_STATE.connected = false;

  clearRetryTimer();

  DB_STATE.connectPromise = (async () => {
    try {
      console.log("🟡 Mongo URI Loaded:", maskMongoUri(uri));

      mongoose.set("bufferCommands", false);

      await mongoose.connect(uri, getMongoOptions());

      if (mongoose.connection.readyState !== 1) {
        await mongoose.connection.asPromise();
      }

      DB_STATE.connected = true;
      DB_STATE.connecting = false;
      DB_STATE.shuttingDown = false;
      DB_STATE.lastConnectedAt = now();
      DB_STATE.retryCount = 0;
      DB_STATE.lastErrorMessage = "";

      console.log("🔥 MongoDB CONNECTED");

      return mongoose.connection;
    } catch (error) {
      DB_STATE.errors++;
      DB_STATE.connected = false;
      DB_STATE.connecting = false;
      DB_STATE.retryCount++;
      DB_STATE.lastErrorMessage = error?.message || "UNKNOWN DB ERROR";

      console.error("❌ DB CONNECTION FAILED:", DB_STATE.lastErrorMessage);

      scheduleRetry();

      return null;
    } finally {
      DB_STATE.connectPromise = null;
      syncStateFromMongoose();
    }
  })();

  return DB_STATE.connectPromise;
}

async function waitForConnection(
  timeout = safeNumberOption(process.env.MONGO_WAIT_TIMEOUT_MS, 30000, 15000, 60000)
) {
  const started = Date.now();

  while (Date.now() - started < timeout) {
    syncStateFromMongoose();

    if (DB_STATE.connected || isActuallyConnected()) {
      return true;
    }

    if (!DB_STATE.connectPromise && !DB_STATE.connecting && !isActuallyConnecting()) {
      await connectDB();
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  syncStateFromMongoose();

  return DB_STATE.connected || isActuallyConnected();
}

async function ensureDBConnection() {
  syncStateFromMongoose();

  if (DB_STATE.connected || isActuallyConnected()) {
    return true;
  }

  await connectDB();

  return waitForConnection();
}

/* =====================================================
🔥 EVENTS
===================================================== */
if (!global.__NORA_DB_EVENTS__) {
  global.__NORA_DB_EVENTS__ = true;

  mongoose.connection.on("connected", () => {
    DB_STATE.connected = true;
    DB_STATE.connecting = false;
    DB_STATE.shuttingDown = false;
    DB_STATE.lastConnectedAt = now();
    DB_STATE.retryCount = 0;
    DB_STATE.lastErrorMessage = "";

    clearRetryTimer();

    console.log("🟢 DB EVENT: connected");
  });

  mongoose.connection.on("error", (error) => {
    DB_STATE.errors++;
    DB_STATE.connected = false;
    DB_STATE.connecting = false;
    DB_STATE.lastErrorMessage = error?.message || "UNKNOWN DB ERROR";

    console.error("🔴 DB ERROR:", DB_STATE.lastErrorMessage);

    if (
      error &&
      (error.code === "ENOTFOUND" ||
        error.code === "ETIMEOUT" ||
        error.code === "ECONNREFUSED")
    ) {
      console.error("[MONGO DNS/NETWORK ERROR]", error.message);
    }
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
    DB_STATE.shuttingDown = false;
    DB_STATE.lastConnectedAt = now();
    DB_STATE.retryCount = 0;
    DB_STATE.lastErrorMessage = "";

    clearRetryTimer();

    console.log("🔵 DB RECONNECTED");
  });
}

/* =====================================================
🔥 HEALTH CHECK
===================================================== */
function getDBHealth() {
  syncStateFromMongoose();

  return {
    ok: DB_STATE.connected || isActuallyConnected(),
    connected: DB_STATE.connected || isActuallyConnected(),
    connecting: DB_STATE.connecting || isActuallyConnecting(),
    readyState: getReadyState(),
    readyStateText: READY_STATE[getReadyState()] || "unknown",
    retryCount: DB_STATE.retryCount,
    errors: DB_STATE.errors,
    lastErrorMessage: DB_STATE.lastErrorMessage,
    lastConnectedAt: DB_STATE.lastConnectedAt,
    lastRetryAt: DB_STATE.lastRetryAt,
    uptime: DB_STATE.lastConnectedAt ? now() - DB_STATE.lastConnectedAt : 0,
  };
}

function isDBConnected() {
  return isActuallyConnected();
}

function getDBStatus() {
  return READY_STATE[getReadyState()] || "unknown";
}

function getDBUptime() {
  return DB_STATE.lastConnectedAt ? now() - DB_STATE.lastConnectedAt : 0;
}

/* =====================================================
🔥 GRACEFUL SHUTDOWN
기존 closeDB export는 유지.
단, 이 모듈에서 process SIGINT/SIGTERM handler 직접 등록은 하지 않음.
중복 shutdown handler는 db.js / server.js / app.js / index.js 쪽과 충돌 가능성이 있음.
===================================================== */
async function closeDB() {
  try {
    DB_STATE.shuttingDown = true;

    clearRetryTimer();

    if (getReadyState() === 0) {
      DB_STATE.connected = false;
      DB_STATE.connecting = false;
      console.log("🛑 DB ALREADY CLOSED");
      return;
    }

    await mongoose.connection.close(false);

    DB_STATE.connected = false;
    DB_STATE.connecting = false;

    console.log("🛑 DB CONNECTION CLOSED");
  } catch (error) {
    console.error("DB CLOSE ERROR:", error.message);
  }
}

/* =====================================================
🔥 AUTO MONITOR
===================================================== */
if (!global.__DB_MONITOR__) {
  global.__DB_MONITOR__ = true;

  const monitorTimer = setInterval(() => {
    syncStateFromMongoose();

    if (!DB_STATE.connected && !DB_STATE.shuttingDown) {
      console.warn("⚠️ DB NOT CONNECTED");
    }
  }, Number(process.env.DB_MONITOR_INTERVAL_MS || 10000));

  if (monitorTimer && typeof monitorTimer.unref === "function") {
    monitorTimer.unref();
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  connectDB,
  closeDB,
  getDBHealth,
  isDBConnected,
  getDBStatus,
  getDBUptime,
  ensureDBConnection,
  waitForConnection,
};

console.log("🔥 DATABASE CONFIG READY");