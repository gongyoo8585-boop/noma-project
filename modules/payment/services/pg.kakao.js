// modules/payment/services/pg.kakao.js

const axios = require('axios');

/**
 * ============================================
 * ENV 설정
 * ============================================
 */
const KAKAO_ADMIN_KEY = process.env.KAKAO_ADMIN_KEY;
const KAKAO_HOST = 'https://kapi.kakao.com';

if (!KAKAO_ADMIN_KEY) {
  console.warn('[KAKAO PAY] ADMIN KEY NOT SET');
}

/**
 * ============================================
 * 공통 요청 함수
 * ============================================
 */
async function request(url, data) {
  try {
    const res = await axios({
      method: 'post',
      url: `${KAKAO_HOST}${url}`,
      headers: {
        Authorization: `KakaoAK ${KAKAO_ADMIN_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      data: new URLSearchParams(data).toString(),
    });

    return res.data;
  } catch (err) {
    console.error('[KAKAO PAY ERROR]', err.response?.data || err.message);
    throw new Error('KAKAO_PAY_REQUEST_FAILED');
  }
}

/**
 * ============================================
 * READY (결제 준비)
 * ============================================
 */
async function ready({
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
  return request('/v1/payment/ready', {
    cid: process.env.KAKAO_CID || 'TC0ONETIME', // 테스트 CID
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
  });
}

/**
 * ============================================
 * APPROVE (결제 승인)
 * ============================================
 */
async function approve({
  tid,
  orderId,
  userId,
  pgToken,
}) {
  return request('/v1/payment/approve', {
    cid: process.env.KAKAO_CID || 'TC0ONETIME',
    tid,
    partner_order_id: orderId,
    partner_user_id: userId,
    pg_token: pgToken,
  });
}

/**
 * ============================================
 * CANCEL (취소 / 환불)
 * ============================================
 */
async function cancel({
  tid,
  cancelAmount,
}) {
  return request('/v1/payment/cancel', {
    cid: process.env.KAKAO_CID || 'TC0ONETIME',
    tid,
    cancel_amount: cancelAmount,
    cancel_tax_free_amount: 0,
  });
}

/**
 * ============================================
 * STATUS (조회 - 선택)
 * ============================================
 */
async function status({ tid }) {
  return request('/v1/payment/order', {
    cid: process.env.KAKAO_CID || 'TC0ONETIME',
    tid,
  });
}

/**
 * ============================================
 * EXPORT
 * ============================================
 */
module.exports = {
  ready,
  approve,
  cancel,
  status,
};