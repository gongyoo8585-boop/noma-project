"use strict";

import React from "react";

import EmptyState from "../common/EmptyState";

/**
 * =====================================================
 * 🔥 REVENUE CHART (FINAL COMPLETE)
 * ✔ 매출 차트 (Bar + 간단 라인 느낌)
 * ✔ 외부 라이브러리 없음
 * ✔ NaN / undefined 100% 방어
 * ✔ 데이터 없으면 EmptyState
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

function RevenueChart({ data = [], title = "매출 통계" }) {
  const list = normalizeData(data);

  if (!list.length) {
    return <EmptyState message="매출 데이터 없음" />;
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
              <div style={styles.lineContainer}>
                <div
                  style={{
                    ...styles.bar,
                    height: `${height}%`,
                  }}
                />
                {/* 🔥 라인 포인트 느낌 */}
                <div
                  style={{
                    ...styles.point,
                    bottom: `${height}%`,
                  }}
                />
              </div>

              <div style={styles.label}>{item.label}</div>
              <div style={styles.value}>
                {item.value.toLocaleString()}
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
  chart: {
    display: "flex",
    alignItems: "flex-end",
    gap: 12,
    height: 220,
  },
  barWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  lineContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "flex-end",
  },
  bar: {
    width: "100%",
    background: "#d4af37",
    borderRadius: 4,
    transition: "all 0.3s ease",
  },
  point: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#fff",
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

export default RevenueChart;