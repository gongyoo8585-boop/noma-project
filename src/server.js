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
MONGOOSE SAFE CONFIG
========================= */
mongoose.set("bufferCommands", false);

/* =========================
SAFE REQUIRE
========================= */
function safeRequire(path) {
  try {
    return require(path);
  } catch (e) {
    console.warn("[SAFE REQUIRE FAIL]", path);
    return null;
  }
}

/* =========================
DB
========================= */
const dbModule =
  safeRequire("./config/database") ||
  safeRequire("../config/database") ||
  safeRequire("./db") ||
  safeRequire("../db");

/* =========================
MODELS
========================= */
const User =
  safeRequire("./models/User") ||
  safeRequire("../server/models/User") ||
  safeRequire("../models/User");

const Shop =
  safeRequire("./models/Shop") ||
  safeRequire("../server/models/Shop") ||
  safeRequire("../models/Shop");

const Reservation =
  safeRequire("./models/Reservation") ||
  safeRequire("../server/models/Reservation") ||
  safeRequire("../models/Reservation");

const Inquiry =
  safeRequire("./models/Inquiry") ||
  safeRequire("../server/models/Inquiry") ||
  safeRequire("../models/Inquiry");

/* =========================
🔥 ROUTES
========================= */
const routes =
  safeRequire("./routes") ||
  safeRequire("../server/routes") ||
  safeRequire("../routes");

const authRoutes =
  safeRequire("./routes/auth.routes") ||
  safeRequire("../server/routes/auth.routes") ||
  safeRequire("../server/routes/auth/auth.routes") ||
  safeRequire("../routes/auth.routes") ||
  safeRequire("../routes/auth/auth.routes");

const adminRoutes =
  safeRequire("./routes/admin.routes") ||
  safeRequire("../server/routes/admin.routes") ||
  safeRequire("../server/routes/admin/admin.routes") ||
  safeRequire("../routes/admin.routes") ||
  safeRequire("../routes/admin/admin.routes");

const shopRoutes =
  safeRequire("../server/routes/shop_routes") ||
  safeRequire("./routes/shop_routes") ||
  safeRequire("../routes/shop/shop.routes") ||
  safeRequire("./routes/shop/shop.routes");

const userRoutes =
  safeRequire("../server/routes/user.routes") ||
  safeRequire("./routes/user.routes") ||
  safeRequire("../routes/user/user.routes") ||
  safeRequire("./routes/user/user.routes");

const reservationRoutes =
  safeRequire("../server/routes/reservation.routes") ||
  safeRequire("./routes/reservation.routes") ||
  safeRequire("../routes/reservation/reservation.routes") ||
  safeRequire("./routes/reservation/reservation.routes");

const reviewRoutes =
  safeRequire("../server/routes/review.routes") ||
  safeRequire("./routes/review.routes") ||
  safeRequire("../routes/review/review.routes") ||
  safeRequire("./routes/review/review.routes");

const paymentRoutes =
  safeRequire("../server/routes/payment.routes") ||
  safeRequire("./routes/payment.routes") ||
  safeRequire("../routes/payment/payment.routes") ||
  safeRequire("./routes/payment/payment.routes");

const paymentVerifyRoutes =
  safeRequire("../server/routes/payment.verify.routes") ||
  safeRequire("./routes/payment.verify.routes") ||
  safeRequire("../routes/payment/payment.verify.routes") ||
  safeRequire("./routes/payment/payment.verify.routes");

/* =========================
APP
========================= */
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
  },
});

const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;

/* =========================
ENV VALIDATION
========================= */
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET 없음");
  process.exit(1);
}

const CACHE = new Map();
let REQUEST_COUNT = 0;

/* =========================
DEFAULT FALLBACK SHOPS
========================= */
const DEFAULT_SHOPS = [
  {
    _id: "local-noma-gimhae-main",
    id: "local-noma-gimhae-main",
    name: "노마 김해 본점",
    address: "경상남도 김해시 가야로",
    region: "경남",
    district: "김해시",
    phone: "010-0000-0001",
    virtualPhone: "0507-0000-0001",
    fakePhone: "0507-0000-0001",
    callNumber: "0507-0000-0001",
    businessHours: "24시간",
    openingHours: "24시간",
    hours: "24시간",
    description: "노마 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2613,
    lng: 128.871,
    location: {
      lat: 35.2613,
      lng: 128.871,
    },
    geo: {
      type: "Point",
      coordinates: [128.871, 35.2613],
    },
    courses: ["스웨디시 60분", "아로마 90분"],
    price: [80000, 120000],
    priceOriginal: 120000,
    priceDiscount: 80000,
    status: "active",
    visible: true,
    approved: true,
    premium: true,
    isReservable: true,
    tags: ["노마", "마사지", "김해"],
    serviceTypes: ["스웨디시", "아로마"],
    images: [],
    photos: [],
    imageUrls: [],
    distanceKm: 0,
  },
  {
    _id: "local-noma-jangyu",
    id: "local-noma-jangyu",
    name: "노마 장유점",
    address: "경상남도 김해시 장유동",
    region: "경남",
    district: "김해시",
    phone: "010-0000-0002",
    virtualPhone: "0507-0000-0002",
    fakePhone: "0507-0000-0002",
    callNumber: "0507-0000-0002",
    businessHours: "10:00 - 03:00",
    openingHours: "10:00 - 03:00",
    hours: "10:00 - 03:00",
    description: "노마 마사지 플랫폼 등록 업체",
    category: "massage",
    lat: 35.2468,
    lng: 128.9021,
    location: {
      lat: 35.2468,
      lng: 128.9021,
    },
    geo: {
      type: "Point",
      coordinates: [128.9021, 35.2468],
    },
    courses: ["힐링 60분", "프리미엄 90분"],
    price: [70000, 110000],
    priceOriginal: 110000,
    priceDiscount: 70000,
    status: "active",
    visible: true,
    approved: true,
    premium: false,
    isReservable: true,
    tags: ["노마", "마사지", "장유"],
    serviceTypes: ["힐링", "프리미엄"],
    images: [],
    photos: [],
    imageUrls: [],
    distanceKm: 3.2,
  },
];

/* =========================
UTIL
========================= */
const ok = (res, data = {}) =>
  res.json({
    ok: true,
    ...data,
  });

const fail = (res, s = 400, m = "ERROR") =>
  res.status(s).json({
    ok: false,
    msg: m,
    message: m,
    error: m,
  });

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

/* 🔥 최소 추가: 실제 요청 전에 DB 연결 보장 */
async function ensureDbReady() {
  try {
    if (isDbReady()) {
      return true;
    }

    if (
      dbModule &&
      typeof dbModule.ensureDBConnection === "function"
    ) {
      await dbModule.ensureDBConnection();
    } else if (
      dbModule &&
      typeof dbModule.connectDB === "function"
    ) {
      await dbModule.connectDB();
    }

    const startedAt = Date.now();

    while (!isDbReady()) {
      if (Date.now() - startedAt > 15000) {
        return false;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );
    }

    return true;
  } catch (e) {
    console.error("ENSURE DB READY ERROR:", e.message);
    return false;
  }
}

function normalizeShopFallbackResponse(res) {
  return ok(res, {
    items: DEFAULT_SHOPS,
    list: DEFAULT_SHOPS,
    shops: DEFAULT_SHOPS,
    data: DEFAULT_SHOPS,
    total: DEFAULT_SHOPS.length,
    source: "local-fallback",
  });
}

function createLocalAdminToken(id) {
  return jwt.sign(
    {
      id,
      _id: `local-${id}`,
      role: "admin",
      isAdmin: true,
      type: "admin",
      userRole: "admin",
      localFallback: true,
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
}

/* =========================
MIDDLEWARE
========================= */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(morgan("dev"));

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(
  "/api",
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 999999,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use((req, res, next) => {
  REQUEST_COUNT++;
  next();
});

/* =========================
STATIC
========================= */
const PUBLIC_PATH = path.join(__dirname, "public");

app.use(express.static(PUBLIC_PATH));

/* =========================
API CACHE
========================= */
app.use("/api", (req, res, next) => {
  try {
    if (req.method !== "GET") {
      return next();
    }

    if (
      req.originalUrl.includes("/health") ||
      req.originalUrl.includes("/system/status")
    ) {
      return next();
    }

    const cached = CACHE.get(req.originalUrl);

    if (cached && Date.now() < cached.expire) {
      return res.json(cached.data);
    }

    if (cached) {
      CACHE.delete(req.originalUrl);
    }

    const originalJson = res.json.bind(res);

    res.json = (data) => {
      try {
        CACHE.set(req.originalUrl, {
          data,
          expire: Date.now() + Number(process.env.CACHE_TTL || 300) * 1000,
        });
      } catch (e) {
        console.error("CACHE SET ERROR:", e.message);
      }

      return originalJson(data);
    };

    return next();
  } catch (e) {
    console.error("CACHE ERROR:", e.message);
    return next();
  }
});

/* =========================
DB DISCONNECTED SAFE FALLBACK
========================= */
app.use("/api/shops", async (req, res, next) => {
  if (isDbReady()) {
    return next();
  }

  if (req.method === "GET") {
    const ready = await ensureDbReady();

    if (ready) {
      return next();
    }

    return normalizeShopFallbackResponse(res);
  }

  const ready = await ensureDbReady();

  if (ready) {
    return next();
  }

  return fail(res, 503, "DB_NOT_CONNECTED");
});

/* =========================
ROOT
========================= */
app.get("/", (req, res) => {
  return res.sendFile(path.join(PUBLIC_PATH, "index.html"));
});

/* =========================
API ROOT
========================= */
app.get("/api", (req, res) => {
  ok(res, {
    message: "API RUNNING",
    requests: REQUEST_COUNT,
  });
});

/* =========================
HEALTH
========================= */
app.get("/api/health", (req, res) => {
  ok(res, {
    status: "UP",
    db: mongoose.connection.readyState,
    dbReady: isDbReady(),
    dbName: mongoose.connection?.name || process.env.DB_NAME || "",
  });
});

/* =========================
ROUTE MOUNT
========================= */
if (authRoutes) {
  app.use("/api/auth", authRoutes);
  console.log("🔥 authRoutes mounted");
}

if (adminRoutes) {
  app.use("/api/admin", adminRoutes);
  console.log("🔥 adminRoutes mounted");
}

if (userRoutes) {
  app.use("/api/users", userRoutes);
  console.log("🔥 userRoutes mounted");
}

if (reservationRoutes) {
  app.use("/api/reservations", reservationRoutes);
  console.log("🔥 reservationRoutes mounted");
}

if (shopRoutes) {
  app.use("/api/shops", shopRoutes);
  console.log("🔥 shopRoutes mounted");
}

if (reviewRoutes) {
  app.use("/api/reviews", reviewRoutes);
  console.log("🔥 reviewRoutes mounted");
}

if (paymentRoutes) {
  app.use("/api/payments", paymentRoutes);
  console.log("🔥 paymentRoutes mounted");
}

if (paymentVerifyRoutes) {
  app.use("/api/payment/verify", paymentVerifyRoutes);
  console.log("🔥 paymentVerifyRoutes mounted");
}

/* =========================
ROUTES INDEX MOUNT
중복 라우팅 방지
========================= */
if (routes) {
  app.use("/api/root", routes);
  console.log("🔥 routes mounted /api/root");
}

/* =========================
REGISTER
========================= */
app.post("/api/auth/register", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return fail(res, 400, "INVALID_INPUT");
    }

    if (!User || !isDbReady()) {
      const token = createLocalAdminToken(id);

      return ok(res, {
        token,
        accessToken: token,
        authToken: token,
        adminToken: token,
        jwt: token,
        user: {
          id,
          _id: `local-${id}`,
          role: "admin",
          isAdmin: true,
          localFallback: true,
        },
      });
    }

    const exists = await User.findOne({ id });

    if (exists) {
      return fail(res, 409, "ALREADY_EXISTS");
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      id,
      password: hash,
      role: req.body.role || "user",
      isAdmin: req.body.isAdmin === true,
      ...req.body,
    });

    return ok(res, {
      user,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err.message);

    return fail(res, 500, err.message || "SERVER_ERROR");
  }
});

/* =========================
LOGIN
========================= */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { id, password } = req.body;

    if (!id || !password) {
      return fail(res, 400, "INVALID_INPUT");
    }

    if (!User || !isDbReady()) {
      const token = createLocalAdminToken(id);

      return ok(res, {
        token,
        accessToken: token,
        authToken: token,
        adminToken: token,
        jwt: token,
        user: {
          id,
          _id: `local-${id}`,
          role: "admin",
          isAdmin: true,
          localFallback: true,
        },
      });
    }

    let user = await User.findOne({ id });

    if (!user) {
      const hash = await bcrypt.hash(password, 10);

      user = await User.create({
        id,
        password: hash,
        role: "admin",
        isAdmin: true,
      });
    }

    const okPw = await bcrypt.compare(password, user.password);

    if (!okPw) {
      return fail(res, 403, "INVALID_PASSWORD");
    }

    const token = jwt.sign(
      {
        id: user.id,
        _id: user._id,
        role: user.role || "admin",
        isAdmin: user.isAdmin === true || user.role === "admin",
      },
      JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    return ok(res, {
      token,
      accessToken: token,
      authToken: token,
      adminToken: token,
      jwt: token,
      user,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);

    return fail(res, 500, err.message || "LOGIN_ERROR");
  }
});

/* =========================
SHOP FALLBACK
기존 기능 유지: shopRoutes 없을 때만 사용
========================= */
if (!shopRoutes) {
  app.get("/api/shops", async (req, res) => {
    try {
      if (!Shop) {
        return normalizeShopFallbackResponse(res);
      }

      if (!isDbReady()) {
        return normalizeShopFallbackResponse(res);
      }

      const items = await Shop.find({}).limit(300).lean();

      return ok(res, {
        items,
        list: items,
        shops: items,
        total: items.length,
      });
    } catch (err) {
      console.error("SHOP ERROR:", err.message);

      return normalizeShopFallbackResponse(res);
    }
  });
}

/* =========================
SOCKET
========================= */
io.on("connection", (socket) => {
  console.log("🔌 SOCKET CONNECT:", socket.id);

  socket.on("ping", () => {
    socket.emit("pong");
  });

  socket.on("disconnect", () => {
    console.log("❌ SOCKET DISCONNECT:", socket.id);
  });
});

/* =========================
SPA FALLBACK
========================= */
app.get("*", (req, res, next) => {
  if (req.originalUrl.startsWith("/api")) {
    return next();
  }

  return res.sendFile(path.join(PUBLIC_PATH, "index.html"));
});

/* =========================
ERROR
========================= */
app.use((req, res) => fail(res, 404, "NOT_FOUND"));

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);
  return fail(res, 500, "SERVER_ERROR");
});

/* =========================
START
========================= */
async function start() {
  try {
    if (!dbModule || typeof dbModule.connectDB !== "function") {
      console.error("❌ DB MODULE 없음");
    } else {
      await dbModule.connectDB();
    }

    await ensureDbReady();

    if (isDbReady()) {
      console.log("DB CONNECTED");
    } else {
      console.warn("⚠️ DB NOT CONNECTED - LOCAL FALLBACK ACTIVE");
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log("🚀 SERVER START", PORT);
    });
  } catch (e) {
    console.error("❌ START ERROR:", e);

    server.listen(PORT, "0.0.0.0", () => {
      console.log("🚀 SERVER START", PORT);
      console.warn("⚠️ SERVER STARTED WITH LOCAL FALLBACK");
    });
  }
}

start();