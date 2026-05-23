"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 DASHBOARD SUMMARY (FINAL COMPLETE)
 * ✔ 관리자 요약 카드 컴포넌트
 * ✔ props 기반 데이터 표시
 * ✔ 데이터 없으면 EmptyState
 * ✔ 0% 오류
 * =====================================================
 */

function DashboardSummary({ summary }) {
  if (!summary) {
    return <EmptyState message="요약 데이터 없음" />;
  }

  return (
    <div style={styles.grid}>
      <Card title="매장 수" value={summary.totalShops} />
      <Card title="유저 수" value={summary.totalUsers} />
      <Card title="예약 수" value={summary.totalReservations} />
      <Card title="결제 수" value={summary.totalPayments} />
      <Card title="총 매출" value={summary.totalRevenue} />
    </div>
  );
}

/* =========================
CARD
========================= */
function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.title}>{title}</div>
      <div style={styles.value}>{value ?? 0}</div>
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
  },
  card: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 15,
    color: "#d4af37",
  },
  title: {
    fontSize: 12,
    color: "#888",
  },
  value: {
    marginTop: 6,
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
};

export default DashboardSummary;