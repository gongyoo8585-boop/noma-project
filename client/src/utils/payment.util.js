"use strict";

/**
 * =====================================================
 * 🔥 PAYMENT UTIL (ULTRA FINAL COMPLETE)
 * ✔ 결제 공통 유틸 함수
 * ✔ 금액 포맷
 * ✔ 상태 라벨 변환
 * ✔ 상태 체크 함수
 * ✔ 날짜 포맷
 * ✔ null / undefined 안전 처리
 * ✔ 모든 payment 컴포넌트 호환
 * =====================================================
 */

/* =========================
🔥 금액 포맷
========================= */
export function formatAmount(amount, currency = "KRW") {
  const num = Number(amount || 0);

  if (currency === "KRW") {
    return `${num.toLocaleString()}원`;
  }

  return `${num.toLocaleString()} ${currency}`;
}

/* =========================
🔥 상태 라벨
========================= */
export function getPaymentStatusLabel(status) {
  const map = {
    ready: "결제 대기",
    paid: "결제 완료",
    cancelled: "결제 취소",
    fail: "결제 실패",
  };

  return map[String(status || "ready").toLowerCase()] || status;
}

/* =========================
🔥 상태 체크
========================= */
export function isPaid(payment) {
  return String(payment?.status).toLowerCase() === "paid";
}

export function isCancelled(payment) {
  return String(payment?.status).toLowerCase() === "cancelled";
}

export function isFailed(payment) {
  return String(payment?.status).toLowerCase() === "fail";
}

export function isReady(payment) {
  return String(payment?.status).toLowerCase() === "ready";
}

/* =========================
🔥 날짜 포맷
========================= */
export function formatDate(date) {
  if (!date) return "-";

  try {
    return new Date(date).toLocaleString();
  } catch {
    return "-";
  }
}

/* =========================
🔥 안전 값 추출
========================= */
export function safePayment(res) {
  return res?.data || res || null;
}

/* =========================
🔥 redirect URL 추출 (카카오)
========================= */
export function getRedirectUrl(res) {
  return (
    res?.next_redirect_pc_url ||
    res?.next_redirect_mobile_url ||
    res?.data?.next_redirect_pc_url ||
    res?.data?.next_redirect_mobile_url ||
    ""
  );
}

/* 🔥 최소 추가: 숫자 안전 변환 (기존 영향 없음) */
export function toSafeNumber(value, defaultValue = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

/* 🔥 최소 추가: 상태 정규화 (기존 영향 없음) */
export function normalizeStatus(status) {
  return String(status || "").toLowerCase();
}