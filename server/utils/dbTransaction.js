"use strict";

/**
 * =====================================================
 * 🔥 DB TRANSACTION UTILITY (ULTRA FINAL)
 * ✔ MongoDB 트랜잭션 헬퍼
 * ✔ 자동 commit / rollback
 * ✔ 재사용 가능한 구조
 * ✔ 서비스 레이어에서 사용
 * ✔ WriteConflict 자동 재시도
 * ✔ timeout / 안전 종료
 * ✔ 기존 기능 100% 유지 + 확장
 * =====================================================
 */

const mongoose = require("mongoose");

/* =========================
유틸
========================= */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* =========================
세션 안전 종료
========================= */
async function safeEnd(session, commit = false) {
  if (!session) return;

  try {
    if (commit) {
      await session.commitTransaction();
    } else {
      await session.abortTransaction();
    }
  } catch (e) {
    console.error("TX SAFE END ERROR:", e.message);
  } finally {
    session.endSession();
  }
}

/* =========================
🔥 기본 트랜잭션 실행
========================= */
async function runTransaction(work, options = {}) {
  const session = await mongoose.startSession();
  const timeout = options.timeout || 15000;

  let finished = false;

  const timer = setTimeout(async () => {
    if (!finished) {
      await safeEnd(session, false);
      console.error("TRANSACTION TIMEOUT");
    }
  }, timeout);

  try {
    session.startTransaction();

    const result = await work(session);

    await safeEnd(session, true);

    finished = true;
    clearTimeout(timer);

    return result;

  } catch (err) {
    await safeEnd(session, false);

    finished = true;
    clearTimeout(timer);

    throw err;
  }
}

/* =========================
🔥 자동 재시도 트랜잭션
(WriteConflict 대응)
========================= */
async function runTransactionWithRetry(work, retries = 3) {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      return await runTransaction(work);
    } catch (err) {
      lastError = err;

      if (
        err.message?.includes("WriteConflict") ||
        err.message?.includes("TransientTransactionError")
      ) {
        await sleep(100 * (i + 1));
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

/* =========================
🔥 ReadOnly 트랜잭션
========================= */
async function runReadOnly(work) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction({
      readConcern: { level: "snapshot" },
    });

    const result = await work(session);

    await safeEnd(session, true);

    return result;

  } catch (err) {
    await safeEnd(session, false);
    throw err;
  }
}

/* =========================
🔥 신규: 외부 세션 지원
========================= */
async function runWithSession(work, session) {
  if (!session) {
    return runTransaction(work);
  }

  return work(session);
}

/* =========================
🔥 신규: 트랜잭션 상태 체크
========================= */
function isInTransaction(session) {
  try {
    return session && session.inTransaction();
  } catch {
    return false;
  }
}

/* =========================
EXPORT
========================= */
module.exports = {
  runTransaction,
  runTransactionWithRetry,
  runReadOnly,
  runWithSession,
  isInTransaction,
};