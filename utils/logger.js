"use strict";

const fs = require("fs");
const path = require("path");

/* =====================================================
🔥 CONFIG
===================================================== */
const LOG_LEVEL = process.env.LOG_LEVEL || "debug";
const LOG_DIR = path.join(process.cwd(), "logs");

// 🔥 기본 true로 변경 (중요)
const ENABLE_FILE_LOG =
  process.env.LOG_FILE === "false" ? false : true;

/* =====================================================
🔥 FILE PATH (🔥 네 구조 유지)
===================================================== */
const SYSTEM_LOG = path.join(LOG_DIR, "system.log");
const PAYMENT_LOG = path.join(LOG_DIR, "payment.log");

/* =====================================================
🔥 LEVEL PRIORITY
===================================================== */
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

function canLog(level) {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

/* =====================================================
🔥 INIT
===================================================== */
if (ENABLE_FILE_LOG) {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  [SYSTEM_LOG, PAYMENT_LOG].forEach((file) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "");
    }
  });
}

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return new Date().toISOString();
}

function safeStr(v) {
  try {
    return typeof v === "string" ? v : JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/* =====================================================
🔥 FORMAT
===================================================== */
function buildLog(level, message, meta = {}) {
  return {
    time: now(),
    level,
    message: safeStr(message),
    ...meta,
  };
}

function formatConsole(log) {
  return `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`;
}

/* =====================================================
🔥 WRITE FILE (🔥 구조 맞춤)
===================================================== */
function writeFile(type, log) {
  if (!ENABLE_FILE_LOG) return;

  try {
    const file =
      type === "payment" ? PAYMENT_LOG : SYSTEM_LOG;

    fs.appendFileSync(file, JSON.stringify(log) + "\n");
  } catch {
    console.error("FILE LOG WRITE FAIL");
  }
}

/* =====================================================
🔥 CORE LOGGER
===================================================== */
function log(level, message, meta = {}, type = "system") {
  if (!canLog(level)) return;

  const data = buildLog(level, message, meta);

  console.log(formatConsole(data));
  writeFile(type, data);
}

/* =====================================================
🔥 API
===================================================== */
const logger = {
  debug: (msg, meta) => log("debug", msg, meta),
  info: (msg, meta) => log("info", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),

  /* 🔥 PAYMENT 전용 */
  payment: (data) => log("info", "PAYMENT", data, "payment"),
};

/* =====================================================
🔥 REQUEST LOGGER
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
  });

  res.on("finish", () => {
    logger.info("REQUEST END", {
      traceId,
      status: res.statusCode,
      duration: Date.now() - start,
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
    message: err.message,
  });
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 LOGGER READY");

module.exports = logger;