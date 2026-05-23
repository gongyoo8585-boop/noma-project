"use strict";

/**
 * =====================================================
 * 🔥 LOG SERVICE (FINAL COMPLETE)
 * ✔ 통합 로그 관리 (info / warn / error / debug)
 * ✔ 파일 로그 + 콘솔 로그
 * ✔ 환경별 로그 레벨 제어
 * ✔ 요청/에러 추적용 메타데이터 지원
 * ✔ 운영 가능한 수준
 * =====================================================
 */

const fs = require("fs");
const path = require("path");

/* =========================
ENV
========================= */
const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const LOG_FILE_ENABLED = process.env.LOG_FILE_ENABLED === "true";
const LOG_FILE_PATH = process.env.LOG_FILE_PATH || "./logs";

/* =========================
LEVEL 우선순위
========================= */
const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;

/* =========================
로그 폴더 생성
========================= */
if (LOG_FILE_ENABLED) {
  if (!fs.existsSync(LOG_FILE_PATH)) {
    fs.mkdirSync(LOG_FILE_PATH, { recursive: true });
  }
}

/* =========================
시간 포맷
========================= */
function getTime() {
  return new Date().toISOString();
}

/* =========================
로그 문자열 생성
========================= */
function format(level, message, meta = {}) {
  let base = `[${getTime()}] [${level.toUpperCase()}] ${message}`;

  if (meta && Object.keys(meta).length > 0) {
    base += " | " + JSON.stringify(meta);
  }

  return base;
}

/* =========================
파일 기록
========================= */
function writeFile(level, log) {
  if (!LOG_FILE_ENABLED) return;

  const filename = `${level}.log`;
  const filePath = path.join(LOG_FILE_PATH, filename);

  fs.appendFile(filePath, log + "\n", (err) => {
    if (err) {
      console.error("LOG FILE WRITE ERROR:", err.message);
    }
  });
}

/* =========================
핵심 로그 함수
========================= */
function log(level, message, meta = {}) {
  if (LEVELS[level] > currentLevel) return;

  const output = format(level, message, meta);

  /* 콘솔 출력 */
  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }

  /* 파일 출력 */
  writeFile(level, output);
}

/* =========================
외부 API
========================= */
const logger = {
  error(message, meta) {
    log("error", message, meta);
  },

  warn(message, meta) {
    log("warn", message, meta);
  },

  info(message, meta) {
    log("info", message, meta);
  },

  debug(message, meta) {
    log("debug", message, meta);
  },

  /* =========================
  🔥 HTTP 로그용
  ========================= */
  http(req, res, extra = {}) {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      user: req.user?.id,
      status: res.statusCode,
      ...extra,
    };

    log("info", "HTTP_REQUEST", meta);
  },

  /* =========================
  🔥 에러 로그용
  ========================= */
  exception(err, context = {}) {
    log("error", err.message, {
      stack: err.stack,
      ...context,
    });
  },
};

module.exports = logger;