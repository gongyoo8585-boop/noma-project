"use strict";

/* =====================================================
🔥 AUTH SERVICE
👉 로그인 / 회원가입 / 토큰 / 비밀번호 / 인증 유틸
👉 기존 구조 유지 + 오류 없는 완성형
===================================================== */

const crypto = require("crypto");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let bcrypt = null;
let jwt = null;
let User = null;

try {
  bcrypt = require("bcryptjs");
} catch (_) {}

try {
  jwt = require("jsonwebtoken");
} catch (_) {}

try {
  User = require("../../models/User");
} catch (_) {
  try {
    User = require("../../modules/user/models/User");
  } catch (__) {}
}

/* =====================================================
🔥 CONFIG
===================================================== */
const JWT_SECRET = process.env.JWT_SECRET || "DEV_SECRET_CHANGE_ME";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || "30d";
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

/* =====================================================
🔥 MEMORY STORE
===================================================== */
const TOKEN_BLACKLIST = new Map();
const REFRESH_STORE = new Map();
const LOGIN_LOGS = [];

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function normalizeUser(user) {
  if (!user) return null;

  return {
    id: String(user._id || user.id || ""),
    _id: user._id,
    email: user.email || "",
    phone: user.phone || "",
    nickname: user.nickname || user.name || "",
    name: user.name || user.nickname || "",
    role: user.role || "user",
    point: Number(user.point || 0),
    isActive: user.isActive !== false,
    isDeleted: !!user.isDeleted,
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

function log(type, payload = {}) {
  LOGIN_LOGS.unshift({
    type,
    payload,
    time: new Date(),
  });

  if (LOGIN_LOGS.length > 1000) {
    LOGIN_LOGS.length = 1000;
  }
}

async function hashPassword(password) {
  assert(password, "PASSWORD_REQUIRED");

  if (bcrypt) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  return crypto
    .createHash("sha256")
    .update(String(password))
    .digest("hex");
}

async function comparePassword(raw, hashed) {
  if (!raw || !hashed) return false;

  if (bcrypt) {
    return bcrypt.compare(raw, hashed);
  }

  const hash = crypto
    .createHash("sha256")
    .update(String(raw))
    .digest("hex");

  return hash === hashed;
}

function signToken(payload = {}, expiresIn = JWT_EXPIRES_IN) {
  assert(jwt, "JWT_MODULE_REQUIRED");

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  assert(jwt, "JWT_MODULE_REQUIRED");
  assert(token, "TOKEN_REQUIRED");

  if (TOKEN_BLACKLIST.has(token)) {
    throw new Error("TOKEN_REVOKED");
  }

  return jwt.verify(token, JWT_SECRET);
}

function getPublicTokenPayload(user) {
  const u = normalizeUser(user);

  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    nickname: u.nickname,
    role: u.role,
  };
}

function generateRandomToken(size = 32) {
  return crypto.randomBytes(size).toString("hex");
}

/* =====================================================
🔥 SERVICE
===================================================== */
class AuthService {
  /* =====================================================
  🔥 REGISTER
  ===================================================== */
  async register(data = {}) {
    assert(User, "USER_MODEL_MISSING");

    const email = data.email ? String(data.email).trim().toLowerCase() : "";
    const phone = data.phone ? String(data.phone).trim() : "";
    const password = data.password;

    assert(email || phone, "EMAIL_OR_PHONE_REQUIRED");
    assert(password, "PASSWORD_REQUIRED");

    const query = email
      ? { email, isDeleted: { $ne: true } }
      : { phone, isDeleted: { $ne: true } };

    const exists = await User.findOne(query);
    if (exists) throw new Error("USER_ALREADY_EXISTS");

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email,
      phone,
      password: passwordHash,
      passwordHash,
      nickname: data.nickname || data.name || "",
      name: data.name || data.nickname || "",
      role: data.role || "user",
      isActive: true,
      isDeleted: false,
    });

    log("register", { userId: user._id, email, phone });

    const token = this.issueAccessToken(user);
    const refreshToken = this.issueRefreshToken(user);

    return {
      user: normalizeUser(user),
      token,
      accessToken: token,
      refreshToken,
    };
  }

  /* =====================================================
  🔥 LOGIN
  ===================================================== */
  async login(data = {}) {
    assert(User, "USER_MODEL_MISSING");

    const identifier = String(
      data.email || data.phone || data.username || data.id || ""
    ).trim();

    const password = data.password;

    assert(identifier, "IDENTIFIER_REQUIRED");
    assert(password, "PASSWORD_REQUIRED");

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier },
        { id: identifier },
        { username: identifier },
      ],
      isDeleted: { $ne: true },
    });

    if (!user) {
      log("login_fail", { identifier, reason: "USER_NOT_FOUND" });
      throw new Error("INVALID_LOGIN");
    }

    if (user.isActive === false) {
      throw new Error("USER_DISABLED");
    }

    const savedPassword =
      user.passwordHash || user.password || user.hashedPassword;

    const matched = await comparePassword(password, savedPassword);

    if (!matched) {
      log("login_fail", { userId: user._id, reason: "BAD_PASSWORD" });
      throw new Error("INVALID_LOGIN");
    }

    user.lastLoginAt = new Date();
    user.loginCount = Number(user.loginCount || 0) + 1;

    if (typeof user.save === "function") {
      await user.save();
    }

    const token = this.issueAccessToken(user);
    const refreshToken = this.issueRefreshToken(user);

    log("login_success", { userId: user._id });

    return {
      user: normalizeUser(user),
      token,
      accessToken: token,
      refreshToken,
    };
  }

  /* =====================================================
  🔥 ISSUE TOKEN
  ===================================================== */
  issueAccessToken(user) {
    return signToken(getPublicTokenPayload(user), JWT_EXPIRES_IN);
  }

  issueRefreshToken(user) {
    const payload = getPublicTokenPayload(user);
    const refreshToken = signToken(
      {
        ...payload,
        type: "refresh",
        nonce: generateRandomToken(8),
      },
      REFRESH_EXPIRES_IN
    );

    REFRESH_STORE.set(refreshToken, {
      userId: payload.id,
      createdAt: Date.now(),
    });

    return refreshToken;
  }

  /* =====================================================
  🔥 REFRESH
  ===================================================== */
  async refresh(refreshToken) {
    assert(refreshToken, "REFRESH_TOKEN_REQUIRED");

    const payload = verifyToken(refreshToken);

    if (payload.type !== "refresh") {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    if (!REFRESH_STORE.has(refreshToken)) {
      throw new Error("REFRESH_TOKEN_REVOKED");
    }

    const user = User
      ? await User.findById(payload.id)
      : {
          id: payload.id,
          email: payload.email,
          phone: payload.phone,
          nickname: payload.nickname,
          role: payload.role,
        };

    if (!user) throw new Error("USER_NOT_FOUND");

    const token = this.issueAccessToken(user);

    return {
      token,
      accessToken: token,
      user: normalizeUser(user),
    };
  }

  /* =====================================================
  🔥 VERIFY
  ===================================================== */
  verify(token) {
    return verifyToken(token);
  }

  verifyToken(token) {
    return verifyToken(token);
  }

  decodeToken(token) {
    assert(jwt, "JWT_MODULE_REQUIRED");
    return jwt.decode(token);
  }

  /* =====================================================
  🔥 LOGOUT / REVOKE
  ===================================================== */
  logout(token, refreshToken = null) {
    if (token) {
      TOKEN_BLACKLIST.set(token, {
        revokedAt: Date.now(),
      });
    }

    if (refreshToken) {
      REFRESH_STORE.delete(refreshToken);
      TOKEN_BLACKLIST.set(refreshToken, {
        revokedAt: Date.now(),
      });
    }

    log("logout", { token: !!token, refreshToken: !!refreshToken });

    return true;
  }

  revokeToken(token) {
    if (!token) return false;

    TOKEN_BLACKLIST.set(token, {
      revokedAt: Date.now(),
    });

    return true;
  }

  isTokenRevoked(token) {
    return TOKEN_BLACKLIST.has(token);
  }

  /* =====================================================
  🔥 PASSWORD
  ===================================================== */
  async changePassword(userId, oldPassword, newPassword) {
    assert(User, "USER_MODEL_MISSING");
    assert(userId, "USER_ID_REQUIRED");
    assert(oldPassword, "OLD_PASSWORD_REQUIRED");
    assert(newPassword, "NEW_PASSWORD_REQUIRED");

    const user = await User.findById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    const savedPassword =
      user.passwordHash || user.password || user.hashedPassword;

    const ok = await comparePassword(oldPassword, savedPassword);
    if (!ok) throw new Error("INVALID_OLD_PASSWORD");

    const newHash = await hashPassword(newPassword);

    user.password = newHash;
    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();

    await user.save();

    log("password_changed", { userId });

    return true;
  }

  async resetPassword(userId, newPassword) {
    assert(User, "USER_MODEL_MISSING");
    assert(userId, "USER_ID_REQUIRED");
    assert(newPassword, "NEW_PASSWORD_REQUIRED");

    const user = await User.findById(userId);
    if (!user) throw new Error("USER_NOT_FOUND");

    const newHash = await hashPassword(newPassword);

    user.password = newHash;
    user.passwordHash = newHash;
    user.passwordChangedAt = new Date();

    await user.save();

    log("password_reset", { userId });

    return true;
  }

  /* =====================================================
  🔥 USER HELPERS
  ===================================================== */
  async getMe(userId) {
    assert(User, "USER_MODEL_MISSING");
    assert(userId, "USER_ID_REQUIRED");

    const user = await User.findById(userId).lean();
    if (!user) throw new Error("USER_NOT_FOUND");

    return normalizeUser(user);
  }

  async getById(userId) {
    return this.getMe(userId);
  }

  async updateProfile(userId, data = {}) {
    assert(User, "USER_MODEL_MISSING");
    assert(userId, "USER_ID_REQUIRED");

    const allowed = {};
    const fields = [
      "nickname",
      "name",
      "phone",
      "email",
      "profileImage",
      "address",
      "marketingAgree",
    ];

    for (const f of fields) {
      if (data[f] !== undefined) allowed[f] = data[f];
    }

    const user = await User.findByIdAndUpdate(userId, allowed, {
      new: true,
    });

    if (!user) throw new Error("USER_NOT_FOUND");

    log("profile_update", { userId });

    return normalizeUser(user);
  }

  /* =====================================================
  🔥 ADMIN HELPERS
  ===================================================== */
  async blockUser(userId) {
    assert(User, "USER_MODEL_MISSING");
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) throw new Error("USER_NOT_FOUND");

    log("user_blocked", { userId });

    return normalizeUser(user);
  }

  async unblockUser(userId) {
    assert(User, "USER_MODEL_MISSING");
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    );

    if (!user) throw new Error("USER_NOT_FOUND");

    log("user_unblocked", { userId });

    return normalizeUser(user);
  }

  async softDeleteUser(userId) {
    assert(User, "USER_MODEL_MISSING");
    const user = await User.findByIdAndUpdate(
      userId,
      { isDeleted: true, isActive: false },
      { new: true }
    );

    if (!user) throw new Error("USER_NOT_FOUND");

    log("user_deleted", { userId });

    return normalizeUser(user);
  }

  /* =====================================================
  🔥 EXPRESS MIDDLEWARE
  ===================================================== */
  middleware() {
    return (req, res, next) => {
      try {
        const token =
          req.headers.authorization?.replace("Bearer ", "") ||
          req.cookies?.token ||
          req.query?.token;

        if (!token) {
          return res.status(401).json({
            ok: false,
            message: "TOKEN_REQUIRED",
          });
        }

        const payload = verifyToken(token);
        req.user = payload;

        next();
      } catch (err) {
        return res.status(401).json({
          ok: false,
          message: err.message || "UNAUTHORIZED",
        });
      }
    };
  }

  optionalMiddleware() {
    return (req, res, next) => {
      try {
        const token =
          req.headers.authorization?.replace("Bearer ", "") ||
          req.cookies?.token ||
          req.query?.token;

        if (token) {
          req.user = verifyToken(token);
        }

        next();
      } catch (_) {
        next();
      }
    };
  }

  requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          ok: false,
          message: "UNAUTHORIZED",
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          ok: false,
          message: "FORBIDDEN",
        });
      }

      next();
    };
  }

  adminOnly() {
    return this.requireRole("admin", "superAdmin", "super_admin");
  }

  /* =====================================================
  🔥 LOG / METRICS
  ===================================================== */
  getLogs(limit = 100) {
    return LOGIN_LOGS.slice(0, limit);
  }

  getMetrics() {
    return {
      revokedTokens: TOKEN_BLACKLIST.size,
      refreshTokens: REFRESH_STORE.size,
      logs: LOGIN_LOGS.length,
    };
  }

  clearExpiredMemory() {
    const maxAge = 1000 * 60 * 60 * 24 * 30;
    const now = Date.now();

    for (const [token, data] of TOKEN_BLACKLIST.entries()) {
      if (now - data.revokedAt > maxAge) {
        TOKEN_BLACKLIST.delete(token);
      }
    }

    return true;
  }
}

/* =====================================================
🔥 SINGLETON
===================================================== */
module.exports = new AuthService();