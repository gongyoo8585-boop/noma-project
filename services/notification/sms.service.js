"use strict";

/* =====================================================
🔥 SMS SERVICE
👉 SMS 발송 (다중 provider 지원)
👉 queue / i18n / analytics 연동
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
let i18nService = null;

try { queueService = require("./queueService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { i18nService = require("./i18n"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const SMS_PROVIDER = process.env.SMS_PROVIDER || "console"; 
// console | twilio | aligo

/* 🔥 TWILIO */
const TWILIO_SID = process.env.TWILIO_SID || "";
const TWILIO_TOKEN = process.env.TWILIO_TOKEN || "";
const TWILIO_FROM = process.env.TWILIO_FROM || "";

/* 🔥 ALIGO */
const ALIGO_API_KEY = process.env.ALIGO_API_KEY || "";
const ALIGO_USER_ID = process.env.ALIGO_USER_ID || "";
const ALIGO_SENDER = process.env.ALIGO_SENDER || "";

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* =====================================================
🔥 PROVIDERS
===================================================== */

/* =========================
🔥 TWILIO
========================= */
async function sendTwilio({ to, message }) {
  assert(TWILIO_SID, "TWILIO_SID_MISSING");

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;

  const res = await axios.post(
    url,
    new URLSearchParams({
      To: to,
      From: TWILIO_FROM,
      Body: message,
    }),
    {
      auth: {
        username: TWILIO_SID,
        password: TWILIO_TOKEN,
      },
    }
  );

  return res.data;
}

/* =========================
🔥 ALIGO (국내 SMS)
========================= */
async function sendAligo({ to, message }) {
  assert(ALIGO_API_KEY, "ALIGO_API_KEY_MISSING");

  const res = await axios.post(
    "https://apis.aligo.in/send/",
    new URLSearchParams({
      key: ALIGO_API_KEY,
      user_id: ALIGO_USER_ID,
      sender: ALIGO_SENDER,
      receiver: to,
      msg: message,
    })
  );

  return res.data;
}

/* =====================================================
🔥 SERVICE
===================================================== */
class SMSService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 SEND
  ===================================================== */
  async send({ to, message, locale = "ko" }) {
    assert(to, "PHONE_REQUIRED");
    assert(message, "MESSAGE_REQUIRED");

    const text = i18nService
      ? i18nService.t(message, locale)
      : message;

    let result = null;

    try {
      switch (SMS_PROVIDER) {
        case "twilio":
          result = await sendTwilio({ to, message: text });
          break;

        case "aligo":
          result = await sendAligo({ to, message: text });
          break;

        default:
          console.log("[sms fallback]", { to, message: text });
          result = { fallback: true };
      }

      this.last = result;

      analyticsService?.track({
        type: "sms_sent",
        payload: { to },
      });

      return result;
    } catch (err) {
      console.error("[sms error]", err.message);

      analyticsService?.track({
        type: "sms_fail",
        payload: { to, error: err.message },
      });

      throw err;
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
      type: "sms",
      payload: data,
      handler: async (payload) => this.send(payload),
    });
  }

  /* =====================================================
  🔥 BULK SEND
  ===================================================== */
  async sendBulk(list = []) {
    const results = [];

    for (const item of list) {
      try {
        const res = await this.send(item);
        results.push({ success: true, res });
      } catch (err) {
        results.push({ success: false, error: err.message });
      }
    }

    return results;
  }

  /* =====================================================
  🔥 TEMPLATE SEND
  ===================================================== */
  async sendTemplate({ to, template, data = {}, locale }) {
    let message = template;

    for (const key in data) {
      message = message.replace(`{${key}}`, data[key]);
    }

    return this.send({
      to,
      message,
      locale,
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

module.exports = new SMSService();