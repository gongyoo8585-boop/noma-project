"use strict";

/* =====================================================
🔥 PAYMENT MODULE ENTRY (FINAL)
👉 모든 payment 기능 연결
👉 안전 require + fallback
👉 구조 유지 + 확장 가능
===================================================== */

function safeRequire(path, fallback = null) {
  try {
    return require(path);
  } catch (e) {
    console.warn("❌ PAYMENT REQUIRE FAIL:", path);
    return fallback;
  }
}

/* =====================================================
🔥 CORE IMPORT
===================================================== */
const routes = safeRequire("./routes/payment.routes");
const service = safeRequire("./services/payment.service");
const kakao = safeRequire("./services/pg.kakao");
const toss = safeRequire("./services/pg.toss");

/* =====================================================
🔥 OPTIONAL MODULES (있으면 자동 연결)
===================================================== */
const subscription = safeRequire("./services/subscription.service");
const receipt = safeRequire("./services/receipt.service");

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  routes,
  service,
  pg: {
    kakao,
    toss
  },
  subscription,
  receipt
};