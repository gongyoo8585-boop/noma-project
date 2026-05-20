"use strict";

// modules/user/controllers/user.controller.js

const userService = require("../services/user.service");

/* =====================================================
🔥 COMMON
===================================================== */
function success(res, data = {}, message = "OK") {
  return res.json({
    ok: true,
    message,
    data,
  });
}

function fail(res, message = "ERROR", code = 400) {
  return res.status(code).json({
    ok: false,
    message,
  });
}

function getUserId(req) {
  return req.user?.id || req.user?._id;
}

/* =====================================================
🔥 CONTROLLER
===================================================== */
class UserController {
  /* ============================================
  🔥 회원가입
  ============================================ */
  async register(req, res) {
    try {
      const user = await userService.register(req.body);

      return success(res, user, "USER_REGISTERED");
    } catch (err) {
      console.error("register error:", err.message);
      return fail(res, err.message);
    }
  }

  /* ============================================
  🔥 로그인
  ============================================ */
  async login(req, res) {
    try {
      const result = await userService.login(req.body);

      return success(res, result, "LOGIN_SUCCESS");
    } catch (err) {
      console.error("login error:", err.message);
      return fail(res, err.message, 401);
    }
  }

  /* ============================================
  🔥 내 정보
  ============================================ */
  async getMe(req, res) {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return fail(res, "UNAUTHORIZED", 401);
      }

      const user = await userService.getMe(userId);

      return success(res, user, "ME");
    } catch (err) {
      console.error("getMe error:", err.message);
      return fail(res, err.message, 404);
    }
  }

  /* ============================================
  🔥 사용자 단건 조회
  ============================================ */
  async getUser(req, res) {
    try {
      const { id } = req.params;

      const user = await userService.getUserById(id);

      return success(res, user, "USER_DETAIL");
    } catch (err) {
      console.error("getUser error:", err.message);
      return fail(res, err.message, 404);
    }
  }

  /* ============================================
  🔥 사용자 목록
  ============================================ */
  async getUsers(req, res) {
    try {
      const { limit, skip } = req.query;

      const users = await userService.getUsers({
        limit,
        skip,
      });

      return success(
        res,
        {
          items: users,
          count: users.length,
        },
        "USER_LIST"
      );
    } catch (err) {
      console.error("getUsers error:", err.message);
      return fail(res, "SERVER_ERROR", 500);
    }
  }

  /* ============================================
  🔥 역할 변경 (admin)
  ============================================ */
  async updateRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await userService.updateRole(id, role);

      return success(res, user, "ROLE_UPDATED");
    } catch (err) {
      console.error("updateRole error:", err.message);
      return fail(res, err.message);
    }
  }

  /* ============================================
  🔥 비밀번호 변경
  ============================================ */
  async changePassword(req, res) {
    try {
      const userId = getUserId(req);
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return fail(res, "UNAUTHORIZED", 401);
      }

      await userService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      return success(res, {}, "PASSWORD_CHANGED");
    } catch (err) {
      console.error("changePassword error:", err.message);
      return fail(res, err.message);
    }
  }

  /* ============================================
  🔥 사용자 삭제 (soft delete)
  ============================================ */
  async deleteUser(req, res) {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return fail(res, "UNAUTHORIZED", 401);
      }

      await userService.deleteUser(userId);

      return success(res, {}, "USER_DELETED");
    } catch (err) {
      console.error("deleteUser error:", err.message);
      return fail(res, err.message);
    }
  }
}

module.exports = new UserController();