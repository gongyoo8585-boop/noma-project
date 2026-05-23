"use strict";

/* =====================================================
🔥 PAYMENT STATUS
===================================================== */
const PAYMENT_STATUS = {
  PENDING: "pending",
  READY: "ready",
  PAID: "paid",
  FAILED: "failed",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  PARTIAL_REFUNDED: "partial_refunded",
  EXPIRED: "expired"
};

/* =====================================================
🔥 PAYMENT METHOD
===================================================== */
const PAYMENT_METHOD = {
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  VIRTUAL_ACCOUNT: "virtual_account",
  KAKAO_PAY: "kakao_pay",
  NAVER_PAY: "naver_pay",
  TOSS_PAY: "toss_pay",
  POINT: "point",
  CASH: "cash",
  ETC: "etc"
};

/* =====================================================
🔥 NUMBER UTILS
===================================================== */
function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toPositiveNumber(value, fallback = 0) {
  const n = toNumber(value, fallback);
  return n > 0 ? n : fallback;
}

function floorAmount(value) {
  return Math.floor(toNumber(value, 0));
}

/* =====================================================
🔥 STRING UTILS
===================================================== */
function isValidString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeString(value, fallback = "") {
  return isValidString(value) ? value.trim() : fallback;
}

/* =====================================================
🔥 AMOUNT HELPERS
===================================================== */
function calculateVat(amount) {
  const safeAmount = floorAmount(amount);
  return Math.floor(safeAmount / 11);
}

function calculateTaxFreeAmount() {
  return 0;
}

function calculatePaidAmount(amount, discountAmount = 0) {
  const total = toNumber(amount, 0);
  const discount = toNumber(discountAmount, 0);
  const paid = total - discount;
  return paid > 0 ? paid : 0;
}

function calculateRefundableAmount(payment) {
  if (!payment) return 0;

  const paidAmount = toNumber(payment.paidAmount, 0);
  const refundedAmount = toNumber(payment.refundedAmount, 0);

  const rest = paidAmount - refundedAmount;
  return rest > 0 ? rest : 0;
}

function isValidRefundAmount(payment, amount) {
  const targetAmount = toNumber(amount, 0);
  if (targetAmount <= 0) return false;

  return targetAmount <= calculateRefundableAmount(payment);
}

/* =====================================================
🔥 STATUS HELPERS
===================================================== */
function isPending(status) {
  return status === PAYMENT_STATUS.PENDING;
}

function isReady(status) {
  return status === PAYMENT_STATUS.READY;
}

function isPaid(status) {
  return status === PAYMENT_STATUS.PAID;
}

function isFailed(status) {
  return status === PAYMENT_STATUS.FAILED;
}

function isCancelled(status) {
  return status === PAYMENT_STATUS.CANCELLED;
}

function isRefunded(status) {
  return (
    status === PAYMENT_STATUS.REFUNDED ||
    status === PAYMENT_STATUS.PARTIAL_REFUNDED
  );
}

function isExpired(status) {
  return status === PAYMENT_STATUS.EXPIRED;
}

function isPayable(status) {
  return [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.READY].includes(status);
}

function isCancelable(status) {
  return [PAYMENT_STATUS.PAID].includes(status);
}

function isRefundable(status) {
  return [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIAL_REFUNDED].includes(status);
}

function isFinalStatus(status) {
  return [
    PAYMENT_STATUS.FAILED,
    PAYMENT_STATUS.CANCELLED,
    PAYMENT_STATUS.REFUNDED,
    PAYMENT_STATUS.EXPIRED
  ].includes(status);
}

/* =====================================================
🔥 ID HELPERS
===================================================== */
function generatePaymentId(prefix = "pay") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateOrderId(prefix = "order") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/* =====================================================
🔥 URL HELPERS
===================================================== */
function buildClientUrls(baseUrl, orderId) {
  const safeBase = normalizeString(baseUrl, "").replace(/\/+$/, "");

  return {
    approval: `${safeBase}/payment/success?orderId=${encodeURIComponent(orderId)}`,
    cancel: `${safeBase}/payment/cancel?orderId=${encodeURIComponent(orderId)}`,
    fail: `${safeBase}/payment/fail?orderId=${encodeURIComponent(orderId)}`
  };
}

function buildKakaoReadyPayload({
  cid,
  orderId,
  userId,
  itemName,
  quantity = 1,
  totalAmount,
  vatAmount,
  taxFreeAmount = 0,
  approvalUrl,
  cancelUrl,
  failUrl
}) {
  return {
    cid,
    partner_order_id: String(orderId),
    partner_user_id: String(userId),
    item_name: normalizeString(itemName, "payment"),
    quantity: toPositiveNumber(quantity, 1),
    total_amount: floorAmount(totalAmount),
    vat_amount: floorAmount(vatAmount),
    tax_free_amount: floorAmount(taxFreeAmount),
    approval_url: approvalUrl,
    cancel_url: cancelUrl,
    fail_url: failUrl
  };
}

function buildKakaoApprovePayload({
  cid,
  tid,
  orderId,
  userId,
  pgToken
}) {
  return {
    cid,
    tid: normalizeString(tid),
    partner_order_id: String(orderId),
    partner_user_id: String(userId),
    pg_token: normalizeString(pgToken)
  };
}

function buildKakaoCancelPayload({
  cid,
  tid,
  cancelAmount,
  cancelTaxFreeAmount = 0
}) {
  return {
    cid,
    tid: normalizeString(tid),
    cancel_amount: floorAmount(cancelAmount),
    cancel_tax_free_amount: floorAmount(cancelTaxFreeAmount)
  };
}

/* =====================================================
🔥 PAYMENT DATA HELPERS
===================================================== */
function sanitizePaymentCreateInput(payload = {}) {
  return {
    user: payload.user,
    reservation: payload.reservation || null,
    title: normalizeString(payload.title, "payment"),
    amount: floorAmount(payload.amount),
    discountAmount: floorAmount(payload.discountAmount || 0),
    paidAmount: calculatePaidAmount(payload.amount, payload.discountAmount || 0),
    method: payload.method || PAYMENT_METHOD.KAKAO_PAY,
    provider: payload.provider || "kakao",
    status: payload.status || PAYMENT_STATUS.PENDING,
    currency: payload.currency || "KRW",
    metadata: payload.metadata || {}
  };
}

function pickPaymentSummary(payment) {
  if (!payment) return null;

  return {
    paymentId: payment.paymentId,
    user: payment.user,
    reservation: payment.reservation,
    title: payment.title,
    amount: payment.amount,
    paidAmount: payment.paidAmount,
    refundedAmount: payment.refundedAmount,
    status: payment.status,
    method: payment.method,
    provider: payment.provider,
    transactionId: payment.transactionId,
    createdAt: payment.createdAt,
    paidAt: payment.paidAt,
    cancelledAt: payment.cancelledAt,
    refundedAt: payment.refundedAt
  };
}

/* =====================================================
🔥 TIME HELPERS
===================================================== */
function isExpiredByMinutes(createdAt, minutes = 10) {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (!created) return false;

  const diff = Date.now() - created;
  return diff >= toPositiveNumber(minutes, 10) * 60 * 1000;
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  PAYMENT_STATUS,
  PAYMENT_METHOD,

  toNumber,
  toPositiveNumber,
  floorAmount,

  isValidString,
  normalizeString,

  calculateVat,
  calculateTaxFreeAmount,
  calculatePaidAmount,
  calculateRefundableAmount,
  isValidRefundAmount,

  isPending,
  isReady,
  isPaid,
  isFailed,
  isCancelled,
  isRefunded,
  isExpired,
  isPayable,
  isCancelable,
  isRefundable,
  isFinalStatus,

  generatePaymentId,
  generateOrderId,

  buildClientUrls,
  buildKakaoReadyPayload,
  buildKakaoApprovePayload,
  buildKakaoCancelPayload,

  sanitizePaymentCreateInput,
  pickPaymentSummary,

  isExpiredByMinutes
};