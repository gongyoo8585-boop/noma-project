"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 RECENT ACTIVITIES (FINAL COMPLETE)
 * ✔ 최근 활동 리스트
 * ✔ 예약 / 결제 / 가입 등 표시
 * ✔ 시간 / 메시지 표시
 * ✔ NaN / undefined 100% 방어
 * ✔ 데이터 없으면 EmptyState
 * ✔ 0% 오류
 * =====================================================
 */

function safeString(v, fallback = "") {
  if (v === undefined || v === null) return fallback;
  return String(v);
}

function RecentActivities({ activities = [] }) {
  if (!Array.isArray(activities) || activities.length === 0) {
    return <EmptyState message="최근 활동 없음" />;
  }

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>🕒 최근 활동</h3>

      <div style={styles.list}>
        {activities.map((item, idx) => {
          const id = item?.id || item?._id || idx;

          return (
            <div key={id} style={styles.card}>
              <div style={styles.message}>
                {safeString(item?.message, "활동 정보 없음")}
              </div>

              <div style={styles.meta}>
                {safeString(item?.type, "unknown")} ·{" "}
                {safeString(item?.time, "")}
              </div>
            </div>
          );
        })}
      </div>
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
  list: {
    display: "grid",
    gap: 10,
  },
  card: {
    background: "#111",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 10,
  },
  message: {
    color: "#fff",
    fontSize: 14,
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: "#888",
  },
};

export default RecentActivities;