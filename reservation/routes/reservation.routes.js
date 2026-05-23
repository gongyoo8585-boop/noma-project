"use strict";

const express = require("express");
const router = express.Router();

const controller = require("../controllers/reservation.controller");
const auth = require("../../middlewares/auth");

/* =====================================================
🔥 USER ROUTES
===================================================== */

// 예약 생성
router.post("/", ...controller.create);

// 내 예약 리스트
router.get("/me", ...controller.myList);

// 예약 상세
router.get("/:id", ...controller.getOne);

// 예약 취소
router.delete("/:id", ...controller.cancel);

// 예약 변경
router.put("/:id/reschedule", ...controller.reschedule);

// 체크인 / 체크아웃
router.post("/:id/checkin", ...controller.checkIn);
router.post("/:id/checkout", ...controller.checkOut);

/* =====================================================
🔥 ADMIN ROUTES
===================================================== */

// 예약 확정
router.post("/:id/confirm", ...controller.confirm);

// 관리자 리스트
router.get("/admin/list", ...controller.adminList);

// 대량 처리
router.post("/admin/bulk-cancel", ...controller.bulkCancel);
router.post("/admin/bulk-confirm", ...controller.bulkConfirm);

/* =====================================================
🔥 ANALYTICS
===================================================== */

router.get("/analytics/daily", controller.dailyStats);
router.get("/analytics/top-shops", controller.topShops);
router.get("/analytics/heatmap", controller.heatmap);

/* =====================================================
🔥 HEALTH CHECK
===================================================== */

router.get("/health/ping", (req, res) => {
  res.json({ ok: true, message: "reservation route alive" });
});

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 reservation.routes READY");

module.exports = router;