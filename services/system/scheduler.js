"use strict";

/* =====================================================
🔥 SCHEDULER
👉 내부 스케줄링 엔진
👉 interval 기반 작업 실행
👉 monitor / alert / analytics / scale 자동 실행
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let monitorService = null;
let alertService = null;
let analyticsService = null;
let scaleService = null;

try { monitorService = require("./monitorService"); } catch (_) {}
try { alertService = require("./alertService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { scaleService = require("./scaleService"); } catch (_) {}

/* =====================================================
🔥 SERVICE
===================================================== */
class Scheduler {
  constructor() {
    this.jobs = new Map();
    this.running = false;
  }

  /* =====================================================
  🔥 CREATE JOB
  ===================================================== */
  createJob(name, handler, interval = 60000) {
    if (!name || typeof handler !== "function") {
      throw new Error("INVALID_JOB");
    }

    const job = {
      name,
      handler,
      interval,
      timer: null,
      lastRun: null,
      status: "stopped",
    };

    this.jobs.set(name, job);

    return job;
  }

  /* =====================================================
  🔥 START JOB
  ===================================================== */
  startJob(name) {
    const job = this.jobs.get(name);
    if (!job) return false;

    if (job.timer) return true;

    job.timer = setInterval(async () => {
      try {
        job.status = "running";
        job.lastRun = new Date();

        await Promise.resolve(job.handler());

        job.status = "idle";
      } catch (err) {
        job.status = "error";
        console.error(`[scheduler] ${name} error:`, err.message);
      }
    }, job.interval);

    return true;
  }

  /* =====================================================
  🔥 STOP JOB
  ===================================================== */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (!job || !job.timer) return false;

    clearInterval(job.timer);
    job.timer = null;
    job.status = "stopped";

    return true;
  }

  /* =====================================================
  🔥 START ALL
  ===================================================== */
  startAll() {
    if (this.running) return true;

    for (const name of this.jobs.keys()) {
      this.startJob(name);
    }

    this.running = true;
    return true;
  }

  /* =====================================================
  🔥 STOP ALL
  ===================================================== */
  stopAll() {
    for (const name of this.jobs.keys()) {
      this.stopJob(name);
    }

    this.running = false;
    return true;
  }

  /* =====================================================
  🔥 DEFAULT JOBS
  ===================================================== */
  initDefaultJobs() {
    /* 🔥 MONITOR */
    if (monitorService) {
      this.createJob("monitor", async () => {
        const result = await monitorService.run();

        // alert 트리거
        if (alertService && result.alerts?.length) {
          for (const a of result.alerts) {
            await alertService.trigger({
              type: a.type,
              message: `${a.type} detected`,
              level: "warn",
              payload: a,
            });
          }
        }
      }, 10000); // 10초
    }

    /* 🔥 ANALYTICS */
    if (analyticsService) {
      this.createJob("analytics", async () => {
        analyticsService.getStats();
      }, 30000);
    }

    /* 🔥 SCALE */
    if (scaleService) {
      this.createJob("scale", async () => {
        scaleService.evaluate();
      }, 15000);
    }
  }

  /* =====================================================
  🔥 STATUS
  ===================================================== */
  getStatus() {
    const list = [];

    for (const job of this.jobs.values()) {
      list.push({
        name: job.name,
        status: job.status,
        interval: job.interval,
        lastRun: job.lastRun,
      });
    }

    return {
      running: this.running,
      jobs: list,
    };
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.stopAll();
    this.jobs.clear();
    this.running = false;
    return true;
  }
}

module.exports = new Scheduler();