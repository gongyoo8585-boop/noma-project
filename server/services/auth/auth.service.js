"use strict";

/**
 * =====================================================
 * 🔥 AUTH SERVICE (ULTRA FINAL COMPLETE)
 * ✔ 회원가입
 * ✔ 로그인
 * ✔ 유저 조회
 * ✔ 토큰 생성
 * ✔ 비밀번호 검증
 * ✔ 카카오 유저 처리
 * ✔ 기존 구조 호환
 * ✔ admin JWT payload 안정화
 * ✔ role/isAdmin 동기화
 * ✔ email 로그인 대응
 * ✔ JWT_SECRET 단일화 유지
 * ✔ INVALID_TOKEN 방지
 * =====================================================
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");

/* =========================
ENV
========================= */
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "change_me";

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN ||
  "7d";

/* =========================
토큰 생성
========================= */
function createToken(user) {
  const safeRole =
    user && user.role
      ? String(user.role)
      : "user";

  const safeIsAdmin =
    safeRole === "admin" ||
    user?.isAdmin === true;

  return jwt.sign(
    {
      id:
        user && user.id
          ? user.id
          : "",

      userId:
        user && user._id
          ? String(user._id)
          : "",

      _id:
        user && user._id
          ? String(user._id)
          : "",

      email:
        user && user.email
          ? user.email
          : "",

      role: safeRole,

      isAdmin: safeIsAdmin,
    },
    JWT_SECRET,
    {
      expiresIn:
        JWT_EXPIRES_IN,
    }
  );
}

/* =========================
비밀번호 해시
========================= */
async function hashPassword(
  password
) {
  return bcrypt.hash(
    password,
    10
  );
}

/* =========================
비밀번호 검증
========================= */
async function comparePassword(
  password,
  hash
) {
  return bcrypt.compare(
    password,
    hash
  );
}

/* =========================
유저 조회 (id)
========================= */
async function findById(id) {
  return User.findOne({
    $or: [
      { id },
      { email: id },
    ],
  });
}

/* =========================
유저 조회 (_id)
========================= */
async function findByObjectId(
  userId
) {
  return User.findById(userId);
}

/* =========================
회원가입
========================= */
async function register(data) {
  const {
    id,
    password,
    nickname,
    phone,
    email,
  } = data;

  if (!id || !password) {
    throw new Error(
      "ID_PASSWORD_REQUIRED"
    );
  }

  const exists =
    await User.findOne({
      $or: [
        { id },
        { email: id },
      ],
    });

  if (exists) {
    throw new Error(
      "USER_ALREADY_EXISTS"
    );
  }

  const hashed =
    await hashPassword(
      password
    );

  const user =
    await User.create({
      id,
      password: hashed,
      nickname:
        nickname || id,
      phone:
        phone || "",
      email:
        email || "",
      role: "user",
      isAdmin: false,
      blocked: false,
    });

  const token =
    createToken(user);

  return {
    user,
    token,
  };
}

/* =========================
로그인
========================= */
async function login(data) {
  const {
    id,
    password,
  } = data;

  if (!id || !password) {
    throw new Error(
      "ID_PASSWORD_REQUIRED"
    );
  }

  const safeLoginId =
    String(id).trim();

  const user =
    await User.findOne({
      $or: [
        { id: safeLoginId },
        {
          email:
            safeLoginId,
        },
      ],
    }).select(
      "+password +role +isAdmin"
    );

  if (!user) {
    throw new Error(
      "USER_NOT_FOUND"
    );
  }

  if (user.blocked) {
    throw new Error(
      "USER_BLOCKED"
    );
  }

  const match =
    await comparePassword(
      password,
      user.password
    );

  if (!match) {
    throw new Error(
      "INVALID_PASSWORD"
    );
  }

  if (
    user.role ===
      "admin" ||
    user.isAdmin === true
  ) {
    user.role = "admin";
    user.isAdmin = true;
  }

  user.lastLoginAt =
    new Date();

  await user.save();

  const token =
    createToken(user);

  return {
    user,
    token,
  };
}

/* =========================
카카오 유저 처리
========================= */
async function findOrCreateKakao({
  kakaoId,
  nickname,
  email,
}) {
  const id = `kakao_${kakaoId}`;

  let user =
    await User.findOne({
      id,
    });

  if (!user) {
    user =
      await User.create({
        id,
        password:
          await hashPassword(
            `kakao_${kakaoId}`
          ),
        nickname:
          nickname ||
          "카카오유저",
        email:
          email || "",
        provider:
          "kakao",
        role: "user",
        isAdmin: false,
        blocked: false,
      });
  }

  if (user.blocked) {
    throw new Error(
      "USER_BLOCKED"
    );
  }

  if (
    user.role ===
      "admin" ||
    user.isAdmin === true
  ) {
    user.role = "admin";
    user.isAdmin = true;
  }

  user.lastLoginAt =
    new Date();

  await user.save();

  const token =
    createToken(user);

  return {
    user,
    token,
  };
}

/* =========================
안전 유저 반환
========================= */
function safeUser(user) {
  if (!user) return null;

  const obj =
    user.toObject
      ? user.toObject()
      : user;

  delete obj.password;
  delete obj.__v;

  if (
    obj.role ===
      "admin" ||
    obj.isAdmin === true
  ) {
    obj.role = "admin";
    obj.isAdmin = true;
  }

  return obj;
}

/* =========================
🔥 최소 추가: null 안전 wrapper
========================= */
function safeResult(result) {
  if (!result) return null;
  return result;
}

/* =========================
EXPORT
========================= */
module.exports = {
  createToken,
  hashPassword,
  comparePassword,
  findById,
  findByObjectId,
  register,
  login,
  findOrCreateKakao,
  safeUser,
  safeResult,
};