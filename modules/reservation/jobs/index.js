"use strict";

// modules/reservation/jobs/index.js

const {
  expireReservations,
} = require("./reservation.expire.job");

/* =====================================================
🔥 CONFIG
===================================================== */
const JOB_INTERVAL_MS = Number(
  process.env.RESERVATION_JOB_INTERVAL_MS || 30000
);

/* =====================================================
🔥 STATE
===================================================== */
let reservationJobTimer = null;
let isRunning = false;

/* =====================================================
🔥 1회 실행
===================================================== */
async function runReservationJobs() {
  if (isRunning) {
    return {
      ok: false,
      message: "RESERVATION_JOB_ALREADY_RUNNING",
    };
  }

  try {
    isRunning = true;

    const result = await expireReservations();

    return {
      ok: true,
      result,
    };
  } catch (err) {
    console.error("[reservation jobs] run error:", err.message);
    return {
      ok: false,
      message: err.message || "RESERVATION_JOB_RUN_FAILED",
    };
  } finally {
    isRunning = false;
  }
}

/* =====================================================
🔥 시작
===================================================== */
function startReservationJobs() {
  try {
    if (reservationJobTimer) {
      console.log("[reservation jobs] already started");
      return reservationJobTimer;
    }

    console.log("[reservation jobs] started");

    // 서버 시작 직후 1회 실행
    runReservationJobs();

    // 주기 실행
    reservationJobTimer = setInterval(() => {
      runReservationJobs();
    }, JOB_INTERVAL_MS);

    return reservationJobTimer;
  } catch (err) {
    console.error("[reservation jobs] start error:", err.message);
    return null;
  }
}

/* =====================================================
🔥 중지
===================================================== */
function stopReservationJobs() {
  try {
    if (reservationJobTimer) {
      clearInterval(reservationJobTimer);
      reservationJobTimer = null;
      console.log("[reservation jobs] stopped");
    }
  } catch (err) {
    console.error("[reservation jobs] stop error:", err.message);
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  startReservationJobs,
  stopReservationJobs,
  runReservationJobs,
};