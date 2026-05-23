"use strict";

const reservationService = require("../../reservation/services/reservation.service");
const auth = require("../../middlewares/auth");

/* =====================================================
🔥 RESPONSE UTILS (표준화 + 코드 추가)
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({ ok: true, message, data });
}

function fail(res, message = "ERROR", code = 400, errorCode = "GENERIC_ERROR") {
  return res.status(code).json({
    ok: false,
    message,
    errorCode
  });
}

/* =====================================================
🔥 SAFE WRAPPER (에러 안정화)
===================================================== */
function safe(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      return fail(res, e.message || "SERVER_ERROR", 500);
    }
  };
}

/* =====================================================
🔥 CREATE
===================================================== */
exports.create = [
  auth,
  safe(async (req, res) => {
    const userId = auth.getUserId(req);

    const reservation = await reservationService.createReservation({
      userId,
      ...req.body
    });

    return ok(res, reservation, "예약 완료");
  })
];

/* =====================================================
🔥 CANCEL
===================================================== */
exports.cancel = [
  auth,
  safe(async (req, res) => {
    const userId = auth.getUserId(req);

    await reservationService.cancelReservation({
      reservationId: req.params.id,
      userId,
      isAdmin: auth.isAdmin(req)
    });

    return ok(res, true, "취소 완료");
  })
];

/* =====================================================
🔥 CONFIRM (ADMIN)
===================================================== */
exports.confirm = [
  auth,
  safe(async (req, res) => {
    if (!auth.isAdmin(req)) {
      return fail(res, "관리자만", 403, "ADMIN_ONLY");
    }

    const result = await reservationService.confirmReservation({
      reservationId: req.params.id,
      adminId: auth.getUserId(req)
    });

    return ok(res, result, "확정 완료");
  })
];

/* =====================================================
🔥 RESCHEDULE
===================================================== */
exports.reschedule = [
  auth,
  safe(async (req, res) => {
    const userId = auth.getUserId(req);

    await reservationService.rescheduleReservation({
      reservationId: req.params.id,
      userId,
      newTime: req.body.newTime
    });

    return ok(res, true, "예약 변경 완료");
  })
];

/* =====================================================
🔥 CHECKIN / CHECKOUT
===================================================== */
exports.checkIn = [
  auth,
  safe(async (req, res) => {
    await reservationService.checkIn(req.params.id);
    return ok(res, true, "체크인 완료");
  })
];

exports.checkOut = [
  auth,
  safe(async (req, res) => {
    await reservationService.checkOut(req.params.id);
    return ok(res, true, "체크아웃 완료");
  })
];

/* =====================================================
🔥 LIST
===================================================== */
exports.myList = [
  auth,
  safe(async (req, res) => {
    const userId = auth.getUserId(req);
    const list = await reservationService.getUserReservations(userId);
    return ok(res, list);
  })
];

exports.getOne = [
  auth,
  safe(async (req, res) => {
    const result = await reservationService.getReservationById(
      req.params.id,
      auth.getUserId(req),
      auth.isAdmin(req)
    );

    return ok(res, result);
  })
];

/* =====================================================
🔥 ADMIN LIST
===================================================== */
exports.adminList = [
  auth,
  safe(async (req, res) => {
    if (!auth.isAdmin(req)) {
      return fail(res, "관리자만", 403, "ADMIN_ONLY");
    }

    const result = await reservationService.getAdminReservations({
      status: req.query.status,
      limit: req.query.limit
    });

    return ok(res, result);
  })
];

/* =====================================================
🔥 BULK
===================================================== */
exports.bulkCancel = [
  auth,
  safe(async (req, res) => {
    if (!auth.isAdmin(req)) {
      return fail(res, "관리자만", 403);
    }

    await reservationService.bulkCancel(req.body.ids || []);
    return ok(res, true, "대량 취소 완료");
  })
];

exports.bulkConfirm = [
  auth,
  safe(async (req, res) => {
    if (!auth.isAdmin(req)) {
      return fail(res, "관리자만", 403);
    }

    await reservationService.bulkConfirm(req.body.ids || []);
    return ok(res, true, "대량 확정 완료");
  })
];

/* =====================================================
🔥 ANALYTICS (확장)
===================================================== */
exports.dailyStats = safe(async (req, res) => {
  const data = await reservationService.getDailyStats();
  return ok(res, data);
});

exports.topShops = safe(async (req, res) => {
  const data = await reservationService.getTopShops();
  return ok(res, data);
});

exports.heatmap = safe(async (req, res) => {
  const data = await reservationService.getHeatmap();
  return ok(res, data);
});

/* =====================================================
🔥 추가 기능 (100개 확장 기반 일부)
===================================================== */

// 예약 상태 조회
exports.getStatus = [
  auth,
  safe(async (req, res) => {
    const r = await reservationService.getReservationById(
      req.params.id,
      auth.getUserId(req),
      auth.isAdmin(req)
    );

    return ok(res, { status: r.status });
  })
];

// 사용자 예약 카운트
exports.getMyCount = [
  auth,
  safe(async (req, res) => {
    const list = await reservationService.getUserReservations(auth.getUserId(req));
    return ok(res, { count: list.length });
  })
];

// 관리자 강제 취소
exports.forceCancel = [
  auth,
  safe(async (req, res) => {
    if (!auth.isAdmin(req)) return fail(res, "관리자만", 403);

    await reservationService.cancelReservation({
      reservationId: req.params.id,
      userId: null,
      isAdmin: true
    });

    return ok(res, true, "강제 취소 완료");
  })
];

/* =====================================================
🔥 HEALTH
===================================================== */
exports.ping = (req, res) => {
  res.json({
    ok: true,
    message: "reservation controller alive",
    time: new Date()
  });
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 reservationController FINAL MASTER READY");

module.exports = exports;