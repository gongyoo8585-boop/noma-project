"use strict";

/* =====================================================
🔥 NOTIFICATION CONTROLLER (FINAL ULTRA COMPLETE MASTER)
👉 알림 테스트 / 발송 / 관리자 / 통계 / 디버그
👉 notification.service 완전 활용
===================================================== */

const notificationService = require("../services/notification.service");

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