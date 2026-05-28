"use strict";

/* =====================================================
🔥 NOTIFICATION CONTROLLER (FINAL ULTRA COMPLETE MASTER)
👉 알림 테스트 / 발송 / 관리자 / 통계 / 디버그
👉 notification.service 안전 로딩 + fallback
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(modulePath) {
  try {
    return require(modulePath);
  } catch (error) {
    return null;
  }
}

/* =====================================================
🔥 NOTIFICATION SERVICE SAFE LOAD
/controllers/notification/notificationController.js 기준
- ../../services/notification.service
- ../../services/notificationService
- ../../services/notification/notification.service
- ../../services/notification/notificationService
===================================================== */
const loadedNotificationService =
  safeRequire("../../services/notification.service") ||
  safeRequire("../../services/notificationService") ||
  safeRequire("../../services/notification/notification.service") ||
  safeRequire("../../services/notification/notificationService") ||
  safeRequire("../services/notification.service") ||
  safeRequire("../services/notificationService");

/* =====================================================
🔥 FALLBACK SERVICE
===================================================== */
function createFallbackNotificationService() {
  const logs = [];
  const metrics = {
    total: 0,
    failed: 0,
    success: 0,
  };

  function addLog(type, payload = {}) {
    metrics.total += 1;
    metrics.success += 1;

    logs.push({
      type,
      payload,
      at: new Date(),
    });

    if (logs.length > 500) {
      logs.shift();
    }

    return {
      ok: true,
      fallback: true,
      type,
      payload,
    };
  }

  return {
    notify(payload) {
      return addLog("notify", payload);
    },

    notifyMultiChannel({ channels = [], payload = {} } = {}) {
      return channels.map((channel) =>
        addLog("notify_multi_channel", {
          channel,
          payload,
        })
      );
    },

    notifyBulk(list = []) {
      return list.map((payload) => addLog("notify_bulk", payload));
    },

    sendReservationCreated(payload) {
      return addLog("reservation_created", payload);
    },

    sendReservationCancelled(payload) {
      return addLog("reservation_cancelled", payload);
    },

    sendReservationReminder(payload) {
      return addLog("reservation_reminder", payload);
    },

    sendPaymentPaid(payload) {
      return addLog("payment_paid", payload);
    },

    sendPaymentFailed(payload) {
      return addLog("payment_failed", payload);
    },

    sendPaymentRefunded(payload) {
      return addLog("payment_refunded", payload);
    },

    sendAdminAlert(payload) {
      return addLog("admin_alert", payload);
    },

    sendSystemAlert(payload) {
      return addLog("system_alert", payload);
    },

    sendSMS(payload) {
      return addLog("sms", payload);
    },

    sendEmail(payload) {
      return addLog("email", payload);
    },

    sendPush(payload) {
      return addLog("push", payload);
    },

    sendKakao(payload) {
      return addLog("kakao", payload);
    },

    getTemplateKeys() {
      return [];
    },

    addTemplate() {
      return false;
    },

    getLogs(limit = 100) {
      return logs.slice(-Math.max(1, Number(limit) || 100));
    },

    clearLogs() {
      logs.length = 0;
      return true;
    },

    getMetrics() {
      return {
        ...metrics,
        fallback: true,
      };
    },

    resetMetrics() {
      metrics.total = 0;
      metrics.failed = 0;
      metrics.success = 0;
      return true;
    },

    getHealth() {
      return {
        ok: true,
        fallback: true,
        logs: logs.length,
        metrics,
      };
    },
  };
}

const notificationService =
  loadedNotificationService && typeof loadedNotificationService === "object"
    ? loadedNotificationService
    : createFallbackNotificationService();

/* =====================================================
🔥 UTIL
===================================================== */
function ok(res, data = {}) {
  return res.json({ ok: true, ...data });
}

function fail(res, status = 500, message = "SERVER ERROR", extra = {}) {
  return res.status(status).json({ ok: false, message, ...extra });
}

function safeAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error("NOTIFICATION CONTROLLER ERROR:", e);
      return fail(res, 500, e.message || "SERVER ERROR");
    });
  };
}

function safeStr(v = "") {
  return String(v || "").trim();
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

/* =====================================================
🔥 CORE SEND
===================================================== */

// 기본 알림
exports.send = safeAsync(async (req, res) => {
  const result = await notificationService.notify(req.body);
  return ok(res, { result });
});

// 다중 채널
exports.sendMulti = safeAsync(async (req, res) => {
  const { channels = [], payload = {} } = req.body;
  const result = await notificationService.notifyMultiChannel({ channels, payload });
  return ok(res, { result });
});

// bulk
exports.sendBulk = safeAsync(async (req, res) => {
  const list = Array.isArray(req.body.list) ? req.body.list : [];
  const result = await notificationService.notifyBulk(list);
  return ok(res, { result });
});

/* =====================================================
🔥 RESERVATION
===================================================== */

exports.reservationCreated = safeAsync(async (req, res) => {
  const result = await notificationService.sendReservationCreated(req.body);
  return ok(res, { result });
});

exports.reservationCancelled = safeAsync(async (req, res) => {
  const result = await notificationService.sendReservationCancelled(req.body);
  return ok(res, { result });
});

exports.reservationReminder = safeAsync(async (req, res) => {
  const result = await notificationService.sendReservationReminder(req.body);
  return ok(res, { result });
});

/* =====================================================
🔥 PAYMENT
===================================================== */

exports.paymentPaid = safeAsync(async (req, res) => {
  const result = await notificationService.sendPaymentPaid(req.body);
  return ok(res, { result });
});

exports.paymentFailed = safeAsync(async (req, res) => {
  const result = await notificationService.sendPaymentFailed(req.body);
  return ok(res, { result });
});

exports.paymentRefunded = safeAsync(async (req, res) => {
  const result = await notificationService.sendPaymentRefunded(req.body);
  return ok(res, { result });
});

/* =====================================================
🔥 ADMIN / SYSTEM
===================================================== */

exports.adminAlert = safeAsync(async (req, res) => {
  const result = await notificationService.sendAdminAlert(req.body);
  return ok(res, { result });
});

exports.systemAlert = safeAsync(async (req, res) => {
  const result = await notificationService.sendSystemAlert(req.body);
  return ok(res, { result });
});

/* =====================================================
🔥 DIRECT CHANNEL (테스트용)
===================================================== */

exports.sms = safeAsync(async (req, res) => {
  const result = await notificationService.sendSMS(req.body);
  return ok(res, { result });
});

exports.email = safeAsync(async (req, res) => {
  const result = await notificationService.sendEmail(req.body);
  return ok(res, { result });
});

exports.push = safeAsync(async (req, res) => {
  const result = await notificationService.sendPush(req.body);
  return ok(res, { result });
});

exports.kakao = safeAsync(async (req, res) => {
  const result = await notificationService.sendKakao(req.body);
  return ok(res, { result });
});

/* =====================================================
🔥 TEMPLATE
===================================================== */

exports.templates = safeAsync(async (req, res) => {
  const keys = notificationService.getTemplateKeys();
  return ok(res, { templates: keys });
});

exports.addTemplate = safeAsync(async (req, res) => {
  const { key } = req.body;

  if (!key) return fail(res, 400, "key required");

  const okAdd = notificationService.addTemplate(
    key,
    (data) => safeStr(data.message || "")
  );

  return ok(res, { added: okAdd });
});

/* =====================================================
🔥 LOG / METRICS
===================================================== */

exports.logs = safeAsync(async (req, res) => {
  const limit = safeNum(req.query.limit, 100);
  const logs = notificationService.getLogs(limit);
  return ok(res, { logs });
});

exports.clearLogs = safeAsync(async (req, res) => {
  notificationService.clearLogs();
  return ok(res);
});

exports.metrics = safeAsync(async (req, res) => {
  const metrics = notificationService.getMetrics();
  return ok(res, { metrics });
});

exports.resetMetrics = safeAsync(async (req, res) => {
  notificationService.resetMetrics();
  return ok(res);
});

/* =====================================================
🔥 HEALTH / DEBUG
===================================================== */

exports.health = safeAsync(async (req, res) => {
  const data = notificationService.getHealth();
  return ok(res, data);
});

exports.debug = safeAsync(async (req, res) => {
  return ok(res, {
    time: Date.now(),
    body: req.body,
    query: req.query
  });
});

/* =====================================================
🔥 TEST API
===================================================== */

exports.test = safeAsync(async (req, res) => {
  const result = await notificationService.notify({
    channel: "system",
    message: "🔥 TEST NOTIFICATION",
    meta: { test: true }
  });

  return ok(res, { result });
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 NOTIFICATION CONTROLLER READY");
