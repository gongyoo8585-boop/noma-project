"use strict";

import React from "react";

/**
 * =====================================================
 * 🔥 RESERVATION STATUS (ULTRA FINAL COMPLETE)
 * ✔ 예약 상태 표시 컴포넌트
 * ✔ 모든 상태 대응 (pending / approved / confirmed / completed / cancelled)
 * ✔ null / undefined 안전 처리
 * ✔ UI 블랙 + 골드
 * ✔ 재사용 가능
 * ✔ 단일 파일 완성형
 * =====================================================
 */

function ReservationStatus({ status = "pending" }) {
  const safeStatus = String(status || "pending").toLowerCase();

  const labelMap = {
    pending: "대기",
    approved: "승인",
    confirmed: "확정",
    completed: "완료",
    cancelled: "취소",
  };

  return (
    <span style={getStyle(safeStatus)}>
      {labelMap[safeStatus] || safeStatus}
    </span>
  );
}

/* =========================
🔥 스타일
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

  if (status === "pending") {
    return {
      ...base,
      background: "#111",
      color: "#d4af37",
    };
  }

  if (status === "approved" || status === "confirmed") {
    return {
      ...base,
      background: "#d4af37",
      color: "#000",
    };
  }

  if (status === "completed") {
    return {
      ...base,
      background: "#065f46",
      color: "#fff",
    };
  }

  if (status === "cancelled") {
    return {
      ...base,
      background: "#700",
      color: "#fff",
    };
  }

  return base;
}

export default ReservationStatus;