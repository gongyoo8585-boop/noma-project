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
const { Server } = require("socket.io");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
function safeRequire(modulePath, fallback = null) {
  try {
    return require(modulePath);
  } catch (err) {
    console.warn("[SAFE REQUIRE FAIL]", modulePath, "-", err.message);
    return fallback;
  }
}

/* =====================================================
🔥 DB BOOTSTRAP
===================================================== */
const dbModule =
  safeRequire("./config/database", null) ||
  safeRequire("./db", null);

/* =====================================================
🔥 MODELS
===================================================== */
const User = safeRequire("./models/User", null);
const Shop = safeRequire("./models/Shop", null);
const Reservation = safeRequire("./models/Reservation", null);
const Inquiry = safeRequire("./models/Inquiry", null);

/* =====================================================
🔥 ROUTES
===================================================== */
const favoritesRouter = safeRequire("./routes/favorites", null);
const usersRouter = safeRequire("./routes/users", null);
const adminRouter = safeRequire("./routes/admin", null);

/* =====================================================
🔥 APP / SERVER
===================================================== */
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  }
});

app.set("io", io);

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const PORT = Number(process.env.PORT || 10000);

/* =====================================================
🔥 GLOBAL STATE
===================================================== */
let ERROR_COUNT = 0;
const CACHE = new Map();
const FAST_IP_MAP = new Map();

/* =====================================================
🔥 UTILS
===================================================== */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

function isObjectId(v) {
  return /^[0-9a-fA-F]{24}$/.test(String(v || ""));
}

function ok(res, data = {}) {
  return res.json({ ok: true, ...data });
}

function fail(res, status = 400, msg = "ERROR", extra = {}) {
  return res.status(status).json({ ok: false, msg, ...extra });
}

function getCache(key) {
  const item = CACHE.get(key);
  if (!item) return null;
  if (Date.now() > item.expire) {
    CACHE.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttl = 5000) {
  CACHE.set(key, {
    data,
    expire: Date.now() + ttl
  });
}

/* =====================================================
🔥 MIDDLEWARE
===================================================== */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan("dev"));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* =====================================================
🔥 RATE LIMIT
===================================================== */
app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

/* =====================================================
🔥 FAST LIMIT
===================================================== */
app.use("/api", (req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "x";
  const now = Date.now();
  const prev = FAST_IP_MAP.get(ip) || 0;

  if (now - prev < 30) {
    return fail(res, 429, "too fast");
  }

  FAST_IP_MAP.set(ip, now);
  next();
});

/* =====================================================
🔥 SOCKET
===================================================== */
io.on("connection", (socket) => {
  socket.on("ping", () => socket.emit("pong"));
});

/* =====================================================
🔥 AUTH
===================================================== */
function auth(req, res, next) {
  try {
    const raw = String(req.headers.authorization || "");
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : raw;

    if (!token) {
      return fail(res, 401, "UNAUTHORIZED");
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return fail(res, 401, "UNAUTHORIZED");
  }
}

/* =====================================================
🔥 ROUTER 연결
===================================================== */
if (usersRouter) app.use("/api/users", usersRouter);
if (adminRouter) app.use("/api/admin", adminRouter);
if (favoritesRouter) app.use("/api/favorites", favoritesRouter);

/* =====================================================
🔥 AUTO CACHE
===================================================== */
app.use("/api", (req, res, next) => {
  if (req.method !== "GET") return next();

  const key = req.originalUrl;
  const cached = getCache(key);

  if (cached) {
    return res.json({
      ...(typeof cached === "object" && cached !== null ? cached : { data: cached }),
      cache: true
    });
  }

  const originalJson = res.json.bind(res);

  res.json = (data) => {
    try {
      if (!res.headersSent && res.statusCode < 400) {
        setCache(key, data);
      }
    } catch (e) {}
    return originalJson(data);
  };

  next();
});

/* =====================================================
🔥 ROOT
===================================================== */
app.get("/", (req, res) => {
  ok(res, {
    message: "NOMA SERVER RUNNING",
    port: PORT,
    uptime: process.uptime()
  });
});

/* =====================================================
🔥 AUTH LOGIN
===================================================== */
app.post("/api/auth/login", asyncHandler(async (req, res) => {
  if (!User) return fail(res, 500, "MODEL");

  const { id, password } = req.body || {};
  if (!id || !password) return fail(res, 400, "INVALID_INPUT");

  let user = await User.findOne({ id });

  if (!user) {
    const hash = await bcrypt.hash(password, 10);
    user = await User.create({ id, password: hash });
  }

  const okPw = await bcrypt.compare(password, user.password);
  if (!okPw) return fail(res, 403, "INVALID_PASSWORD");

  const token = jwt.sign(
    { id: user.id, role: user.role || "user" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return ok(res, { token });
}));

/* =====================================================
🔥 SHOP
===================================================== */
app.get("/api/shops", asyncHandler(async (req, res) => {
  if (!Shop) return fail(res, 500, "MODEL");

  const items = await Shop.find().limit(50);
  return ok(res, { items });
}));

/* =====================================================
🔥 RESERVATION
===================================================== */
app.post("/api/reservations", auth, asyncHandler(async (req, res) => {
  if (!Reservation) return fail(res, 500, "MODEL");

  const { shopId } = req.body || {};
  if (!isObjectId(shopId)) return fail(res, 400, "INVALID_SHOP_ID");

  const exists = await Reservation.findOne({
    userId: req.user.id,
    shopId,
    status: "pending"
  });

  if (exists) return fail(res, 400, "already");

  const reservation = await Reservation.create({
    userId: req.user.id,
    shopId,
    status: "pending"
  });

  return ok(res, { reservation });
}));

/* =====================================================
🔥 ADMIN
===================================================== */
app.get("/api/admin/stats", asyncHandler(async (req, res) => {
  if (!User || !Shop || !Reservation) return fail(res, 500, "MODEL");

  const [users, shops, reservations] = await Promise.all([
    User.countDocuments(),
    Shop.countDocuments(),
    Reservation.countDocuments()
  ]);

  return ok(res, { users, shops, reservations });
}));

/* =====================================================
🔥 INQUIRY
===================================================== */
app.get("/api/inquiries", asyncHandler(async (req, res) => {
  if (!Inquiry) return fail(res, 500, "MODEL");

  const items = await Inquiry.find().limit(50);
  return ok(res, { items });
}));

/* =====================================================
🔥 HEALTH
===================================================== */
app.get("/api/health", (req, res) => {
  ok(res, {
    db: mongoose.connection.readyState,
    uptime: process.uptime(),
    errors: ERROR_COUNT
  });
});

/* =====================================================
🔥 404
===================================================== */
app.use((req, res) => {
  return fail(res, 404, "NOT_FOUND");
});

/* =====================================================
🔥 ERROR
===================================================== */
app.use((err, req, res, next) => {
  ERROR_COUNT++;
  console.error("[SERVER ERROR]", err);
  return fail(res, 500, err.message || "INTERNAL_SERVER_ERROR");
});

/* =====================================================
🔥 INTERVAL 보호
===================================================== */
setInterval(() => {
  try {
    if (CACHE.size > 1000) CACHE.clear();
    if (FAST_IP_MAP.size > 10000) FAST_IP_MAP.clear();
  } catch (e) {}
}, 60000);

/* =====================================================
🔥 START
===================================================== */
async function bootstrap() {
  try {
    if (dbModule && typeof dbModule.connectDB === "function") {
      await dbModule.connectDB();
      console.log("DB 연결 성공");
    } else {
      console.log("DB 모듈 없음 또는 connectDB 없음 - 계속 진행");
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log("🚀 SERVER START:", PORT);
    });
  } catch (err) {
    console.error("서버 실행 실패:", err);
    process.exit(1);
  }
}

bootstrap();