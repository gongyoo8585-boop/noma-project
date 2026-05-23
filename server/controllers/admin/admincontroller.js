"use strict";

/**
 * =====================================================
 * 🔥 ADMIN CONTROLLER (LOWERCASE FIXED)
 * =====================================================
 */

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn(`[SAFE REQUIRE FAIL] ${path}`);
    return null;
  }
}

/* =========================
MODELS
========================= */
const user = safeRequire("../../models/User");
const reservation = safeRequire("../../models/Reservation");
const payment = safeRequire("../../models/Payment");
const review = safeRequire("../../models/Review");
const shop = safeRequire("../../models/Shop");

/* 🔥 최소 추가 */
const report =
  safeRequire("../../models/Report") ||
  safeRequire("../../models/report");

/* =========================
UTIL
========================= */
function safeNumber(val) {
  return Number(val) || 0;
}

/* =====================================================
🔥 DASHBOARD
===================================================== */
exports.getDashboard = async (req, res) => {
  try {
    const [
      userCount,
      reservationCount,
      paymentList,
      reviewCount,
      shopCount,
    ] = await Promise.all([
      user?.countDocuments ? user.countDocuments() : 0,
      reservation?.countDocuments ? reservation.countDocuments() : 0,
      payment?.find ? payment.find({}) : [],
      review?.countDocuments ? review.countDocuments() : 0,
      shop?.countDocuments ? shop.countDocuments() : 0,
    ]);

    const totalRevenue = Array.isArray(paymentList)
      ? paymentList.reduce((sum, p) => sum + safeNumber(p.amount), 0)
      : 0;

    const recentUsers = user?.find
      ? await user.find().sort({ createdAt: -1 }).limit(5)
      : [];

    const recentReservations = reservation?.find
      ? await reservation.find().sort({ createdAt: -1 }).limit(5)
      : [];

    const recentShops = shop?.find
      ? await shop.find().sort({ createdAt: -1 }).limit(5)
      : [];

    return res.json({
      ok: true,
      summary: {
        totalUsers: userCount || 0,
        totalReservations: reservationCount || 0,
        totalPayments: Array.isArray(paymentList) ? paymentList.length : 0,
        totalRevenue,
        totalShops: shopCount || 0,
      },
      recent: {
        users: recentUsers || [],
        reservations: recentReservations || [],
        shops: recentShops || [],
      },
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "ADMIN_DASHBOARD_ERROR",
      error: e.message,
    });
  }
};

/* =====================================================
🔥 STATS (ROUTES 호환)
===================================================== */
exports.getStats = async (req, res) => {
  try {
    const total = user?.countDocuments
      ? await user.countDocuments()
      : 0;

    const recent = user?.find
      ? await user.find().sort({ createdAt: -1 }).limit(5)
      : [];

    const shops = shop?.countDocuments
      ? await shop.countDocuments()
      : 0;

    /* 🔥 최소 추가: express route 대응 */
    if (res && typeof res.json === "function") {
      return res.json({
        ok: true,
        total,
        recent,
        shops,
      });
    }

    return {
      total,
      recent,
      shops,
    };

  } catch (e) {

    /* 🔥 최소 추가 */
    if (res && typeof res.status === "function") {
      return res.status(500).json({
        ok: false,
        msg: "ADMIN_STATS_ERROR",
        error: e.message,
      });
    }

    return {
      total: 0,
      recent: [],
      shops: 0,
    };
  }
};

/* =====================================================
🔥 USERS
===================================================== */
exports.getUserList = async (req, res) => {
  try {
    if (!user?.find) {
      return res.status(500).json({ ok: false, msg: "USER_MODEL_ERROR" });
    }

    const list = await user.find().sort({ createdAt: -1 });

    return res.json({
      ok: true,
      data: list || [],
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "USER_LIST_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가: routes 호환 (getList alias) */
exports.getList = exports.getUserList;

/* =====================================================
🔥 최소 추가: 사용자 상세
===================================================== */
exports.getDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!user?.findById) {
      return res.status(500).json({
        ok: false,
        msg: "USER_MODEL_ERROR",
      });
    }

    const item = await user.findById(id);

    if (!item) {
      return res.status(404).json({
        ok: false,
        msg: "USER_NOT_FOUND",
      });
    }

    return res.json({
      ok: true,
      data: item,
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "USER_DETAIL_ERROR",
      error: e.message,
    });
  }
};

/* =====================================================
🔥 최소 추가: 권한 변경
===================================================== */
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!user?.findByIdAndUpdate) {
      return res.status(500).json({
        ok: false,
        msg: "USER_MODEL_ERROR",
      });
    }

    await user.findByIdAndUpdate(id, {
      role: role || "user",
    });

    return res.json({
      ok: true,
      msg: "ROLE_UPDATED",
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "ROLE_UPDATE_ERROR",
      error: e.message,
    });
  }
};

/* =====================================================
🔥 최소 추가: 차단 처리
===================================================== */
exports.block = async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body || {};

    if (!user?.findByIdAndUpdate) {
      return res.status(500).json({
        ok: false,
        msg: "USER_MODEL_ERROR",
      });
    }

    await user.findByIdAndUpdate(id, {
      blocked: !!blocked,
      status: blocked ? "blocked" : "active",
    });

    return res.json({
      ok: true,
      msg: blocked ? "USER_BLOCKED" : "USER_UNBLOCKED",
    });

  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "USER_BLOCK_ERROR",
      error: e.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!user?.findByIdAndDelete) {
      return res.status(500).json({ ok: false, msg: "USER_MODEL_ERROR" });
    }

    await user.findByIdAndDelete(id);

    return res.json({
      ok: true,
      msg: "USER_DELETED",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "USER_DELETE_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가: routes 호환 (remove alias) */
exports.remove = exports.deleteUser;

/* =====================================================
🔥 RESERVATIONS
===================================================== */
exports.getReservationList = async (req, res) => {
  try {
    if (!reservation?.find) {
      return res.status(500).json({ ok: false, msg: "RESERVATION_MODEL_ERROR" });
    }

    const list = await reservation.find().sort({ createdAt: -1 });

    return res.json({
      ok: true,
      data: list || [],
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "RESERVATION_LIST_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가: routes 호환 */
exports.getAdminReservationList = exports.getReservationList;

exports.cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!reservation?.findByIdAndUpdate) {
      return res.status(500).json({ ok: false, msg: "RESERVATION_MODEL_ERROR" });
    }

    await reservation.findByIdAndUpdate(id, {
      status: "cancelled",
    });

    return res.json({
      ok: true,
      msg: "RESERVATION_CANCELLED",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "RESERVATION_CANCEL_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가: routes 호환 */
exports.cancel = exports.cancelReservation;

/* =====================================================
🔥 PAYMENTS
===================================================== */
exports.getPaymentList = async (req, res) => {
  try {
    if (!payment?.find) {
      return res.status(500).json({ ok: false, msg: "PAYMENT_MODEL_ERROR" });
    }

    const list = await payment.find().sort({ createdAt: -1 });

    return res.json({
      ok: true,
      data: list || [],
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "PAYMENT_LIST_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가: routes 호환 */
exports.getAdminPaymentList = exports.getPaymentList;

exports.refundPayment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!payment?.findByIdAndUpdate) {
      return res.status(500).json({ ok: false, msg: "PAYMENT_MODEL_ERROR" });
    }

    await payment.findByIdAndUpdate(id, {
      status: "refunded",
    });

    return res.json({
      ok: true,
      msg: "PAYMENT_REFUNDED",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "PAYMENT_REFUND_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가: routes 호환 */
exports.refund = exports.refundPayment;

/* =====================================================
🔥 REVIEWS
===================================================== */
exports.getReviewList = async (req, res) => {
  try {
    if (!review?.find) {
      return res.status(500).json({ ok: false, msg: "REVIEW_MODEL_ERROR" });
    }

    const list = await review.find().sort({ createdAt: -1 });

    return res.json({
      ok: true,
      data: list || [],
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "REVIEW_LIST_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가: routes 호환 */
exports.getAdminReviewList = exports.getReviewList;

exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!review?.findByIdAndDelete) {
      return res.status(500).json({ ok: false, msg: "REVIEW_MODEL_ERROR" });
    }

    await review.findByIdAndDelete(id);

    return res.json({
      ok: true,
      msg: "REVIEW_DELETED",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "REVIEW_DELETE_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가: routes 호환 */
exports.adminRemove = exports.deleteReview;

/* =====================================================
🔥 REPORTS
===================================================== */
exports.getReportList = async (req, res) => {
  try {
    if (!report?.find) {
      return res.json({
        ok: true,
        data: [],
      });
    }

    const list = await report.find().sort({ createdAt: -1 });

    return res.json({
      ok: true,
      data: list || [],
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "REPORT_LIST_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가 */
exports.getAdminReportList = exports.getReportList;

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    if (!report?.findByIdAndDelete) {
      return res.status(500).json({
        ok: false,
        msg: "REPORT_MODEL_ERROR",
      });
    }

    await report.findByIdAndDelete(id);

    return res.json({
      ok: true,
      msg: "REPORT_DELETED",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      msg: "REPORT_DELETE_ERROR",
      error: e.message,
    });
  }
};

/* 🔥 최소 추가 */
exports.removeReport = exports.deleteReport;