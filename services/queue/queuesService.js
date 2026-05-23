"use strict";

/* =====================================================
🔥 QUEUE SERVICE
👉 in-memory queue
👉 job 등록 / 실행 / 재시도 / 상태 조회
👉 payment / reservation / system 어디서든 사용 가능
===================================================== */

class QueueService {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.history = [];
    this.maxHistory = Number(process.env.QUEUE_HISTORY_MAX || 1000);
    this.defaultRetry = Number(process.env.QUEUE_DEFAULT_RETRY || 0);
  }

  /* =====================================================
  🔥 JOB ID
  ===================================================== */
  createJobId(prefix = "job") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  /* =====================================================
  🔥 ADD JOB
  ===================================================== */
  add(job = {}) {
    const item = {
      id: job.id || this.createJobId(job.type || "job"),
      type: job.type || "default",
      payload: job.payload || {},
      handler: typeof job.handler === "function" ? job.handler : null,
      retries: Number.isFinite(job.retries) ? job.retries : this.defaultRetry,
      attempts: 0,
      status: "queued",
      error: null,
      createdAt: new Date(),
      startedAt: null,
      finishedAt: null,
    };

    if (!item.handler) {
      throw new Error("QUEUE_HANDLER_REQUIRED");
    }

    this.queue.push(item);
    this.run().catch((err) => {
      console.error("queue run error:", err.message);
    });

    return {
      id: item.id,
      type: item.type,
      status: item.status,
    };
  }

  /* =====================================================
  🔥 ADD MANY
  ===================================================== */
  addMany(jobs = []) {
    const result = [];

    for (const job of Array.isArray(jobs) ? jobs : []) {
      result.push(this.add(job));
    }

    return result;
  }

  /* =====================================================
  🔥 PROCESS ONE
  ===================================================== */
  async processOne(job) {
    job.status = "processing";
    job.startedAt = new Date();
    job.attempts += 1;

    try {
      const output = await Promise.resolve(job.handler(job.payload, job));

      job.status = "done";
      job.finishedAt = new Date();
      job.result = output || null;

      this.pushHistory(job);

      return job;
    } catch (err) {
      job.error = err.message;
      job.finishedAt = new Date();

      if (job.attempts <= job.retries) {
        job.status = "queued";
        this.queue.push(job);
      } else {
        job.status = "failed";
        this.pushHistory(job);
      }

      return job;
    }
  }

  /* =====================================================
  🔥 RUN LOOP
  ===================================================== */
  async run() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift();
        if (!job) continue;

        await this.processOne(job);
      }
    } finally {
      this.processing = false;
    }
  }

  /* =====================================================
  🔥 HISTORY
  ===================================================== */
  pushHistory(job) {
    this.history.unshift({
      id: job.id,
      type: job.type,
      payload: job.payload,
      status: job.status,
      attempts: job.attempts,
      retries: job.retries,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      result: job.result || null,
    });

    if (this.history.length > this.maxHistory) {
      this.history.length = this.maxHistory;
    }
  }

  /* =====================================================
  🔥 STATS
  ===================================================== */
  getStats() {
    const queued = this.queue.length;
    const done = this.history.filter((j) => j.status === "done").length;
    const failed = this.history.filter((j) => j.status === "failed").length;

    return {
      queued,
      processing: this.processing,
      history: this.history.length,
      done,
      failed,
    };
  }

  /* =====================================================
  🔥 GET HISTORY
  ===================================================== */
  getHistory(limit = 50) {
    return this.history.slice(0, Number(limit) || 50);
  }

  /* =====================================================
  🔥 FIND JOB
  ===================================================== */
  findJob(jobId) {
    const inQueue = this.queue.find((j) => j.id === jobId);
    if (inQueue) return inQueue;

    return this.history.find((j) => j.id === jobId) || null;
  }

  /* =====================================================
  🔥 CLEAR
  ===================================================== */
  clearQueue() {
    const count = this.queue.length;
    this.queue = [];
    return count;
  }

  clearHistory() {
    const count = this.history.length;
    this.history = [];
    return count;
  }

  reset() {
    this.clearQueue();
    this.clearHistory();
    this.processing = false;
    return true;
  }
}

module.exports = new QueueService();