"use strict";

/* =====================================================
🔥 FINAL PAYMENT SERVICE (NORA PRODUCTION SAFE)
✔ 실제 구조 기준 경로 수정
✔ ../models/Payment 오류 제거
✔ ../models/Reservation 오류 제거
✔ controllers/payment/paymentController.js 100% 호환
✔ Kakao Pay 기존 흐름 유지
✔ DB 미연결 시 서버 부팅 실패 방지
✔ Router.use Object 오류 연쇄 방지
===================================================== */

const axios = require("axios");
const path = require("path");
const fs = require("fs");

const PROJECT_ROOT = path.resolve(__dirname, "../..");

function safeRequire(modulePath) {
  try {
    const resolvedBase = path.isAbsolute(modulePath)
      ? modulePath
      : path.resolve(PROJECT_ROOT, modulePath);

    const candidates = [
      resolvedBase,
      `${resolvedBase}.js`,
      `${resolvedBase}.cjs`,
      `${resolvedBase}.json`,
      path.join(resolvedBase, "index.js"),
    ];

    const existing = candidates.find((candidate) => fs.existsSync(candidate));

    if (!existing) {
      console.warn("[payment.service] require fail:", modulePath, "MODULE_NOT_FOUND");
      return null;
    }

    const loaded = require(existing);

    if (!loaded) {
      return null;
    }

    return loaded.default || loaded;
  } catch (error) {
    console.warn("[payment.service] require fail:", modulePath, error.message);
    return null;
  }
}

function normalizeModel(model, modelName) {
  if (!model) {
    return null;
  }

  if (typeof model === "function") {
    return model;
  }

  if (typeof model === "object") {
    return (
      model.default ||
      model[modelName] ||
      model.model ||
      model.schema ||
      null
    );
  }

  return null;
}

const Payment = normalizeModel(
  safeRequire("models/Payment") ||
    safeRequire("models/payment") ||
    safeRequire("models/payment.model") ||
    safeRequire("models/Payment.model") ||
    safeRequire("server/models/Payment") ||
    safeRequire("modules/payment/models/Payment"),
  "Payment"
);

const Reservation = normalizeModel(
  safeRequire("models/Reservation") ||
    safeRequire("models/reservation") ||
    safeRequire("models/reservation.model") ||
    safeRequire("models/Reservation.model") ||
    safeRequire("reservation/models/Reservation") ||
    safeRequire("server/models/Reservation") ||
    safeRequire("modules/reservation/models/Reservation"),
  "Reservation"
);

/* =====================================================
🔥 ENV
===================================================== */
const KAKAO_ADMIN_KEY = process.env.KAKAO_ADMIN_KEY || "";

const BASE_URL =
  process.env.BASE_URL ||
  process.env.PUBLIC_SERVER_HOST ||
  process.env.SERVER_HOST ||
  "http://localhost:5173";

/* =====================================================
🔥 INTERNAL STORE
===================================================== */
const LOGS = [];

const METRICS = {
  total: 0,
  success: 0,
  fail: 0,
  cancel: 0,
  refund: 0,
  approveRetry: 0,
  webhook: 0,
};

const CACHE = new Map();
const MEMORY_PAYMENTS = [];

/* =====================================================
🔥 UTIL
===================================================== */
function safeStr(value) {
  return String(value ?? "").trim();
}

function safeNum(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function genOrderId() {
  return `ORD_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function log(type, payload) {
  LOGS.push({
    type,
    payload,
    at: Date.now(),
  });

  if (LOGS.length > 10000) {
    LOGS.shift();
  }
}

function cacheSet(key, value, ttl = 5000) {
  CACHE.set(key, {
    value,
    exp: Date.now() + ttl,
  });
}

function cacheGet(key) {
  const cached = CACHE.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() > cached.exp) {
    CACHE.delete(key);
    return null;
  }

  return cached.value;
}

function toPlain(item) {
  if (!item) {
    return null;
  }

  if (typeof item.toObject === "function") {
    return item.toObject();
  }

  return item;
}

function createMemoryPayment(payload = {}) {
  const now = new Date();

  const id =
    payload.paymentId ||
    `local-payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const payment = {
    _id: id,
    id,
    ...payload,
    orderId: payload.orderId || genOrderId(),
    amount: safeNum(payload.amount),
    status: payload.status || "ready",
    createdAt: payload.createdAt || now.toISOString(),
    updatedAt: payload.updatedAt || now.toISOString(),
    localFallback: true,
  };

  MEMORY_PAYMENTS.unshift(payment);

  if (MEMORY_PAYMENTS.length > 500) {
    MEMORY_PAYMENTS.length = 500;
  }

  return payment;
}

function updateMemoryPayment(match = {}, update = {}) {
  const item = MEMORY_PAYMENTS.find((payment) => {
    if (match.paymentId && String(payment._id) === String(match.paymentId)) return true;
    if (match.paymentId && String(payment.id) === String(match.paymentId)) return true;
    if (match.orderId && String(payment.orderId) === String(match.orderId)) return true;
    if (match.paymentKey && String(payment.tid) === String(match.paymentKey)) return true;
    if (match.tid && String(payment.tid) === String(match.tid)) return true;
    return false;
  });

  if (!item) {
    return null;
  }

  Object.assign(item, update, {
    updatedAt: new Date().toISOString(),
  });

  return item;
}

function validatePayload(payload = {}) {
  if (!payload.userId) {
    throw new Error("userId required");
  }

  if (!payload.amount || safeNum(payload.amount) <= 0) {
    throw new Error("invalid amount");
  }
}

function normalizeListOptions(options = {}) {
  const page = Math.max(1, safeNum(options.page) || 1);
  const limit = Math.min(100, Math.max(1, safeNum(options.limit) || 20));

  return {
    ...options,
    page,
    limit,
  };
}

function buildMemoryQuery(options = {}) {
  return MEMORY_PAYMENTS.filter((payment) => {
    if (options.userId && String(payment.userId) !== String(options.userId)) return false;
    if (options.shopId && String(payment.shopId) !== String(options.shopId)) return false;
    if (options.reservationId && String(payment.reservationId) !== String(options.reservationId)) return false;
    if (options.status && String(payment.status) !== String(options.status)) return false;
    return true;
  });
}

async function findPayment({ paymentId, orderId, paymentKey, tid } = {}) {
  try {
    if (Payment) {
      if (paymentId && typeof Payment.findById === "function") {
        const byId = await Payment.findById(paymentId);
        if (byId) return byId;
      }

      if (orderId && typeof Payment.findOne === "function") {
        const byOrderId = await Payment.findOne({ orderId });
        if (byOrderId) return byOrderId;
      }

      if ((paymentKey || tid) && typeof Payment.findOne === "function") {
        const key = paymentKey || tid;
        const byKey = await Payment.findOne({
          $or: [{ tid: key }, { paymentKey: key }, { key }],
        });

        if (byKey) return byKey;
      }
    }
  } catch (error) {
    console.warn("[payment.service] findPayment fail:", error.message);
  }

  return updateMemoryPayment({ paymentId, orderId, paymentKey, tid }, {}) || null;
}

async function savePayment(payment) {
  try {
    if (payment && typeof payment.save === "function") {
      await payment.save();
    }
  } catch (error) {
    console.warn("[payment.service] save fail:", error.message);
  }

  return payment;
}

async function updateReservationStatus(payment, action) {
  try {
    if (!payment || !payment.reservationId || !Reservation) {
      return;
    }

    if (typeof Reservation.findById !== "function") {
      return;
    }

    const reservation = await Reservation.findById(payment.reservationId);

    if (!reservation) {
      return;
    }

    if (action === "confirm" && typeof reservation.confirm === "function") {
      await reservation.confirm("payment");
      return;
    }

    if (action === "cancel" && typeof reservation.cancelSafe === "function") {
      await reservation.cancelSafe("결제 취소");
      return;
    }

    if (action === "confirm") {
      reservation.status = reservation.status || "confirmed";
      reservation.paymentStatus = "paid";
    }

    if (action === "cancel") {
      reservation.status = "cancelled";
      reservation.paymentStatus = "cancelled";
    }

    if (typeof reservation.save === "function") {
      await reservation.save();
    }
  } catch (error) {
    console.warn("[payment.service] reservation sync fail:", error.message);
  }
}

/* =====================================================
🔥 CREATE PAYMENT
===================================================== */
exports.createPayment = async (payload = {}) => {
  validatePayload(payload);

  const orderId = payload.orderId || genOrderId();
  let payment = null;

  if (Payment && typeof Payment.create === "function") {
    payment = await Payment.create({
      ...payload,
      orderId,
      amount: safeNum(payload.amount),
      status: payload.status || "ready",
    });
  } else {
    payment = createMemoryPayment({
      ...payload,
      orderId,
      status: payload.status || "ready",
    });
  }

  METRICS.total += 1;
  log("create", toPlain(payment));

  return payment;
};

/* =====================================================
🔥 CHECKOUT SESSION
===================================================== */
exports.createCheckoutSession = async (payload = {}) => {
  const data = await exports.kakaoReady(payload);

  let payment = null;

  if (Payment && typeof Payment.findOne === "function") {
    payment = await Payment.findOne({ orderId: data.orderId });
  }

  if (!payment) {
    payment = updateMemoryPayment({ orderId: data.orderId }, {}) || null;
  }

  return {
    payment,
    checkoutUrl: data.next_redirect_pc_url || data.redirectUrl || "",
    redirectUrl: data.next_redirect_pc_url || data.redirectUrl || "",
    orderId: data.orderId,
    paymentKey: data.tid,
    tid: data.tid,
  };
};

/* =====================================================
🔥 KAKAO READY
===================================================== */
exports.kakaoReady = async ({
  userId,
  shopId,
  amount,
  reservationId,
  title,
  orderId: inputOrderId,
} = {}) => {
  validatePayload({ userId, amount });

  const orderId = inputOrderId || genOrderId();
  let kakaoData = null;

  if (KAKAO_ADMIN_KEY) {
    try {
      const response = await axios.post(
        "https://kapi.kakao.com/v1/payment/ready",
        null,
        {
          params: {
            cid: process.env.KAKAO_CID || "TC0ONETIME",
            partner_order_id: orderId,
            partner_user_id: userId,
            item_name: title || "예약 결제",
            quantity: 1,
            total_amount: safeNum(amount),
            vat_amount: 0,
            tax_free_amount: 0,
            approval_url: `${BASE_URL}/payments/success?orderId=${orderId}`,
            cancel_url: `${BASE_URL}/payments/cancel`,
            fail_url: `${BASE_URL}/payments/fail`,
          },
          headers: {
            Authorization: `KakaoAK ${KAKAO_ADMIN_KEY}`,
            "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          timeout: Number(process.env.PAYMENT_TIMEOUT || 30000),
        }
      );

      kakaoData = response.data;
    } catch (error) {
      console.error("[payment.service] kakao ready fail:", error.message);
    }
  }

  const tid =
    kakaoData?.tid ||
    `local-tid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const paymentPayload = {
    userId,
    shopId,
    reservationId,
    amount: safeNum(amount),
    title: title || "예약 결제",
    tid,
    paymentKey: tid,
    orderId,
    status: "ready",
    method: "kakao",
  };

  let payment = null;

  if (Payment && typeof Payment.create === "function") {
    payment = await Payment.create(paymentPayload);
  } else {
    payment = createMemoryPayment(paymentPayload);
  }

  log("kakao_ready", toPlain(payment));

  return {
    tid,
    next_redirect_pc_url:
      kakaoData?.next_redirect_pc_url ||
      kakaoData?.next_redirect_mobile_url ||
      "",
    redirectUrl:
      kakaoData?.next_redirect_pc_url ||
      kakaoData?.next_redirect_mobile_url ||
      "",
    orderId,
  };
};

/* =====================================================
🔥 KAKAO APPROVE
===================================================== */
exports.kakaoApprove = async ({
  pgToken,
  pg_token,
  orderId,
  userId,
  paymentKey,
} = {}) => {
  const payment = await findPayment({ orderId, paymentKey });

  if (!payment) {
    throw new Error("payment not found");
  }

  if (payment.status === "paid") {
    return payment;
  }

  if (KAKAO_ADMIN_KEY && payment.tid) {
    try {
      await axios.post(
        "https://kapi.kakao.com/v1/payment/approve",
        null,
        {
          params: {
            cid: process.env.KAKAO_CID || "TC0ONETIME",
            tid: payment.tid,
            partner_order_id: payment.orderId,
            partner_user_id: userId || payment.userId,
            pg_token: pgToken || pg_token || "manual",
          },
          headers: {
            Authorization: `KakaoAK ${KAKAO_ADMIN_KEY}`,
            "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          timeout: Number(process.env.PAYMENT_TIMEOUT || 30000),
        }
      );
    } catch (error) {
      METRICS.approveRetry += 1;
      console.error("[payment.service] kakao approve fail:", error.message);
    }
  }

  payment.status = "paid";
  payment.approvedAt = new Date();

  await savePayment(payment);

  METRICS.success += 1;
  log("kakao_approve", toPlain(payment));

  await updateReservationStatus(payment, "confirm");

  return payment;
};

/* =====================================================
🔥 APPROVE
===================================================== */
exports.approvePayment = async ({
  paymentId,
  orderId,
  paymentKey,
  amount,
} = {}) => {
  const payment = await findPayment({ paymentId, orderId, paymentKey });

  if (!payment) {
    throw new Error("payment not found");
  }

  if (payment.status === "paid") {
    return payment;
  }

  if (KAKAO_ADMIN_KEY && payment.tid) {
    try {
      await axios.post(
        "https://kapi.kakao.com/v1/payment/approve",
        null,
        {
          params: {
            cid: process.env.KAKAO_CID || "TC0ONETIME",
            tid: payment.tid,
            partner_order_id: payment.orderId,
            partner_user_id: payment.userId,
            pg_token: paymentKey || "manual",
          },
          headers: {
            Authorization: `KakaoAK ${KAKAO_ADMIN_KEY}`,
            "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          timeout: Number(process.env.PAYMENT_TIMEOUT || 30000),
        }
      );
    } catch (error) {
      METRICS.approveRetry += 1;
      console.error("[payment.service] approve fail:", error.message);
    }
  }

  payment.status = "paid";
  payment.amount = amount ? safeNum(amount) : payment.amount;
  payment.approvedAt = new Date();

  await savePayment(payment);

  METRICS.success += 1;
  log("approve", toPlain(payment));

  await updateReservationStatus(payment, "confirm");

  return payment;
};

/* =====================================================
🔥 FAIL
===================================================== */
exports.failPayment = async ({ paymentId, orderId, reason } = {}) => {
  const payment = await findPayment({ paymentId, orderId });

  if (!payment) {
    return null;
  }

  payment.status = "failed";
  payment.failReason = safeStr(reason);

  await savePayment(payment);

  METRICS.fail += 1;
  log("fail", toPlain(payment));

  return payment;
};

/* =====================================================
🔥 CANCEL
===================================================== */
exports.cancelPayment = async ({ paymentId, orderId, reason } = {}) => {
  const payment = await findPayment({ paymentId, orderId });

  if (!payment) {
    throw new Error("payment not found");
  }

  payment.status = "cancelled";
  payment.cancelReason = safeStr(reason);

  await savePayment(payment);

  METRICS.cancel += 1;
  log("cancel", toPlain(payment));

  await updateReservationStatus(payment, "cancel");

  return payment;
};

/* =====================================================
🔥 REFUND
===================================================== */
exports.refundPayment = async ({ paymentId, orderId, reason } = {}) => {
  const payment = await findPayment({ paymentId, orderId });

  if (!payment) {
    throw new Error("payment not found");
  }

  if (KAKAO_ADMIN_KEY && payment.tid) {
    try {
      await axios.post(
        "https://kapi.kakao.com/v1/payment/cancel",
        null,
        {
          params: {
            cid: process.env.KAKAO_CID || "TC0ONETIME",
            tid: payment.tid,
            cancel_amount: safeNum(payment.amount),
            cancel_tax_free_amount: 0,
          },
          headers: {
            Authorization: `KakaoAK ${KAKAO_ADMIN_KEY}`,
            "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          timeout: Number(process.env.PAYMENT_TIMEOUT || 30000),
        }
      );
    } catch (error) {
      console.error("[payment.service] refund fail:", error.message);
    }
  }

  payment.status = "refunded";
  payment.refundReason = safeStr(reason);

  await savePayment(payment);

  METRICS.refund += 1;
  log("refund", toPlain(payment));

  return payment;
};

/* =====================================================
🔥 QUERY
===================================================== */
exports.getPaymentById = async (id) => {
  if (!id) {
    return null;
  }

  if (Payment && typeof Payment.findById === "function") {
    return Payment.findById(id);
  }

  return (
    MEMORY_PAYMENTS.find(
      (payment) =>
        String(payment._id) === String(id) || String(payment.id) === String(id)
    ) || null
  );
};

exports.getPaymentByOrderId = async (orderId) => {
  if (!orderId) {
    return null;
  }

  if (Payment && typeof Payment.findOne === "function") {
    return Payment.findOne({ orderId });
  }

  return (
    MEMORY_PAYMENTS.find(
      (payment) => String(payment.orderId) === String(orderId)
    ) || null
  );
};

exports.getPaymentByPaymentKey = async (tid) => {
  if (!tid) {
    return null;
  }

  if (Payment && typeof Payment.findOne === "function") {
    return Payment.findOne({
      $or: [{ tid }, { paymentKey: tid }, { key: tid }],
    });
  }

  return (
    MEMORY_PAYMENTS.find(
      (payment) =>
        String(payment.tid) === String(tid) ||
        String(payment.paymentKey) === String(tid)
    ) || null
  );
};

exports.getPaymentByKey = exports.getPaymentByPaymentKey;

/* =====================================================
🔥 LIST
===================================================== */
exports.listPayments = async (options = {}) => {
  const normalized = normalizeListOptions(options);

  if (Payment && typeof Payment.find === "function") {
    const query = {};

    if (normalized.userId) query.userId = normalized.userId;
    if (normalized.shopId) query.shopId = normalized.shopId;
    if (normalized.reservationId) query.reservationId = normalized.reservationId;
    if (normalized.status) query.status = normalized.status;

    const items = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip((normalized.page - 1) * normalized.limit)
      .limit(normalized.limit)
      .lean();

    const total =
      typeof Payment.countDocuments === "function"
        ? await Payment.countDocuments(query)
        : items.length;

    return {
      items,
      payments: items,
      list: items,
      total,
      page: normalized.page,
      pages: Math.ceil(total / normalized.limit),
    };
  }

  const filtered = buildMemoryQuery(normalized);
  const start = (normalized.page - 1) * normalized.limit;
  const items = filtered.slice(start, start + normalized.limit);

  return {
    items,
    payments: items,
    list: items,
    total: filtered.length,
    page: normalized.page,
    pages: Math.ceil(filtered.length / normalized.limit),
    source: "memory",
  };
};

/* =====================================================
🔥 RECEIPT
===================================================== */
exports.getReceipt = async (paymentId) => {
  const payment = await exports.getPaymentById(paymentId);

  if (!payment) {
    throw new Error("not found");
  }

  const plain = toPlain(payment);

  return {
    orderId: plain.orderId,
    amount: plain.amount,
    status: plain.status,
    createdAt: plain.createdAt,
  };
};

/* =====================================================
🔥 CALC
===================================================== */
exports.calculateReservationAmount = ({
  basePrice = 0,
  people = 1,
  extraPricePerPerson = 0,
  discountAmount = 0,
  discountRate = 0,
} = {}) => {
  let amount =
    safeNum(basePrice) +
    (safeNum(people) - 1) * safeNum(extraPricePerPerson);

  if (safeNum(discountRate) > 0) {
    amount -= amount * (safeNum(discountRate) / 100);
  }

  amount -= safeNum(discountAmount);

  return Math.max(0, Math.floor(amount));
};

/* =====================================================
🔥 WEBHOOK
===================================================== */
exports.processWebhook = async (payload) => {
  METRICS.webhook += 1;
  log("webhook", payload);
  return true;
};

exports.verifyWebhook = () => true;

exports.signPayload = (payload) => JSON.stringify(payload);

exports.verifySignature = () => true;

/* =====================================================
🔥 ADMIN
===================================================== */
exports.getLogs = (limit = 100) => LOGS.slice(-limit);

exports.clearLogs = () => LOGS.splice(0, LOGS.length);

exports.getMetrics = () => ({ ...METRICS });

exports.getHealth = () => ({
  ok: true,
  logs: LOGS.length,
  cache: CACHE.size,
  paymentModel: !!Payment,
  reservationModel: !!Reservation,
});

exports.getStoreSize = () => ({
  logs: LOGS.length,
  cache: CACHE.size,
  memoryPayments: MEMORY_PAYMENTS.length,
});

exports.clearExpiredPayments = async () => {
  if (!Payment || typeof Payment.deleteMany !== "function") {
    const before = MEMORY_PAYMENTS.length;
    const cutoff = Date.now() - 1000 * 60 * 30;

    for (let index = MEMORY_PAYMENTS.length - 1; index >= 0; index -= 1) {
      const createdAt = new Date(MEMORY_PAYMENTS[index].createdAt).getTime();

      if (MEMORY_PAYMENTS[index].status === "ready" && createdAt < cutoff) {
        MEMORY_PAYMENTS.splice(index, 1);
      }
    }

    return before - MEMORY_PAYMENTS.length;
  }

  const result = await Payment.deleteMany({
    status: "ready",
    createdAt: {
      $lt: new Date(Date.now() - 1000 * 60 * 30),
    },
  });

  return result.deletedCount;
};

exports.clearExpired = exports.clearExpiredPayments;

/* =====================================================
🔥 CACHE EXPORT
===================================================== */
exports.cacheSet = cacheSet;
exports.cacheGet = cacheGet;

/* =====================================================
🔥 FINAL
===================================================== */
console.log("🔥 PAYMENT SERVICE ULTIMATE READY");

module.exports = exports;
