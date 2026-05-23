"use strict";

/* =====================================================
🔥 ENV CONFIG (FINAL ULTRA MASTER)
👉 dotenv + validation + fallback + 타입 안전
👉 운영/개발 분리
👉 런타임 검증
👉 전체 프로젝트 공통 환경 관리
===================================================== */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

/* =====================================================
🔥 LOAD ENV FILE
===================================================== */

const ENV_PATH = path.resolve(process.cwd(), ".env");

if (fs.existsSync(ENV_PATH)) {
  dotenv.config({ path: ENV_PATH });
  console.log("🔥 ENV LOADED:", ENV_PATH);
} else {
  console.warn("⚠️ .env file not found, using process.env only");
}

/* =====================================================
🔥 UTIL
===================================================== */

function safeString(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeNumber(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeBool(v, d = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    return ["true", "1", "yes"].includes(v.toLowerCase());
  }
  return d;
}

function required(v, name) {
  if (v === undefined || v === null || v === "") {
    throw new Error(`❌ ENV REQUIRED: ${name}`);
  }
  return v;
}

/* =====================================================
🔥 CORE ENV
===================================================== */

const ENV = {
  NODE_ENV: safeString(process.env.NODE_ENV, "development"),
  PORT: safeNumber(process.env.PORT, 3000),

  APP_NAME: safeString(process.env.APP_NAME, "Massage Platform"),
  APP_URL: safeString(process.env.APP_URL, "http://localhost:3000"),

  /* =========================
     DB
  ========================= */
  MONGO_URI: safeString(
    process.env.MONGO_URI,
    "mongodb://127.0.0.1:27017/massage"
  ),

  /* =========================
     JWT
  ========================= */
  JWT_SECRET: required(
    safeString(process.env.JWT_SECRET, "SUPER_SECRET_KEY_CHANGE_THIS"),
    "JWT_SECRET"
  ),

  JWT_EXPIRES_IN: safeString(process.env.JWT_EXPIRES_IN, "7d"),
  JWT_REFRESH_EXPIRES: safeString(
    process.env.JWT_REFRESH_EXPIRES,
    "30d"
  ),

  /* =========================
     PAYMENT (PG)
  ========================= */
  PAYMENT_PROVIDER: safeString(process.env.PAYMENT_PROVIDER, "mock"),

  KAKAO_PAY_KEY: safeString(process.env.KAKAO_PAY_KEY),
  NAVER_PAY_KEY: safeString(process.env.NAVER_PAY_KEY),
  TOSS_PAY_KEY: safeString(process.env.TOSS_PAY_KEY),

  /* =========================
     CACHE
  ========================= */
  REDIS_URL: safeString(process.env.REDIS_URL, ""),
  CACHE_TTL: safeNumber(process.env.CACHE_TTL, 3000),

  /* =========================
     SECURITY
  ========================= */
  RATE_LIMIT: safeNumber(process.env.RATE_LIMIT, 100),
  RATE_WINDOW: safeNumber(process.env.RATE_WINDOW, 1000),

  CORS_ORIGIN: safeString(process.env.CORS_ORIGIN, "*"),

  /* =========================
     LOGGING
  ========================= */
  LOG_LEVEL: safeString(process.env.LOG_LEVEL, "dev"),

  /* =========================
     FEATURE FLAGS
  ========================= */
  ENABLE_CACHE: safeBool(process.env.ENABLE_CACHE, true),
  ENABLE_LOGGER: safeBool(process.env.ENABLE_LOGGER, true),
  ENABLE_PAYMENT: safeBool(process.env.ENABLE_PAYMENT, true),

  /* =========================
     DEBUG
  ========================= */
  DEBUG: safeBool(process.env.DEBUG, true)
};

/* =====================================================
🔥 ENV VALIDATION
===================================================== */

function validateEnv() {
  const errors = [];

  if (!ENV.JWT_SECRET || ENV.JWT_SECRET.length < 10) {
    errors.push("JWT_SECRET too weak");
  }

  if (!ENV.MONGO_URI.includes("mongodb")) {
    errors.push("Invalid MONGO_URI");
  }

  if (ENV.PORT <= 0) {
    errors.push("Invalid PORT");
  }

  if (errors.length) {
    console.error("❌ ENV VALIDATION FAILED:");
    errors.forEach((e) => console.error(" -", e));

    if (ENV.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}

validateEnv();

/* =====================================================
🔥 ENV HELPERS
===================================================== */

ENV.isDev = ENV.NODE_ENV === "development";
ENV.isProd = ENV.NODE_ENV === "production";
ENV.isTest = ENV.NODE_ENV === "test";

/* =====================================================
🔥 FREEZE (안전)
===================================================== */
Object.freeze(ENV);

/* =====================================================
🔥 RUNTIME WATCH (추가 기능)
===================================================== */

if (!global.__ENV_WATCH__) {
  global.__ENV_WATCH__ = true;

  setInterval(() => {
    if (ENV.DEBUG) {
      const mem = process.memoryUsage().heapUsed / 1024 / 1024;
      if (mem > 500) {
        console.warn("⚠️ ENV WATCH MEMORY HIGH:", mem.toFixed(2) + "MB");
      }
    }
  }, 60000);
}

/* =====================================================
🔥 EXPORT
===================================================== */

console.log("🔥 ENV CONFIG READY:", ENV.NODE_ENV);

module.exports = ENV;