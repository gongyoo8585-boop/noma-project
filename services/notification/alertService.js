"use strict";

/* =====================================================
🔥 ALERT SERVICE
👉 시스템 이상 감지 알림
👉 websocket / queue / analytics 연동
👉 alert 기록 + 재시도 + 상태 관리
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let queueService = null;
let ws = null;
let analyticsService = null;
let cacheService = null;

try { queueService = require("./queueService"); } catch (_) {}
try { ws = require("../websocket/wsServer"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}

/* =====================================================
🔥 CONFIG
===================================================== */
const MAX_HISTORY = Number(process.env.ALERT_HISTORY || 500);
const RETRY_COUNT = Number(process.env.ALERT_RETRY || 1);

/* =====================================================
🔥 SERVICE
===================================================== */
class AlertService {
  constructor() {
    this.history = [];
    this.active = new Map(); // 중복 알림 방지
  }

  /* =====================================================
  🔥 CREATE ALERT
  ===================================================== */
  createAlert(data = {}) {
    const id = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const alert = {
      id,
      type: data.type || "UNKNOWN",
      message: data.message || "",
      level: data.level || "warn", // info | warn | error | critical
      payload: data.payload || {},
      status: "created",
      createdAt: new Date(),
      triggeredAt: null,
      resolvedAt: null,
      retries: 0,
    };

    return alert;
  }

  /* =====================================================
  🔥 TRIGGER ALERT
  ===================================================== */
  async trigger(data = {}) {
    const key = `${data.type}_${JSON.stringify(data.payload || {})}`;

    // 🔥 중복 방지
    if (this.active.has(key)) {
      return { skipped: true };
    }

    const alert = this.createAlert(data);

    alert.status = "triggered";
    alert.triggeredAt = new Date();

    this.active.set(key, alert.id);
    this.pushHistory(alert);

    // websocket
    if (ws?.emitToUser) {
      try {
        ws.emitToUser("admin", "alert", alert);
      } catch (_) {}
    }

    // analytics
    if (analyticsService) {
      try {
        analyticsService.track({
          type: "alert",
          payload: alert,
        });
      } catch (_) {}
    }

    // cache
    if (cacheService) {
      try {
        cacheService.set(`alert:${alert.id}`, alert, 300);
      } catch (_) {}
    }

    // queue 처리 (비동기 재시도)
    if (queueService) {
      queueService.add({
        type: "alert",
        payload: alert,
        retries: RETRY_COUNT,
        handler: async (payload, job) => {
          return this.processAlert(payload, job);
        },
      });
    }

    return alert;
  }

  /* =====================================================
  🔥 PROCESS ALERT
  ===================================================== */
  async processAlert(alert, job) {
    try {
      alert.retries = job.attempts;

      // 확장 가능 (SMS, EMAIL 등)
      // 현재는 로그 처리만
      console.log(`[ALERT] ${alert.type} → ${alert.message}`);

      alert.status = "sent";

      return alert;
    } catch (err) {
      alert.status = "failed";
      alert.error = err.message;
      throw err;
    }
  }

  /* =====================================================
  🔥 RESOLVE ALERT
  ===================================================== */
  resolve(alertId) {
    const alert = this.history.find(a => a.id === alertId);
    if (!alert) return false;

    alert.status = "resolved";
    alert.resolvedAt = new Date();

    // active 제거
    for (const [key, id] of this.active.entries()) {
      if (id === alertId) {
        this.active.delete(key);
        break;
      }
    }

    return alert;
  }

  /* =====================================================
  🔥 HISTORY
  ===================================================== */
  pushHistory(alert) {
    this.history.unshift(alert);

    if (this.history.length > MAX_HISTORY) {
      this.history.length = MAX_HISTORY;
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
      active: this.active.size,
      history: this.history.length,
    };
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.history = [];
    this.active.clear();
    return true;
  }
}

module.exports = new AlertService();