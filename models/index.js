"use strict";

/* =====================================================
🔥 MODELS SAFE INDEX (NON-BREAKING)
👉 기존 구조 절대 변경 없음
👉 require 통합만 제공
👉 없어도 동작 / 있으면 더 강력
===================================================== */

function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn("MODEL LOAD FAIL:", path);
    return null;
  }
}

/* =====================================================
🔥 LOAD MODELS (있는 것만)
===================================================== */
const User = safeRequire("./User");
const Shop = safeRequire("./Shop");
const Reservation = safeRequire("./Reservation");
const Payment = safeRequire("./Payment");
const Review = safeRequire("./Review");
const Post = safeRequire("./Post");
const Point = safeRequire("./Point");

/* =====================================================
🔥 EXPORT SAFE OBJECT
===================================================== */
module.exports = {
  User,
  Shop,
  Reservation,
  Payment,
  Review,
  Post,
  Point
};

/* =====================================================
🔥 EXTRA: VALIDATION (추가 기능)
===================================================== */
module.exports.isLoaded = function (name) {
  return !!module.exports[name];
};

module.exports.getLoadedModels = function () {
  return Object.keys(module.exports).filter(
    (k) => typeof module.exports[k] === "function"
  );
};

/* =====================================================
🔥 DEBUG
===================================================== */
console.log("🔥 MODEL INDEX SAFE READY");