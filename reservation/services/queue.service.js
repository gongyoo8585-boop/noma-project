"use strict";

/* =====================================================
🔥 QUEUE SERVICE (FINAL MASTER)
비동기 작업 처리 / 재시도 / 딜레이 / 워커 / 통계
===================================================== */

/* =====================================================
🔥 CONFIG
===================================================== */
const MAX_RETRY = 3;
const CONCURRENCY = 5;

/* =====================================================
🔥 QUEUE STORAGE
===================================================== */
const QUEUE = [];
const ACTIVE = new Set();

/* =====================================================
🔥 STATS
===================================================== */
const STATS = {
  added: 0,
  processed: 0,
  failed: 0,
  retried: 0
};

/* =====================================================
🔥 UTIL
===================================================== */
function now() {
  return Date.now();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* =====================================================
🔥 CORE
===================================================== */

/* ADD JOB */
function add(job = {}) {
  const item = {
    id: "job_" + now() + "_" + Math.random(),
    type: job.type || "default",
    payload: job.payload || {},
    retry: 0,
    maxRetry: job.maxRetry || MAX_RETRY,
    delay: job.delay || 0,
    createdAt: now(),
    status: "queued"
  };

  QUEUE.push(item);
  STATS.added++;

  return item.id;
}

/* GET NEXT */
function getNext() {
  return QUEUE.find(j => j.status === "queued");
}

/* PROCESS */
async function process(handlerMap = {}) {
  while (ACTIVE.size < CONCURRENCY) {
    const job = getNext();
    if (!job) break;

    run(job, handlerMap);
  }
}

/* RUN JOB */
async function run(job, handlerMap) {
  ACTIVE.add(job.id);
  job.status = "processing";

  try {
    if (job.delay) {
      await sleep(job.delay);
    }

    const handler = handlerMap[job.type];

    if (typeof handler !== "function") {
      throw new Error("NO_HANDLER");
    }

    await handler(job.payload);

    job.status = "done";
    STATS.processed++;

  } catch (err) {
    job.retry++;

    if (job.retry <= job.maxRetry) {
      job.status = "queued";
      STATS.retried++;
    } else {
      job.status = "failed";
      STATS.failed++;
    }
  } finally {
    ACTIVE.delete(job.id);
  }
}

/* =====================================================
🔥 BULK
===================================================== */
function addBulk(list = []) {
  return list.map(add);
}

/* =====================================================
🔥 DELAYED JOB
===================================================== */
function addDelayed(job, delay = 1000) {
  return add({ ...job, delay });
}

/* =====================================================
🔥 CLEANUP
===================================================== */
function cleanup() {
  const before = QUEUE.length;

  for (let i = QUEUE.length - 1; i >= 0; i--) {
    const j = QUEUE[i];
    if (j.status === "done" || j.status === "failed") {
      QUEUE.splice(i, 1);
    }
  }

  return before - QUEUE.length;
}

/* =====================================================
🔥 INSPECT
===================================================== */
function list(status = null) {
  if (!status) return QUEUE;
  return QUEUE.filter(j => j.status === status);
}

function get(id) {
  return QUEUE.find(j => j.id === id);
}

/* =====================================================
🔥 CONTROL
===================================================== */
function clear() {
  QUEUE.length = 0;
  ACTIVE.clear();
}

/* =====================================================
🔥 AUTO WORKER
===================================================== */
let interval = null;

function start(handlerMap = {}) {
  if (interval) return;

  interval = setInterval(() => {
    try {
      process(handlerMap);
    } catch (_) {}
  }, 200);
}

function stop() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

/* =====================================================
🔥 HEALTH
===================================================== */
function getHealth() {
  return {
    queued: list("queued").length,
    processing: ACTIVE.size,
    done: list("done").length,
    failed: list("failed").length,
    stats: STATS,
    time: new Date()
  };
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  add,
  addBulk,
  addDelayed,

  process,
  start,
  stop,

  list,
  get,

  cleanup,
  clear,

  getHealth
};