"use strict";

// modules/payment/services/kakao.service.js

const axios = require("axios");

/* =====================================================
🔥 CONFIG
===================================================== */
const KAKAO_HOST = "https://kapi.kakao.com";
const ADMIN_KEY = process.env.KAKAO_ADMIN_KEY;

/* =====================================================
🔥 AXIOS INSTANCE
===================================================== */
const api = axios.create({
  baseURL: KAKAO_HOST,
  headers: {
    Authorization: `KakaoAK ${ADMIN_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
  },
  timeout: 10000,
});

/* =====================================================
🔥 HELPER
===================================================== */
function toForm(data = {}) {
  return new URLSearchParams(data).toString();
}

function handleError(err, label = "KAKAO_API_ERROR") {
  if (err.response) {
    console.error(`[${label}]`, err.response.data);
    throw new Error(err.response.data?.msg || label);
  }

  console.error(`[${label}]`, err.message);
  throw new Error(label);
}

/* =====================================================
🔥 SERVICE
===================================================== */
class KakaoPayService {
  /* ============================================
  🔥 READY (결제 준비)
  ============================================ */
  async ready({
    orderId,
    userId,
    itemName,
    quantity,
    totalAmount,
    vatAmount,
    taxFreeAmount,
    approvalUrl,
    cancelUrl,
    failUrl,
  }) {
    try {
      const payload = {
        cid: "TC0ONETIME", // 테스트용
        partner_order_id: orderId,
        partner_user_id: userId,
        item_name: itemName,
        quantity,
        total_amount: totalAmount,
        vat_amount: vatAmount,
        tax_free_amount: taxFreeAmount,
        approval_url: approvalUrl,
        cancel_url: cancelUrl,
        fail_url: failUrl,
      };

      const res = await api.post(
        "/v1/payment/ready",
        toForm(payload)
      );

      return res.data;
    } catch (err) {
      handleError(err, "KAKAO_READY_ERROR");
    }
  }

  /* ============================================
  🔥 APPROVE (결제 승인)
  ============================================ */
  async approve({
    tid,
    orderId,
    userId,
    pgToken,
  }) {
    try {
      const payload = {
        cid: "TC0ONETIME",
        tid,
        partner_order_id: orderId,
        partner_user_id: userId,
        pg_token: pgToken,
      };

      const res = await api.post(
        "/v1/payment/approve",
        toForm(payload)
      );

      return res.data;
    } catch (err) {
      handleError(err, "KAKAO_APPROVE_ERROR");
    }
  }

  /* ============================================
  🔥 CANCEL / REFUND
  ============================================ */
  async cancel({
    tid,
    cancelAmount,
  }) {
    try {
      const payload = {
        cid: "TC0ONETIME",
        tid,
        cancel_amount: cancelAmount,
        cancel_tax_free_amount: 0,
      };

      const res = await api.post(
        "/v1/payment/cancel",
        toForm(payload)
      );

      return res.data;
    } catch (err) {
      handleError(err, "KAKAO_CANCEL_ERROR");
    }
  }
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = new KakaoPayService();