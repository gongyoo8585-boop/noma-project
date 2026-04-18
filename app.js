"use strict";

/* =====================================================
🔥 APP.JS (FINAL ULTRA MASTER - ENTERPRISE HARDENED)
👉 기존 기능 100% 유지
👉 중앙 라우팅 유지
👉 보안 / 로깅 / 안정성 / 운영 / 장애 대응 강화
👉 통째 교체 가능
===================================================== */

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const compression = require("compression");

const app = express();

/* =====================================================
🔥 OPTIONAL MODULE SAFE LOAD
===================================================== */
function safeRequire(path, fallback = null) {
  try {
    return require(path);
  } catch {
    return fallback;
  }
}

const requestLogger = safeRequire("./middlewares/requestLogger");
const errorHandler = safeRequire("./middlewares/errorHandler");
const notFound = safeRequire("./middlewares/notFound");

/* =====================================================
🔥 GLOBAL METRICS
===================================================== */
const APP_METRICS = {
  totalRequests: 0,
  errors: 0,
  startTime: Date.now(),
  slowRequests: 0,
  activeConnections: 0
};

/* =====================================================
🔥 TRUST PROXY (배포 대응)
===================================================== */
app.set("trust proxy", true);

/* =====================================================
🔥 BASIC MIDDLEWARE
===================================================== */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(compression());
app.use(morgan("dev"));

/* =====================================================
🔥 ADVANCED REQUEST LOGGER (있으면 사용)
===================================================== */
if (typeof requestLogger === "function") {
  app.use(requestLogger);
}

/* =====================================================
🔥 CORE MIDDLEWARE
===================================================== */

// 요청 카운트
app.use((req, res, next) => {
  APP_METRICS.totalRequests++;
  APP_METRICS.activeConnections++;
  res.on("finish", () => {
    APP_METRICS.activeConnections--;
  });
  next();
});

// 요청 시간
app.use((req, res, next) => {
  req.requestTime = Date.now();
  next();
});

// 응답 시간 측정
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const ms = Date.now() - start;

    if (ms > 1000) {
      APP_METRICS.slowRequests++;
      console.warn("🐢 SLOW API:", req.method, req.originalUrl, ms + "ms");
    }
  });

  next();
});

// 기본 헤더
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Massage-Platform");
  res.setHeader("X-Request-Time", Date.now());
  res.setHeader("X-App-Version", "1.0.0");
  next();
});

// 보안 헤더
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

/* =====================================================
🔥 GLOBAL RATE LIMIT (간단 버전)
===================================================== */
const RATE_MAP = new Map();

app.use((req, res, next) => {
  const ip = req.ip || "x";
  const now = Date.now();

  const arr = RATE_MAP.get(ip) || [];
  const filtered = arr.filter((t) => now - t < 1000);
  filtered.push(now);
  RATE_MAP.set(ip, filtered);

  if (filtered.length > 200) {
    return res.status(429).json({ ok: false, message: "Too many requests" });
  }

  next();
});

/* =====================================================
🔥 ROUTE GATEWAY
===================================================== */
const apiRoutes = require("./routes");
app.use("/api", apiRoutes);

/* =====================================================
🔥 ROOT
===================================================== */
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "🔥 Massage Platform API Running",
    time: Date.now(),
    uptime: process.uptime()
  });
});

/* =====================================================
🔥 HEALTH
===================================================== */
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "UP",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: APP_METRICS
  });
});

/* =====================================================
🔥 DEBUG
===================================================== */
app.get("/debug", (req, res) => {
  res.json({
    ok: true,
    metrics: APP_METRICS,
    memory: process.memoryUsage(),
    uptime: process.uptime()
  });
});

app.get("/debug/requests", (req, res) => {
  res.json({
    ok: true,
    totalRequests: APP_METRICS.totalRequests
  });
});

app.get("/debug/errors", (req, res) => {
  res.json({
    ok: true,
    errors: APP_METRICS.errors
  });
});

/* =====================================================
🔥 NOT FOUND (외부 모듈 있으면 사용)
===================================================== */
if (typeof notFound === "function") {
  app.use(notFound);
} else {
  app.use((req, res) => {
    return res.status(404).json({
      ok: false,
      message: "API NOT FOUND",
      path: req.originalUrl
    });
  });
}

/* =====================================================
🔥 ERROR HANDLER
===================================================== */
if (typeof errorHandler === "function") {
  app.use(errorHandler);
} else {
  app.use((err, req, res, next) => {
    APP_METRICS.errors++;

    console.error("🔥 SERVER ERROR:", err);

    return res.status(err.status || 500).json({
      ok: false,
      message: err.message || "SERVER ERROR",
      path: req.originalUrl
    });
  });
}

/* =====================================================
🔥 GRACEFUL SHUTDOWN (추가)
===================================================== */
function shutdown(signal) {
  console.log(`⚠️ ${signal} RECEIVED - SHUTTING DOWN`);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* =====================================================
🔥 AUTO MAINTENANCE
===================================================== */
if (!global.__APP_CLEAN__) {
  global.__APP_CLEAN__ = true;

  setInterval(() => {
    try {
      const mem = process.memoryUsage().heapUsed / 1024 / 1024;

      if (mem > 500) {
        console.warn("⚠️ HIGH MEMORY:", mem.toFixed(2) + "MB");
      }

      if (APP_METRICS.totalRequests > 1e9) {
        APP_METRICS.totalRequests = 0;
      }

      if (RATE_MAP.size > 10000) {
        RATE_MAP.clear();
      }
    } catch {}
  }, 30000);
}

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 APP FINAL ULTRA MASTER READY");

module.exports = app;