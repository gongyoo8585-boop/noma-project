"use strict";

// modules/system/services/system.service.js

const os = require("os");

/* =====================================================
🔥 HELPER
===================================================== */
function bytesToMB(bytes) {
  return Math.round(bytes / 1024 / 1024);
}

function getCpuLoad() {
  const cpus = os.cpus();

  let idle = 0;
  let total = 0;

  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  });

  // 🔥 FIX: 0 division 방어
  if (!total) {
    return {
      idle: 0,
      total: 0,
      usage: 0,
    };
  }

  return {
    idle,
    total,
    usage: Math.round((1 - idle / total) * 100),
  };
}

/* =====================================================
🔥 SERVICE
===================================================== */
class SystemService {
  /**
   * ============================================
   * 헬스 체크
   * ============================================
   */
  async getHealth() {
    return {
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
  }

  /**
   * ============================================
   * 시스템 정보
   * ============================================
   */
  async getSystemInfo() {
    const cpuInfo = os.cpus();

    const memory = {
      total: bytesToMB(os.totalmem()),
      free: bytesToMB(os.freemem()),
      used: bytesToMB(os.totalmem() - os.freemem()),
    };

    return {
      platform: os.platform(),
      hostname: os.hostname(),
      cpuCount: cpuInfo.length,
      cpuModel: cpuInfo[0]?.model || "unknown",
      cpuUsage: getCpuLoad().usage + "%",
      memory,
      uptime: os.uptime(),
    };
  }

  /**
   * ============================================
   * 프로세스 정보
   * ============================================
   */
  async getProcessInfo() {
    const mem = process.memoryUsage();

    return {
      pid: process.pid,
      nodeVersion: process.version,
      env: process.env.NODE_ENV || "development",

      memory: {
        rss: bytesToMB(mem.rss),
        heapTotal: bytesToMB(mem.heapTotal),
        heapUsed: bytesToMB(mem.heapUsed),
        external: bytesToMB(mem.external),
      },

      uptime: process.uptime(),
    };
  }
}

module.exports = new SystemService();