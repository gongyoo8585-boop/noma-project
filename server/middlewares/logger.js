"use strict";

/**
 * =====================================================
 * 🔥 LOGGER MIDDLEWARE (ULTRA FINAL)
 * ✔ 모든 HTTP 요청 로그 기록
 * ✔ 응답 시간 측정
 * ✔ 에러 추적
 * ✔ log.service 연동
 * ✔ 요청 ID (traceId) 추가
 * ✔ body / query 선택적 로깅
 * ✔ 실서비스 운영 최적화
 * =====================================================
 */

const logger = require("../services/log.service");

/* =========================
traceId 생성
========================= */
function generateTraceId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

/* =========================
Logger Middleware
========================= */
module.exports = function (req, res, next) {
  const start = Date.now();
  const traceId = generateTraceId();

  /* traceId 주입 */
  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);

  /* 요청 시작 로그 */
  logger.info("REQUEST_START", {
    traceId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    user: req.user?.id || req.user?._id,
    query: req.query,
    body: process.env.LOG_BODY === "true" ? req.body : undefined,
  });

  /* 응답 완료 후 */
  res.on("finish", () => {
    const duration = Date.now() - start;

    const meta = {
      traceId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      user: req.user?.id || req.user?._id,
    };

    if (res.statusCode >= 500) {
      logger.error("REQUEST_ERROR", meta);
    } else if (res.statusCode >= 400) {
      logger.warn("REQUEST_WARN", meta);
    } else {
      logger.info("REQUEST_SUCCESS", meta);
    }
  });

  /* 에러 캐치 */
  res.on("error", (err) => {
    logger.exception(err, {
      traceId,
      method: req.method,
      url: req.originalUrl,
    });
  });

  next();
};