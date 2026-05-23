"use strict";

/**
 * =====================================================
 * 🔥 TRANSACTION MIDDLEWARE (ULTRA FINAL)
 * ✔ MongoDB 트랜잭션 자동 처리
 * ✔ 요청 단위 session 관리
 * ✔ 성공 → commit / 실패 → rollback
 * ✔ double commit / double rollback 방지
 * ✔ 타임아웃 보호
 * ✔ traceId 연동
 * ✔ 서비스 레이어 연동 강화
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

const mongoose = require("mongoose");
const logger = require("../services/log.service");

/* =========================
유틸
========================= */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* =========================
Transaction Middleware
========================= */
module.exports = function transactionMiddleware(req, res, next) {
  let session = null;
  let finished = false;
  const traceId = req.traceId || `${Date.now()}-tx`;

  /* =========================
START
========================= */
  const start = async () => {
    session = await mongoose.startSession();
    session.startTransaction();

    req.dbSession = session;

    logger.debug("TRANSACTION_START", {
      traceId,
      url: req.originalUrl,
      user: req.user?._id || req.user?.id,
    });
  };

  /* =========================
COMMIT
========================= */
  const commit = async () => {
    if (!session || finished) return;

    try {
      await session.commitTransaction();
      logger.debug("TRANSACTION_COMMIT", {
        traceId,
        url: req.originalUrl,
        user: req.user?._id || req.user?.id,
      });
    } catch (e) {
      logger.error("TRANSACTION_COMMIT_ERROR", {
        traceId,
        error: e.message,
      });
    } finally {
      session.endSession();
      finished = true;
    }
  };

  /* =========================
ROLLBACK
========================= */
  const rollback = async (err) => {
    if (!session || finished) return;

    try {
      await session.abortTransaction();
      logger.error("TRANSACTION_ROLLBACK", {
        traceId,
        url: req.originalUrl,
        error: err?.message,
        user: req.user?._id || req.user?.id,
      });
    } catch (e) {
      logger.error("TRANSACTION_ROLLBACK_ERROR", {
        traceId,
        error: e.message,
      });
    } finally {
      session.endSession();
      finished = true;
    }
  };

  /* =========================
TIMEOUT 보호
========================= */
  const timeoutMs = Number(process.env.TX_TIMEOUT || 15000);
  const timeout = setTimeout(async () => {
    if (!finished) {
      await rollback(new Error("TRANSACTION_TIMEOUT"));
    }
  }, timeoutMs);

  /* =========================
실행
========================= */
  start()
    .then(() => {
      /* 정상 응답 */
      res.on("finish", async () => {
        clearTimeout(timeout);

        if (res.statusCode < 400) {
          await commit();
        } else {
          await rollback(new Error(`STATUS_${res.statusCode}`));
        }
      });

      /* 연결 끊김 */
      res.on("close", async () => {
        if (!finished) {
          clearTimeout(timeout);
          await rollback(new Error("CONNECTION_CLOSED"));
        }
      });

      /* 명시적 에러 */
      res.on("error", async (err) => {
        if (!finished) {
          clearTimeout(timeout);
          await rollback(err);
        }
      });

      next();
    })
    .catch(async (err) => {
      clearTimeout(timeout);

      logger.exception(err, {
        traceId,
        url: req.originalUrl,
      });

      await rollback(err);
      next(err);
    });
};