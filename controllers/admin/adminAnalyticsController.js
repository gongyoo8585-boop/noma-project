"use strict";

/* =====================================================
🔥 ADMIN ANALYTICS CONTROLLER
===================================================== */

const revenuePredict = require("../../services/revenue.predict");
const churnPredict = require("../../services/churn.predict");
const abtest = require("../../services/abtest");
const analyticsService = require("../../services/analyticsService");

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
🔥 DASHBOARD SUMMARY
GET /admin/analytics/dashboard
===================================================== */
exports.dashboard = async (req, res) => {
  try {
    const revenue = await revenuePredict.totalForecast(7);
    const churn = await churnPredict.highRiskUsers(50);

    return ok(res, {
      revenue,
      churnCount: churn.length,
    });
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 REVENUE DETAIL
GET /admin/analytics/revenue
===================================================== */
exports.revenue = async (req, res) => {
  try {
    const days = Number(req.query.days || 30);

    const data = await revenuePredict.predict({ days });

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 CHURN USERS
GET /admin/analytics/churn
===================================================== */
exports.churn = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);

    const data = await churnPredict.predictBulk(limit);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 HIGH RISK USERS
GET /admin/analytics/churn/high-risk
===================================================== */
exports.highRisk = async (req, res) => {
  try {
    const data = await churnPredict.highRiskUsers(100);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 REGISTER AB TEST
POST /admin/analytics/ab
===================================================== */
exports.createAB = async (req, res) => {
  try {
    const { name, variants, weights } = req.body;

    if (!name) throw new Error("NAME_REQUIRED");

    abtest.register(name, { variants, weights });

    return ok(res, { created: true });
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 AB RESULT
GET /admin/analytics/ab/:name
===================================================== */
exports.abResult = async (req, res) => {
  try {
    const { name } = req.params;

    const data = abtest.getResult(name);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 AB WINNER
GET /admin/analytics/ab/:name/winner
===================================================== */
exports.abWinner = async (req, res) => {
  try {
    const { name } = req.params;

    const data = abtest.getWinner(name);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 SYSTEM EVENTS
GET /admin/analytics/events
===================================================== */
exports.events = async (req, res) => {
  try {
    const data = analyticsService.getLast?.() || [];

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};