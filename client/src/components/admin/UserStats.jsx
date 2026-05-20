"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 USER STATS (FINAL COMPLETE)
 * ✔ 사용자 통계 카드 리스트
 * ✔ 총 유저 / 신규 / 활성 / 탈퇴 등 표시
 * ✔ NaN / undefined 100% 방어
 * ✔ 데이터 없으면 EmptyState
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function UserStats({ stats }) {
  if (!stats) {
    return <EmptyState message="유저 통계 없음" />;
  }

  const total = toNumber(stats.totalUsers);
  const newUsers = toNumber(stats.newUsers);
  const activeUsers = toNumber(stats.activeUsers);
  const inactiveUsers = toNumber(stats.inactiveUsers);
  const blockedUsers = toNumber(stats.blockedUsers);

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>👤 사용자 통계</h3>

      <div style={styles.grid}>
        <Card title="총 사용자" value={total} />
        <Card title="신규 사용자" value={newUsers} />
        <Card title="활성 사용자" value={activeUsers} />
        <Card title="비활성 사용자" value={inactiveUsers} />
        <Card title="차단 사용자" value={blockedUsers} />
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

export default UserStats;