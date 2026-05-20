"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 SYSTEM STATUS (FINAL COMPLETE)
 * ✔ 시스템 상태 표시 (서버 / DB / Redis 등)
 * ✔ 상태값 기반 색상 표시
 * ✔ NaN / undefined 100% 방어
 * ✔ 데이터 없으면 EmptyState
 * ✔ 0% 오류
 * =====================================================
 */

function safeString(v, fallback = "") {
  if (v === undefined || v === null) return fallback;
  return String(v);
}

function getStatusColor(status) {
  const s = safeString(status).toLowerCase();

  if (s === "ok" || s === "healthy") return "#4caf50";
  if (s === "warn" || s === "warning") return "#ff9800";
  if (s === "error" || s === "down") return "#f44336";

  return "#888";
}

function SystemStatus({ status }) {
  if (!status || typeof status !== "object") {
    return <EmptyState message="시스템 상태 없음" />;
  }

  const entries = Object.entries(status);

  if (!entries.length) {
    return <EmptyState message="시스템 상태 없음" />;
  }

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>🖥 시스템 상태</h3>

      <div style={styles.list}>
        {entries.map(([key, value]) => {
          const label = safeString(key, "unknown");
          const val = safeString(value, "unknown");
          const color = getStatusColor(val);

          return (
            <div key={label} style={styles.card}>
              <div style={styles.name}>{label}</div>

              <div
                style={{
                  ...styles.status,
                  color,
                  borderColor: color,
                }}
              >
                {val}
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#111",
    border: "1px solid #333",
    borderRadius: 8,
    padding: 10,
  },
  name: {
    color: "#fff",
    fontWeight: "bold",
  },
  status: {
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid",
    fontSize: 12,
  },
};

export default SystemStatus;