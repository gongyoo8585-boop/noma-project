"use strict";

import React from "react";
import PaymentStatus from "./PaymentStatus";

/**
 * =====================================================
 * 🔥 PAYMENT RESULT (ULTRA FINAL COMPLETE)
 * ✔ 결제 결과 카드 UI
 * ✔ PaymentSuccessPage / DetailPage 호환
 * ✔ payment 객체 그대로 사용
 * ✔ 상태 / 금액 / 시간 표시
 * ✔ null 안전 처리
 * ✔ 블랙 + 골드 UI
 * =====================================================
 */

function PaymentResult({ payment }) {
  if (!payment) return null;

  const amount = Number(payment.amount || 0);

  return (
    <div style={card}>
      <h3 style={title}>결제 정보</h3>

      <InfoRow label="결제 상태">
        <PaymentStatus status={payment.status} />
      </InfoRow>

      <InfoRow label="결제 금액">
        {amount.toLocaleString()}원
      </InfoRow>

      {payment.approvedAt && (
        <InfoRow label="승인 시간">
          {formatDate(payment.approvedAt)}
        </InfoRow>
      )}

      {payment.cancelledAt && (
        <InfoRow label="취소 시간">
          {formatDate(payment.cancelledAt)}
        </InfoRow>
      )}

      {payment.failedAt && (
        <InfoRow label="실패 시간">
          {formatDate(payment.failedAt)}
        </InfoRow>
      )}

      {payment.failReason && (
        <InfoRow label="실패 사유">
          {payment.failReason}
        </InfoRow>
      )}
    </div>
  );
}

/* =========================
🔥 공통 Row
========================= */
function InfoRow({ label, children }) {
  return (
    <div style={row}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{children || "-"}</span>
    </div>
  );
}

/* =========================
🔥 유틸
========================= */
function formatDate(date) {
  try {
    return new Date(date).toLocaleString();
  } catch {
    return "-";
  }
}

/* =========================
🔥 STYLE
========================= */

const card = {
  background: "#111",
  border: "1px solid #333",
  borderRadius: 12,
  padding: 16,
  marginTop: 20,
  width: "100%",
  maxWidth: 420,
};

const title = {
  color: "#FFD700",
  marginBottom: 12,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: 10,
};

const labelStyle = {
  color: "#FFD700",
};

const valueStyle = {
  color: "#fff",
};

export default PaymentResult;