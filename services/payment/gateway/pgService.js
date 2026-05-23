"use strict";

/* =====================================================
🔥 PG SERVICE
👉 결제 게이트웨이 통합 레이어
👉 kakao / (확장: toss, stripe 등)
👉 payment.service와 100% 호환
===================================================== */

/* =====================================================
🔥 SAFE REQUIRE
===================================================== */
let kakao = null;

try {
  kakao = require("../modules/payment/services/kakao.service");
} catch (e) {
  console.warn("[pgService] kakao.service not found");
}

/* =====================================================
🔥 SERVICE
===================================================== */
class PGService {
  constructor() {
    this.providers = {
      kakao: kakao || null,
    };
  }

  /* =====================================================
  🔥 GET PROVIDER
  ===================================================== */
  getProvider(name) {
    const provider = this.providers[name];

    if (!provider) {
      throw new Error(`PG_PROVIDER_NOT_FOUND: ${name}`);
    }

    return provider;
  }

  /* =====================================================
  🔥 READY
  ===================================================== */
  async ready(providerName, payload) {
    const provider = this.getProvider(providerName);

    if (typeof provider.ready !== "function") {
      throw new Error("PG_READY_NOT_SUPPORTED");
    }

    return provider.ready(payload);
  }

  /* =====================================================
  🔥 APPROVE
  ===================================================== */
  async approve(providerName, payload) {
    const provider = this.getProvider(providerName);

    if (typeof provider.approve !== "function") {
      throw new Error("PG_APPROVE_NOT_SUPPORTED");
    }

    return provider.approve(payload);
  }

  /* =====================================================
  🔥 CANCEL
  ===================================================== */
  async cancel(providerName, payload) {
    const provider = this.getProvider(providerName);

    if (typeof provider.cancel !== "function") {
      throw new Error("PG_CANCEL_NOT_SUPPORTED");
    }

    return provider.cancel(payload);
  }

  /* =====================================================
  🔥 REFUND (alias cancel)
  ===================================================== */
  async refund(providerName, payload) {
    return this.cancel(providerName, payload);
  }

  /* =====================================================
  🔥 REGISTER NEW PROVIDER
  ===================================================== */
  register(name, service) {
    if (!name || typeof service !== "object") {
      throw new Error("INVALID_PROVIDER");
    }

    this.providers[name] = service;
    return true;
  }

  /* =====================================================
  🔥 LIST PROVIDERS
  ===================================================== */
  listProviders() {
    return Object.keys(this.providers).filter(
      (k) => this.providers[k]
    );
  }
}

module.exports = new PGService();