"use strict";

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path, fallback = {}) {
  try {
    return require(path);
  } catch (err) {
    console.warn("[payment/utils] require fail:", path);
    return fallback;
  }
}

/* =====================================================
🔥 LOAD UTILS
===================================================== */
const helper = safeRequire("./payment.helper");
const format = safeRequire("./payment.format");
const validate = safeRequire("./payment.validate");

/* =====================================================
🔥 MERGE EXPORTS
===================================================== */
module.exports = {
  ...helper,
  ...format,
  ...validate,
};