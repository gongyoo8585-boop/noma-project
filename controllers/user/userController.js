"use strict";

/* =====================================================
🔥 USER CONTROLLER
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let userService = null;
let authSecurity = null;
let analyticsService = null;

try { userService = require("../services/userService"); } catch (_) {}
try { authSecurity = require("../services/auth.security"); } catch (_) {}
try { analyticsService = require("../services/analyticsService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function ok(res, data = {}, message = "OK") {
  return res.json({
    ok: true,
    message,
    data,
  });
}

function fail(res, err, code = 400) {
  return res.status(code).json({
    ok: false,
    message: err.message || err || "ERROR",
  });
}

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

/* =====================================================
🔥 REGISTER
POST /user/register
===================================================== */
exports.register = async (req, res) => {
  try {
    const data = await userService.register(req.body);

    analyticsService?.track({
      type: "user_register",
      userId: data?.id,
    });

    return ok(res, data, "REGISTER_SUCCESS");
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 LOGIN
POST /user/login
===================================================== */
exports.login = async (req, res) => {
  try {
    const { user, token } = await userService.login(req.body);

    analyticsService?.track({
      type: "user_login",
      userId: user?.id,
    });

    return ok(res, {
      user,
      token,
    }, "LOGIN_SUCCESS");
  } catch (err) {
    return fail(res, err, 401);
  }
};

/* =====================================================
🔥 LOGOUT
POST /user/logout
===================================================== */
exports.logout = async (req, res) => {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") || null;

    if (token && authSecurity?.revokeToken) {
      authSecurity.revokeToken(token);
    }

    return ok(res, true, "LOGOUT_SUCCESS");
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 ME
GET /user/me
===================================================== */
exports.me = async (req, res) => {
  try {
    const userId = getUserId(req);

    const user = await userService.getById(userId);

    return ok(res, user);
  } catch (err) {
    return fail(res, err, 401);
  }
};

/* =====================================================
🔥 UPDATE PROFILE
PUT /user/me
===================================================== */
exports.update = async (req, res) => {
  try {
    const userId = getUserId(req);

    const updated = await userService.update(userId, req.body);

    analyticsService?.track({
      type: "user_update",
      userId,
    });

    return ok(res, updated, "UPDATE_SUCCESS");
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 CHANGE PASSWORD
PUT /user/password
===================================================== */
exports.changePassword = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { oldPassword, newPassword } = req.body;

    await userService.changePassword(userId, oldPassword, newPassword);

    return ok(res, true, "PASSWORD_CHANGED");
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 DELETE ACCOUNT
DELETE /user
===================================================== */
exports.remove = async (req, res) => {
  try {
    const userId = getUserId(req);

    await userService.delete(userId);

    analyticsService?.track({
      type: "user_delete",
      userId,
    });

    return ok(res, true, "ACCOUNT_DELETED");
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 ADMIN: USER LIST
GET /admin/users
===================================================== */
exports.adminList = async (req, res) => {
  try {
    const data = await userService.getAll(req.query);

    return ok(res, data);
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 ADMIN: BLOCK USER
POST /admin/user/block
===================================================== */
exports.block = async (req, res) => {
  try {
    const { userId } = req.body;

    await userService.block(userId);

    return ok(res, true, "USER_BLOCKED");
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 ADMIN: UNBLOCK USER
POST /admin/user/unblock
===================================================== */
exports.unblock = async (req, res) => {
  try {
    const { userId } = req.body;

    await userService.unblock(userId);

    return ok(res, true, "USER_UNBLOCKED");
  } catch (err) {
    return fail(res, err);
  }
};

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 USER CONTROLLER READY");