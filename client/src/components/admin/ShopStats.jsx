"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 SHOP STATS (FINAL COMPLETE)
 * ✔ 매장 통계 카드
 * ✔ 총 매장 / 신규 / 활성 / 인기 매장 표시
 * ✔ NaN / undefined 100% 방어
 * ✔ 데이터 없으면 EmptyState
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function ShopStats({ stats }) {
  if (!stats) {
    return <EmptyState message="매장 통계 없음" />;
  }

  const total = toNumber(stats.totalShops);
  const newShops = toNumber(stats.newShops);
  const activeShops = toNumber(stats.activeShops);
  const inactiveShops = toNumber(stats.inactiveShops);
  const popularShops = toNumber(stats.popularShops);

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>🏪 매장 통계</h3>

      <div style={styles.grid}>
        <Card title="총 매장" value={total} />
        <Card title="신규 매장" value={newShops} />
        <Card title="운영 중" value={activeShops} />
        <Card title="비활성 매장" value={inactiveShops} />
        <Card title="인기 매장" value={popularShops} />
      </div>
    </div>
  );
}

/* =========================
CARD
========================= */
function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

/* =========================
STYLE
========================= */
const styles = {
  wrapper: {
    background: "#000",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 16,
    color: "#d4af37",
  },
  title: {
    marginBottom: 12,
    color: "#d4af37",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
  card: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 12,
  },
  cardTitle: {
    fontSize: 12,
    color: "#888",
  },
  cardValue: {
    marginTop: 6,
    fontSize: 18,
    color: "#fff",
    fontWeight: "bold",
  },
};

export default ShopStats;