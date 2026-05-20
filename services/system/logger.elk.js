"use strict";

/* =====================================================
🔥 ELK LOGGER SERVICE
👉 Elasticsearch 기반 로그 전송
👉 JSON 구조 로그
👉 queue / fallback 지원
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const axios = require("axios");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let queueService = null;
let analyticsService = null;

try { queueService = require("./queueService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const ELK_ENDPOINT = process.env.ELK_ENDPOINT || ""; 
// ex: http://localhost:9200/logs/_doc

const SERVICE_NAME = process.env.SERVICE_NAME || "app";
const NODE_ENV = process.env.NODE_ENV || "development";

/* =====================================================
🔥 HELPER
===================================================== */
function buildLog(level, message, meta = {}) {
  return {
    level,
    message,
    service: SERVICE_NAME,
    env: NODE_ENV,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

/* =====================================================
🔥 SERVICE
===================================================== */
class ELKLogger {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 SEND (CORE)
  ===================================================== */
  async send(log) {
    if (!ELK_ENDPOINT) {
      console.log("[ELK disabled]", log);
      return { fallback: true };
    }

    try {
      const res = await axios.post(ELK_ENDPOINT, log, {
        headers: { "Content-Type": "application/json" },
        timeout: 2000,
      });

      this.last = log;

      return res.data;
    } catch (err) {
      console.error("[ELK ERROR]", err.message);

      return { error: true };
    }
  }

  /* =====================================================
  🔥 SEND ASYNC
  ===================================================== */
  async sendAsync(log) {
    if (!queueService) {
      return this.send(log);
    }

    return queueService.add({
      type: "log",
      payload: log,
      handler: async (payload) => this.send(payload),
    });
  }

  /* =====================================================
  🔥 LOG LEVELS
  ===================================================== */
  info(message, meta = {}) {
    const log = buildLog("info", message, meta);

    analyticsService?.track({
      type: "log_info",
      payload: meta,
    });

    return this.sendAsync(log);
  }

  warn(message, meta = {}) {
    const log = buildLog("warn", message, meta);

    return this.sendAsync(log);
  }

  error(message, meta = {}) {
    const log = buildLog("error", message, meta);

    analyticsService?.track({
      type: "log_error",
      payload: meta,
    });

    return this.sendAsync(log);
  }

  debug(message, meta = {}) {
    if (NODE_ENV === "production") return;

    const log = buildLog("debug", message, meta);

    return this.sendAsync(log);
  }

  /* =====================================================
  🔥 REQUEST LOG (EXPRESS)
  ===================================================== */
  middleware() {
    return (req, res, next) => {
      const start = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - start;

        this.info("http_request", {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration,
          ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        });
      });

      next();
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

module.exports = new ELKLogger();