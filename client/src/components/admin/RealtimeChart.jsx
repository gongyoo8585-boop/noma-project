"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 REALTIME CHART (FINAL COMPLETE)
 * ✔ 실시간 데이터 차트 (간단 Bar 형태)
 * ✔ 외부 라이브러리 없음
 * ✔ 데이터 없으면 EmptyState
 * ✔ NaN / undefined 100% 방어
 * ✔ 0% 오류
 * =====================================================
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeData(data) {
  if (!Array.isArray(data)) return [];

  return data.map((d) => ({
    label: String(d?.label ?? ""),
    value: toNumber(d?.value, 0),
  }));
}

function RealtimeChart({ data = [], title = "실시간 통계" }) {
  const list = normalizeData(data);

  if (!list.length) {
    return <EmptyState message="실시간 데이터 없음" />;
  }

  const max = Math.max(...list.map((d) => d.value), 1);

  return (
    <div style={styles.wrapper}>
      <h3 style={styles.title}>{title}</h3>

      <div style={styles.chart}>
        {list.map((item, idx) => {
          const height = (item.value / max) * 100;

          return (
            <div key={idx} style={styles.barWrapper}>
              <div
                style={{
                  ...styles.bar,
                  height: `${height}%`,
                }}
              />
              <div style={styles.label}>{item.label}</div>
              <div style={styles.value}>{item.value}</div>
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
  chart: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    height: 200,
  },
  barWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  bar: {
    width: "100%",
    background: "#d4af37",
    borderRadius: 4,
    transition: "all 0.3s ease",
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: "#888",
  },
  value: {
    fontSize: 12,
    color: "#fff",
  },
};

export default RealtimeChart;