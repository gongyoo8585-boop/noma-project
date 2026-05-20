"use strict";

/* =====================================================
🔥 SENTRY SERVICE
👉 에러 모니터링 + 성능 추적
👉 Express / Async / Logger 연동
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
let Sentry = null;

try {
  Sentry = require("@sentry/node");
} catch (_) {
  console.warn("[sentry] package not installed");
}

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let logger = null;
let analyticsService = null;

try { logger = require("./logger.elk"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const SENTRY_DSN = process.env.SENTRY_DSN || "";
const NODE_ENV = process.env.NODE_ENV || "development";

/* =====================================================
🔥 SERVICE
===================================================== */
class SentryService {
  constructor() {
    this.enabled = !!(Sentry && SENTRY_DSN);
    this.last = null;
  }

  /* =====================================================
  🔥 INIT
  ===================================================== */
  init(app = null) {
    if (!this.enabled) {
      console.warn("[sentry] disabled");
      return false;
    }

    Sentry.init({
      dsn: SENTRY_DSN,
      environment: NODE_ENV,
      tracesSampleRate: 0.5, // 성능 추적 비율
    });

    if (app) {
      app.use(Sentry.Handlers.requestHandler());
      app.use(Sentry.Handlers.tracingHandler());
    }

    return true;
  }

  /* =====================================================
  🔥 CAPTURE ERROR
  ===================================================== */
  captureError(err, context = {}) {
    if (!err) return;

    this.last = err;

    logger?.error("sentry_error", {
      message: err.message,
      stack: err.stack,
      ...context,
    });

    analyticsService?.track({
      type: "error",
      payload: {
        message: err.message,
        ...context,
      },
    });

    if (!this.enabled) {
      console.error("[sentry fallback]", err);
      return;
    }

    Sentry.captureException(err, {
      extra: context,
    });
  }

  /* =====================================================
  🔥 CAPTURE MESSAGE
  ===================================================== */
  captureMessage(message, level = "info", context = {}) {
    logger?.info("sentry_message", {
      message,
      level,
      ...context,
    });

    if (!this.enabled) {
      console.log("[sentry fallback]", message);
      return;
    }

    Sentry.captureMessage(message, level);
  }

  /* =====================================================
  🔥 SET USER CONTEXT
  ===================================================== */
  setUser(user = {}) {
    if (!this.enabled) return;

    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  }

  /* =====================================================
  🔥 SET TAG
  ===================================================== */
  setTag(key, value) {
    if (!this.enabled) return;

    Sentry.setTag(key, value);
  }

  /* =====================================================
  🔥 EXPRESS ERROR HANDLER
  ===================================================== */
  errorHandler() {
    return (err, req, res, next) => {
      this.captureError(err, {
        url: req.originalUrl,
        method: req.method,
      });

      if (this.enabled) {
        Sentry.Handlers.errorHandler()(err, req, res, next);
      } else {
        next(err);
      }
    };
  }

  /* =====================================================
  🔥 WRAP ASYNC FUNCTION
  ===================================================== */
  wrap(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        this.captureError(err);
        throw err;
      }
    };
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.last;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.last = null;
    return true;
  }
}

module.exports = new SentryService();