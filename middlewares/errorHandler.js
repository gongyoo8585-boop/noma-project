"use strict";

/* =====================================================
🔥 GLOBAL ERROR HANDLER (FINAL ULTRA COMPLETE)
👉 전체 서버 에러 통합 처리
👉 Mongoose / JWT / Validation 대응
👉 로그 + 디버깅 + 확장 포함
===================================================== */

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function safeStr(v, d = "") {
  return typeof v === "string" ? v : d;
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function now() {
  return Date.now();
}

/* =====================================================
🔥 ERROR PARSER
===================================================== */
function parseError(err = {}) {
  const name = safeStr(err.name);
  const message = safeStr(err.message, "SERVER ERROR");

  /* =========================
     MONGOOSE ERRORS
  ========================= */
  if (name === "ValidationError") {
    return {
      status: 400,
      message: "VALIDATION ERROR",
      details: Object.values(err.errors || {}).map((e) => ({
        field: e.path,
        message: e.message
      }))
    };
  }

  if (err.code === 11000) {
    return {
      status: 400,
      message: "DUPLICATE KEY",
      details: err.keyValue || {}
    };
  }

  if (name === "CastError") {
    return {
      status: 400,
      message: "INVALID ID",
      details: {
        field: err.path,
        value: err.value
      }
    };
  }

  /* =========================
     JWT ERRORS
  ========================= */
  if (name === "JsonWebTokenError") {
    return {
      status: 401,
      message: "INVALID TOKEN"
    };
  }

  if (name === "TokenExpiredError") {
    return {
      status: 401,
      message: "TOKEN EXPIRED"
    };
  }

  /* =========================
     CUSTOM ERRORS
  ========================= */
  if (err.status) {
    return {
      status: err.status,
      message: message,
      details: err.details || null
    };
  }

  /* =========================
     DEFAULT
  ========================= */
  return {
    status: 500,
    message
  };
}

/* =====================================================
🔥 LOGGER
===================================================== */
function logError(err, req) {
  try {
    const log = {
      time: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      message: err.message,
      stack: err.stack
    };

    if (isDev()) {
      console.error("🔥 ERROR:", log);
    } else {
      console.error("🔥 ERROR:", {
        time: log.time,
        path: log.path,
        message: log.message
      });
    }
  } catch (e) {
    console.error("ERROR LOGGING FAILED");
  }
}

/* =====================================================
🔥 MAIN HANDLER
===================================================== */
function errorHandler(err, req, res, next) {
  const parsed = parseError(err);

  logError(err, req);

  const response = {
    ok: false,
    message: parsed.message
  };

  if (parsed.details) {
    response.details = parsed.details;
  }

  /* =========================
     DEV DEBUG
  ========================= */
  if (isDev()) {
    response.debug = {
      stack: err.stack,
      raw: err
    };
  }

  return res.status(parsed.status).json(response);
}

/* =====================================================
🔥 ASYNC WRAPPER (추가 기능)
===================================================== */
errorHandler.asyncWrapper = function (fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/* =====================================================
🔥 NOT FOUND HANDLER
===================================================== */
errorHandler.notFound = function (req, res) {
  return res.status(404).json({
    ok: false,
    message: "API NOT FOUND",
    path: req.originalUrl
  });
};

/* =====================================================
🔥 CUSTOM ERROR CREATOR
===================================================== */
errorHandler.createError = function (status = 500, message = "ERROR", details = null) {
  const err = new Error(message);
  err.status = status;
  err.details = details;
  return err;
};

/* =====================================================
🔥 ASSERT (간단 검증용)
===================================================== */
errorHandler.assert = function (condition, message = "ASSERT FAIL", status = 400) {
  if (!condition) {
    throw errorHandler.createError(status, message);
  }
};

/* =====================================================
🔥 GLOBAL PROCESS HANDLING
===================================================== */
if (!global.__GLOBAL_ERROR_HANDLER__) {
  global.__GLOBAL_ERROR_HANDLER__ = true;

  process.on("unhandledRejection", (err) => {
    console.error("🔥 UNHANDLED REJECTION:", err);
  });

  process.on("uncaughtException", (err) => {
    console.error("🔥 UNCAUGHT EXCEPTION:", err);
  });
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 ERROR HANDLER READY");

module.exports = errorHandler;