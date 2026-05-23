"use strict";

/* =====================================================
🔥 EMAIL SERVICE
👉 이메일 발송 (SMTP 기반)
👉 템플릿 / 큐 / i18n / analytics 지원
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
let nodemailer = null;

try {
  nodemailer = require("nodemailer");
} catch (_) {
  console.warn("[email] nodemailer not installed");
}

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
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@example.com";

/* =====================================================
🔥 INIT TRANSPORT
===================================================== */
let transporter = null;

if (nodemailer && SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  console.warn("[email] SMTP not configured → console fallback");
}

/* =====================================================
🔥 TEMPLATE
===================================================== */
function buildTemplate({ title, message }) {
  return `
    <div style="font-family: Arial; padding:20px;">
      <h2>${title}</h2>
      <p>${message}</p>
      <hr/>
      <small>© Service</small>
    </div>
  `;
}

/* =====================================================
🔥 SERVICE
===================================================== */
class EmailService {
  constructor() {
    this.last = null;
  }

  /* =====================================================
  🔥 SEND EMAIL
  ===================================================== */
  async send({ to, subject, message, locale = "ko" }) {
    if (!to) throw new Error("EMAIL_REQUIRED");

    const title = i18nService
      ? i18nService.t(subject, locale)
      : subject;

    const html = buildTemplate({
      title,
      message,
    });

    const mail = {
      from: FROM_EMAIL,
      to,
      subject: title,
      html,
    };

    /* SMTP */
    if (transporter) {
      const res = await transporter.sendMail(mail);

      this.last = res;

      analyticsService?.track({
        type: "email_sent",
        payload: { to, subject },
      });

      return res;
    }

    /* fallback */
    console.log("[email fallback]", mail);

    return {
      fallback: true,
      mail,
    };
  }

  /* =====================================================
  🔥 SEND ASYNC
  ===================================================== */
  async sendAsync(data) {
    if (!queueService) {
      return this.send(data);
    }

    return queueService.add({
      type: "email",
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
      subject: "NOTIFICATION",
      message,
      locale,
    });
  }

  /* =====================================================
  🔥 VERIFY SMTP
  ===================================================== */
  async verify() {
    if (!transporter) return false;

    try {
      await transporter.verify();
      return true;
    } catch {
      return false;
    }
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

module.exports = new EmailService();