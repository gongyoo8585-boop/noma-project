"use strict";

/* =====================================================
🔥 HEALTH SERVICE
👉 전체 시스템 상태 체크
👉 DB / Queue / Cache / System / Monitor 상태 통합
👉 운영용 health endpoint 대응
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let systemService = null;
let queueService = null;
let cacheService = null;
let monitorService = null;

try { systemService = require("../modules/system/services/system.service"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { monitorService = require("./monitorService"); } catch (_) {}

/* =====================================================
🔥 SERVICE
===================================================== */
class HealthService {
  constructor() {
    this.lastCheck = null;
  }

  /* =====================================================
  🔥 DB CHECK
  ===================================================== */
  async checkDB() {
    try {
      const mongoose = require("mongoose");
      const state = mongoose.connection.readyState;

      return {
        ok: state === 1,
        state,
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
      };
    }
  }

  /* =====================================================
  🔥 QUEUE CHECK
  ===================================================== */
  checkQueue() {
    try {
      if (!queueService) return { ok: true, disabled: true };

      const stats = queueService.getStats();

      return {
        ok: true,
        stats,
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
      };
    }
  }

  /* =====================================================
  🔥 CACHE CHECK
  ===================================================== */
  checkCache() {
    try {
      if (!cacheService) return { ok: true, disabled: true };

      cacheService.set("health:test", "ok", 5);
      const value = cacheService.get("health:test");

      return {
        ok: value === "ok",
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
      };
    }
  }

  /* =====================================================
  🔥 SYSTEM CHECK
  ===================================================== */
  async checkSystem() {
    try {
      if (!systemService) return { ok: true, disabled: true };

      const info = await systemService.getSystemInfo();

      return {
        ok: true,
        info,
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
      };
    }
  }

  /* =====================================================
  🔥 MONITOR CHECK
  ===================================================== */
  async checkMonitor() {
    try {
      if (!monitorService) return { ok: true, disabled: true };

      const result = await monitorService.run();

      return {
        ok: true,
        alerts: result.alerts,
      };
    } catch (err) {
      return {
        ok: false,
        error: err.message,
      };
    }
  }

  /* =====================================================
  🔥 FULL HEALTH CHECK
  ===================================================== */
  async checkAll() {
    const [db, queue, cache, system, monitor] = await Promise.all([
      this.checkDB(),
      this.checkQueue(),
      this.checkCache(),
      this.checkSystem(),
      this.checkMonitor(),
    ]);

    const overall =
      db.ok &&
      queue.ok &&
      cache.ok &&
      system.ok &&
      monitor.ok;

    const result = {
      ok: overall,
      timestamp: Date.now(),
      services: {
        db,
        queue,
        cache,
        system,
        monitor,
      },
    };

    this.lastCheck = result;

    return result;
  }

  /* =====================================================
  🔥 QUICK HEALTH
  ===================================================== */
  async quick() {
    try {
      const db = await this.checkDB();

      return {
        ok: db.ok,
        timestamp: Date.now(),
      };
    } catch {
      return {
        ok: false,
      };
    }
  }

  /* =====================================================
  🔥 STATUS
  ===================================================== */
  getStatus() {
    return {
      lastCheck: this.lastCheck,
    };
  }
}

module.exports = new HealthService();