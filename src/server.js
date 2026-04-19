"use strict";

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");

const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { Server } = require("socket.io");

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try { return require(path); } catch { return null; }
}

/* =========================
DB
========================= */
const dbModule = safeRequire("./config/database") || safeRequire("./db");

/* =========================
MODELS
========================= */
const User = safeRequire("./models/User");
const Shop = safeRequire("./models/Shop");
const Reservation = safeRequire("./models/Reservation");
const Inquiry = safeRequire("./models/Inquiry");

/* =========================
APP
========================= */
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

/* =========================
ENV VALIDATION
========================= */
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET 없음");
  process.exit(1);
}

/* =========================
GLOBAL STATE
========================= */
const CACHE = new Map();
let REQUEST_COUNT = 0;

/* =========================
MIDDLEWARE
========================= */
app.use(helmet());
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 300
}));

app.use((req, res, next) => {
  REQUEST_COUNT++;
  next();
});

/* =========================
🔥 STATIC UI (복구된 기능)
========================= */
app.use(express.static(path.join(__dirname, "public")));

/* =========================
UTIL
========================= */
const ok = (res, data = {}) => res.json({ ok: true, ...data });
const fail = (res, s = 400, m = "ERROR") =>
  res.status(s).json({ ok: false, msg: m });

function getCache(key) {
  const v = CACHE.get(key);
  if (!v) return null;
  if (Date.now() > v.expire) {
    CACHE.delete(key);
    return null;
  }
  return v.data;
}

function setCache(key, data, ttl = 5000) {
  CACHE.set(key, { data, expire: Date.now() + ttl });
}

/* =========================
AUTH
========================= */
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

/* =========================
ROOT (UI 연결)
========================= */
app.get("/", (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* =========================
API ROOT
========================= */
app.get("/api", (req, res) => {
  ok(res, { message: "API RUNNING", requests: REQUEST_COUNT });
});

/* =========================
KAKAO LOGIN
========================= */
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
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    const kakaoId = userRes.data.id;

    let user = null;

    if (User) {
      user = await User.findOne({ kakaoId });
      if (!user) {
        user = await User.create({
          kakaoId,
          id: "kakao_" + kakaoId,
        });
      }
    }

    const token = jwt.sign(
      { id: user?.id || kakaoId },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🔥 UI로 리다이렉트 (중요 수정)
    return res.redirect("/?token=" + token);

  } catch (err) {
    console.error(err.response?.data || err.message);
    return fail(res, 500, "KAKAO_ERROR");
  }
});

/* =========================
LOGIN
========================= */
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

/* =========================
CACHE
========================= */
app.use("/api", (req, res, next) => {
  if (req.method !== "GET") return next();

  const cached = getCache(req.originalUrl);
  if (cached) return res.json(cached);

  const original = res.json;
  res.json = (data) => {
    setCache(req.originalUrl, data);
    return original.call(res, data);
  };

  next();
});

/* =========================
SHOP
========================= */
app.get("/api/shops", async (req, res) => {
  if (!Shop) return fail(res, 500);
  const items = await Shop.find().limit(50);
  ok(res, { items });
});

/* =========================
RESERVATION
========================= */
app.post("/api/reservations", auth, async (req, res) => {
  if (!Reservation) return fail(res, 500);

  const r = await Reservation.create({
    userId: req.user.id,
    shopId: req.body.shopId,
    status: "pending"
  });

  ok(res, { r });
});

/* =========================
ADMIN
========================= */
app.get("/api/admin/stats", async (req, res) => {
  const users = User ? await User.countDocuments() : 0;
  const shops = Shop ? await Shop.countDocuments() : 0;
  const reservations = Reservation ? await Reservation.countDocuments() : 0;

  ok(res, { users, shops, reservations });
});

/* =========================
SYSTEM
========================= */
app.get("/api/system/status", (req, res) => {
  ok(res, {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    requests: REQUEST_COUNT
  });
});

/* =========================
ERROR
========================= */
app.use((req, res) => fail(res, 404, "NOT_FOUND"));

app.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "SERVER_ERROR");
});

/* =========================
START
========================= */
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