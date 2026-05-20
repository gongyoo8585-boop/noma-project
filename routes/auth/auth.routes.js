"use strict";

/* =====================================================
🔥 ENV
===================================================== */
require("dotenv").config();

/* =====================================================
🔥 CORE
===================================================== */
const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

/* =====================================================
🔥 SOCKET (기존 유지 + 확장)
===================================================== */
const { Server } = require("socket.io");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(p) {
  try { return require(p); } catch { return null; }
}

/* =====================================================
🔥 DB
===================================================== */
const dbModule = safeRequire("./config/database") || safeRequire("./db");

/* =====================================================
🔥 MODELS
===================================================== */
const Shop = safeRequire("./models/Shop");
const Reservation = safeRequire("./models/Reservation");

/* =====================================================
🔥 ROUTES (확장)
===================================================== */
const routesIndex = safeRequire("./routes/index");
const authRouter = safeRequire("./routes/auth");

/* =====================================================
🔥 APP INIT
===================================================== */
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

const PORT = process.env.PORT || 10000;

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
let REQUEST_COUNT = 0;
const CACHE = new Map();

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
app.use(helmet());
app.use(compression());
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));

/* 🔥 RATE LIMIT */
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 300
}));

/* REQUEST COUNT */
app.use((req, res, next) => {
  REQUEST_COUNT++;
  next();
});

/* =====================================================
🔥 STATIC
===================================================== */
const PUBLIC_PATH = path.resolve(process.cwd(), "public");
app.use(express.static(PUBLIC_PATH));

/* =====================================================
🔥 UTIL
===================================================== */
const ok = (res, data = {}) => res.json({ ok: true, ...data });
const fail = (res, s = 400, m = "ERROR") => res.status(s).json({ ok: false, msg: m });

/* =====================================================
🔥 CACHE SYSTEM (강화)
===================================================== */
function cacheGet(key) {
  const v = CACHE.get(key);
  if (!v) return null;

  if (Date.now() > v.expire) {
    CACHE.delete(key);
    return null;
  }

  return v.data;
}

function cacheSet(key, data, ttl = 5000) {
  CACHE.set(key, { data, expire: Date.now() + ttl });
}

/* =====================================================
🔥 ROUTER APPLY
===================================================== */
if (authRouter) {
  app.use("/api/auth", authRouter);
}

if (routesIndex) {
  app.use("/api", routesIndex);
}

/* =====================================================
🔥 ROOT
===================================================== */
app.get("/", (req, res) => {
  return res.sendFile(path.join(PUBLIC_PATH, "index.html"));
});

/* =====================================================
🔥 CACHE LAYER (GET ONLY)
===================================================== */
app.use("/api", (req, res, next) => {
  if (req.method !== "GET") return next();

  const cached = cacheGet(req.originalUrl);
  if (cached) return res.json(cached);

  const original = res.json.bind(res);

  res.json = (data) => {
    cacheSet(req.originalUrl, data);
    return original(data);
  };

  next();
});

/* =====================================================
🔥 SHOP API
===================================================== */
app.get("/api/shops", async (req, res) => {
  if (!Shop) return fail(res, 500);

  const items = await Shop.find().limit(50);
  ok(res, { items });
});

/* =====================================================
🔥 RESERVATION API
===================================================== */
app.post("/api/reservations", async (req, res) => {
  if (!Reservation) return fail(res, 500);

  const r = await Reservation.create({
    userId: req.body.userId,
    shopId: req.body.shopId,
    status: "pending"
  });

  /* 🔥 SOCKET PUSH */
  io.emit("reservation:new", r);

  ok(res, { r });
});

/* =====================================================
🔥 ADMIN
===================================================== */
app.get("/api/admin/stats", async (req, res) => {
  const users = await mongoose.connection.collection("users").countDocuments();
  const shops = Shop ? await Shop.countDocuments() : 0;
  const reservations = Reservation ? await Reservation.countDocuments() : 0;

  ok(res, { users, shops, reservations });
});

/* =====================================================
🔥 SYSTEM
===================================================== */
app.get("/api/system/status", (req, res) => {
  ok(res, {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    requests: REQUEST_COUNT
  });
});

/* =====================================================
🔥 HEALTH
===================================================== */
app.get("/api/health", (req, res) => {
  ok(res, {
    db: mongoose.connection.readyState,
    uptime: process.uptime()
  });
});

/* =====================================================
🔥 SOCKET (확장)
===================================================== */
io.on("connection", (socket) => {

  socket.on("ping", () => {
    socket.emit("pong");
  });

  /* 🔥 USER JOIN */
  socket.on("join:user", (userId) => {
    socket.join(`user:${userId}`);
  });

  /* 🔥 ADMIN JOIN */
  socket.on("join:admin", () => {
    socket.join("admin");
  });

  /* 🔥 BROADCAST */
  socket.on("broadcast", (msg) => {
    io.emit("broadcast", msg);
  });

});

/* =====================================================
🔥 ERROR
===================================================== */
app.use((req, res) => fail(res, 404, "NOT_FOUND"));

app.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "SERVER_ERROR");
});

/* =====================================================
🔥 START
===================================================== */
async function start() {
  try {

    if (dbModule?.connectDB) {
      await dbModule.connectDB();
      console.log("DB CONNECTED");
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log("🚀 SERVER START", PORT);
    });

  } catch (e) {
    console.error(e);
  }
}

start();