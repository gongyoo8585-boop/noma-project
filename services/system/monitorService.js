"use strict";

/* =====================================================
🔥 MONITOR SERVICE
👉 시스템 상태 수집
👉 queue / cpu / memory / cache 상태
👉 이상 감지 (alert)
👉 analytics 기록
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let queueService = null;
let cacheService = null;
let scaleService = null;
let analyticsService = null;
let systemService = null;

try { queueService = require("./queueService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { scaleService = require("./scaleService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { systemService = require("../modules/system/services/system.service"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const CPU_ALERT = Number(process.env.MONITOR_CPU || 85);
const MEMORY_ALERT = Number(process.env.MONITOR_MEMORY || 85);
const QUEUE_ALERT = Number(process.env.MONITOR_QUEUE || 100);

/* =====================================================
🔥 SERVICE
===================================================== */
class MonitorService {
  constructor() {
    this.history = [];
    this.maxHistory = Number(process.env.MONITOR_HISTORY || 500);
    this.lastStatus = null;
  }

  /* =====================================================
  🔥 COLLECT
  ===================================================== */
  async collect() {
    let system = {};
    let queue = {};
    let scale = {};

    try {
      system = systemService ? await systemService.getSystemInfo() : {};
    } catch (_) {}

    try {
      queue = queueService ? queueService.getStats() : {};
    } catch (_) {}

    try {
      scale = scaleService ? scaleService.getMetrics() : {};
    } catch (_) {}

    const data = {
      time: new Date(),
      system,
      queue,
      scale,
    };

    this.lastStatus = data;
    this.pushHistory(data);

    // analytics 기록
    if (analyticsService) {
      try {
        analyticsService.track({
          type: "monitor",
          payload: data,
        });
      } catch (_) {}
    }

    // cache 저장
    if (cacheService) {
      try {
        cacheService.set("monitor:last", data, 30);
      } catch (_) {}
    }

    return data;
  }

  /* =====================================================
  🔥 ALERT CHECK
  ===================================================== */
  checkAlerts(status) {
    const alerts = [];

    try {
      const cpu = Number(status?.system?.cpuUsage?.replace("%", "") || 0);
      const memory = Number(status?.scale?.memory || 0);
      const queue = Number(status?.queue?.queued || 0);

      if (cpu > CPU_ALERT) {
        alerts.push({ type: "CPU_HIGH", value: cpu });
      }

      if (memory > MEMORY_ALERT) {
        alerts.push({ type: "MEMORY_HIGH", value: memory });
      }

      if (queue > QUEUE_ALERT) {
        alerts.push({ type: "QUEUE_HIGH", value: queue });
      }
    } catch (_) {}

    return alerts;
  }

  /* =====================================================
  🔥 RUN MONITOR
  ===================================================== */
  async run() {
    const status = await this.collect();
    const alerts = this.checkAlerts(status);

    return {
      status,
      alerts,
    };
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
  🔥 STATUS
  ===================================================== */
  getStatus() {
    return {
      last: this.lastStatus,
      historySize: this.history.length,
    };
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.history = [];
    this.lastStatus = null;
    return true;
  }
}

module.exports = new MonitorService();