/**
 * =====================================================
 * 🔥 KAKAO AUTH ROUTES (FINAL ULTRA COMPLETE)
 * =====================================================
 */

const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const router = express.Router();

const User = require("../models/User");

/* =========================
   🔥 ENV
========================= */
const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID || "";
const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || "";
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

/* =========================
   🔥 1. 카카오 로그인 URL
========================= */
router.get("/login", (req, res) => {
  const url =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${KAKAO_CLIENT_ID}` +
    `&redirect_uri=${KAKAO_REDIRECT_URI}` +
    `&response_type=code`;

  res.json({ ok: true, url });
});

/* =========================
   🔥 2. 카카오 콜백 → JWT 발급
========================= */
router.get("/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ ok: false, message: "code 없음" });
    }

    /* 1️⃣ access_token 요청 */
    const tokenRes = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: KAKAO_CLIENT_ID,
          redirect_uri: KAKAO_REDIRECT_URI,
          code
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenRes.data.access_token;

    /* 2️⃣ 사용자 정보 요청 */
    const userRes = await axios.get(
      "https://kapi.kakao.com/v2/user/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const kakao = userRes.data;

    const kakaoId = "kakao_" + kakao.id;
    const nickname =
      kakao.kakao_account?.profile?.nickname || "카카오유저";

    /* 3️⃣ 유저 생성 or 조회 */
    let user = await User.findOne({ id: kakaoId });

    if (!user) {
      user = await User.create({
        id: kakaoId,
        password: "kakao",
        nickname
      });
    }

    /* 4️⃣ JWT 생성 */
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    /* 5️⃣ 응답 */
    res.json({
      ok: true,
      token,
      user: user.toJSON()
    });

  } catch (e) {
    console.error("KAKAO LOGIN ERROR:", e.response?.data || e.message);

    res.status(500).json({
      ok: false,
      message: "카카오 로그인 실패"
    });
  }
});

/* =========================
   🔥 3. 간편 로그인 (프론트용)
========================= */
router.post("/simple", async (req, res) => {
  try {
    const { kakaoId, nickname } = req.body;

    if (!kakaoId) {
      return res.status(400).json({ ok: false });
    }

    const id = "kakao_" + kakaoId;

    let user = await User.findOne({ id });

    if (!user) {
      user = await User.create({
        id,
        password: "kakao",
        nickname: nickname || "카카오유저"
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      ok: true,
      token,
      user: user.toJSON()
    });

  } catch (e) {
    console.error("KAKAO SIMPLE ERROR:", e);
    res.status(500).json({ ok: false });
  }
});

/* =========================
   🔥 4. 로그아웃 (클라이언트용)
========================= */
router.post("/logout", (req, res) => {
  res.json({ ok: true });
});

/* ===================================================== */
module.exports = router;