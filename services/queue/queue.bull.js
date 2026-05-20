"use strict";

/* =====================================================
🔥 BULL QUEUE SERVICE
👉 Redis 기반 Job Queue
👉 retry / delay / concurrency 지원
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
let Queue = null;

try {
  Queue = require("bull");
} catch (_) {
  console.warn("[queue.bull] bull not installed");
}

/* =====================================================
🔥 CONFIG
===================================================== */
const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const DEFAULT_ATTEMPTS = Number(process.env.QUEUE_ATTEMPTS || 3);
const DEFAULT_DELAY = Number(process.env.QUEUE_DELAY || 0);

/* =====================================================
🔥 SERVICE
===================================================== */
class BullQueueService {
  constructor() {
    this.queues = new Map();
    this.last = null;
  }

  /* =====================================================
  🔥 GET OR CREATE QUEUE
  ===================================================== */
  getQueue(name) {
    if (!Queue) {
      throw new Error("BULL_NOT_INSTALLED");
    }

    if (!this.queues.has(name)) {
      const q = new Queue(name, REDIS_URL);

      /* 이벤트 로그 */
      q.on("completed", (job, result) => {
        console.log(`[queue:${name}] completed`, job.id);
      });

      q.on("failed", (job, err) => {
        console.error(`[queue:${name}] failed`, job.id, err.message);
      });

      q.on("stalled", (job) => {
        console.warn(`[queue:${name}] stalled`, job.id);
      });

      this.queues.set(name, q);
    }

    return this.queues.get(name);
  }

  /* =====================================================
  🔥 ADD JOB
  ===================================================== */
  async add({
    type = "default",
    payload = {},
    opts = {},
  }) {
    const queue = this.getQueue(type);

    const job = await queue.add(payload, {
      attempts: opts.attempts || DEFAULT_ATTEMPTS,
      delay: opts.delay || DEFAULT_DELAY,
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.last = job;

    return {
      jobId: job.id,
      type,
    };
  }

  /* =====================================================
  🔥 PROCESS (WORKER)
  ===================================================== */
  process(type, handler, concurrency = 5) {
    const queue = this.getQueue(type);

    queue.process(concurrency, async (job) => {
      try {
        const result = await handler(job.data);

        return result;
      } catch (err) {
        console.error(`[queue:${type}] handler error`, err.message);
        throw err;
      }
    });

    return true;
  }

  /* =====================================================
  🔥 DELAYED JOB
  ===================================================== */
  async addDelayed(type, payload, delayMs) {
    return this.add({
      type,
      payload,
      opts: { delay: delayMs },
    });
  }

  /* =====================================================
  🔥 REPEAT JOB (CRON)
  ===================================================== */
  async addRepeat(type, payload, cron) {
    const queue = this.getQueue(type);

    const job = await queue.add(payload, {
      repeat: { cron },
      removeOnComplete: true,
    });

    return job;
  }

  /* =====================================================
  🔥 GET JOB
  ===================================================== */
  async getJob(type, jobId) {
    const queue = this.getQueue(type);
    return queue.getJob(jobId);
  }

  /* =====================================================
  🔥 CLEAN QUEUE
  ===================================================== */
  async clean(type) {
    const queue = this.getQueue(type);

    await queue.clean(0, "completed");
    await queue.clean(0, "failed");

    return true;
  }

  /* =====================================================
  🔥 STATS
  ===================================================== */
  async getStats(type) {
    const queue = this.getQueue(type);

    const counts = await queue.getJobCounts();

    return counts;
  }

  /* =====================================================
  🔥 LAST
  ===================================================== */
  getLast() {
    return this.last;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  async reset() {
    for (const [name, q] of this.queues.entries()) {
      await q.empty();
      await q.close();
    }

    this.queues.clear();

    return true;
  }
}

module.exports = new BullQueueService();