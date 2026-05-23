"use strict";

// modules/user/services/user.service.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");

/* =====================================================
🔥 CONFIG
===================================================== */
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/* =====================================================
🔥 HELPER
===================================================== */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildTokenPayload(user) {
  return {
    id: user.id,
    role: user.role || "user",
  };
}

function signToken(user) {
  return jwt.sign(buildTokenPayload(user), JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/* =====================================================
🔥 SERVICE
===================================================== */
class UserService {
  /**
   * ============================================
   * 회원가입
   * ============================================
   */
  async register({ id, password, role } = {}) {
    assert(id, "USER_ID_REQUIRED");
    assert(password, "PASSWORD_REQUIRED");

    const exists = await User.findActiveById(id);
    if (exists) {
      throw new Error("USER_ALREADY_EXISTS");
    }

    const user = await User.create({
      id,
      password,
      role: role || "user",
    });

    return user;
  }

  /**
   * ============================================
   * 로그인
   * ============================================
   */
  async login({ id, password } = {}) {
    assert(id, "USER_ID_REQUIRED");
    assert(password, "PASSWORD_REQUIRED");

    const user = await User.findWithPassword(id);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      throw new Error("INVALID_PASSWORD");
    }

    const token = signToken(user);

    return {
      user,
      token,
    };
  }

  /**
   * ============================================
   * 내 정보
   * ============================================
   */
  async getMe(userId) {
    assert(userId, "USER_ID_REQUIRED");

    const user = await User.findActiveById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    return user;
  }

  /**
   * ============================================
   * 사용자 단건 조회
   * ============================================
   */
  async getUserById(id) {
    assert(id, "USER_ID_REQUIRED");

    const user = await User.findActiveById(id);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    return user;
  }

  /**
   * ============================================
   * 사용자 목록
   * ============================================
   */
  async getUsers(options = {}) {
    const limit = Number(options.limit || 20);
    const skip = Number(options.skip || 0);

    return User.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  /**
   * ============================================
   * 역할 변경
   * ============================================
   */
  async updateRole(id, role) {
    assert(id, "USER_ID_REQUIRED");
    assert(role, "ROLE_REQUIRED");

    const user = await User.findActiveById(id);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    user.role = role;
    await user.save();

    return user;
  }

  /**
   * ============================================
   * 비밀번호 변경
   * ============================================
   */
  async changePassword(id, currentPassword, newPassword) {
    assert(id, "USER_ID_REQUIRED");
    assert(currentPassword, "CURRENT_PASSWORD_REQUIRED");
    assert(newPassword, "NEW_PASSWORD_REQUIRED");

    const user = await User.findWithPassword(id);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    const ok = await user.comparePassword(currentPassword);
    if (!ok) {
      throw new Error("INVALID_PASSWORD");
    }

    user.password = newPassword;
    await user.save();

    return true;
  }

  /**
   * ============================================
   * soft delete
   * ============================================
   */
  async deleteUser(id) {
    assert(id, "USER_ID_REQUIRED");

    const user = await User.findActiveById(id);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    user.isDeleted = true;
    await user.save();

    return true;
  }
}

module.exports = new UserService();