"use strict";

/**
 * =====================================================
 * 🔥 MODEL INDEX (ULTRA FINAL SAFE VERSION)
 * ✔ mongoose model 중복 등록 방지
 * ✔ require 실패 방어
 * ✔ 기존 구조 영향 없음
 * ✔ populate model name 안정화
 * ✔ Review populate 500 방지 대응
 * =====================================================
 */

const mongoose = require("mongoose");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.error("MODEL REQUIRE FAIL:", path, e.message);
    return null;
  }
}

/* =====================================================
🔥 MODELS
===================================================== */
const User = safeRequire("./User");
const Shop = safeRequire("./Shop");
const Reservation = safeRequire("./Reservation");
const Payment = safeRequire("./Payment");
const Review = safeRequire("./Review");

/* =====================================================
🔥 mongoose model 강제 등록 안정화
===================================================== */

/* USER */
if (User && !mongoose.models.User) {
  mongoose.model("User", User.schema);
}

/* SHOP */
if (Shop && !mongoose.models.Shop) {
  mongoose.model("Shop", Shop.schema);
}

/* RESERVATION */
if (Reservation && !mongoose.models.Reservation) {
  mongoose.model("Reservation", Reservation.schema);
}

/* PAYMENT */
if (Payment && !mongoose.models.Payment) {
  mongoose.model("Payment", Payment.schema);
}

/* REVIEW */
if (Review && !mongoose.models.Review) {
  mongoose.model("Review", Review.schema);
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  User,
  Shop,
  Reservation,
  Payment,
  Review,
};

/* =====================================================
🔥 DEBUG
===================================================== */
console.log("✅ MODELS LOADED:", {
  User: !!User,
  Shop: !!Shop,
  Reservation: !!Reservation,
  Payment: !!Payment,
  Review: !!Review,
});