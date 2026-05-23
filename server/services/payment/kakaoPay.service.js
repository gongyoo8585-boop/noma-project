"use strict";

/**
 * =====================================================
 * 🔥 KAKAO PAY SERVICE (ULTRA FINAL - PATCHED)
 * ✔ 기존 기능 100% 유지
 * ✔ axios / retry / validate 유지
 * ✔ payment.service와 충돌 없는 안전 보완
 * ✔ 최소 수정 (필수값 + 타입 안정성만 보강)
 * =====================================================
 */

const axios = require("axios");

/* =========================
ENV
========================= */
const KAKAO_ADMIN_KEY = process.env.KAKAO_ADMIN_KEY;

if (!KAKAO_ADMIN_KEY) {
  console.warn("⚠️ KAKAO_ADMIN_KEY 없음");
}

/* =========================
AXIOS INSTANCE
========================= */
const client = axios.create({
  baseURL: "https://kapi.kakao.com",
  timeout: 10000,
  headers: {
    Authorization: KAKAO_ADMIN_KEY,
    "Content-Type": "application/x-www-form-urlencoded",
  },
});

/* =========================
공통 에러 처리
========================= */
function handleError(e, label = "KAKAO PAY ERROR") {
  const errMsg = e.response?.data || e.message;
  console.error(label, errMsg);
  throw new Error(errMsg?.msg || errMsg || label);
}

/* =========================
재시도 유틸
========================= */
async function retry(fn, retryCount = 2) {
  let lastErr;
  for (let i = 0; i <= retryCount; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      console.warn("KAKAO RETRY:", i + 1);
    }
  }
  throw lastErr;
}

/* =========================
응답 검증
========================= */
function validate(res, key) {
  if (!res || !res.data) throw new Error("KAKAO EMPTY RESPONSE");
  if (key && !res.data[key]) {
    throw new Error(`KAKAO INVALID RESPONSE (${key})`);
  }
  return res.data;
}

/* =====================================================
🔥 READY
===================================================== */
exports.ready = async ({
  orderId,
  userId,
  itemName,
  amount,
  successUrl,
  cancelUrl,
  failUrl,
}) => {
  try {
    /* 🔥 최소 검증 강화 */
    if (!orderId || !userId) {
      throw new Error("READY 필수값 누락");
    }

    const totalAmount = Number(amount);
    if (!totalAmount || totalAmount < 1) {
      throw new Error("결제 금액 오류");
    }

    const res = await retry(() =>
      client.post("/v1/payment/ready", null, {
        params: {
          cid: "TC0ONETIME",
          partner_order_id: String(orderId),
          partner_user_id: String(userId),
          item_name: itemName || "결제",
          quantity: 1,
          total_amount: totalAmount,
          vat_amount: Math.floor(totalAmount / 10),
          tax_free_amount: 0,
          approval_url: successUrl,
          cancel_url: cancelUrl,
          fail_url: failUrl,
        },
      })
    );

    const data = validate(res, "tid");

    return {
      tid: data.tid,
      next_redirect_pc_url: data.next_redirect_pc_url,
      created_at: data.created_at,
      raw: data,
    };

  } catch (e) {
    handleError(e, "KAKAO READY ERROR");
  }
};

/* =====================================================
🔥 APPROVE
===================================================== */
exports.approve = async ({
  tid,
  orderId,
  userId,
  pgToken,
}) => {
  try {
    if (!tid || !orderId || !userId || !pgToken) {
      throw new Error("APPROVE 필수값 누락");
    }

    const res = await retry(() =>
      client.post("/v1/payment/approve", null, {
        params: {
          cid: "TC0ONETIME",
          tid,
          partner_order_id: String(orderId),
          partner_user_id: String(userId),
          pg_token: pgToken,
        },
      })
    );

    return validate(res);

  } catch (e) {
    handleError(e, "KAKAO APPROVE ERROR");
  }
};

/* =====================================================
🔥 CANCEL
===================================================== */
exports.cancel = async ({
  tid,
  cancelAmount,
}) => {
  try {
    const amount = Number(cancelAmount);

    if (!tid || !amount || amount < 1) {
      throw new Error("CANCEL 필수값 누락");
    }

    const res = await retry(() =>
      client.post("/v1/payment/cancel", null, {
        params: {
          cid: "TC0ONETIME",
          tid,
          cancel_amount: amount,
          cancel_tax_free_amount: 0,
        },
      })
    );

    return validate(res);

  } catch (e) {
    handleError(e, "KAKAO CANCEL ERROR");
  }
};

/* =====================================================
🔥 STATUS 조회
===================================================== */
exports.getOrder = async ({ tid }) => {
  try {
    if (!tid) {
      throw new Error("ORDER 조회 tid 필요");
    }

    const res = await retry(() =>
      client.post("/v1/payment/order", null, {
        params: {
          cid: "TC0ONETIME",
          tid,
        },
      })
    );

    return validate(res);

  } catch (e) {
    handleError(e, "KAKAO ORDER ERROR");
  }
};

/* =====================================================
🔥 부분 취소 (환불 확장)
===================================================== */
exports.partialCancel = async ({
  tid,
  cancelAmount,
  cancelTaxFree = 0,
}) => {
  try {
    const amount = Number(cancelAmount);

    if (!tid || !amount || amount < 1) {
      throw new Error("PARTIAL CANCEL 필수값 누락");
    }

    const res = await retry(() =>
      client.post("/v1/payment/cancel", null, {
        params: {
          cid: "TC0ONETIME",
          tid,
          cancel_amount: amount,
          cancel_tax_free_amount: Number(cancelTaxFree),
        },
      })
    );

    return validate(res);

  } catch (e) {
    handleError(e, "KAKAO PARTIAL CANCEL ERROR");
  }
};

/* =====================================================
🔥 결제 상태 체크 헬퍼
===================================================== */
exports.isApproved = (data) => {
  return data?.status === "SUCCESS_PAYMENT" || data?.approved_at;
};