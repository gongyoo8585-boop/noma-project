"use strict";

/* =====================================================
🔥 ASYNC HANDLER (FINAL ULTRA COMPLETE MASTER)
👉 async/await route/controller 공통 래퍼
👉 에러 자동 next(err)
👉 traceId / 로깅 / 실행시간 / fallback 포함
👉 통째로 교체 가능한 완성형
===================================================== */

const logger = (() => {
  try {
    return require("../utils/logger");
  } catch (_) {
    return {
      debug: console.log,
      info: console.log,
      warn: console.warn,
      error: console.error
    };
  }
})();

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
const ASYNC_HANDLER_STATE = {
  totalWrapped: 0,
  totalExecuted: 0,
  totalErrors: 0,
  lastErrorAt: null,
  slowCalls: 0
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

function makeTraceId(prefix = "ASYNC") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getHandlerName(fn) {
  if (!fn) return "anonymous";
  return safeStr(fn.name || "anonymous", "anonymous");
}

function ensureTraceId(req) {
  if (!req.traceId) {
    req.traceId = makeTraceId();
  }
  return req.traceId;
}

function buildMeta(req, fnName, startedAt) {
  return {
    traceId: ensureTraceId(req),
    handler: fnName,
    method: safeStr(req.method || ""),
    path: safeStr(req.originalUrl || req.url || ""),
    duration: `${now() - startedAt}ms`
  };
}

/* =====================================================
🔥 MAIN WRAPPER
===================================================== */
function asyncHandler(fn) {
  ASYNC_HANDLER_STATE.totalWrapped += 1;

  return function wrappedAsyncHandler(req, res, next) {
    ASYNC_HANDLER_STATE.totalExecuted += 1;

    const startedAt = now();
    const fnName = getHandlerName(fn);
    ensureTraceId(req);

    Promise.resolve(fn(req, res, next))
      .then(() => {
        const duration = now() - startedAt;

        if (duration > 1000) {
          ASYNC_HANDLER_STATE.slowCalls += 1;
          logger.warn("ASYNC HANDLER SLOW", {
            traceId: req.traceId,
            handler: fnName,
            method: req.method,
            path: req.originalUrl,
            duration: `${duration}ms`
          });
        } else {
          logger.debug("ASYNC HANDLER OK", {
            traceId: req.traceId,
            handler: fnName,
            duration: `${duration}ms`
          });
        }
      })
      .catch((err) => {
        ASYNC_HANDLER_STATE.totalErrors += 1;
        ASYNC_HANDLER_STATE.lastErrorAt = now();

        if (!err.status) {
          err.status = 500;
        }

        if (!err.traceId) {
          err.traceId = req.traceId;
        }

        logger.error("ASYNC HANDLER ERROR", {
          traceId: req.traceId,
          handler: fnName,
          method: req.method,
          path: req.originalUrl,
          message: err.message,
          status: err.status,
          duration: `${now() - startedAt}ms`
        });

        return next(err);
      });
  };
}

/* =====================================================
🔥 LIGHT WRAPPER
👉 최소 기능 버전
===================================================== */
asyncHandler.light = function (fn) {
  ASYNC_HANDLER_STATE.totalWrapped += 1;

  return function wrappedLightHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/* =====================================================
🔥 SAFE JSON WRAPPER
👉 에러 시 JSON 응답 직접 반환
===================================================== */
asyncHandler.json = function (fn) {
  ASYNC_HANDLER_STATE.totalWrapped += 1;

  return function wrappedJsonHandler(req, res, next) {
    const startedAt = now();
    const fnName = getHandlerName(fn);
    ensureTraceId(req);

    Promise.resolve(fn(req, res, next)).catch((err) => {
      ASYNC_HANDLER_STATE.totalErrors += 1;
      ASYNC_HANDLER_STATE.lastErrorAt = now();

      logger.error("ASYNC JSON ERROR", {
        traceId: req.traceId,
        handler: fnName,
        method: req.method,
        path: req.originalUrl,
        message: err.message,
        duration: `${now() - startedAt}ms`
      });

      return res.status(err.status || 500).json({
        ok: false,
        message: err.message || "SERVER ERROR",
        traceId: req.traceId
      });
    });
  };
};

/* =====================================================
🔥 ARRAY WRAPPER
👉 미들웨어 배열을 한 번에 감싸기
===================================================== */
asyncHandler.wrapAll = function (handlers = []) {
  return (Array.isArray(handlers) ? handlers : []).map((handler) => {
    if (typeof handler !== "function") return handler;
    return asyncHandler(handler);
  });
};

/* =====================================================
🔥 CONDITIONAL WRAPPER
👉 조건에 따라 다른 핸들러 실행
===================================================== */
asyncHandler.when = function (conditionFn, trueHandler, falseHandler = null) {
  return asyncHandler(async (req, res, next) => {
    const result = await Promise.resolve(conditionFn(req, res, next));

    if (result) {
      if (typeof trueHandler === "function") {
        return trueHandler(req, res, next);
      }
      return next();
    }

    if (typeof falseHandler === "function") {
      return falseHandler(req, res, next);
    }

    return next();
  });
};

/* =====================================================
🔥 TRY WRAPPER
👉 sync + async 모두 안전 처리
===================================================== */
asyncHandler.try = function (fn) {
  ASYNC_HANDLER_STATE.totalWrapped += 1;

  return function wrappedTryHandler(req, res, next) {
    try {
      const result = fn(req, res, next);
      return Promise.resolve(result).catch(next);
    } catch (err) {
      return next(err);
    }
  };
};

/* =====================================================
🔥 ROUTE SCOPE LOGGER
===================================================== */
asyncHandler.scope = function (scopeName = "default", fn) {
  return asyncHandler(async (req, res, next) => {
    req.asyncScope = safeStr(scopeName, "default");

    logger.info("ASYNC SCOPE ENTER", {
      traceId: ensureTraceId(req),
      scope: req.asyncScope,
      method: req.method,
      path: req.originalUrl
    });

    return fn(req, res, next);
  });
};

/* =====================================================
🔥 CUSTOM ERROR HELPER
===================================================== */
asyncHandler.createError = function (status = 500, message = "SERVER ERROR", details = null) {
  const err = new Error(message);
  err.status = safeNum(status, 500);
  err.details = details;
  return err;
};

/* =====================================================
🔥 ASSERT HELPER
===================================================== */
asyncHandler.assert = function (condition, status = 400, message = "BAD REQUEST", details = null) {
  if (!condition) {
    throw asyncHandler.createError(status, message, details);
  }
  return true;
};

/* =====================================================
🔥 STATE / DEBUG
===================================================== */
asyncHandler.getState = function () {
  return {
    ...ASYNC_HANDLER_STATE
  };
};

asyncHandler.resetState = function () {
  ASYNC_HANDLER_STATE.totalWrapped = 0;
  ASYNC_HANDLER_STATE.totalExecuted = 0;
  ASYNC_HANDLER_STATE.totalErrors = 0;
  ASYNC_HANDLER_STATE.lastErrorAt = null;
  ASYNC_HANDLER_STATE.slowCalls = 0;
  return true;
};

/* =====================================================
🔥 TIMER HELPER
===================================================== */
asyncHandler.timer = function () {
  const startedAt = now();

  return {
    end() {
      return now() - startedAt;
    }
  };
};

/* =====================================================
🔥 AUTO MAINTENANCE
===================================================== */
if (!global.__ASYNC_HANDLER_INTERVAL__) {
  global.__ASYNC_HANDLER_INTERVAL__ = true;

  setInterval(() => {
    try {
      if (ASYNC_HANDLER_STATE.totalWrapped > 100000000) {
        ASYNC_HANDLER_STATE.totalWrapped = 0;
      }
      if (ASYNC_HANDLER_STATE.totalExecuted > 100000000) {
        ASYNC_HANDLER_STATE.totalExecuted = 0;
      }
      if (ASYNC_HANDLER_STATE.totalErrors > 100000000) {
        ASYNC_HANDLER_STATE.totalErrors = 0;
      }
      if (ASYNC_HANDLER_STATE.slowCalls > 100000000) {
        ASYNC_HANDLER_STATE.slowCalls = 0;
      }
    } catch (_) {}
  }, 60000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 ASYNC HANDLER READY");

module.exports = asyncHandler;