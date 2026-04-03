const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

/* ================= DB ================= */
mongoose.connect(process.env.MONGO_URI);

/* ================= USER ================= */
const User = mongoose.model("User", new mongoose.Schema({
  username: String,
  password: String,
  kakaoId: String
}));

/* ================= 회원가입 ================= */
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    const exist = await User.findOne({ username });
    if (exist) return res.status(400).json({ msg: "이미 존재" });

    const hash = await bcrypt.hash(password, 10);

    await User.create({ username, password: hash });

    res.json({ msg: "회원가입 성공" });
  } catch (e) {
    res.status(500).json({ msg: "서버 오류" });
  }
});

/* ================= 로그인 ================= */
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "유저 없음" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ msg: "비번 틀림" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ token });
  } catch {
    res.status(500).json({ msg: "서버 오류" });
  }
});

/* ================= 카카오 로그인 시작 ================= */
app.get("/kakao", (req, res) => {
  const redirect = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_REST_KEY}&redirect_uri=${process.env.KAKAO_REDIRECT}&response_type=code`;

  res.redirect(redirect);
});

/* ================= 카카오 콜백 ================= */
app.get("/kakao/callback", async (req, res) => {
  try {
    const code = req.query.code;

    /* 토큰 요청 */
    const tokenRes = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: process.env.KAKAO_REST_KEY,
          redirect_uri: process.env.KAKAO_REDIRECT,
          code
        },
        headers: {
          "Content-type": "application/x-www-form-urlencoded;charset=utf-8"
        }
      }
    );

    const accessToken = tokenRes.data.access_token;

    /* 유저 정보 */
    const userRes = await axios.get(
      "https://kapi.kakao.com/v2/user/me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const kakaoId = userRes.data.id;

    /* DB 저장 */
    let user = await User.findOne({ kakaoId });

    if (!user) {
      user = await User.create({
        username: "kakao_" + kakaoId,
        kakaoId
      });
    }

    /* JWT 발급 */
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    /* 메인으로 이동 */
    res.redirect("/?token=" + token);

  } catch (e) {
    console.log(e.response?.data || e);
    res.send("카카오 로그인 실패");
  }
});

/* ================= 서버 시작 ================= */
app.listen(3000, () => console.log("서버 실행"));