"use strict";

/**
 * =====================================================
 * 🔥 RESERVATION TRANSACTION ROUTES (FINAL COMPLETE)
 * ✔ 예약 생성 (락 + 트랜잭션)
 * ✔ 예약 취소
 * ✔ 상태 변경
 * ✔ 관리자 강제 취소
 * ✔ 인증 / 관리자 권한 포함
 * =====================================================
 */

const express = require("express");
const router = express.Router();

const controller = require("../controllers/reservation.transaction.controller");
const auth = require("../middlewares/auth");
const admin = require("../middlewares/admin");

/* =========================
🔥 사용자 (트랜잭션 기반)
========================= */

// 예약 생성 (락 + 트랜잭션)
router.post("/tx", auth, controller.create);

// 예약 취소 (트랜잭션)
router.post("/:id/cancel-tx", auth, controller.cancel);

/* =========================
🔥 관리자
========================= */

// 상태 변경 (트랜잭션)
router.patch("/:id/status-tx", auth, admin, controller.updateStatus);

// 관리자 강제 취소
router.delete("/:id/admin-cancel", auth, admin, controller.adminCancel);

/* ========================= */

module.exports = router;