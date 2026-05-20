"use strict";

/* =====================================================
🔥 ADVANCED RESERVATION CONTROLLER
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const reservationService = require("../services/advancedReservationService");
const analyticsService = require("../services/analyticsService");

/* WebSocket (optional) */
let ws = null;
try { ws = require("../websocket/wsServer"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function ok(res, data = {}) {
  return res.json({ success: true, data });
}

function fail(res, err) {
  return res.status(400).json({
    success: false,
    message: err.message,
  });
}

/* =====================================================
🔥 CREATE RESERVATION
POST /reservation
===================================================== */
exports.create = async (req, res) => {
  try {
    const userId = req.user?.id;

    const data = await reservationService.create({
      ...req.body,
      userId,
    });

    /* analytics */
    analyticsService?.track({
      type: "reservation_create",
      userId,
    });

    /* websocket */
    ws?.emitToUser?.(userId, "reservation:create", data);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 UPDATE RESERVATION
PUT /reservation/:id
===================================================== */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await reservationService.update(id, req.body);

    ws?.emitToReservation?.(id, "reservation:update", data);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 CANCEL RESERVATION
DELETE /reservation/:id
===================================================== */
exports.cancel = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await reservationService.cancel(id);

    ws?.emitToReservation?.(id, "reservation:cancel", data);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 GET RESERVATION
GET /reservation/:id
===================================================== */
exports.get = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await reservationService.get(id);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 USER RESERVATIONS
GET /reservation/my
===================================================== */
exports.my = async (req, res) => {
  try {
    const userId = req.user?.id;

    const data = await reservationService.getByUser(userId);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 AVAILABLE SLOTS
GET /reservation/slots
===================================================== */
exports.slots = async (req, res) => {
  try {
    const data = await reservationService.getAvailableSlots(req.query);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 SMART RECOMMEND SLOT
GET /reservation/recommend
===================================================== */
exports.recommend = async (req, res) => {
  try {
    const userId = req.user?.id;

    const data = await reservationService.recommend({
      userId,
      ...req.query,
    });

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 CONFLICT CHECK
POST /reservation/check
===================================================== */
exports.check = async (req, res) => {
  try {
    const data = await reservationService.checkConflict(req.body);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 ADMIN: ALL RESERVATIONS
GET /reservation/admin
===================================================== */
exports.adminList = async (req, res) => {
  try {
    const data = await reservationService.getAll(req.query);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};