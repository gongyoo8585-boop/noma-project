"use strict";

/* =====================================================
🔥 CORS CONFIG (FINAL ULTRA MASTER)
👉 환경별 CORS 제어
👉 화이트리스트 / 동적 origin 검사
👉 보안 강화 + 운영 대응
👉 통째 교체 가능
===================================================== */

const ENV = (() => {
  try {
    return require("./env");
  } catch (_) {
    return {
      NODE_ENV: "development",
      CORS_ORIGIN: "*"
    };
  }
})();

/* =====================================================
🔥 UTIL
===================================================== */

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function parseList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function matchOrigin(origin, allowed = []) {
  if (!origin) return true; // 서버간 요청 허용

  return allowed.some((rule) => {
    if (rule === "*") return true;
    if (rule === origin) return true;

    // 🔥 서브도메인 허용 (*.example.com)
    if (rule.startsWith("*.")) {
      const base = rule.slice(2);
      return origin.endsWith(base);
    }

    return false;
  });
}

/* =====================================================
🔥 CONFIG
===================================================== */

// ENV에서 origin 리스트 가져오기
const ALLOW_LIST = parseList(ENV.CORS_ORIGIN || "*");

// 기본 설정
const BASE_CONFIG = {
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Access-Token"
  ],
  exposedHeaders: ["X-Request-Time", "X-Trace-Id"],
  maxAge: 86400 // 24h
};

/* =====================================================
🔥 DYNAMIC ORIGIN HANDLER
===================================================== */

function originHandler(origin, callback) {
  try {
    // 개발환경은 전부 허용
    if (ENV.NODE_ENV === "development") {
      return callback(null, true);
    }

    // whitelist 검사
    if (matchOrigin(origin, ALLOW_LIST)) {
      return callback(null, true);
    }

    console.warn("❌ CORS BLOCKED:", origin);

    return callback(new Error("CORS NOT ALLOWED"), false);

  } catch (e) {
    console.error("CORS ERROR:", e.message);
    return callback(new Error("CORS ERROR"), false);
  }
}

/* =====================================================
🔥 FINAL CONFIG
===================================================== */

const corsOptions = {
  ...BASE_CONFIG,
  origin: originHandler
};

/* =====================================================
🔥 DEBUG
===================================================== */

function debugCors() {
  return {
    env: ENV.NODE_ENV,
    allowList: ALLOW_LIST
  };
}

/* =====================================================
🔥 RUNTIME UPDATE (추가 기능)
===================================================== */

function addOrigin(origin) {
  if (!origin) return false;
  if (!ALLOW_LIST.includes(origin)) {
    ALLOW_LIST.push(origin);
    return true;
  }
  return false;
}

function removeOrigin(origin) {
  const idx = ALLOW_LIST.indexOf(origin);
  if (idx >= 0) {
    ALLOW_LIST.splice(idx, 1);
    return true;
  }
  return false;
}

/* =====================================================
🔥 EXPORT
===================================================== */

module.exports = {
  corsOptions,
  debugCors,
  addOrigin,
  removeOrigin
};

console.log("🔥 CORS CONFIG READY");