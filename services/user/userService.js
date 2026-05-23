"use strict";

/* =====================================================
🔥 USER SERVICE
👉 사용자 관리 (회원가입 / 로그인 / 조회)
👉 cache / analytics / notify 연동
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let User = null;
let cacheService = null;
let analyticsService = null;
let notifyService = null;

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

try { User = require("../modules/user/models/User"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { notifyService = require("./notifyService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class UserService {
  constructor() {
    this.lastUser = null;
  }

  /* =====================================================
  🔥 REGISTER
  ===================================================== */
  async register({ id, password }) {
    assert(id, "ID_REQUIRED");
    assert(password, "PASSWORD_REQUIRED");

    if (!User) throw new Error("USER_MODEL_MISSING");

    const exists = await User.findActiveById(id);
    if (exists) throw new Error("USER_ALREADY_EXISTS");

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      id,
      password: hash,
    });

    this.lastUser = user;

    /* analytics */
    if (analyticsService) {
      analyticsService.track({
        type: "user_register",
        userId: id,
      });
    }

    return user;
  }

  /* =====================================================
  🔥 LOGIN
  ===================================================== */
  async login({ id, password }) {
    assert(id, "ID_REQUIRED");
    assert(password, "PASSWORD_REQUIRED");

    if (!User) throw new Error("USER_MODEL_MISSING");

    const user = await User.findActiveById(id);
    if (!user) throw new Error("USER_NOT_FOUND");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error("INVALID_PASSWORD");

    const token = jwt.sign({ id: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    /* cache */
    if (cacheService) {
      cacheService.set(`user:${id}`, user, 60);
    }

    /* analytics */
    if (analyticsService) {
      analyticsService.track({
        type: "user_login",
        userId: id,
      });
    }

    /* notify */
    if (notifyService) {
      notifyService.pushAsync({
        userId: id,
        type: "login",
        message: "로그인 성공",
      });
    }

    return {
      token,
      user: {
        id: user.id,
        role: user.role,
      },
    };
  }

  /* =====================================================
  🔥 GET USER
  ===================================================== */
  async getUser(id) {
    assert(id, "ID_REQUIRED");

    // cache 먼저
    if (cacheService) {
      const cached = cacheService.get(`user:${id}`);
      if (cached) return cached;
    }

    const user = await User.findActiveById(id);
    if (!user) throw new Error("USER_NOT_FOUND");

    if (cacheService) {
      cacheService.set(`user:${id}`, user, 60);
    }

    return user;
  }

  /* =====================================================
  🔥 UPDATE PASSWORD
  ===================================================== */
  async updatePassword(id, newPassword) {
    assert(id, "ID_REQUIRED");
    assert(newPassword, "PASSWORD_REQUIRED");

    const user = await User.findActiveById(id);
    if (!user) throw new Error("USER_NOT_FOUND");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return true;
  }

  /* =====================================================
  🔥 DELETE USER
  ===================================================== */
  async deleteUser(id) {
    const user = await User.findActiveById(id);
    if (!user) throw new Error("USER_NOT_FOUND");

    user.isDeleted = true;
    await user.save();

    return true;
  }

  /* =====================================================
  🔥 LIST USERS
  ===================================================== */
  async list({ limit = 20, skip = 0 } = {}) {
    return User.find({ isDeleted: false })
      .limit(Number(limit))
      .skip(Number(skip))
      .sort({ createdAt: -1 });
  }

  /* =====================================================
  🔥 VERIFY TOKEN
  ===================================================== */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.lastUser;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.lastUser = null;
    return true;
  }
}

module.exports = new UserService();