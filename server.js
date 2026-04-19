"use strict";

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { Server } = require("socket.io");

/* =====================================================
SAFE REQUIRE
===================================================== */
function safeRequire(path) {
  try { return require(path); } catch { return null; }
}

/* =====================================================
DB
===================================================== */
const dbModule = safeRequire("./config/database") || safeRequire("./db");

/* =====================================================
MODELS
===================================================== */
const User = safeRequire("./models/User");
const Shop = safeRequire("./models/Shop");
const Reservation = safeRequire("./models/Reservation");
const Inquiry = safeRequire("./models/Inquiry");

/* =====================================================
APP
===================================================== */
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

/* =====================================================
MIDDLEWARE
===================================================== */
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

/* =====================================================
RATE LIMIT
===================================================== */
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

/* =====================================================
UTIL
===================================================== */
const ok = (res, data = {}) => res.json({ ok: true, ...data });
const fail = (res, s = 400, m = "ERROR") =>
  res.status(s).json({ ok: false, msg: m });

/* =====================================================
AUTH
===================================================== */
function auth(req, res, next) {
  try {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return fail(res, 401, "NO_TOKEN");
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return fail(res, 401, "INVALID_TOKEN");
  }
}

/* =====================================================
🔥 UI (웹페이지)
===================================================== */
app.get("/home", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>NOMA</title>
    <style>
      body { font-family: Arial; text-align: center; padding: 50px; }
      button { padding: 10px 20px; margin: 10px; font-size: 16px; }
      pre { background:#111;color:#0f0;padding:20px;text-align:left; }
    </style>
  </head>
  <body>
    <h1>🔥 NOMA 플랫폼</h1>

    <button onclick="login()">일반 로그인</button>
    <button onclick="kakao()">카카오 로그인</button>
    <button onclick="shops()">매장 조회</button>
    <button onclick="health()">서버 상태</button>

    <pre id="out"></pre>

    <script>
      async function login(){
        const r = await fetch('/api/auth/login',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id:'test',password:'1234'})
        });
        show(await r.json());
      }

      function kakao(){
        location.href='/auth/kakao';
      }

      async function shops(){
        const r = await fetch('/api/shops');
        show(await r.json());
      }

      async function health(){
        const r = await fetch('/api/health');
        show(await r.json());
      }

      function show(d){
        document.getElementById('out').innerText = JSON.stringify(d,null,2);
      }
    </script>
  </body>
  </html>
  `);
});

/* =====================================================
ROOT
===================================================== */
app.get("/", (req, res) => {
  ok(res, {
    message: "NOMA SERVER RUNNING",
    uptime: process.uptime()
  });
});

/* =====================================================
KAKAO LOGIN
===================================================== */
function getRedirectUri() {
  return process.env.NODE_ENV === "production"
    ? "https://noma-project-1.onrender.com/auth/kakao/callback"
    : process.env.KAKAO_REDIRECT_URI;
}

app.get("/auth/kakao", (req, res) => {
  const url =
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${process.env.KAKAO_CLIENT_ID}` +
    `&redirect_uri=${getRedirectUri()}` +
    `&response_type=code`;

  res.redirect(url);
});

app.get("/auth/kakao/callback", async (req, res) => {
  try {
    const { code } = req.query;

    const tokenRes = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          client_id: process.env.KAKAO_CLIENT_ID,
          redirect_uri: getRedirectUri(),
          code,
        },
      }
    );

    const access_token = tokenRes.data.access_token;

    const userRes = await axios.get(
      "https://kapi.kakao.com/v2/user/me",
      { headers: { Authorization: \`Bearer \${access_token}\` } }
    );

    const kakaoId = userRes.data.id;

    let user = User && await User.findOne({ kakaoId });

    if (!user && User) {
      user = await User.create({
        kakaoId,
        id: "kakao_" + kakaoId,
      });
    }

    const token = jwt.sign({ id: user?.id || kakaoId }, JWT_SECRET);

    return ok(res, { token });

  } catch (err) {
    console.error(err.response?.data || err.message);
    return fail(res, 500, "KAKAO_ERROR");
  }
});

/* =====================================================
LOGIN
===================================================== */
app.post("/api/auth/login", async (req, res) => {
  if (!User) return fail(res, 500);

  const { id, password } = req.body;

  let user = await User.findOne({ id });

  if (!user) {
    const hash = await bcrypt.hash(password, 10);
    user = await User.create({ id, password: hash });
  }

  const okPw = await bcrypt.compare(password, user.password);
  if (!okPw) return fail(res, 403);

  const token = jwt.sign({ id: user.id }, JWT_SECRET);

  ok(res, { token });
});

/* =====================================================
SHOP
===================================================== */
app.get("/api/shops", async (req, res) => {
  if (!Shop) return fail(res, 500);
  const items = await Shop.find().limit(50);
  ok(res, { items });
});

/* =====================================================
RESERVATION
===================================================== */
app.post("/api/reservations", auth, async (req, res) => {
  if (!Reservation) return fail(res, 500);

  const r = await Reservation.create({
    userId: req.user.id,
    shopId: req.body.shopId,
    status: "pending"
  });

  ok(res, { r });
});

/* =====================================================
ADMIN
===================================================== */
app.get("/api/admin/stats", async (req, res) => {
  const users = User ? await User.countDocuments() : 0;
  const shops = Shop ? await Shop.countDocuments() : 0;
  const reservations = Reservation ? await Reservation.countDocuments() : 0;

  ok(res, { users, shops, reservations });
});

/* =====================================================
HEALTH
===================================================== */
app.get("/api/health", (req, res) => {
  ok(res, { db: mongoose.connection.readyState });
});

/* =====================================================
404
===================================================== */
app.use((req, res) => fail(res, 404, "NOT_FOUND"));

/* =====================================================
START
===================================================== */
async function start() {
  try {
    if (dbModule?.connectDB) {
      await dbModule.connectDB();
      console.log("DB CONNECTED");
    }

    server.listen(PORT, () => {
      console.log("🚀 SERVER START", PORT);
    });
  } catch (e) {
    console.error(e);
  }
}

start();