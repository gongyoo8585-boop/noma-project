"use strict";

/* =====================================================
🔥 QUEUE SYSTEM (FINAL ULTRA COMPLETE MASTER)
👉 비동기 작업 처리 엔진
👉 retry / delay / priority / worker 포함
===================================================== */

/* =====================================================
🔥 CONFIG
===================================================== */
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_RETRY = 3;
const DEFAULT_DELAY = 0;

/* =====================================================
🔥 INTERNAL STATE
===================================================== */
const QUEUES = new Map();
const WORKERS = new Map();
const METRICS = {
  totalJobs: 0,
  success: 0,
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
  return new Promise((r) => setTimeout(r, ms));
}

function uid() {
  return "job_" + now() + "_" + Math.random().toString(36).slice(2);
}

/* =====================================================
🔥 QUEUE CLASS
===================================================== */
class Queue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    this.running = 0;
    this.concurrency = DEFAULT_CONCURRENCY;
  }

  push(job) {
    this.jobs.push(job);
    this.jobs.sort((a, b) => b.priority - a.priority);
  }

  shift() {
    return this.jobs.shift();
  }

  size() {
    return this.jobs.length;
  }
}

/* =====================================================
🔥 JOB CREATOR
===================================================== */
function createJob(data, opts = {}) {
  return {
    id: uid(),
    data,
    attempts: 0,
    maxRetry: opts.retry ?? DEFAULT_RETRY,
    delay: opts.delay ?? DEFAULT_DELAY,
    priority: opts.priority ?? 0,
    createdAt: now()
  };
}

/* =====================================================
🔥 CORE EXECUTOR
===================================================== */
async function runJob(queue, worker, job) {
  try {
    if (job.delay > 0) {
      await sleep(job.delay);
    }

    await worker(job.data, job);

    METRICS.success++;

  } catch (err) {
    job.attempts++;

    if (job.attempts <= job.maxRetry) {
      METRICS.retried++;
      queue.push(job);
    } else {
      METRICS.failed++;
      console.error("❌ JOB FAILED:", job.id, err.message);
    }
  }
}

/* =====================================================
🔥 WORKER LOOP
===================================================== */
async function processQueue(queueName) {
  const queue = QUEUES.get(queueName);
  const worker = WORKERS.get(queueName);

  if (!queue || !worker) return;

  while (true) {
    if (queue.running >= queue.concurrency) {
      await sleep(10);
      continue;
    }

    const job = queue.shift();
    if (!job) {
      await sleep(50);
      continue;
    }

    queue.running++;

    runJob(queue, worker, job)
      .catch(() => {})
      .finally(() => {
        queue.running--;
      });
  }
}

/* =====================================================
🔥 PUBLIC API
===================================================== */

// 큐 생성
function createQueue(name, worker, opts = {}) {
  if (QUEUES.has(name)) return;

  const q = new Queue(name);
  q.concurrency = opts.concurrency || DEFAULT_CONCURRENCY;

  QUEUES.set(name, q);
  WORKERS.set(name, worker);

  processQueue(name);

  console.log("🔥 QUEUE CREATED:", name);
}

// 작업 추가
function addJob(queueName, data, opts = {}) {
  const queue = QUEUES.get(queueName);
  if (!queue) throw new Error("Queue not found: " + queueName);

  const job = createJob(data, opts);

  queue.push(job);

  METRICS.totalJobs++;

  return job.id;
}

// delay 작업
function addDelayed(queueName, data, delay = 1000) {
  return addJob(queueName, data, { delay });
}

// priority 작업
function addPriority(queueName, data, priority = 10) {
  return addJob(queueName, data, { priority });
}

// retry 작업
function addRetry(queueName, data, retry = 5) {
  return addJob(queueName, data, { retry });
}

/* =====================================================
🔥 BULK
===================================================== */
function addBulk(queueName, list = []) {
  return list.map((item) => addJob(queueName, item));
}

/* =====================================================
🔥 ADMIN
===================================================== */
function getQueueStats(queueName) {
  const q = QUEUES.get(queueName);
  if (!q) return null;

  return {
    name: queueName,
    size: q.size(),
    running: q.running,
    concurrency: q.concurrency
  };
}

function getAllStats() {
  const queues = {};

  for (const [name, q] of QUEUES.entries()) {
    queues[name] = getQueueStats(name);
  }

  return {
    queues,
    metrics: METRICS
  };
}

function clearQueue(name) {
  const q = QUEUES.get(name);
  if (!q) return;
  q.jobs.length = 0;
}

function pauseQueue(name) {
  const q = QUEUES.get(name);
  if (!q) return;
  q.concurrency = 0;
}

function resumeQueue(name, concurrency = DEFAULT_CONCURRENCY) {
  const q = QUEUES.get(name);
  if (!q) return;
  q.concurrency = concurrency;
}

/* =====================================================
🔥 PRESET QUEUES (핵심)
===================================================== */

// 1️⃣ 결제 처리
createQueue("payment", async (data) => {
  console.log("💳 PROCESS PAYMENT:", data);
});

// 2️⃣ 예약 처리
createQueue("reservation", async (data) => {
  console.log("📅 PROCESS RESERVATION:", data);
});

// 3️⃣ 랭킹 재계산
createQueue("ranking", async (data) => {
  console.log("📊 RECALC RANK:", data);
});

// 4️⃣ 캐시 워밍
createQueue("cache", async (data) => {
  console.log("⚡ CACHE WARM:", data);
});

// 5️⃣ 알림
createQueue("notification", async (data) => {
  console.log("🔔 SEND NOTIFICATION:", data);
});

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
setInterval(() => {
  try {
    for (const [name, q] of QUEUES.entries()) {
      if (q.size() > 10000) {
        q.jobs.splice(0, 5000);
      }
    }
  } catch {}
}, 30000);

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 QUEUE SYSTEM READY");

module.exports = {
  createQueue,
  addJob,
  addDelayed,
  addPriority,
  addRetry,
  addBulk,

  getQueueStats,
  getAllStats,

  clearQueue,
  pauseQueue,
  resumeQueue
};