"use strict";

/* =====================================================
🔥 PAYMENT SERVICE (FINAL ULTRA COMPLETE MASTER)
👉 결제 생성 / 승인 / 취소 / 환불 / 조회 / 검증
👉 Reservation 모델과 바로 연결 가능
👉 외부 PG 없을 때도 mock 모드로 동작
👉 통째로 교체 가능한 완성형
===================================================== */

const crypto = require("crypto");

let Reservation = null;
try {
  Reservation = require("../models/Reservation");
} catch (_) {
  Reservation = null;
}

/* =====================================================
🔥 CONFIG
===================================================== */
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || "mock";
const PAYMENT_SECRET = process.env.PAYMENT_SECRET || "PAYMENT_SECRET_CHANGE_THIS";
const PAYMENT_CURRENCY = process.env.PAYMENT_CURRENCY || "KRW";
const PAYMENT_TTL_MS = Number(process.env.PAYMENT_TTL_MS || 30 * 60 * 1000);
const PAYMENT_WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET || "PAYMENT_WEBHOOK_SECRET_CHANGE_THIS";

/* =====================================================
🔥 INTERNAL STORE
👉 DB 없을 때도 안전하게 동작
===================================================== */
const PAYMENT_STORE = new Map();
const PAYMENT_LOGS = [];
const PAYMENT_METRICS = {
  created: 0,
  approved: 0,
  cancelled: 0,
  refunded: 0,
  failed: 0,
  webhooks: 0
};

/* =====================================================
🔥 SAFE UTIL
===================================================== */
function now() {
  return Date.now();
}

function safeStr(v, d = "") {
  return typeof v === "string" ? v.trim() : d;
}

function safeNum(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function safeBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return ["true", "1", "yes", "y"].includes(v.toLowerCase());
  return false;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ""));
}

function randomId(prefix = "pay") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

function makeOrderId(prefix = "ord") {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function hmac(value, secret) {
  return crypto.createHmac("sha256", secret).update(String(value)).digest("hex");
}

function appendLog(type, payload = {}) {
  PAYMENT_LOGS.push({
    type,
    payload,
    time: now()
  });

  if (PAYMENT_LOGS.length > 5000) {
    PAYMENT_LOGS.shift();
  }
}

function ensurePositiveAmount(amount) {
  const v = Math.max(0, safeNum(amount, 0));
  return Math.round(v);
}

function normalizeMethod(method = "") {
  const v = safeStr(method || "card").toLowerCase();
  if (!v) return "card";
  return v;
}

function normalizeStatus(status = "") {
  const v = safeStr(status).toLowerCase();

  if (["ready", "pending", "requested"].includes(v)) return "ready";
  if (["approved", "paid", "success", "done"].includes(v)) return "approved";
  if (["cancelled", "canceled", "void"].includes(v)) return "cancelled";
  if (["refund", "refunded", "partial_refund"].includes(v)) return "refunded";
  if (["failed", "error"].includes(v)) return "failed";

  return "ready";
}

function normalizePayment(doc) {
  if (!doc) return null;

  return {
    id: safeStr(doc.id),
    provider: safeStr(doc.provider || PAYMENT_PROVIDER),
    orderId: safeStr(doc.orderId),
    paymentKey: safeStr(doc.paymentKey),
    reservationId: safeStr(doc.reservationId),
    userId: safeStr(doc.userId),
    shopId: safeStr(doc.shopId),
    title: safeStr(doc.title),
    method: safeStr(doc.method || "card"),
    amount: ensurePositiveAmount(doc.amount),
    currency: safeStr(doc.currency || PAYMENT_CURRENCY),
    status: normalizeStatus(doc.status),
    requestedAt: doc.requestedAt || null,
    approvedAt: doc.approvedAt || null,
    cancelledAt: doc.cancelledAt || null,
    refundedAt: doc.refundedAt || null,
    failReason: safeStr(doc.failReason),
    cancelReason: safeStr(doc.cancelReason),
    refundReason: safeStr(doc.refundReason),
    metadata: doc.metadata && typeof doc.metadata === "object" ? clone(doc.metadata) : {},
    receiptUrl: safeStr(doc.receiptUrl),
    checkoutUrl: safeStr(doc.checkoutUrl),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null
  };
}

function setStore(doc) {
  doc.updatedAt = new Date();
  PAYMENT_STORE.set(doc.id, doc);
  return doc;
}

function getStoreById(id) {
  return PAYMENT_STORE.get(String(id || "")) || null;
}

function getStoreByOrderId(orderId) {
  const target = safeStr(orderId);
  for (const item of PAYMENT_STORE.values()) {
    if (item.orderId === target) return item;
  }
  return null;
}

function getStoreByPaymentKey(paymentKey) {
  const target = safeStr(paymentKey);
  for (const item of PAYMENT_STORE.values()) {
    if (item.paymentKey === target) return item;
  }
  return null;
}

function assertExists(item, message = "payment not found") {
  if (!item) {
    const err = new Error(message);
    err.status = 404;
    throw err;
  }
}

function assertAmountValid(amount) {
  if (ensurePositiveAmount(amount) <= 0) {
    const err = new Error("invalid payment amount");
    err.status = 400;
    throw err;
  }
}

function assertStatus(item, allowed = [], message = "invalid payment status") {
  if (!allowed.includes(normalizeStatus(item.status))) {
    const err = new Error(message);
    err.status = 400;
    throw err;
  }
}

/* =====================================================
🔥 RESERVATION SYNC
===================================================== */
async function syncReservationPaid(reservationId, paymentId, amount) {
  if (!Reservation || !reservationId || !isValidId(reservationId)) return null;

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return null;

  if (typeof reservation.attachPayment === "function") {
    await reservation.attachPayment(paymentId, amount);
  } else if (typeof reservation.pay === "function") {
    await reservation.pay(amount);
    reservation.paymentId = paymentId;
    await reservation.save();
  } else {
    reservation.paymentStatus = "paid";
    reservation.paymentAmount = ensurePositiveAmount(amount);
    reservation.paymentId = paymentId;
    await reservation.save();
  }

  return reservation;
}

async function syncReservationRefunded(reservationId) {
  if (!Reservation || !reservationId || !isValidId(reservationId)) return null;

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return null;

  if (typeof reservation.refund === "function") {
    await reservation.refund();
  } else {
    reservation.paymentStatus = "refund";
    await reservation.save();
  }

  return reservation;
}

async function syncReservationCancelledPayment(reservationId) {
  if (!Reservation || !reservationId || !isValidId(reservationId)) return null;

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) return null;

  if (!reservation.paymentStatus || reservation.paymentStatus === "none") {
    return reservation;
  }

  reservation.paymentStatus = "none";
  reservation.paymentAmount = 0;
  reservation.paymentId = "";
  await reservation.save();

  return reservation;
}

/* =====================================================
🔥 CORE CREATE
===================================================== */
async function createPayment({
  reservationId = "",
  userId = "",
  shopId = "",
  orderId = "",
  title = "Reservation Payment",
  amount = 0,
  currency = PAYMENT_CURRENCY,
  method = "card",
  successUrl = "",
  failUrl = "",
  metadata = {}
} = {}) {
  const finalAmount = ensurePositiveAmount(amount);
  assertAmountValid(finalAmount);

  const finalOrderId = safeStr(orderId) || makeOrderId("order");
  const exists = getStoreByOrderId(finalOrderId);
  if (exists) {
    const err = new Error("duplicated orderId");
    err.status = 409;
    throw err;
  }

  const id = randomId("pay");
  const paymentKey = sha256(`${id}_${finalOrderId}_${PAYMENT_SECRET}`).slice(0, 32);

  const doc = {
    id,
    provider: PAYMENT_PROVIDER,
    orderId: finalOrderId,
    paymentKey,
    reservationId: safeStr(reservationId),
    userId: safeStr(userId),
    shopId: safeStr(shopId),
    title: safeStr(title || "Reservation Payment"),
    method: normalizeMethod(method),
    amount: finalAmount,
    currency: safeStr(currency || PAYMENT_CURRENCY),
    status: "ready",
    successUrl: safeStr(successUrl),
    failUrl: safeStr(failUrl),
    receiptUrl: "",
    checkoutUrl: `/payments/checkout/${id}`,
    metadata: metadata && typeof metadata === "object" ? clone(metadata) : {},
    requestedAt: new Date(),
    approvedAt: null,
    cancelledAt: null,
    refundedAt: null,
    failReason: "",
    cancelReason: "",
    refundReason: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    expireAt: new Date(now() + PAYMENT_TTL_MS)
  };

  setStore(doc);
  PAYMENT_METRICS.created += 1;
  appendLog("create", { id, orderId: finalOrderId, amount: finalAmount });

  return normalizePayment(doc);
}

/* =====================================================
🔥 APPROVE
===================================================== */
async function approvePayment({
  paymentId = "",
  paymentKey = "",
  orderId = "",
  amount = null,
  approvedBy = "system",
  receiptUrl = ""
} = {}) {
  let item =
    getStoreById(paymentId) ||
    getStoreByPaymentKey(paymentKey) ||
    getStoreByOrderId(orderId);

  assertExists(item);
  assertStatus(item, ["ready"], "payment is not approvable");

  if (item.expireAt && new Date(item.expireAt).getTime() < now()) {
    item.status = "failed";
    item.failReason = "payment expired";
    setStore(item);
    PAYMENT_METRICS.failed += 1;
    appendLog("expire_fail", { id: item.id });
    throw Object.assign(new Error("payment expired"), { status: 400 });
  }

  if (amount != null && ensurePositiveAmount(amount) !== ensurePositiveAmount(item.amount)) {
    const err = new Error("payment amount mismatch");
    err.status = 400;
    throw err;
  }

  item.status = "approved";
  item.approvedAt = new Date();
  item.receiptUrl = safeStr(receiptUrl) || `/payments/receipt/${item.id}`;
  item.metadata = {
    ...(item.metadata || {}),
    approvedBy: safeStr(approvedBy || "system")
  };

  setStore(item);

  await syncReservationPaid(item.reservationId, item.id, item.amount);

  PAYMENT_METRICS.approved += 1;
  appendLog("approve", { id: item.id, orderId: item.orderId });

  return normalizePayment(item);
}

/* =====================================================
🔥 FAIL
===================================================== */
async function failPayment({
  paymentId = "",
  orderId = "",
  reason = "payment failed"
} = {}) {
  const item = getStoreById(paymentId) || getStoreByOrderId(orderId);
  assertExists(item);

  if (normalizeStatus(item.status) === "approved") {
    const err = new Error("approved payment cannot fail");
    err.status = 400;
    throw err;
  }

  item.status = "failed";
  item.failReason = safeStr(reason || "payment failed");
  setStore(item);

  PAYMENT_METRICS.failed += 1;
  appendLog("fail", { id: item.id, reason: item.failReason });

  return normalizePayment(item);
}

/* =====================================================
🔥 CANCEL
===================================================== */
async function cancelPayment({
  paymentId = "",
  orderId = "",
  reason = "cancelled by user",
  cancelledBy = "system"
} = {}) {
  const item = getStoreById(paymentId) || getStoreByOrderId(orderId);
  assertExists(item);
  assertStatus(item, ["ready"], "only ready payment can be cancelled");

  item.status = "cancelled";
  item.cancelledAt = new Date();
  item.cancelReason = safeStr(reason);
  item.metadata = {
    ...(item.metadata || {}),
    cancelledBy: safeStr(cancelledBy || "system")
  };

  setStore(item);
  await syncReservationCancelledPayment(item.reservationId);

  PAYMENT_METRICS.cancelled += 1;
  appendLog("cancel", { id: item.id, reason: item.cancelReason });

  return normalizePayment(item);
}

/* =====================================================
🔥 REFUND
===================================================== */
async function refundPayment({
  paymentId = "",
  orderId = "",
  reason = "refund",
  refundedBy = "system",
  partialAmount = null
} = {}) {
  const item = getStoreById(paymentId) || getStoreByOrderId(orderId);
  assertExists(item);
  assertStatus(item, ["approved"], "only approved payment can be refunded");

  if (partialAmount != null) {
    const refundAmount = ensurePositiveAmount(partialAmount);
    if (refundAmount <= 0 || refundAmount > item.amount) {
      const err = new Error("invalid refund amount");
      err.status = 400;
      throw err;
    }

    item.status = refundAmount < item.amount ? "refunded" : "refunded";
    item.metadata = {
      ...(item.metadata || {}),
      partialRefundAmount: refundAmount
    };
  } else {
    item.status = "refunded";
  }

  item.refundedAt = new Date();
  item.refundReason = safeStr(reason || "refund");
  item.metadata = {
    ...(item.metadata || {}),
    refundedBy: safeStr(refundedBy || "system")
  };

  setStore(item);
  await syncReservationRefunded(item.reservationId);

  PAYMENT_METRICS.refunded += 1;
  appendLog("refund", { id: item.id, reason: item.refundReason });

  return normalizePayment(item);
}

/* =====================================================
🔥 GET / FIND
===================================================== */
async function getPaymentById(paymentId = "") {
  const item = getStoreById(paymentId);
  assertExists(item);
  return normalizePayment(item);
}

async function getPaymentByOrderId(orderId = "") {
  const item = getStoreByOrderId(orderId);
  assertExists(item);
  return normalizePayment(item);
}

async function getPaymentByPaymentKey(paymentKey = "") {
  const item = getStoreByPaymentKey(paymentKey);
  assertExists(item);
  return normalizePayment(item);
}

async function listPayments({
  userId = "",
  reservationId = "",
  shopId = "",
  status = "",
  limit = 50,
  page = 1
} = {}) {
  let list = Array.from(PAYMENT_STORE.values());

  if (userId) list = list.filter((v) => v.userId === String(userId));
  if (reservationId) list = list.filter((v) => v.reservationId === String(reservationId));
  if (shopId) list = list.filter((v) => v.shopId === String(shopId));
  if (status) list = list.filter((v) => normalizeStatus(v.status) === normalizeStatus(status));

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const finalLimit = Math.max(1, Math.min(200, safeNum(limit, 50)));
  const finalPage = Math.max(1, safeNum(page, 1));
  const total = list.length;
  const start = (finalPage - 1) * finalLimit;
  const items = list.slice(start, start + finalLimit).map(normalizePayment);

  return {
    list: items,
    page: finalPage,
    limit: finalLimit,
    total,
    hasMore: finalPage * finalLimit < total
  };
}

/* =====================================================
🔥 VERIFY / SIGNATURE
===================================================== */
function signPayload(payload = {}) {
  const raw = JSON.stringify(payload || {});
  return hmac(raw, PAYMENT_WEBHOOK_SECRET);
}

function verifySignature(payload = {}, signature = "") {
  const expected = signPayload(payload);
  return expected === safeStr(signature);
}

function verifyWebhook(headers = {}, body = {}) {
  const signature =
    safeStr(headers["x-payment-signature"]) ||
    safeStr(headers["x-signature"]) ||
    safeStr(headers.signature);

  if (!signature) {
    const err = new Error("missing webhook signature");
    err.status = 401;
    throw err;
  }

  const valid = verifySignature(body, signature);
  if (!valid) {
    const err = new Error("invalid webhook signature");
    err.status = 401;
    throw err;
  }

  PAYMENT_METRICS.webhooks += 1;
  appendLog("webhook_verify", { ok: true });

  return true;
}

/* =====================================================
🔥 WEBHOOK PROCESS
===================================================== */
async function processWebhook(event = {}) {
  const type = safeStr(event.type || event.eventType);
  const data = event.data || event;

  if (!type) {
    const err = new Error("invalid webhook event");
    err.status = 400;
    throw err;
  }

  appendLog("webhook_receive", { type });

  if (["payment.approved", "payment.success", "approved"].includes(type)) {
    return approvePayment({
      paymentId: data.paymentId || data.id,
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      amount: data.amount,
      approvedBy: "webhook",
      receiptUrl: data.receiptUrl
    });
  }

  if (["payment.cancelled", "cancelled"].includes(type)) {
    return cancelPayment({
      paymentId: data.paymentId || data.id,
      orderId: data.orderId,
      reason: data.reason || "webhook cancel",
      cancelledBy: "webhook"
    });
  }

  if (["payment.refunded", "refunded"].includes(type)) {
    return refundPayment({
      paymentId: data.paymentId || data.id,
      orderId: data.orderId,
      reason: data.reason || "webhook refund",
      refundedBy: "webhook",
      partialAmount: data.partialAmount
    });
  }

  if (["payment.failed", "failed"].includes(type)) {
    return failPayment({
      paymentId: data.paymentId || data.id,
      orderId: data.orderId,
      reason: data.reason || "webhook fail"
    });
  }

  return { ok: true, ignored: true, type };
}

/* =====================================================
🔥 PRICE / VALIDATION
===================================================== */
function calculateReservationAmount({
  basePrice = 0,
  people = 1,
  extraPricePerPerson = 0,
  discountAmount = 0,
  discountRate = 0
} = {}) {
  const base = ensurePositiveAmount(basePrice);
  const count = Math.max(1, safeNum(people, 1));
  const extra = ensurePositiveAmount(extraPricePerPerson) * Math.max(0, count - 1);

  let total = base + extra;

  if (discountRate > 0) {
    total -= Math.floor(total * (safeNum(discountRate) / 100));
  }

  if (discountAmount > 0) {
    total -= ensurePositiveAmount(discountAmount);
  }

  return Math.max(0, Math.round(total));
}

function validateCheckoutPayload(payload = {}) {
  const amount = ensurePositiveAmount(payload.amount);
  if (amount <= 0) {
    const err = new Error("invalid checkout amount");
    err.status = 400;
    throw err;
  }

  if (!safeStr(payload.userId) && !safeStr(payload.reservationId)) {
    const err = new Error("userId or reservationId required");
    err.status = 400;
    throw err;
  }

  return true;
}

/* =====================================================
🔥 MOCK CHECKOUT / RECEIPT
===================================================== */
async function createCheckoutSession(payload = {}) {
  validateCheckoutPayload(payload);

  const payment = await createPayment(payload);

  return {
    payment,
    checkoutUrl: payment.checkoutUrl,
    orderId: payment.orderId,
    paymentKey: payment.paymentKey
  };
}

async function getReceipt(paymentId = "") {
  const payment = await getPaymentById(paymentId);

  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    approvedAt: payment.approvedAt,
    refundedAt: payment.refundedAt,
    receiptUrl: payment.receiptUrl || `/payments/receipt/${payment.id}`
  };
}

/* =====================================================
🔥 OPERATIONS / ADMIN
===================================================== */
function getMetrics() {
  return clone(PAYMENT_METRICS);
}

function getLogs(limit = 100) {
  const finalLimit = Math.max(1, Math.min(1000, safeNum(limit, 100)));
  return PAYMENT_LOGS.slice(-finalLimit);
}

function clearLogs() {
  PAYMENT_LOGS.length = 0;
  return true;
}

function clearExpiredPayments() {
  let count = 0;

  for (const [id, item] of PAYMENT_STORE.entries()) {
    if (item.expireAt && new Date(item.expireAt).getTime() < now() && normalizeStatus(item.status) === "ready") {
      PAYMENT_STORE.delete(id);
      count += 1;
    }
  }

  appendLog("clear_expired", { count });
  return count;
}

function getStoreSize() {
  return PAYMENT_STORE.size;
}

function getHealth() {
  return {
    ok: true,
    provider: PAYMENT_PROVIDER,
    storeSize: PAYMENT_STORE.size,
    logSize: PAYMENT_LOGS.length,
    metrics: getMetrics()
  };
}

/* =====================================================
🔥 AUTO CLEAN
===================================================== */
if (!global.__PAYMENT_SERVICE_INTERVAL__) {
  global.__PAYMENT_SERVICE_INTERVAL__ = true;

  setInterval(() => {
    try {
      clearExpiredPayments();
      if (PAYMENT_LOGS.length > 5000) {
        PAYMENT_LOGS.splice(0, PAYMENT_LOGS.length - 3000);
      }
    } catch (_) {}
  }, 60000);
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  // core
  createPayment,
  approvePayment,
  failPayment,
  cancelPayment,
  refundPayment,

  // query
  getPaymentById,
  getPaymentByOrderId,
  getPaymentByPaymentKey,
  listPayments,

  // checkout
  createCheckoutSession,
  getReceipt,

  // verify
  signPayload,
  verifySignature,
  verifyWebhook,
  processWebhook,

  // calc
  calculateReservationAmount,
  validateCheckoutPayload,

  // ops
  getMetrics,
  getLogs,
  clearLogs,
  clearExpiredPayments,
  getStoreSize,
  getHealth
};

console.log("🔥 PAYMENT SERVICE FINAL MASTER READY");