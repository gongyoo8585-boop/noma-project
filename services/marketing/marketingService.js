"use strict";

/* =====================================================
🔥 MARKETING SERVICE
👉 캠페인 생성 / 실행
👉 타겟 사용자 관리
👉 메시지 발송 (확장형)
👉 queue / cache 연동 가능
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let queueService = null;
let cacheService = null;
let ws = null;

try {
  queueService = require("./queueService");
} catch (_) {}

try {
  cacheService = require("./cacheService");
} catch (_) {}

try {
  ws = require("../websocket/wsServer");
} catch (_) {}

/* =====================================================
🔥 SERVICE
===================================================== */
class MarketingService {
  constructor() {
    this.campaigns = new Map();
    this.history = [];
  }

  /* =====================================================
  🔥 CREATE CAMPAIGN
  ===================================================== */
  createCampaign(data = {}) {
    const id = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const campaign = {
      id,
      title: data.title || "Untitled Campaign",
      message: data.message || "",
      targetUsers: data.targetUsers || [],
      status: "created",
      createdAt: new Date(),
      executedAt: null,
    };

    this.campaigns.set(id, campaign);

    return campaign;
  }

  /* =====================================================
  🔥 GET CAMPAIGN
  ===================================================== */
  getCampaign(id) {
    return this.campaigns.get(id) || null;
  }

  /* =====================================================
  🔥 LIST CAMPAIGNS
  ===================================================== */
  listCampaigns() {
    return Array.from(this.campaigns.values());
  }

  /* =====================================================
  🔥 EXECUTE CAMPAIGN
  ===================================================== */
  async executeCampaign(id) {
    const campaign = this.campaigns.get(id);

    if (!campaign) {
      throw new Error("CAMPAIGN_NOT_FOUND");
    }

    if (campaign.status === "running") {
      throw new Error("CAMPAIGN_ALREADY_RUNNING");
    }

    campaign.status = "running";
    campaign.executedAt = new Date();

    const results = [];

    for (const userId of campaign.targetUsers) {
      const job = {
        type: "marketing",
        payload: {
          userId,
          message: campaign.message,
        },
        handler: async (payload) => {
          // 🔥 실제 발송 (확장 가능)
          if (ws?.emitToUser) {
            ws.emitToUser(payload.userId, "marketing", {
              message: payload.message,
            });
          }

          return {
            userId: payload.userId,
            sent: true,
          };
        },
        retries: 1,
      };

      if (queueService) {
        queueService.add(job);
      } else {
        await job.handler(job.payload);
      }

      results.push({ userId, queued: !!queueService });
    }

    campaign.status = "completed";

    this.history.unshift({
      id: campaign.id,
      title: campaign.title,
      total: campaign.targetUsers.length,
      executedAt: campaign.executedAt,
    });

    // cache 저장
    if (cacheService) {
      cacheService.set(`campaign:${id}`, campaign, 300);
    }

    return {
      campaignId: id,
      total: campaign.targetUsers.length,
      status: campaign.status,
    };
  }

  /* =====================================================
  🔥 HISTORY
  ===================================================== */
  getHistory(limit = 20) {
    return this.history.slice(0, Number(limit) || 20);
  }

  /* =====================================================
  🔥 DELETE CAMPAIGN
  ===================================================== */
  deleteCampaign(id) {
    const exists = this.campaigns.has(id);
    if (!exists) return false;

    this.campaigns.delete(id);
    return true;
  }

  /* =====================================================
  🔥 RESET
  ===================================================== */
  reset() {
    this.campaigns.clear();
    this.history = [];
    return true;
  }
}

module.exports = new MarketingService();