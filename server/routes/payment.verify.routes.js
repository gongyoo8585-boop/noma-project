"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT VERIFY ROUTES (ULTRA FINAL)
 * ✔ 결제 검증 (핵심 보안)
 * ✔ 관리자 검증
 * ✔ 재검증 / 강제검증 / 위변조 체크 강화
 * ✔ 로그 추적
 * ✔ 인증 / 관리자 권한 적용
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

const express = require("express");
const router = express.Router();

const controller = require("../controllers/payment.verify.controller");
const auth = require("../middlewares/auth");
const admin = require("../middlewares/admin");

/* =========================
🔥 사용자 결제 검증
========================= */

// 결제 검증 (카카오 승인 후)
router.post("/verify", auth, controller.verify);

/* =========================
🔥 관리자 검증
========================= */

// 결제 상태 재검증 (관리자)
router.post("/verify/admin", auth, admin, controller.adminVerify);

/* =========================
🔥 신규 기능
========================= */

// 단건 결제 상태 조회 검증
router.get("/verify/:id", auth, controller.getVerifyStatus);

// 관리자 강제 검증 (비정상 결제 대응)
router.post("/verify/admin/force", auth, admin, controller.forceVerify);

// 결제 위변조 검사
router.post("/verify/integrity", auth, controller.verifyIntegrity);

// 관리자 전체 검증 로그 조회
router.get("/verify/admin/logs", auth, admin, controller.getVerifyLogs);

/* ========================= */

module.exports = router;