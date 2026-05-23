"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 PAYMENT STATUS (ULTRA FINAL COMPLETE)
 * ✔ 결제 상태 표시 컴포넌트
 * ✔ Payment / ReservationDetail 100% 호환
 * ✔ 모든 상태 대응 (ready / paid / cancelled / fail)
 * ✔ null / undefined 안전 처리
 * ✔ 블랙 + 골드 UI
 * =====================================================
 */

function PaymentStatus({ status = "ready" }) {
  const safeStatus = String(status || "ready").toLowerCase();

  const labelMap = {
    ready: "결제 대기",
    paid: "결제 완료",
    cancelled: "결제 취소",
    fail: "결제 실패",
  };

  return (
    <span style={getStyle(safeStatus)}>
      {labelMap[safeStatus] || safeStatus}
    </span>
  );
}

/* =========================
🔥 STYLE
========================= */
function getStyle(status) {
  const base = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    border: "1px solid #333",
    whiteSpace: "nowrap",
  };

  if (status === "ready") {
    return {
      ...base,
      background: "#111",
      color: "#FFD700",
    };
  }

  if (status === "paid") {
    return {
      ...base,
      background: "#FFD700",
      color: "#000",
    };
  }

  if (status === "cancelled") {
    return {
      ...base,
      background: "#700",
      color: "#fff",
    };
  }

  if (status === "fail") {
    return {
      ...base,
      background: "#444",
      color: "#fff",
    };
  }

  return base;
}

export default PaymentStatus;