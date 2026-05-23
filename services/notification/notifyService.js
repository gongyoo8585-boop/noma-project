"use strict";

/* =====================================================
🔥 NOTIFY SERVICE
👉 사용자 알림 통합 서비스
👉 websocket / queue / cache / analytics 연동
👉 실시간 + 비동기 알림 지원
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let ws = null;
let queueService = null;
let cacheService = null;
let analyticsService = null;

try { ws = require("../websocket/wsServer"); } catch (_) {}
try { queueService = require("./queueService"); } catch (_) {}
try { cacheService = require("./cacheService"); } catch (_) {}
try { analyticsService = require("./analyticsService"); } catch (_) {}

/* =====================================================
🔥 HELPER
===================================================== */
function createNotification(data = {}) {
  return {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: data.userId || null,
    type: data.type || "general",
    title: data.title || "",
    message: data.message || "",
    payload: data.payload || {},
    read: false,
    createdAt: new Date(),
  };
}

/* =====================================================
🔥 SERVICE
===================================================== */
class NotifyService {
  constructor() {
    this.store = new Map(); // userId -> notifications[]
    this.maxPerUser = Number(process.env.NOTIFY_MAX || 100);
  }

  /* =====================================================
  🔥 PUSH (핵심)
  ===================================================== */
  push(data = {}) {
    const notification = createNotification(data);

    if (!notification.userId) {
      throw new Error("USER_ID_REQUIRED");
    }

    if (!this.store.has(notification.userId)) {
      this.store.set(notification.userId, []);
    }

    const list = this.store.get(notification.userId);

    list.unshift(notification);

    // max 제한
    if (list.length > this.maxPerUser) {
      list.length = this.maxPerUser;
    }

    /* 🔥 websocket */
    if (ws?.emitToUser) {
      try {
        ws.emitToUser(notification.userId, "notification", notification);
      } catch (_) {}
    }

    /* 🔥 cache */
    if (cacheService) {
      try {
        cacheService.set(
          `notify:${notification.userId}`,
          list,
          60
        );
      } catch (_) {}
    }

    /* 🔥 analytics */
    if (analyticsService) {
      try {
        analyticsService.track({
          type: "notification",
          payload: notification,
          userId: notification.userId,
        });
      } catch (_) {}
    }

    return notification;
  }

  /* =====================================================
  🔥 PUSH ASYNC
  ===================================================== */
  async pushAsync(data = {}) {
    if (!queueService) {
      return this.push(data);
    }

    return queueService.add({
      type: "notify",
      payload: data,
      handler: async (payload) => this.push(payload),
      retries: 1,
    });
  }

  /* =====================================================
  🔥 GET USER NOTIFICATIONS
  ===================================================== */
  getUserNotifications(userId, limit = 20) {
    const list = this.store.get(userId) || [];
    return list.slice(0, Number(limit) || 20);
  }

  /* =====================================================
  🔥 MARK AS READ
  ===================================================== */
  markAsRead(userId, notificationId) {
    const list = this.store.get(userId);
    if (!list) return false;

    const item = list.find(n => n.id === notificationId);
    if (!item) return false;

    item.read = true;
    return item;
  }

  /* =====================================================
  🔥 MARK ALL READ
  ===================================================== */
  markAllRead(userId) {
    const list = this.store.get(userId);
    if (!list) return false;

    for (const n of list) {
      n.read = true;
    }

    return true;
  }

  /* =====================================================
  🔥 DELETE
  ===================================================== */
  delete(userId, notificationId) {
    const list = this.store.get(userId);
    if (!list) return false;

    const idx = list.findIndex(n => n.id === notificationId);
    if (idx === -1) return false;

    list.splice(idx, 1);
    return true;
  }

  /* =====================================================
  🔥 CLEAR
  ===================================================== */
  clear(userId) {
    this.store.delete(userId);
    return true;
  }

  /* =====================================================
  🔥 STATS
  ===================================================== */
  getStats() {
    let total = 0;

    for (const list of this.store.values()) {
      total += list.length;
    }

    return {
      users: this.store.size,
      notifications: total,
    };
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.store.clear();
    return true;
  }
}

module.exports = new NotifyService();