"use strict";

/* =====================================================
🔥 REQUEST LOGGER (FINAL ULTRA COMPLETE MASTER)
👉 요청 추적 / traceId / 응답시간 / 사용자 식별 / 상태코드 로그
👉 logger.js 연동 가능
👉 통째로 교체 가능한 완성형
===================================================== */

const logger = (() => {
  try {
    return require("../utils/logger");
  } catch (_) {
    return {
      info: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.log
    };
  }
})();

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
const REQUEST_LOGGER_STATE = {
  total: 0,
  active: 0,
  errors: 0,
  slow: 0,
  lastRequestAt: null
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function makeTraceId(prefix = "REQ") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getClientIp(req) {
  let ip =
    req.headers["x-forwarded-for"] ||
    req.ip ||
    req.socket?.remoteAddress ||
    "";

  if (typeof ip === "string" && ip.includes(",")) {
    ip = ip.split(",")[0].trim();
  }

  return safeStr(ip);
}

function getUserId(req) {
  return String(req.user?.id || req.user?._id || "");
}

function getUserRole(req) {
  return String(req.user?.role || "guest");
}

function getRequestMeta(req) {
  return {
    traceId: req.traceId,
    method: req.method,
    path: req.originalUrl,
    ip: getClientIp(req),
    userId: getUserId(req),
    role: getUserRole(req),
    ua: safeStr(req.headers["user-agent"] || ""),
    contentLength: safeStr(req.headers["content-length"] || "0"),
    referer: safeStr(req.headers.referer || req.headers.referrer || "")
  };
}

function isStaticPath(req) {
  const path = safeStr(req.originalUrl || "");
  return (
    path.startsWith("/favicon.ico") ||
    path.startsWith("/robots.txt") ||
    path.startsWith("/static/") ||
    path.startsWith("/public/")
  );
}

/* =====================================================
🔥 MAIN REQUEST LOGGER
===================================================== */
function requestLogger(req, res, next) {
  if (isStaticPath(req)) {
    return next();
  }

  const startedAt = now();
  const traceId = req.traceId || makeTraceId();

  req.traceId = traceId;
  req.requestStartedAt = startedAt;

  REQUEST_LOGGER_STATE.total += 1;
  REQUEST_LOGGER_STATE.active += 1;
  REQUEST_LOGGER_STATE.lastRequestAt = startedAt;

  res.setHeader("X-Trace-Id", traceId);

  const startMeta = getRequestMeta(req);

  logger.info("REQUEST START", startMeta);

  res.on("finish", () => {
    const duration = now() - startedAt;
    const statusCode = safeNum(res.statusCode, 0);

    REQUEST_LOGGER_STATE.active = Math.max(0, REQUEST_LOGGER_STATE.active - 1);

    if (statusCode >= 400) {
      REQUEST_LOGGER_STATE.errors += 1;
    }

    if (duration > 1000) {
      REQUEST_LOGGER_STATE.slow += 1;
      logger.warn("REQUEST SLOW", {
        ...startMeta,
        statusCode,
        duration: `${duration}ms`
      });
    }

    logger.info("REQUEST END", {
      ...startMeta,
      statusCode,
      duration: `${duration}ms}`,
      responseLength: safeStr(res.getHeader("content-length") || "")
    });
  });

  res.on("close", () => {
    if (!res.writableEnded) {
      REQUEST_LOGGER_STATE.active = Math.max(0, REQUEST_LOGGER_STATE.active - 1);

      logger.warn("REQUEST CLOSED EARLY", {
        ...startMeta,
        duration: `${now() - startedAt}ms`
      });
    }
  });

  return next();
}

/* =====================================================
🔥 LIGHT LOGGER
===================================================== */
requestLogger.light = function (req, res, next) {
  const traceId = req.traceId || makeTraceId("LREQ");
  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);

  logger.debug("REQUEST", {
    traceId,
    method: req.method,
    path: req.originalUrl
  });

  next();
};

/* =====================================================
🔥 ERROR-AWARE LOGGER
===================================================== */
requestLogger.withErrorCapture = function (req, res, next) {
  requestLogger(req, res, () => {
    try {
      next();
    } catch (err) {
      REQUEST_LOGGER_STATE.errors += 1;

      logger.error("REQUEST SYNC ERROR", {
        traceId: req.traceId,
        path: req.originalUrl,
        method: req.method,
        message: err.message
      });

      next(err);
    }
  });
};

/* =====================================================
🔥 ADMIN / DEBUG
===================================================== */
requestLogger.getState = function () {
  return {
    ...REQUEST_LOGGER_STATE,
    uptime: process.uptime()
  };
};

requestLogger.resetState = function () {
  REQUEST_LOGGER_STATE.total = 0;
  REQUEST_LOGGER_STATE.active = 0;
  REQUEST_LOGGER_STATE.errors = 0;
  REQUEST_LOGGER_STATE.slow = 0;
  REQUEST_LOGGER_STATE.lastRequestAt = null;
  return true;
};

requestLogger.debug = function (req) {
  return {
    traceId: req.traceId,
    startedAt: req.requestStartedAt,
    ip: getClientIp(req),
    userId: getUserId(req),
    role: getUserRole(req),
    method: req.method,
    path: req.originalUrl
  };
};

/* =====================================================
🔥 REQUEST TIMER HELPER
===================================================== */
requestLogger.timer = function (req) {
  const startedAt = req.requestStartedAt || now();

  return {
    ms() {
      return now() - startedAt;
    }
  };
};

/* =====================================================
🔥 PER-ROUTE LOGGER FACTORY
===================================================== */
requestLogger.scope = function (scopeName = "api") {
  return (req, res, next) => {
    req.logScope = safeStr(scopeName, "api");
    logger.info("REQUEST SCOPE", {
      scope: req.logScope,
      traceId: req.traceId || makeTraceId("SCOPE"),
      path: req.originalUrl
    });
    next();
  };
};

/* =====================================================
🔥 AUTO MAINTENANCE
===================================================== */
if (!global.__REQUEST_LOGGER_INTERVAL__) {
  global.__REQUEST_LOGGER_INTERVAL__ = true;

  setInterval(() => {
    try {
      if (REQUEST_LOGGER_STATE.total > 100000000) {
        REQUEST_LOGGER_STATE.total = 0;
      }
      if (REQUEST_LOGGER_STATE.errors > 100000000) {
        REQUEST_LOGGER_STATE.errors = 0;
      }
      if (REQUEST_LOGGER_STATE.slow > 100000000) {
        REQUEST_LOGGER_STATE.slow = 0;
      }
    } catch (_) {}
  }, 60000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 REQUEST LOGGER READY");

module.exports = requestLogger;