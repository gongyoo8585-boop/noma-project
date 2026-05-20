"use strict";

/* =====================================================
🔥 COMMON
===================================================== */
function toPlain(value) {
  if (!value) return value;

  if (typeof value.toObject === "function") {
    return value.toObject({ virtuals: true });
  }

  if (typeof value.toJSON === "function") {
    return value.toJSON();
  }

  return value;
}

function removeUndefined(obj = {}) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  );
}

/* =====================================================
🔥 RESPONSE WRAPPERS
===================================================== */
function success(data = {}, message = "OK") {
  return {
    ok: true,
    message,
    data
  };
}

function fail(message = "ERROR", code = 400, extra = {}) {
  return {
    ok: false,
    code,
    message,
    ...extra
  };
}

/* =====================================================
🔥 PAYMENT SERIALIZER
===================================================== */
function serializePayment(payment) {
  if (!payment) return null;

  const p = toPlain(payment);

  return removeUndefined({
    id: p._id || null,
    paymentId: p.paymentId || null,
    user: p.user || null,
    reservation: p.reservation || null,
    orderId: p.orderId || null,

    title: p.title || null,
    amount: p.amount ?? 0,
    discountAmount: p.discountAmount ?? 0,
    paidAmount: p.paidAmount ?? 0,
    refundedAmount: p.refundedAmount ?? 0,
    currency: p.currency || "KRW",

    method: p.method || null,
    provider: p.provider || null,
    status: p.status || null,

    transactionId: p.transactionId || null,
    providerOrderId: p.providerOrderId || null,
    providerPaymentKey: p.providerPaymentKey || null,

    payerName: p.payerName || null,
    payerEmail: p.payerEmail || null,
    payerPhone: p.payerPhone || null,

    failReason: p.failReason || null,
    cancelReason: p.cancelReason || null,
    refundReason: p.refundReason || null,
    adminNote: p.adminNote || null,

    serviceSnapshot: p.serviceSnapshot || {},
    metadata: p.metadata || {},

    paidAt: p.paidAt || null,
    cancelledAt: p.cancelledAt || null,
    refundedAt: p.refundedAt || null,
    failedAt: p.failedAt || null,

    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null
  });
}

function serializePaymentList(payments = []) {
  return Array.isArray(payments)
    ? payments.map((item) => serializePayment(item))
    : [];
}

/* =====================================================
🔥 LIGHT SUMMARY
===================================================== */
function paymentSummary(payment) {
  if (!payment) return null;

  const p = toPlain(payment);

  return removeUndefined({
    paymentId: p.paymentId || null,
    reservation: p.reservation || null,
    title: p.title || null,
    amount: p.amount ?? 0,
    paidAmount: p.paidAmount ?? 0,
    refundedAmount: p.refundedAmount ?? 0,
    status: p.status || null,
    method: p.method || null,
    provider: p.provider || null,
    createdAt: p.createdAt || null,
    paidAt: p.paidAt || null
  });
}

function paymentListResponse(payments = [], message = "PAYMENT_LIST") {
  return success(
    {
      items: serializePaymentList(payments),
      count: Array.isArray(payments) ? payments.length : 0
    },
    message
  );
}

/* =====================================================
🔥 KAKAO READY FORMAT
===================================================== */
function formatKakaoReadyResponse(payment, readyData = {}) {
  return {
    paymentId: payment?.paymentId || null,
    orderId: payment?.paymentId || null,
    tid: readyData.tid || null,

    redirectUrl:
      readyData.next_redirect_pc_url ||
      readyData.next_redirect_mobile_url ||
      readyData.next_redirect_app_url ||
      null,

    pcUrl: readyData.next_redirect_pc_url || null,
    mobileUrl: readyData.next_redirect_mobile_url || null,
    appUrl: readyData.next_redirect_app_url || null,

    createdAt: readyData.created_at || null
  };
}

/* =====================================================
🔥 KAKAO APPROVE FORMAT
===================================================== */
function formatKakaoApproveResponse(payment, approveData = {}) {
  const amount = approveData.amount || {};

  return {
    payment: serializePayment(payment),
    provider: "kakao",
    tid: approveData.tid || payment?.transactionId || null,
    itemName: approveData.item_name || payment?.title || null,

    quantity: amount.quantity ?? null,
    totalAmount: amount.total ?? payment?.paidAmount ?? 0,
    taxFreeAmount: amount.tax_free ?? 0,
    vatAmount: amount.vat ?? 0,
    discountAmount: amount.discount ?? 0,

    approvedAt: approveData.approved_at || null,
    partnerOrderId: approveData.partner_order_id || payment?.paymentId || null,
    partnerUserId: approveData.partner_user_id || payment?.user || null
  };
}

/* =====================================================
🔥 KAKAO CANCEL FORMAT
===================================================== */
function formatKakaoCancelResponse(payment, cancelData = {}) {
  const amount = cancelData.amount || {};
  const canceledAmount = cancelData.canceled_amount || {};

  return {
    payment: serializePayment(payment),
    provider: "kakao",
    tid: cancelData.tid || payment?.transactionId || null,

    cancelTotal:
      canceledAmount.total ??
      amount.total ??
      payment?.refundedAmount ??
      0,

    cancelTaxFree:
      canceledAmount.tax_free ??
      amount.tax_free ??
      0,

    cancelVat:
      canceledAmount.vat ??
      amount.vat ??
      0,

    cancelledAt: cancelData.cancel_available_amount?.created_at || null
  };
}

/* =====================================================
🔥 CONTROLLER RESPONSE BUILDERS
===================================================== */
function readyResponse(payment, readyData) {
  return success(
    formatKakaoReadyResponse(payment, readyData),
    "KAKAO_READY"
  );
}

function approveResponse(payment, approveData) {
  return success(
    formatKakaoApproveResponse(payment, approveData),
    "PAYMENT_APPROVED"
  );
}

function cancelResponse(payment, cancelData) {
  return success(
    formatKakaoCancelResponse(payment, cancelData),
    "PAYMENT_CANCELLED"
  );
}

function refundResponse(payment, cancelData) {
  return success(
    formatKakaoCancelResponse(payment, cancelData),
    "PAYMENT_REFUNDED"
  );
}

function detailResponse(payment, message = "PAYMENT_DETAIL") {
  return success(serializePayment(payment), message);
}

/* =====================================================
🔥 EXPORT
===================================================== */
module.exports = {
  toPlain,
  removeUndefined,

  success,
  fail,

  serializePayment,
  serializePaymentList,
  paymentSummary,
  paymentListResponse,

  formatKakaoReadyResponse,
  formatKakaoApproveResponse,
  formatKakaoCancelResponse,

  readyResponse,
  approveResponse,
  cancelResponse,
  refundResponse,
  detailResponse
};