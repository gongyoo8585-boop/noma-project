"use strict";

/* =====================================================
🔥 SCALE SERVICE
👉 서버 상태 기반 스케일 판단
👉 queue / cpu / memory 기반
👉 확장/축소 신호 제공
===================================================== */

const os = require("os");

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let queueService = null;
let cacheService = null;

try {
  queueService = require("./queueService");
} catch (_) {}

try {
  cacheService = require("./cacheService");
} catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const CPU_THRESHOLD = Number(process.env.SCALE_CPU || 70);
const MEMORY_THRESHOLD = Number(process.env.SCALE_MEMORY || 70);
const QUEUE_THRESHOLD = Number(process.env.SCALE_QUEUE || 50);

/* =====================================================
🔥 HELPER
===================================================== */
function getCpuUsage() {
  const cpus = os.cpus();

  let idle = 0;
  let total = 0;

  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  });

  if (!total) return 0;

  return Math.round((1 - idle / total) * 100);
}

function getMemoryUsage() {
  const total = os.totalmem();
  const free = os.freemem();

  if (!total) return 0;

  return Math.round(((total - free) / total) * 100);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class ScaleService {
  constructor() {
    this.lastDecision = null;
    this.history = [];
    this.maxHistory = 200;
  }

  /* =====================================================
  🔥 METRICS
  ===================================================== */
  getMetrics() {
    const cpu = getCpuUsage();
    const memory = getMemoryUsage();

    let queueSize = 0;

    try {
      queueSize = queueService?.getStats()?.queued || 0;
    } catch (_) {}

    return {
      cpu,
      memory,
      queue: queueSize,
      timestamp: Date.now(),
    };
  }

  /* =====================================================
  🔥 DECISION ENGINE
  ===================================================== */
  evaluate() {
    const metrics = this.getMetrics();

    let action = "stable";

    if (
      metrics.cpu > CPU_THRESHOLD ||
      metrics.memory > MEMORY_THRESHOLD ||
      metrics.queue > QUEUE_THRESHOLD
    ) {
      action = "scale_up";
    } else if (
      metrics.cpu < CPU_THRESHOLD * 0.3 &&
      metrics.memory < MEMORY_THRESHOLD * 0.3 &&
      metrics.queue === 0
    ) {
      action = "scale_down";
    }

    const result = {
      action,
      metrics,
      threshold: {
        cpu: CPU_THRESHOLD,
        memory: MEMORY_THRESHOLD,
        queue: QUEUE_THRESHOLD,
      },
      time: new Date(),
    };

    this.lastDecision = result;
    this.pushHistory(result);

    return result;
  }

  /* =====================================================
  🔥 HISTORY
  ===================================================== */
  pushHistory(data) {
    this.history.unshift(data);

    if (this.history.length > this.maxHistory) {
      this.history.length = this.maxHistory;
    }
  }

  getHistory(limit = 50) {
    return this.history.slice(0, Number(limit) || 50);
  }

  /* =====================================================
  🔥 CACHE INTEGRATION
  ===================================================== */
  cacheDecision() {
    if (!cacheService) return false;

    try {
      const decision = this.evaluate();
      cacheService.set("scale:last", decision, 30);
      return decision;
    } catch (err) {
      console.error("scale cache error:", err.message);
      return false;
    }
  }

  /* =====================================================
  🔥 STATUS
  ===================================================== */
  getStatus() {
    return {
      lastDecision: this.lastDecision,
      historySize: this.history.length,
    };
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.history = [];
    this.lastDecision = null;
    return true;
  }
}

module.exports = new ScaleService();