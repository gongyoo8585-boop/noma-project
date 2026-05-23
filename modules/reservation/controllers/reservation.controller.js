"use strict";

// modules/reservation/controllers/reservation.controller.js

const reservationService = require("../services/reservation.service");

/* =====================================================
🔥 COMMON
===================================================== */
function fail(res, message, code = 400) {
  return res.status(code).json({
    ok: false,
    message,
  });
}

function success(res, data, message = "OK") {
  return res.json({
    ok: true,
    message,
    data,
  });
}

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

/* =====================================================
🔥 CONTROLLER
===================================================== */
class ReservationController {

  /* ============================================
  🔥 예약 생성
  ============================================ */
  async createReservation(req, res) {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return fail(res, "UNAUTHORIZED", 401);
      }

      const reservation = await reservationService.createReservation({
        ...req.body,
        userId,
      });

      return success(res, reservation, "RESERVATION_CREATED");

    } catch (err) {
      console.error("createReservation error:", err.message);
      return fail(res, err.message || "SERVER_ERROR", 500);
    }
  }

  /* ============================================
  🔥 내 예약 목록
  ============================================ */
  async getMyReservations(req, res) {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return fail(res, "UNAUTHORIZED", 401);
      }

      let { limit, skip, status } = req.query;

      // 🔥 숫자 보정
      limit = Number(limit) || 20;
      skip = Number(skip) || 0;

      const list = await reservationService.getUserReservations(userId, {
        limit,
        skip,
        status,
      });

      return res.json({
        ok: true,
        message: "RESERVATION_LIST",
        data: {
          items: list,
          count: list.length,
        },
      });

    } catch (err) {
      console.error("getMyReservations error:", err.message);
      return fail(res, "SERVER_ERROR", 500);
    }
  }

  /* ============================================
  🔥 단건 조회
  ============================================ */
  async getReservation(req, res) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      const reservation = await reservationService.getReservationById(id);

      // 🔥 소유자 보호
      if (userId && String(reservation.userId) !== String(userId)) {
        return fail(res, "FORBIDDEN", 403);
      }

      return success(res, reservation, "RESERVATION_DETAIL");

    } catch (err) {
      console.error("getReservation error:", err.message);
      return fail(res, err.message || "NOT_FOUND", 404);
    }
  }

  /* ============================================
  🔥 예약 취소
  ============================================ */
  async cancelReservation(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = getUserId(req);

      const reservation = await reservationService.getReservationById(id);

      if (String(reservation.userId) !== String(userId)) {
        return fail(res, "FORBIDDEN", 403);
      }

      const result = await reservationService.cancelReservation(id, reason);

      return success(res, result, "RESERVATION_CANCELLED");

    } catch (err) {
      console.error("cancelReservation error:", err.message);
      return fail(res, err.message || "SERVER_ERROR", 500);
    }
  }

  /* ============================================
  🔥 예약 확정 (관리자/샵)
  ============================================ */
  async confirmReservation(req, res) {
    try {
      const { id } = req.params;

      const reservation = await reservationService.confirmReservation(id);

      return success(res, reservation, "RESERVATION_CONFIRMED");

    } catch (err) {
      console.error("confirmReservation error:", err.message);
      return fail(res, err.message || "SERVER_ERROR", 500);
    }
  }

  /* ============================================
  🔥 예약 완료
  ============================================ */
  async completeReservation(req, res) {
    try {
      const { id } = req.params;

      const reservation = await reservationService.completeReservation(id);

      return success(res, reservation, "RESERVATION_COMPLETED");

    } catch (err) {
      console.error("completeReservation error:", err.message);
      return fail(res, err.message || "SERVER_ERROR", 500);
    }
  }

  /* ============================================
  🔥 환불
  ============================================ */
  async refundReservation(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = getUserId(req);

      const reservation = await reservationService.getReservationById(id);

      if (String(reservation.userId) !== String(userId)) {
        return fail(res, "FORBIDDEN", 403);
      }

      const result = await reservationService.refundReservation(id, reason);

      return success(res, result, "RESERVATION_REFUNDED");

    } catch (err) {
      console.error("refundReservation error:", err.message);
      return fail(res, err.message || "SERVER_ERROR", 500);
    }
  }
}

module.exports = new ReservationController();