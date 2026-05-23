"use strict";

/* =====================================================
🔥 XSS MIDDLEWARE
👉 XSS 공격 방어 (sanitize + escape)
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let logger = null;
let analyticsService = null;

try { logger = require("../services/logger.elk"); } catch (_) {}
try { analyticsService = require("../services/analyticsService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function isMalicious(str = "") {
  const patterns = [
    /<script/i,
    /javascript:/i,
    /onerror/i,
    /onload/i,
    /<iframe/i,
    /<img/i,
  ];

  return patterns.some(p => p.test(str));
}

/* =====================================================
🔥 SANITIZE OBJECT (RECURSIVE)
===================================================== */
function sanitize(obj) {
  if (!obj) return obj;

  if (typeof obj === "string") {
    if (isMalicious(obj)) {
      return escapeHTML(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item));
  }

  if (typeof obj === "object") {
    const clean = {};
    for (const key in obj) {
      clean[key] = sanitize(obj[key]);
    }
    return clean;
  }

  return obj;
}

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
function xss() {
  return (req, res, next) => {
    try {
      const original = {
        body: JSON.stringify(req.body || {}),
        query: JSON.stringify(req.query || {}),
        params: JSON.stringify(req.params || {}),
      };

      /* sanitize */
      req.body = sanitize(req.body);
      req.query = sanitize(req.query);
      req.params = sanitize(req.params);

      /* detect attack */
      const combined = JSON.stringify(req.body) +
                       JSON.stringify(req.query) +
                       JSON.stringify(req.params);

      if (isMalicious(combined)) {
        logger?.warn("xss_detected", {
          ip: req.ip,
        });

        analyticsService?.track({
          type: "xss_attempt",
          payload: { ip: req.ip },
        });
      }

      next();
    } catch (err) {
      logger?.error("xss_error", {
        message: err.message,
      });

      return res.status(500).json({
        success: false,
        message: "XSS_ERROR",
      });
    }
  };
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = xss;