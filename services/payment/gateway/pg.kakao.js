"use strict";

/* =====================================================
🔥 KAKAO PAY PG SERVICE
👉 카카오페이 결제 연동
👉 ready / approve / cancel
👉 pgService 호환 구조
===================================================== */

/* =====================================================
🔥 REQUIRE
===================================================== */
const axios = require("axios");

/* =====================================================
🔥 CONFIG
===================================================== */
const KAKAO_HOST = "https://kapi.kakao.com";

const ADMIN_KEY = process.env.KAKAO_ADMIN_KEY || "";
const CID = process.env.KAKAO_CID || "TC0ONETIME";

/* =====================================================
🔥 AXIOS INSTANCE
===================================================== */
const api = axios.create({
  baseURL: KAKAO_HOST,
  headers: {
    Authorization: `KakaoAK ${ADMIN_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
  },
});

/* =====================================================
🔥 HELPER
===================================================== */
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function toParams(data = {}) {
  return new URLSearchParams(data).toString();
}

/* =====================================================
🔥 SERVICE
===================================================== */
class KakaoPGService {
  /* =====================================================
  🔥 READY (결제 준비)
  ===================================================== */
  async ready(payload = {}) {
    assert(ADMIN_KEY, "KAKAO_ADMIN_KEY_MISSING");

    const {
      partner_order_id,
      partner_user_id,
      item_name,
      quantity = 1,
      total_amount,
      vat_amount = 0,
      tax_free_amount = 0,
      approval_url,
      cancel_url,
      fail_url,
    } = payload;

    assert(partner_order_id, "ORDER_ID_REQUIRED");
    assert(partner_user_id, "USER_ID_REQUIRED");
    assert(total_amount, "AMOUNT_REQUIRED");

    const res = await api.post(
      "/v1/payment/ready",
      toParams({
        cid: CID,
        partner_order_id,
        partner_user_id,
        item_name,
        quantity,
        total_amount,
        vat_amount,
        tax_free_amount,
        approval_url,
        cancel_url,
        fail_url,
      })
    );

    return {
      provider: "kakao",
      tid: res.data.tid,
      next_redirect_pc_url: res.data.next_redirect_pc_url,
      created_at: res.data.created_at,
    };
  }

  /* =====================================================
  🔥 APPROVE (결제 승인)
  ===================================================== */
  async approve(payload = {}) {
    assert(ADMIN_KEY, "KAKAO_ADMIN_KEY_MISSING");

    const {
      tid,
      partner_order_id,
      partner_user_id,
      pg_token,
    } = payload;

    assert(tid, "TID_REQUIRED");
    assert(pg_token, "PG_TOKEN_REQUIRED");

    const res = await api.post(
      "/v1/payment/approve",
      toParams({
        cid: CID,
        tid,
        partner_order_id,
        partner_user_id,
        pg_token,
      })
    );

    return {
      provider: "kakao",
      status: "paid",
      tid: res.data.tid,
      amount: res.data.amount?.total,
      approved_at: res.data.approved_at,
    };
  }

  /* =====================================================
  🔥 CANCEL (결제 취소 / 환불)
  ===================================================== */
  async cancel(payload = {}) {
    assert(ADMIN_KEY, "KAKAO_ADMIN_KEY_MISSING");

    const {
      tid,
      cancel_amount,
      cancel_tax_free_amount = 0,
    } = payload;

    assert(tid, "TID_REQUIRED");
    assert(cancel_amount, "CANCEL_AMOUNT_REQUIRED");

    const res = await api.post(
      "/v1/payment/cancel",
      toParams({
        cid: CID,
        tid,
        cancel_amount,
        cancel_tax_free_amount,
      })
    );

    return {
      provider: "kakao",
      status: "cancelled",
      tid: res.data.tid,
      cancelled_amount: res.data.amount?.total,
      cancelled_at: new Date(),
    };
  }

  /* =====================================================
  🔥 STATUS CHECK (옵션)
  ===================================================== */
  async getStatus(tid) {
    assert(tid, "TID_REQUIRED");

    const res = await api.post(
      "/v1/payment/order",
      toParams({
        cid: CID,
        tid,
      })
    );

    return res.data;
  }
}

module.exports = new KakaoPGService();