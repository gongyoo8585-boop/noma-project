"use strict";

/* =====================================================
🔥 NOTIFICATION SERVICE (FINAL ULTRA COMPLETE MASTER)
👉 예약 / 결제 / 관리자 / 시스템 알림 통합 서비스
👉 SMS / EMAIL / PUSH / KAKAO 확장 가능
👉 queue 연동 / template / retry / log / metrics 포함
👉 통째로 교체 가능한 완성형
===================================================== */

const queue = (() => {
  try {
    return require("../utils/queue");
  } catch (_) {
    return null;
  }
})();

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

const cryptoUtil = (() => {
  try {
    return require("../utils/crypto");
  } catch (_) {
    return {
      randomId: (prefix = "NTF") =>
        `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    };
  }
})();

const dateUtil = (() => {
  try {
    return require("../utils/date");
  } catch (_) {
    return {
      format: (d = new Date()) => new Date(d).toISOString()
    };
  }
})();

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_CHANNEL = "system";
const DEFAULT_RETRY = 3;
const DEFAULT_PRIORITY = 0;
const MAX_LOGS = Number(process.env.NOTIFICATION_MAX_LOGS || 5000);
const ENABLE_QUEUE = process.env.NOTIFICATION_USE_QUEUE !== "false";
const ENABLE_SMS = process.env.ENABLE_SMS === "true";
const ENABLE_EMAIL = process.env.ENABLE_EMAIL === "true";
const ENABLE_PUSH = process.env.ENABLE_PUSH === "true";
const ENABLE_KAKAO = process.env.ENABLE_KAKAO === "true";

/* =====================================================
🔥 INTERNAL STATE
===================================================== */
const NOTIFICATION_LOGS = [];
const NOTIFICATION_METRICS = {
  total: 0,
  sent: 0,
  failed: 0,
  queued: 0,
  sms: 0,
  email: 0,
  push: 0,
  kakao: 0,
  system: 0
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

function safeBool(v, d = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    return ["true", "1", "yes", "y", "on"].includes(v.toLowerCase());
  }
  return d;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function normalizePhone(v = "") {
  return String(v || "").replace(/[^\d+]/g, "");
}

function normalizeEmail(v = "") {
  return safeStr(v).toLowerCase();
}

function buildNotificationId() {
  if (typeof cryptoUtil.randomId === "function") {
    return cryptoUtil.randomId("NTF");
  }
  return `NTF_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function addLog(entry = {}) {
  NOTIFICATION_LOGS.push({
    id: buildNotificationId(),
    time: now(),
    date: typeof dateUtil.format === "function" ? dateUtil.format(new Date()) : new Date().toISOString(),
    ...entry
  });

  if (NOTIFICATION_LOGS.length > MAX_LOGS) {
    NOTIFICATION_LOGS.splice(0, NOTIFICATION_LOGS.length - Math.floor(MAX_LOGS / 2));
  }
}

function incMetric(channel = DEFAULT_CHANNEL) {
  NOTIFICATION_METRICS.total += 1;
  if (NOTIFICATION_METRICS[channel] != null) {
    NOTIFICATION_METRICS[channel] += 1;
  } else {
    NOTIFICATION_METRICS.system += 1;
  }
}

/* =====================================================
🔥 TEMPLATE SYSTEM
===================================================== */
const TEMPLATES = {
  reservation_created: ({ shopName = "", reserveAt = "", people = 1 } = {}) =>
    `[예약 완료] ${shopName} / ${reserveAt} / ${people}명 예약이 접수되었습니다.`,

  reservation_cancelled: ({ shopName = "", reserveAt = "" } = {}) =>
    `[예약 취소] ${shopName} / ${reserveAt} 예약이 취소되었습니다.`,

  reservation_reminder: ({ shopName = "", reserveAt = "" } = {}) =>
    `[예약 알림] ${shopName} 예약 시간이 ${reserveAt} 입니다.`,

  payment_paid: ({ amount = 0, orderId = "" } = {}) =>
    `[결제 완료] 주문번호 ${orderId} / ${amount}원이 결제되었습니다.`,

  payment_failed: ({ amount = 0, orderId = "" } = {}) =>
    `[결제 실패] 주문번호 ${orderId} / ${amount}원 결제가 실패했습니다.`,

  payment_refunded: ({ amount = 0, orderId = "" } = {}) =>
    `[환불 완료] 주문번호 ${orderId} / ${amount}원이 환불되었습니다.`,

  admin_alert: ({ title = "", message = "" } = {}) =>
    `[관리자 알림] ${title} ${message}`,

  system_alert: ({ title = "", message = "" } = {}) =>
    `[시스템 알림] ${title} ${message}`
};

function renderTemplate(templateKey = "", payload = {}) {
  const tpl = TEMPLATES[templateKey];
  if (typeof tpl === "function") {
    return tpl(payload || {});
  }
  return safeStr(payload.message || "");
}

/* =====================================================
🔥 CORE SENDERS
===================================================== */
async function sendSystem({ to = "", subject = "", message = "", meta = {} } = {}) {
  logger.info("NOTIFICATION SYSTEM", { to, subject, message, meta });
  return {
    ok: true,
    channel: "system",
    to,
    subject,
    message
  };
}

async function sendSMS({ phone = "", message = "", meta = {} } = {}) {
  const normalized = normalizePhone(콜);

  if (!ENABLE_SMS) {
    logger.info("SMS MOCK SEND", { phone: normalized, message, meta });
    return {
      ok: true,
      channel: "sms",
      mock: true,
      to: normalized,
      message
    };
  }

  // 실제 SMS provider 연동 위치
  logger.info("SMS SEND", { phone: normalized, message, meta });

  return {
    ok: true,
    channel: "sms",
    to: normalized,
    message
  };
}

async function sendEmail({ email = "", subject = "", message = "", html = "", meta = {} } = {}) {
  const normalized = normalizeEmail(email);

  if (!ENABLE_EMAIL) {
    logger.info("EMAIL MOCK SEND", { email: normalized, subject, message, html, meta });
    return {
      ok: true,
      channel: "email",
      mock: true,
      to: normalized,
      subject
    };
  }

  // 실제 Email provider 연동 위치
  logger.info("EMAIL SEND", { email: normalized, subject, message, html, meta });

  return {
    ok: true,
    channel: "email",
    to: normalized,
    subject
  };
}

async function sendPush({ userId = "", title = "", message = "", meta = {} } = {}) {
  if (!ENABLE_PUSH) {
    logger.info("PUSH MOCK SEND", { userId, title, message, meta });
    return {
      ok: true,
      channel: "push",
      mock: true,
      to: userId,
      title
    };
  }

  // 실제 Push provider 연동 위치
  logger.info("PUSH SEND", { userId, title, message, meta });

  return {
    ok: true,
    channel: "push",
    to: userId,
    title
  };
}

async function sendKakao({ phone = "", templateCode = "", message = "", meta = {} } = {}) {
  const normalized = normalizePhone(콜);

  if (!ENABLE_KAKAO) {
    logger.info("KAKAO MOCK SEND", { phone: normalized, templateCode, message, meta });
    return {
      ok: true,
      channel: "kakao",
      mock: true,
      to: normalized,
      templateCode
    };
  }

  // 실제 Kakao provider 연동 위치
  logger.info("KAKAO SEND", { phone: normalized, templateCode, message, meta });

  return {
    ok: true,
    channel: "kakao",
    to: normalized,
    templateCode
  };
}

/* =====================================================
🔥 DISPATCHER
===================================================== */
async function dispatch(channel = DEFAULT_CHANNEL, payload = {}) {
  switch (channel) {
    case "sms":
      return sendSMS(payload);
    case "email":
      return sendEmail(payload);
    case "push":
      return sendPush(payload);
    case "kakao":
      return sendKakao(payload);
    case "system":
    default:
      return sendSystem(payload);
  }
}

/* =====================================================
🔥 CORE NOTIFY
===================================================== */
async function notify({
  channel = DEFAULT_CHANNEL,
  to = "",
  phone = "",
  email = "",
  userId = "",
  subject = "",
  title = "",
  message = "",
  html = "",
  templateKey = "",
  templateData = {},
  templateCode = "",
  retry = DEFAULT_RETRY,
  priority = DEFAULT_PRIORITY,
  useQueue = ENABLE_QUEUE,
  meta = {}
} = {}) {
  const finalMessage = templateKey
    ? renderTemplate(templateKey, templateData)
    : safeStr(message);

  const payload = {
    to,
    phone,
    email,
    userId,
    subject: safeStr(subject || title),
    title: safeStr(title || subject),
    message: finalMessage,
    html,
    templateCode: safeStr(templateCode),
    meta: meta && typeof meta === "object" ? meta : {}
  };

  if (useQueue && queue && typeof queue.addJob === "function") {
    try {
      queue.addJob(
        "notification",
        {
          channel,
          payload
        },
        {
          retry,
          priority
        }
      );

      NOTIFICATION_METRICS.queued += 1;
      addLog({
        type: "queued",
        channel,
        payload
      });

      return {
        ok: true,
        queued: true,
        channel,
        payload
      };
    } catch (err) {
      logger.warn("NOTIFICATION QUEUE FALLBACK", {
        channel,
        message: err.message
      });
    }
  }

  try {
    incMetric(channel);

    const result = await dispatch(channel, payload);

    NOTIFICATION_METRICS.sent += 1;

    addLog({
      type: "sent",
      channel,
      payload,
      result
    });

    return {
      ok: true,
      queued: false,
      channel,
      result
    };
  } catch (err) {
    NOTIFICATION_METRICS.failed += 1;

    addLog({
      type: "failed",
      channel,
      payload,
      error: err.message
    });

    logger.error("NOTIFICATION FAILED", {
      channel,
      message: err.message,
      payload
    });

    throw err;
  }
}

/* =====================================================
🔥 BATCH
===================================================== */
async function notifyBulk(list = [], options = {}) {
  const items = Array.isArray(list) ? list : [];
  const results = [];

  for (const item of items) {
    try {
      const result = await notify({
        ...item,
        ...options
      });
      results.push(result);
    } catch (err) {
      results.push({
        ok: false,
        error: err.message,
        item
      });
    }
  }

  return results;
}

/* =====================================================
🔥 PRESET: RESERVATION
===================================================== */
async function sendReservationCreated({
  phone = "",
  email = "",
  userId = "",
  shopName = "",
  reserveAt = "",
  people = 1,
  channel = "system",
  meta = {}
} = {}) {
  return notify({
    channel,
    phone,
    email,
    userId,
    templateKey: "reservation_created",
    templateData: { shopName, reserveAt, people },
    subject: "예약 완료",
    meta
  });
}

async function sendReservationCancelled({
  phone = "",
  email = "",
  userId = "",
  shopName = "",
  reserveAt = "",
  channel = "system",
  meta = {}
} = {}) {
  return notify({
    channel,
    phone,
    email,
    userId,
    templateKey: "reservation_cancelled",
    templateData: { shopName, reserveAt },
    subject: "예약 취소",
    meta
  });
}

async function sendReservationReminder({
  phone = "",
  email = "",
  userId = "",
  shopName = "",
  reserveAt = "",
  channel = "system",
  meta = {}
} = {}) {
  return notify({
    channel,
    phone,
    email,
    userId,
    templateKey: "reservation_reminder",
    templateData: { shopName, reserveAt },
    subject: "예약 알림",
    meta
  });
}

/* =====================================================
🔥 PRESET: PAYMENT
===================================================== */
async function sendPaymentPaid({
  phone = "",
  email = "",
  userId = "",
  amount = 0,
  orderId = "",
  channel = "system",
  meta = {}
} = {}) {
  return notify({
    channel,
    phone,
    email,
    userId,
    templateKey: "payment_paid",
    templateData: { amount: safeNum(amount), orderId },
    subject: "결제 완료",
    meta
  });
}

async function sendPaymentFailed({
  phone = "",
  email = "",
  userId = "",
  amount = 0,
  orderId = "",
  channel = "system",
  meta = {}
} = {}) {
  return notify({
    channel,
    phone,
    email,
    userId,
    templateKey: "payment_failed",
    templateData: { amount: safeNum(amount), orderId },
    subject: "결제 실패",
    meta
  });
}

async function sendPaymentRefunded({
  phone = "",
  email = "",
  userId = "",
  amount = 0,
  orderId = "",
  channel = "system",
  meta = {}
} = {}) {
  return notify({
    channel,
    phone,
    email,
    userId,
    templateKey: "payment_refunded",
    templateData: { amount: safeNum(amount), orderId },
    subject: "환불 완료",
    meta
  });
}

/* =====================================================
🔥 PRESET: ADMIN / SYSTEM
===================================================== */
async function sendAdminAlert({
  title = "",
  message = "",
  channel = "system",
  meta = {}
} = {}) {
  return notify({
    channel,
    title,
    subject: title,
    templateKey: "admin_alert",
    templateData: { title, message },
    meta
  });
}

async function sendSystemAlert({
  title = "",
  message = "",
  channel = "system",
  meta = {}
} = {}) {
  return notify({
    channel,
    title,
    subject: title,
    templateKey: "system_alert",
    templateData: { title, message },
    meta
  });
}

/* =====================================================
🔥 MULTI CHANNEL
===================================================== */
async function notifyMultiChannel({
  channels = [],
  payload = {}
} = {}) {
  const results = [];
  const list = Array.isArray(channels) ? channels : [];

  for (const channel of list) {
    try {
      const result = await notify({
        ...payload,
        channel
      });
      results.push(result);
    } catch (err) {
      results.push({
        ok: false,
        channel,
        error: err.message
      });
    }
  }

  return results;
}

/* =====================================================
🔥 LOG / METRICS
===================================================== */
function getLogs(limit = 100) {
  const n = Math.max(1, safeNum(limit, 100));
  return NOTIFICATION_LOGS.slice(-n);
}

function clearLogs() {
  NOTIFICATION_LOGS.length = 0;
  return true;
}

function getMetrics() {
  return {
    ...NOTIFICATION_METRICS,
    logSize: NOTIFICATION_LOGS.length
  };
}

function resetMetrics() {
  NOTIFICATION_METRICS.total = 0;
  NOTIFICATION_METRICS.sent = 0;
  NOTIFICATION_METRICS.failed = 0;
  NOTIFICATION_METRICS.queued = 0;
  NOTIFICATION_METRICS.sms = 0;
  NOTIFICATION_METRICS.email = 0;
  NOTIFICATION_METRICS.push = 0;
  NOTIFICATION_METRICS.kakao = 0;
  NOTIFICATION_METRICS.system = 0;
  return true;
}

/* =====================================================
🔥 TEMPLATE ADMIN
===================================================== */
function addTemplate(key, handler) {
  if (!safeStr(key) || typeof handler !== "function") return false;
  TEMPLATES[key] = handler;
  return true;
}

function getTemplateKeys() {
  return Object.keys(TEMPLATES);
}

/* =====================================================
🔥 HEALTH
===================================================== */
function getHealth() {
  return {
    ok: true,
    queueEnabled: !!(queue && ENABLE_QUEUE),
    smsEnabled: ENABLE_SMS,
    emailEnabled: ENABLE_EMAIL,
    pushEnabled: ENABLE_PUSH,
    kakaoEnabled: ENABLE_KAKAO,
    metrics: getMetrics()
  };
}

/* =====================================================
🔥 QUEUE WORKER AUTO REGISTER
===================================================== */
if (
  queue &&
  typeof queue.createQueue === "function" &&
  !global.__NOTIFICATION_QUEUE_WORKER__
) {
  global.__NOTIFICATION_QUEUE_WORKER__ = true;

  try {
    queue.createQueue(
      "notification",
      async (jobData) => {
        const { channel = DEFAULT_CHANNEL, payload = {} } = jobData || {};

        incMetric(channel);

        const result = await dispatch(channel, payload);

        NOTIFICATION_METRICS.sent += 1;

        addLog({
          type: "worker_sent",
          channel,
          payload,
          result
        });

        return result;
      },
      {
        concurrency: 3
      }
    );
  } catch (err) {
    logger.warn("NOTIFICATION QUEUE CREATE SKIPPED", {
      message: err.message
    });
  }
}

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
if (!global.__NOTIFICATION_SERVICE_CLEAN__) {
  global.__NOTIFICATION_SERVICE_CLEAN__ = true;

  setInterval(() => {
    try {
      if (NOTIFICATION_LOGS.length > MAX_LOGS) {
        NOTIFICATION_LOGS.splice(0, NOTIFICATION_LOGS.length - Math.floor(MAX_LOGS / 2));
      }
    } catch (_) {}
  }, 30000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 NOTIFICATION SERVICE READY");

module.exports = {
  // core
  notify,
  notifyBulk,
  notifyMultiChannel,

  // direct channels
  sendSystem,
  sendSMS,
  sendEmail,
  sendPush,
  sendKakao,

  // presets
  sendReservationCreated,
  sendReservationCancelled,
  sendReservationReminder,
  sendPaymentPaid,
  sendPaymentFailed,
  sendPaymentRefunded,
  sendAdminAlert,
  sendSystemAlert,

  // template
  renderTemplate,
  addTemplate,
  getTemplateKeys,

  // logs / metrics
  getLogs,
  clearLogs,
  getMetrics,
  resetMetrics,

  // health
  getHealth
};