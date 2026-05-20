"use strict";

/* =====================================================
🔥 SLACK ALERT SERVICE
👉 Slack Webhook 알림
👉 에러 / 시스템 / 이벤트 전송
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const axios = require("axios");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let logger = null;
let analyticsService = null;
let queueService = null;

try { logger = require("./logger.elk"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";
const SERVICE_NAME = process.env.SERVICE_NAME || "app";
const NODE_ENV = process.env.NODE_ENV || "development";

/* =====================================================
🔥 HELPER
===================================================== */
function buildPayload({ title, message, level = "info", meta = {} }) {
  const color =
    level === "error"
      ? "#ff0000"
      : level === "warn"
      ? "#ffa500"
      : "#36a64f";

  return {
    attachments: [
      {
        color,
        title: `[${SERVICE_NAME}] ${title}`,
        text: message,
        fields: Object.entries(meta).map(([k, v]) => ({
          title: k,
          value: String(v),
          short: true,
        })),
        footer: NODE_ENV,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

/* =====================================================
🔥 SERVICE
===================================================== */
class SlackAlertService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 SEND
  ===================================================== */
  async send({ title, message, level = "info", meta = {} }) {
    const payload = buildPayload({ title, message, level, meta });

    if (!SLACK_WEBHOOK_URL) {
      console.log("[slack fallback]", payload);
      return { fallback: true };
    }

    try {
      const res = await axios.post(SLACK_WEBHOOK_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 3000,
      });

      this.last = payload;

      logger?.info("slack_sent", { title, level });

      analyticsService?.track({
        type: "slack_alert",
        payload: { title, level },
      });

      return res.data;
    } catch (err) {
      console.error("[slack error]", err.message);

      logger?.error("slack_error", {
        message: err.message,
      });

      return { error: true };
    }
  }

  /* =====================================================
  🔥 SEND ASYNC
  ===================================================== */
  async sendAsync(data) {
    if (!queueService) {
      return this.send(data);
    }

    return queueService.add({
      type: "slack",
      payload: data,
      handler: async (payload) => this.send(payload),
    });
  }

  /* =====================================================
  🔥 ERROR ALERT
  ===================================================== */
  error(err, meta = {}) {
    return this.sendAsync({
      title: "🚨 ERROR",
      message: err.message,
      level: "error",
      meta: {
        stack: err.stack,
        ...meta,
      },
    });
  }

  /* =====================================================
  🔥 WARN ALERT
  ===================================================== */
  warn(message, meta = {}) {
    return this.sendAsync({
      title: "⚠️ WARNING",
      message,
      level: "warn",
      meta,
    });
  }

  /* =====================================================
  🔥 INFO ALERT
  ===================================================== */
  info(message, meta = {}) {
    return this.sendAsync({
      title: "ℹ️ INFO",
      message,
      level: "info",
      meta,
    });
  }

  /* =====================================================
  🔥 CRITICAL (즉시)
  ===================================================== */
  async critical(message, meta = {}) {
    return this.send({
      title: "🔥 CRITICAL",
      message,
      level: "error",
      meta,
    });
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

module.exports = new SlackAlertService();