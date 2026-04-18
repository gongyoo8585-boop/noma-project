"use strict";

/* =====================================================
🔥 LOGGER (FINAL ULTRA COMPLETE)
👉 전역 로그 시스템
👉 서비스 / 컨트롤러 / 에러 통합
👉 운영/개발 분리
===================================================== */

const fs = require("fs");
const path = require("path");

/* =====================================================
🔥 CONFIG
===================================================== */
const LOG_LEVEL = process.env.LOG_LEVEL || "debug";
const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), "logs");
const ENABLE_FILE_LOG = process.env.LOG_FILE === "true";

/* =====================================================
🔥 LEVEL PRIORITY
===================================================== */
const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function canLog(level) {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

/* =====================================================
🔥 INIT LOG DIR
===================================================== */
if (ENABLE_FILE_LOG) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (e) {
    console.error("LOG DIR CREATE FAIL");
  }
}

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date().toISOString();
}

function safeStr(v) {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function buildLog(level, message, meta = {}) {
  return {
    time: now(),
    level,
    message: safeStr(message),
    ...meta
  };
}

function formatConsole(log) {
  return `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`;
}

function writeFile(level, log) {
  if (!ENABLE_FILE_LOG) return;

  try {
    const file = path.join(LOG_DIR, `${level}.log`);
    fs.appendFileSync(file, JSON.stringify(log) + "\n");
  } catch {
    console.error("FILE LOG WRITE FAIL");
  }
}

/* =====================================================
🔥 CORE LOGGER
===================================================== */
function log(level, message, meta = {}) {
  if (!canLog(level)) return;

  const data = buildLog(level, message, meta);

  console.log(formatConsole(data));
  writeFile(level, data);
}

/* =====================================================
🔥 LEVEL API
===================================================== */
const logger = {
  debug: (msg, meta) => log("debug", msg, meta),
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta)
};

/* =====================================================
🔥 REQUEST LOGGER MIDDLEWARE
===================================================== */
logger.request = function (req, res, next) {
  const start = Date.now();

  const traceId =
    req.traceId ||
    "REQ_" + Date.now() + "_" + Math.random().toString(36).slice(2);

  req.traceId = traceId;

  logger.info("REQUEST START", {
    traceId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip
  });

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info("REQUEST END", {
      traceId,
      status: res.statusCode,
      duration: duration + "ms"
    });
  });

  next();
};

/* =====================================================
🔥 ERROR LOGGER
===================================================== */
logger.errorHandler = function (err, req) {
  logger.error("SERVER ERROR", {
    traceId: req?.traceId,
    path: req?.originalUrl,
    method: req?.method,
    message: err.message,
    stack: err.stack
  });
};

/* =====================================================
🔥 PERFORMANCE TIMER
===================================================== */
logger.timer = function (label = "TIMER") {
  const start = Date.now();

  return {
    end: () => {
      const duration = Date.now() - start;
      logger.debug(label, { duration: duration + "ms" });
      return duration;
    }
  };
};

/* =====================================================
🔥 CUSTOM EVENT
===================================================== */
logger.event = function (name, payload = {}) {
  logger.info("EVENT:" + name, payload);
};

/* =====================================================
🔥 DB LOGGER
===================================================== */
logger.db = function (query, duration) {
  logger.debug("DB QUERY", {
    query: safeStr(query),
    duration: duration + "ms"
  });
};

/* =====================================================
🔥 AUTH LOGGER
===================================================== */
logger.auth = function (user, action) {
  logger.info("AUTH", {
    userId: user?.id,
    role: user?.role,
    action
  });
};

/* =====================================================
🔥 PAYMENT LOGGER
===================================================== */
logger.payment = function (data) {
  logger.info("PAYMENT", data);
};

/* =====================================================
🔥 ADMIN LOGGER
===================================================== */
logger.admin = function (data) {
  logger.warn("ADMIN ACTION", data);
};

/* =====================================================
🔥 CLEANUP (메모리 보호)
===================================================== */
let LOG_COUNT = 0;

setInterval(() => {
  LOG_COUNT = 0;
}, 60000);

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 LOGGER READY");

module.exports = logger;